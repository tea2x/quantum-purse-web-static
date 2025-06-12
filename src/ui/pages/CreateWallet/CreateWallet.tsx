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
import { SrpTextBox } from "../../components";
import usePasswordValidator from "../../hooks/usePasswordValidator";
import { Dispatch, RootState } from "../../store";
import {
  STORAGE_KEYS,
  WALLET_STEP,
  WalletStepEnum,
} from "../../utils/constants";
import { cx, formatError } from "../../utils/methods";
import styles from "./CreateWallet.module.scss";
import { CreateWalletContextType } from "./interface";
import ParamSetSelectorForm from "../../components/sphincs-param-set/param_selector";
import QuantumPurse, { SphincsVariant } from "../../../core/quantum_purse";

const CreateWalletContext = createContext<CreateWalletContextType>({
  currentStep: WALLET_STEP.PASSWORD,
  setCurrentStep: () => {},
  next: () => {},
  prev: () => {},
  done: () => {},
  steps: [],
});

const CreateWalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<WalletStepEnum>(
    location.state?.step || WALLET_STEP.PASSWORD
  );
  const dispatch = useDispatch<Dispatch>();
  const { createWallet: loadingCreateWallet, exportSRP: loadingExportSRP } =
    useSelector((state: RootState) => state.loading.effects.wallet);
  const next = () => {
    const nextStepIndex =
      steps.findIndex((step) => step.key === currentStep) + 1;
    setCurrentStep(steps[nextStepIndex].key);
  };
  const prev = () => {
    const prevStepIndex =
      steps.findIndex((step) => step.key === currentStep) - 1;
    setCurrentStep(steps[prevStepIndex].key);
  };

  useEffect(() => {
    if (location.state?.step) {
      setCurrentStep(location.state.step);
    }
  }, [location.state?.step]);

  const done = async () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.WALLET_STEP);
      await dispatch.wallet.init({});
      await dispatch.wallet.loadCurrentAccount({});
      dispatch.wallet.resetSRP();
      notification.success({
        message: "Create wallet successfully!",
        description: "You can now use your wallet to send and receive tokens.",
      });
    } catch (error) {
      notification.error({
        message: "Wallet creation failed!",
        description: formatError(error),
      });
    }
  };

  const steps = useMemo(
    () => [
      {
        key: WALLET_STEP.PASSWORD,
        title: "Wallet Type & Password",
        description: "Choose a SPHINCS+ parameter set and create a password",
        icon: loadingCreateWallet ? <LoadingOutlined /> : <KeyOutlined />,
        content: <StepCreatePassword />,
      },
      {
        key: WALLET_STEP.SRP,
        title: "Secure Secret Recovery Phrase",
        description: "Back up your SPHINCS+ variant and Mnemonic Seed Phrase",
        icon: loadingExportSRP ? <LoadingOutlined /> : <LockOutlined />,
        content: <StepSecureSRP />,
      },
    ],
    [loadingCreateWallet, loadingExportSRP]
  );

  return (
    <CreateWalletContext.Provider
      value={{
        steps,
        currentStep,
        setCurrentStep,
        next,
        prev,
        done,
      }}
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
      <div>{steps.find((step) => step.key === currentStep)?.content}</div>
    </section>
  );
};

export const StepCreatePassword: React.FC = () => {
  const [form] = Form.useForm();
  const { next } = useContext(CreateWalletContext);
  const values = Form.useWatch([], form);
  const dispatch = useDispatch<Dispatch>();
  const [submittable, setSubmittable] = React.useState<boolean>(false);
  const { createWallet: loadingCreateWallet, exportSRP: loadingExportSRP } =
    useSelector((state: RootState) => state.loading.effects.wallet);
  const { rules: passwordRules } = usePasswordValidator();

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  const onFinish = async (
    { password, parameterSet }: { password: string, parameterSet: SphincsVariant }
  ) => {
    if (parameterSet) {
      QuantumPurse.getInstance().initKeyVault(parameterSet);
    }
    // store chosen param set to storage, so wallet type retains when refreshed
    localStorage.setItem(STORAGE_KEYS.SPHINCS_PLUS_PARAM_SET, parameterSet.toString());
    try {
      await dispatch.wallet
        .createWallet({ password })
        .then(async () => {
          await dispatch.wallet.exportSRP({ password });
        })
        .then(() => {
          next();
          localStorage.setItem(
            STORAGE_KEYS.WALLET_STEP,
            WALLET_STEP.SRP.toString()
          );
        });
    } catch (error) {
      notification.info({
        message: "Wallet creation failed",
        description: formatError(error),
      });
    }
  };

  return (
    <div className={styles.stepCreatePassword}>
      <h2>Wallet Type & Password</h2>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        
        <ParamSetSelectorForm />

        <Form.Item
          name="password"
          label={<span style={{ color: 'var(--gray-01)' }}>Password</span>}
          rules={passwordRules}
        >
          <Input.Password size="large" placeholder="Enter your password" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label={<span style={{ color: 'var(--gray-01)' }}>Confirm password</span>}
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
          <Input.Password size="large" placeholder="Confirm your password" />
        </Form.Item>

        <Form.Item
          name="walletTypeBackup"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value
                  ? Promise.resolve()
                  : Promise.reject(new Error("You must agree to the terms!")),
            },
          ]}
        >
          <Checkbox style={{ color: 'var(--gray-01)' }}>
            I understand I must back up my parameter set with the mnemonic seed next.
          </Checkbox>
        </Form.Item>

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
                  new Error("You must agree to the terms!")
                );
              },
            },
          ]}
        >
          <Checkbox style={{ color: 'var(--gray-01)' }}>
            I understand that Quantum Purse cannot recover this password if lost.
          </Checkbox>
        </Form.Item>

        <Flex align="center" justify="center" gap={16}>
          <Form.Item>
            <Button
              onClick={() => window.history.back()}
              disabled={loadingCreateWallet || loadingExportSRP}
            >
              Back
            </Button>
          </Form.Item>
          <Form.Item>
            <Button
              htmlType="submit"
              type="primary"
              disabled={!submittable || loadingCreateWallet || loadingExportSRP}
              loading={loadingCreateWallet || loadingExportSRP}
            >
              Create
            </Button>
          </Form.Item>
        </Flex>
      </Form>
    </div>
  );
};

const StepSecureSRP: React.FC = () => {
  const { done } = useContext(CreateWalletContext);
  const srp = useSelector((state: RootState) => state.wallet.srp);
  const dispatch = useDispatch<Dispatch>();
  const { exportSRP: loadingExportSRP } = useSelector(
    (state: RootState) => state.loading.effects.wallet
  );

  const exportSrpHandler = async (password: string) => {
    await dispatch.wallet.exportSRP({ password });
  };

  return (
    <SrpTextBox
      value={srp}
      title={"Secure Secret Recovery Phrase"}
      description={
        srp
          ? "WARNING: Never copy or screenshot! Only handwrite to backup your chosen SPHINCS+ variant \"" + QuantumPurse.getInstance().getSphincsPlusParamSet() + "\" with the mnemonic seed."
          : "Your wallet creation process has been interrupted. Please enter your password to reveal your SRP then follow through the process."
      }
      exportSrpHandler={exportSrpHandler}
      onConfirm={() => {
        done();
      }}
      loading={loadingExportSRP}
    />
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
