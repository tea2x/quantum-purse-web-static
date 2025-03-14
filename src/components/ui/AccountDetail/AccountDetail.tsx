import { CopyOutlined } from "@ant-design/icons";
import { Flex } from "antd";
import { QRCodeSVG } from "qrcode.react";
import { Copy } from "../..";
import { IAccount } from "../../../store/models/interface";
import { shortenAddress } from "../../../utils/methods";
import styles from "./AccountDetail.module.scss";

interface AccountDetailProps {
  account: IAccount;
}

const AccountDetail: React.FC<AccountDetailProps> = ({ account }) => {
  return (
    <div className={styles.detailContainer}>
      <h2>{account.name}</h2>

      <Copy value={account.address!}>
        <Flex align="center" gap={8} className={styles.address}>
          {shortenAddress(account.address!, 10, 10)}
          <CopyOutlined />
        </Flex>
      </Copy>

      <div className={styles.qrCodeContainer}>
        {account.address && (
          <QRCodeSVG
            value={account.address}
            size={200}
            level="H" // Highest error correction level
          />
        )}
      </div>
    </div>
  );
};

export default AccountDetail;
