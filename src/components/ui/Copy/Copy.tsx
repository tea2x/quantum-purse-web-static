import { message } from "antd";
import { cx } from "../../../utils/methods";
import styles from "./Copy.module.scss";

interface CopyProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const Copy: React.FC<CopyProps> = ({ value, children, className, ...rest }) => {
  const [messageApi, contextHolder] = message.useMessage();

  return (
    <>
      {contextHolder}
      <div
        {...rest}
        className={cx(styles.copy, className)}
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          messageApi.success("Copied to clipboard");
        }}
      >
        {children}
      </div>
    </>
  );
};

export default Copy;
