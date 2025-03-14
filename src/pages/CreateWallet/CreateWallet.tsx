import { KeyOutlined, LoadingOutlined, LockOutlined } from "@ant-design/icons";
import { Button, Checkbox, Flex, Form, Input, notification, Steps } from "antd";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { Copy } from "../../components";
import QuantumPurse from "../../core/quantum_purse";
import { utf8ToBytes } from "../../core/utils";
import { Dispatch, RootState } from "../../store";
// import { TEMP_PASSWORD } from "../../utils/constants";
import { cx } from "../../utils/methods";
import styles from "./CreateWallet.module.scss";
import { CreateWalletContextType } from "./interface";

const CreateWalletContext = createContext<CreateWalletContextType>({
  currentStep: 0,
  setCurrentStep: () => {},
  next: () => {},
  prev: () => {},
  done: () => {},
  steps: [],
  srp: "",
  setSRP: () => {},
});

const CreateWalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(location.state?.step || 0);
  const [srp, setSRP] = useState("");
  const [api, contextHolder] = notification.useNotification();
  const dispatch = useDispatch<Dispatch>();
  const { createWallet: loadingCreateWallet, exportSRP: loadingExportSRP } =
    useSelector((state: RootState) => state.loading.effects.wallet);
  const next = () => {
    setCurrentStep(currentStep + 1);
  };
  const prev = () => {
    setCurrentStep(currentStep - 1);
  };
  const done = async () => {
    try {
      localStorage.removeItem("wallet-step");
      api.success({
        message: "Create wallet successfully!",
        description: "You can now use your wallet to send and receive tokens.",
        duration: 0,
      });
      await dispatch.wallet.init({});
      await dispatch.wallet.loadAccounts();
      await dispatch.wallet.loadCurrentAccount({});
    } catch (error) {
      api.error({
        message: "Create wallet failed!",
        description: "Please try again.",
        duration: 0,
      });
    }
  };

  const steps = useMemo(
    () => [
      {
        key: "1",
        title: "Create password",
        description: "Create a secure password for your wallet",
        icon:
          loadingCreateWallet || loadingExportSRP ? (
            <LoadingOutlined />
          ) : (
            <KeyOutlined />
          ),
        content: <StepCreatePassword />,
      },
      {
        key: "2",
        title: "Secure Secret Recovery Phrase",
        description: "Save your recovery phrase in a secure location",
        icon: <LockOutlined />,
        content: <StepSecureSRP />,
      },
    ],
    [loadingCreateWallet, loadingExportSRP]
  );

  console.log("currentSTep  ", currentStep);

  return (
    <CreateWalletContext.Provider
      value={{
        steps,
        currentStep,
        setCurrentStep,
        next,
        prev,
        done,
        srp,
        setSRP,
      }}
    >
      {contextHolder}
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
  const { next, setSRP } = useContext(CreateWalletContext);
  const values = Form.useWatch([], form);
  const dispatch = useDispatch<Dispatch>();
  const [submittable, setSubmittable] = React.useState<boolean>(false);
  const { createWallet: loadingCreateWallet, exportSRP: loadingExportSRP } =
    useSelector((state: RootState) => state.loading.effects.wallet);

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  const entropyValidator = (password: string) => {
    if (!password) {
      return Promise.resolve();
    }
    const passwordBytes = utf8ToBytes(password);
    try {
      QuantumPurse.checkPassword(passwordBytes);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(new Error(error as string));
    }
  };

  const onFinish = async (values: any) => {
    await dispatch.wallet
      .createWallet({
        password: values.password,
      })
      .then(async () => {
        const srp = await dispatch.wallet.exportSRP({
          password: values.password,
        });
        setSRP(srp);
      })
      .then(() => {
        next();
        localStorage.setItem("wallet-step", "1");
      });
  };

  return (
    <div className={styles.stepCreatePassword}>
      <h2>Create password</h2>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={
          {
            // password: TEMP_PASSWORD,
            // confirmPassword: TEMP_PASSWORD,
            // passwordAwareness: true,
          }
        }
      >
        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: "Please input your password!" },
            {
              validator: (_, value) => {
                return entropyValidator(value);
              },
            },
          ]}
        >
          <Input.Password size="large" />
        </Form.Item>

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
        <Form.Item>
          <Flex align="center" gap={8}>
            <Form.Item
              name="passwordAwareness"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) => {
                    if (value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("You must acknowledge this statement!")
                    );
                  },
                },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Checkbox />
            </Form.Item>
            <p>
              I understand that Quantum Purse cannot recover this password for
              me.
            </p>
          </Flex>
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            disabled={!submittable || loadingCreateWallet || loadingExportSRP}
            loading={loadingCreateWallet || loadingExportSRP}
          >
            Create a new wallet
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

const StepSecureSRP: React.FC = () => {
  const { done, srp } = useContext(CreateWalletContext);

  const onDone = () => {
    done();
  };

  return (
    <div className={styles.stepSecureSRP}>
      <h2>Secure Secret Recovery Phrase</h2>
      <p>
        Your secret recovery phrase is a list of 24 words that you can use to
        recover your wallet.
      </p>
      <p>
        Write down these 24 words in the order shown below, and store them in a
        secure location.
      </p>
      <Copy value={srp}>
        <p className={"srp"}>
          {srp ||
            "world hunt hazard love bulk bullet outside entire goat come aerobic program maximum idea change myth please simple idea copper toss genre calm also"}
        </p>
      </Copy>
      <Button type="primary" onClick={onDone}>
        I wrote it down !
      </Button>
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
