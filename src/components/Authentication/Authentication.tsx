import { Form, Input, Modal, ModalProps } from "antd";
import React, { useEffect, useImperativeHandle, useState } from "react";
import QuantumPurse from "../../core/quantum_purse";
import { utf8ToBytes } from "../../core/utils";
// import { TEMP_PASSWORD } from "../../utils/constants";
import styles from "./Authentication.module.scss";

export interface AuthenticationRef {
  open: () => void;
  close: () => void;
}

interface AuthenticationProps extends ModalProps {
  title?: string;
  description?: string;
  loading?: boolean;
  authenCallback: (password: string) => void;
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

    useEffect(() => {
      form
        .validateFields({ validateOnly: true })
        .then(() => setSubmittable(true))
        .catch(() => setSubmittable(false));
    }, [form, values]);

    const closeHandler = () => {
      setOpen(false);
    };

    useImperativeHandle(ref, () => ({
      open: () => setOpen(true),
      close: closeHandler,
    }));

    const onFinish = async (values: any) => {
      await authenCallback(values.password);
      form.resetFields();
    };

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

    return (
      <Modal
        open={open}
        {...rest}
        onCancel={closeHandler}
        centered
        onOk={form.submit}
        className={styles.authentication}
        confirmLoading={loading}
        cancelButtonProps={{
          disabled: loading,
        }}
        closable={!loading}
        okButtonProps={{
          disabled: !submittable,
        }}
      >
        <h2 className="title">{title}</h2>
        <p className="description">{description}</p>
        <Form
          form={form}
          onFinish={onFinish}
          initialValues={
            {
              // password: TEMP_PASSWORD,
            }
          }
          layout="vertical"
          className="form-authentication"
        >
          <Form.Item
            name="password"
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
        </Form>
      </Modal>
    );
  }
);

export default Authentication;
