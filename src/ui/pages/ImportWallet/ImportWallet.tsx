import { KeyOutlined, LoadingOutlined, LockOutlined } from "@ant-design/icons";
import {
  Button,
  Checkbox,
  Flex,
  Form,
  FormInstance,
  Input,
  notification,
  Steps,
  Tabs,
} from "antd";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import usePasswordValidator from "../../hooks/usePasswordValidator";
import { Dispatch, RootState } from "../../store";
import { WalletStepEnum, STORAGE_KEYS } from "../../utils/constants";
import { cx, formatError } from "../../utils/methods";
import styles from "./ImportWallet.module.scss";
import ParamSetSelector from "../../components/sphincs-param-set/param_selector";
import QuantumPurse, { SphincsVariant } from "../../../core/quantum_purse";

interface ImportWalletContext {
  currentStep?: WalletStepEnum;
  next: () => void;
  prev: () => void;
}

const ImportWalletContext = createContext<ImportWalletContext>({
  currentStep: undefined,
  next: () => {},
  prev: () => {},
});

const STEP = {
  SRP: 1,
  PASSWORD: 2,
};
const ImportWalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<WalletStepEnum>(
    location.state?.step || STEP.SRP
  );

  const next = () => {
    setCurrentStep(currentStep + 1);
  };
  const prev = () => {
    setCurrentStep(currentStep - 1);
  };

  useEffect(() => {
    if (location.state?.step) {
      setCurrentStep(location.state.step);
    }
  }, [location.state?.step]);

  return (
    <ImportWalletContext.Provider value={{ currentStep, next, prev }}>
      {children}
    </ImportWalletContext.Provider>
  );
};

export const StepCreatePassword: React.FC<BaseStepProps> = ({ form }) => {
  const values = Form.useWatch([], form);
  const [submittable, setSubmittable] = React.useState<boolean>(false);
  const { importWallet: loadingImportWallet, exportSRP: loadingExportSRP } =
    useSelector((state: RootState) => state.loading.effects.wallet);
  const { prev } = useContext(ImportWalletContext);
  const { rules: passwordRules } = usePasswordValidator();

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  return (
    <div className={styles.stepCreatePassword}>
      <h2>Wallet Type & Password</h2>

      <ParamSetSelector/>

      <Form.Item
        name="password"
        label={<span style={{ color: 'var(--gray-01)' }}>Password</span>}
        rules={passwordRules}
      >
        <Input.Password size="large" />
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
        <Input.Password size="large" />
      </Form.Item>

      <Form.Item
        name="walletTypeBackup"
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
      >
        <Checkbox style={{ color: 'var(--gray-01)' }}>
          I understand that the parameter set must match with the one I backed up with the mnemonic seed previously.
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
                new Error("You must acknowledge this statement!")
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
            onClick={() => prev()}
            disabled={loadingImportWallet || loadingExportSRP}
          >
            Back
          </Button>
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            disabled={!submittable || loadingImportWallet || loadingExportSRP}
            loading={loadingImportWallet || loadingExportSRP}
          >
            Create
          </Button>
        </Form.Item>
      </Flex>
    </div>
  );
};

interface BaseStepProps {
  form: FormInstance;
}

const StepInputSRP: React.FC<BaseStepProps> = ({ form }) => {
  const values = Form.useWatch([], form);
  const [submittable, setSubmittable] = React.useState<boolean>(false);
  const { next } = useContext(ImportWalletContext);

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  return (
    <div className={styles.stepInputSRP}>
      <h2>Import SRP</h2>
      <Form.Item
        name="srp"
        rules={[
          {
            required: true,
            message: "Please input your seed recovery phrase",
          },
          {
            validator: (_, value) => {
              if (!value) return Promise.resolve();
              const words = value.trim().split(/\s+/);
              if (![36, 54, 72].includes(words.length)) {
                return Promise.reject(
                  new Error(`Current word count is ${words.length} but expected to be 36, 54 or 72!`)
                );
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input.TextArea
          size="large"
          placeholder="Enter your seed recovery phrase"
          rows={9}
        />
      </Form.Item>
      <Flex align="center" justify="center" gap={16}>
        <Form.Item>
          <Button onClick={() => window.history.back()}>Back</Button>
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            disabled={!submittable}
            loading={false}
            onClick={() => next()}
            className="next-button"
          >
            Next
          </Button>
        </Form.Item>
      </Flex>
    </div>
  );
};

const ImportWalletContent: React.FC = () => {
  const [form] = Form.useForm();
  const values = Form.useWatch([], form);
  const dispatch = useDispatch<Dispatch>();

  const onFinish = async ({parameterSet}:{parameterSet: SphincsVariant}) => {
    QuantumPurse.getInstance().initKeyVault(parameterSet);
    // store chosen param set to storage, so wallet type retains when refreshed
    localStorage.setItem(STORAGE_KEYS.SPHINCS_PLUS_PARAM_SET, parameterSet.toString());

    const { srp, password } = values;

    try {
      await dispatch.wallet.importWallet({ srp, password });
      await dispatch.wallet.init({});
      await dispatch.wallet.loadCurrentAccount({});
      dispatch.wallet.resetSRP();
      notification.success({
        message: "Import wallet successfully!",
        description: "You can now use your wallet to send and receive tokens.",
      });
    } catch (error) {
      notification.error({
        message: "Import wallet failed!",
        description: formatError(error),
      });
    }
  };

  const { currentStep } = useContext(ImportWalletContext);
  const { importWallet: loadingImportWallet, exportSRP: loadingExportSRP } =
    useSelector((state: RootState) => state.loading.effects.wallet);

  const steps = useMemo(
    () => [
      {
        key: STEP.SRP,
        title: "Import SRP",
        description: "Import your secret recovery phrase",
        icon: loadingExportSRP ? <LoadingOutlined /> : <LockOutlined />,
        content: <StepInputSRP form={form} />,
      },
      {
        key: STEP.PASSWORD,
        title: "Wallet Type & Password",
        description: "Choose SPHINCS+ variant and create password",
        icon: loadingImportWallet ? <LoadingOutlined /> : <KeyOutlined />,
        content: <StepCreatePassword form={form} />,
      },
    ],
    [loadingImportWallet, loadingExportSRP]
  );

  return (
    <section className={cx(styles.importWallet, "panel")}>
      <h1>Import wallet</h1>
      <Steps current={currentStep} items={steps} />
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Tabs
          items={steps.map((step) => ({
            key: step.key.toString(),
            label: step.title,
            children: step.content,
          }))}
          activeKey={currentStep?.toString()}
          renderTabBar={() => <></>}
          className={styles.tabs}
        />
      </Form>
    </section>
  );
};

const ImportWallet: React.FC = () => {
  return (
    <ImportWalletProvider>
      <ImportWalletContent />
    </ImportWalletProvider>
  );
};

export default ImportWallet;
