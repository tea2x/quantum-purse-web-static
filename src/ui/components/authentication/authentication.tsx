import { Form, Input, Modal, ModalProps } from "antd";
import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import usePasswordValidator from "../../hooks/usePasswordValidator";
import { Dispatch } from "../../store";
import { ROUTES } from "../../utils/constants";
import styles from "./authentication.module.scss";
import QuantumPurse, { SpxVariant } from "../../../core/quantum_purse";
import { STORAGE_KEYS } from "../../utils/constants";
import ConfirmDeleteWalletModal from "../../components/delete-wallet-confirm/delete_wallet_confirm";

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
      description = "",
      loading,
      ...rest
    },
    ref
  ) => {
    const [form] = Form.useForm();
    const values = Form.useWatch([], form);
    const [open, setOpen] = useState(false);
    const [submittable, setSubmittable] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [isDeleteWalletConfirmModalOpen, setIsDeleteWalletConfirmModalOpen] = useState(false);
    const dispatch = useDispatch<Dispatch>();
    const navigate = useNavigate();

    let paramSet;
    try {
      paramSet = QuantumPurse.getInstance().getSphincsPlusParamSet();
    } catch (e) {
      const paramId = localStorage.getItem(STORAGE_KEYS.SPHINCS_PLUS_PARAM_SET);
      paramSet = SpxVariant[Number(paramId)];
    }
    const { rules: passwordRules } = usePasswordValidator(Number(paramSet));

    useEffect(() => {
      if (values?.password) {
        form
          .validateFields()
          .then(() => setSubmittable(true))
          .catch(() => setSubmittable(false));
      } else {
        setSubmittable(false);
      }
    }, [form, values]);

    const closeHandler = () => {
      setOpen(false);
      setIsForgotPassword(false);
      form.resetFields();
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
          ? () => setIsDeleteWalletConfirmModalOpen(true)
          : form.submit,
        cancelText: isForgotPassword ? "Back to Authentication" : "Cancel",
        onCancel: isForgotPassword
          ? () => setIsForgotPassword(false)
          : closeHandler,
        okDisabled: isForgotPassword ? false : !submittable,
      };
    }, [isForgotPassword, submittable]);

    return (
      <>
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
            disabled: loading,
          }}
          closable={!loading}
          okButtonProps={{
            disabled: modalOptions.okDisabled,
          }}
        >
          {isForgotPassword ? (
            <>
              <h2 className="title">Forgot Password?</h2>
              <p className="description">
                Restore your wallet by deleting current instance and reimport your secret recovery phrase.
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
        <ConfirmDeleteWalletModal
          isOpen={isDeleteWalletConfirmModalOpen}
          onOk={async () => {
            await dispatch.wallet.ejectWallet();
            navigate(ROUTES.WELCOME);
          }}
          onCancel={() => setIsDeleteWalletConfirmModalOpen(false)}
        />
      </>
    );
  }
);

export default Authentication;