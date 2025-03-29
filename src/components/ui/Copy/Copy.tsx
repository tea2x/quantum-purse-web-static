import { message } from "antd";
import { cx } from "../../../utils/methods";
import styles from "./Copy.module.scss";

interface CopyProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const Copy: React.FC<CopyProps> = ({ value, children, className, ...rest }) => (
  <div
    {...rest}
    className={cx(styles.copy, className)}
    onClick={async (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      await navigator.clipboard.writeText(value);
      message.success("Copied to clipboard");
    }}
  >
    {children}
  </div>
);

export default Copy;
