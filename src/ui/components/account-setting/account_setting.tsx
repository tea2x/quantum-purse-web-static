import { useState } from "react";
import { CopyOutlined } from "@ant-design/icons";
import Copy from "../copy/copy";
import { IAccount } from "../../store/models/interface";
import { shortenAddress } from "../../utils/methods";
import styles from "./account_setting.module.scss";
import { Button, Flex, Input, Divider } from "antd";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import QuantumPurse from "../../../core/quantum_purse";
import { LightClientSetScriptsCommand } from "ckb-light-client-js";
import { Hex } from "@ckb-ccc/core";

interface AccountSettingProps {
  account: IAccount;
}

const AccountSetting: React.FC<AccountSettingProps> = ({ account }) => {
  const syncStatus = useSelector((state: RootState) => state.wallet.syncStatus);
  const [startingBlock, setStartingBlock] = useState("");
  const isValidStartingBlock = /^\d+$/.test(startingBlock);

  return (
    <div className={styles.settingContainer}>
      <h2>{account.name}</h2>

      <Copy value={account.address!}>
        <Flex align="center" gap={8} className={styles.address}>
          {shortenAddress(account.address!, 10, 20)}
          <CopyOutlined />
        </Flex>
      </Copy>
      <Divider style={{ margin: '4px 0'}}>Sync from start block</Divider>
      <div className={styles.startingBlock}>
        <Flex align="center" gap={8}>
          <Input
            value={startingBlock}
            onChange={(e) => setStartingBlock(e.target.value)}
            placeholder={"In range [0, " + syncStatus.tipBlock.toString() + "]"}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            onClick={async () => {
              await QuantumPurse.getInstance().setSellectiveSyncFilter(
                [account.spxLockArgs as Hex],
                [BigInt(startingBlock)],
                LightClientSetScriptsCommand.Partial
              );
              setStartingBlock("");
            }}
            disabled={!isValidStartingBlock}
          >
            Set
          </Button>
        </Flex>
      </div>
    </div>
  );
};

export default AccountSetting;