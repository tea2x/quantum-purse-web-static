import { CopyOutlined } from "@ant-design/icons";
import { cx, formatBalance, shortenAddress } from "../../../utils/methods";
import Copy from "../Copy/Copy";
import styles from "./CurrentAccount.module.scss";
interface CurrentAccountProps extends React.HTMLAttributes<HTMLDivElement> {
  address: string;
  name: string;
  balance: string;
}

const CurrentAccount: React.FC<CurrentAccountProps> = ({
  address,
  name,
  balance,
  className,
  ...props
}) => {
  return (
    <div className={cx(styles.currentAccount, className)} {...props}>
      <p className="name">{name}</p>
      <p className="balance">{formatBalance(balance)}</p>
      {address && (
        <Copy value={address} className="address-utilities">
          <p className="address">{shortenAddress(address)}</p>
          <CopyOutlined className="copy-icon" />
        </Copy>
      )}
    </div>
  );
};

export default CurrentAccount;
