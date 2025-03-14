import { Button } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch, RootState } from "../../store";
import { cx } from "../../utils/methods";
import styles from "./EjectWallet.module.scss";

const EjectWallet: React.FC = () => {
  const dispatch = useDispatch<Dispatch>();
  return (
    <section className={cx(styles.ejectWallet, "panel")}>
      <h1>Eject Wallet</h1>
      <div className={styles.content}>
        <p>
          Ejecting your wallet will remove it from the Quantum Purse
          application.
        </p>
        <p>
          Once ejected, you will not be able to access your wallet without
          re-importing it.
        </p>
        <Button type="primary" onClick={() => dispatch.wallet.ejectWallet()}>
          Eject Wallet
        </Button>
      </div>
    </section>
  );
};

export default EjectWallet;
