import { Button, Form, Input, notification } from "antd";
import React from "react";
import { Copy } from "../../components";
import usePasswordValidator from "../../hooks/usePasswordValidator";
import { formatError } from "../../utils/methods";
import styles from "./SrpTextBox.module.scss";

interface SrpTextBoxProps {
  value?: string;
  loading?: boolean;
  title?: string;
  description?: string;
  exportSrpHandler: (password: string) => Promise<any>;
  onConfirm: () => void;
}

const SrpTextBox: React.FC<SrpTextBoxProps> = ({
  value,
  loading = false,
  title = "Secret Recovery Phrase",
  description = "Your secret recovery phrase is a list of 24 words that you can use to recover your wallet.",
  exportSrpHandler,
  onConfirm,
}) => {
  const { rules: passwordRules } = usePasswordValidator();
  const onSubmit = async (values: { password: string }) => {
    try {
      await exportSrpHandler(values.password);
      notification.success({
        message: "SRP revealed successfully",
      });
    } catch (error) {
      notification.error({
        message: "Failed to reveal SRP",
        description: formatError(error),
      });
    }
  };

  return (
    <div className={styles.srpTextBox}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {description && <p>{description}</p>}
      {value ? (
        <>
          <Copy value={value}>
            <div className={styles.textBox}>
              <p className="srp">{value}</p>
            </div>
          </Copy>
          <Button type="primary" onClick={onConfirm}>
            I wrote it down !
          </Button>
        </>
      ) : (
        <Form layout="vertical" onFinish={onSubmit}>
          <Form.Item name="password" rules={passwordRules}>
            <Input.Password size="large" placeholder="Enter your password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Reveal SRP
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  );
};

export default SrpTextBox;
