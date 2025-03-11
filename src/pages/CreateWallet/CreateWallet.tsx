import { LoadingOutlined } from "@ant-design/icons";
import { Button, Checkbox, Flex, Form, Input, Progress, Steps } from "antd";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import QuantumPurse from "../../core/quantum_purse";
import { utf8ToBytes } from "../../core/utils";
import { Dispatch } from "../../store";
import { ROUTES, PASSWORD_ENTROPY_THRESHOLDS } from "../../utils/constants";
import { cx } from "../../utils/methods";
import styles from "./CreateWallet.module.scss";
import { CreateWalletContextType } from "./interface";

const { WEAK, MEDIUM, STRONG, VERY_STRONG } = PASSWORD_ENTROPY_THRESHOLDS;

const CreateWalletContext = createContext<CreateWalletContextType>({
  currentStep: 0,
  setCurrentStep: () => {},
  next: () => {},
  prev: () => {},
  done: () => {},
  steps: [],
});

const CreateWalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const next = () => {
    setCurrentStep(currentStep + 1);
  };
  const prev = () => {
    setCurrentStep(currentStep - 1);
  };
  const done = () => {
    navigate(ROUTES.HOME);
  };

  const steps = useMemo(
    () => [
      {
        key: "1",
        title: "Create password",
        description: "Create a secure password for your wallet",
        icon: <LoadingOutlined />,
        content: <StepCreatePassword />,
      },
      {
        key: "2",
        title: "Secure Secret Recovery Phrase",
        description: "Save your recovery phrase in a secure location",
        icon: <LoadingOutlined />,
        content: <StepSecureSRP />,
      },
    ],
    []
  );

  return (
    <CreateWalletContext.Provider
      value={{ steps, currentStep, setCurrentStep, next, prev, done }}
    >
      {children}
    </CreateWalletContext.Provider>
  );
};

const CreateWalletContent: React.FC = () => {
  const { steps, currentStep } = useContext(CreateWalletContext);

  return (
    <section className={cx(styles.createWallet, "panel")}>
      <h1>Create a new wallet</h1>
      <Steps current={currentStep} items={steps} />
      <div>{steps[currentStep].content}</div>
    </section>
  );
};

const StepCreatePassword: React.FC = () => {
  const [form] = Form.useForm();
  const { next } = useContext(CreateWalletContext);
  const values = Form.useWatch([], form);
  const dispatch = useDispatch<Dispatch>();
  const [submittable, setSubmittable] = React.useState<boolean>(false);
  const [passwordEntropy, setPasswordEntropy] = React.useState<number>(0);
  const [passwordStrength, setPasswordStrength] = React.useState<{
    label: string;
    color: string;
  }>({ label: "Too Weak", color: "#ff4d4f" });

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  const entropyValidator = (password: string) => {
    if (!password) {
      Promise.resolve();
      setPasswordEntropy(0);
      setPasswordStrength({ label: "Too Weak", color: "#ff4d4f" });
    }

    const passwordBytes = utf8ToBytes(password);
    const entropy = QuantumPurse.calculateEntropy(passwordBytes);
    setPasswordEntropy(entropy);

    if (entropy < WEAK) {
      setPasswordStrength({ label: "Too Weak", color: "#ff4d4f" });
    } else if (entropy < MEDIUM) {
      setPasswordStrength({ label: "Weak", color: "#faad14" });
    } else if (entropy < STRONG) {
      setPasswordStrength({ label: "Medium", color: "#1677ff" });
    } else if (entropy < VERY_STRONG) {
      setPasswordStrength({ label: "Strong", color: "#52c41a" });
      return Promise.resolve();
    } else {
      setPasswordStrength({
        label: "Very Strong",
        color: "#52c41a",
      });
      return Promise.resolve();
    }
    return Promise.reject(new Error("Password is not strong enough!"));
  };

  // Calculate password entropy when password changes
  // useEffect(() => {
  //   if (values?.password) {
  //     const passwordBytes = utf8ToBytes(values.password);
  //     const entropy = QuantumPurse.calculateEntropy(passwordBytes);

  //     // Set password strength indicator
  //     if (entropy < WEAK) {
  //       setPasswordStrength({ label: "Too Weak", color: "#ff4d4f" });
  //     } else if (entropy < MEDIUM) {
  //       setPasswordStrength({ label: "Weak", color: "#faad14" });
  //     } else if (entropy < STRONG) {
  //       setPasswordStrength({ label: "Medium", color: "#1677ff" });
  //     } else if (entropy < VERY_STRONG) {
  //       setPasswordStrength({ label: "Strong", color: "#52c41a" });
  //     } else {
  //       setPasswordStrength({ label: "Very Strong", color: "#52c41a" });
  //     }
  //     setPasswordEntropy(entropy);
  //   } else {
  //     setPasswordEntropy(0);
  //     setPasswordStrength({ label: "Too Weak", color: "#ff4d4f" });
  //   }
  // }, [values?.password]);

  const onFinish = (values: any) => {
    dispatch.wallet.createWallet({
      password:
        values.password || "my password is easy to crack. Don't use this!",
    });
    next();
  };

  return (
    <div className={styles.stepCreatePassword}>
      <h2>Create password</h2>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: "Please input your password!" },
            {
              validator: (_, value) => {
                return entropyValidator(value);
              },
              message: "Password is not strong enough!",
            },
          ]}
        >
          <Input.Password size="large" />
        </Form.Item>

        {values?.password && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Password Strength:</span>
              <span style={{ color: passwordStrength.color }}>
                {passwordStrength.label}
              </span>
            </div>
            <Progress
              percent={(passwordEntropy / VERY_STRONG) * 100}
              strokeColor={passwordStrength.color}
              showInfo={false}
              status="active"
            />
          </div>
        )}

        <Form.Item
          name="confirmPassword"
          label="Confirm password"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Please confirm your password!" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("The passwords do not match!"));
              },
            }),
          ]}
        >
          <Input.Password size="large" />
        </Form.Item>
        <Form.Item
          name="passwordAwareness"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) => {
                console.log(value, typeof value);
                if (value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("You must acknowledge this statement!")
                );
              },
            },
          ]}
        >
          <Flex align="center" gap={8}>
            <Checkbox />
            <p>
              I understand that Quantum Purse cannot recover this password for
              me.
            </p>
          </Flex>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" disabled={!submittable}>
            Create a new wallet
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

const StepSecureSRP: React.FC = () => {
  const { done } = useContext(CreateWalletContext);
  const srp =
    "lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.";
  const copyToClipboard = () => {
    navigator.clipboard.writeText(srp);
  };
  return (
    <div>
      <h2>Secure Secret Recovery Phrase</h2>
      <p>
        Your secret recovery phrase is a list of 12 words that you can use to
        recover your wallet.
      </p>
      <p>
        Write down these 12 words in the order shown below, and store them in a
        secure location.
      </p>
      <p className={styles.srp}>{srp}</p>
      <Flex>
        <Button type="primary" onClick={copyToClipboard}>
          Copy
        </Button>
        <Button onClick={done}>Done</Button>
      </Flex>
    </div>
  );
};

const CreateWallet: React.FC = () => {
  return (
    <CreateWalletProvider>
      <CreateWalletContent />
    </CreateWalletProvider>
  );
};

export default CreateWallet;
