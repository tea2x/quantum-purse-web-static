import { Form, Input, Modal, ModalProps } from "antd";
import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
// import { TEMP_PASSWORD } from "../../utils/constants";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import usePasswordValidator from "../../hooks/usePasswordValidator";
import { Dispatch } from "../../store";
import { ROUTES } from "../../utils/constants";
import styles from "./Authentication.module.scss";

export interface AuthenticationRef {
  open: () => void;
  close: () => void;
}

interface AuthenticationProps extends ModalProps {
  title?: string;
  description?: string;
  loading?: boolean;
  authenCallback: (password: string) => Promise<void>;
}

const Authentication = React.forwardRef<AuthenticationRef, AuthenticationProps>(
  (
    {
      authenCallback,
      title = "Authentication",
      description = "Please enter your password to generate a new account",
      loading,
      ...rest
    },
    ref
  ) => {
    const [form] = Form.useForm();
    const values = Form.useWatch([], form);
    const [open, setOpen] = useState(false);
    const [submittable, setSubmittable] = useState(false);
    const { rules: passwordRules } = usePasswordValidator();
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const dispatch = useDispatch<Dispatch>();
    const navigate = useNavigate();

    useEffect(() => {
      form
        .validateFields({ validateOnly: true })
        .then(() => setSubmittable(true))
        .catch(() => setSubmittable(false));
    }, [form, values]);

    const closeHandler = () => {
      setOpen(false);
      setIsForgotPassword(false);
    };

    useImperativeHandle(ref, () => ({
      open: () => setOpen(true),
      close: closeHandler,
    }));

    const onFinish = async (values: any) => {
      await authenCallback(values.password);
      form.resetFields();
    };

    const modalOptions = useMemo(() => {
      return {
        okText: isForgotPassword ? "Ok, re-import my wallet" : "Submit",
        onOk: isForgotPassword
          ? async () => {
              await dispatch.wallet.ejectWallet();
              navigate(ROUTES.WELCOME);
            }
          : form.submit,
        okClassname: isForgotPassword ? "forgot-btn" : "",
        cancelText: isForgotPassword ? "Back to Authentication" : "Cancel",
        onCancel: isForgotPassword
          ? () => setIsForgotPassword(false)
          : closeHandler,
        cancelClassname: isForgotPassword ? "forgot-btn" : "",
        okDisabled: isForgotPassword ? false : !submittable,
      };
    }, [isForgotPassword, submittable]);

    return (
      <Modal
        open={open}
        {...rest}
        okText={modalOptions.okText}
        onOk={modalOptions.onOk}
        cancelText={modalOptions.cancelText}
        onCancel={modalOptions.onCancel}
        centered
        className={styles.authentication}
        confirmLoading={loading}
        cancelButtonProps={{
          className: modalOptions.cancelClassname,
          disabled: loading,
        }}
        closable={!loading}
        okButtonProps={{
          className: modalOptions.okClassname,
          disabled: modalOptions.okDisabled,
        }}
      >
        {isForgotPassword ? (
          <>
            <h2 className="title">Forgot Password?</h2>
            <p className="description">
              Quantum Purse wallet does not store your password in somewhere.
              You can only restore your wallet by using your secret recovery
              phrase.
            </p>
          </>
        ) : (
          <>
            <h2 className="title">{title}</h2>
            <p className="description">{description}</p>
            <Form
              form={form}
              onFinish={onFinish}
              layout="vertical"
              className="form-authentication"
              disabled={loading}
            >
              <Form.Item name="password" rules={passwordRules}>
                <Input.Password
                  size="large"
                  placeholder="Enter your password"
                />
              </Form.Item>
            </Form>
            <p
              className="forgot-password"
              onClick={() => setIsForgotPassword(true)}
            >
              Forgot password?
            </p>
          </>
        )}
      </Modal>
    );
  }
);

export default Authentication;
