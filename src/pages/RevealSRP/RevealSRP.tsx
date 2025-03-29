import { useDispatch, useSelector } from "react-redux";
import { SrpTextBox } from "../../components";
import { Dispatch, RootState } from "../../store";
import { cx } from "../../utils/methods";
import styles from "./RevealSRP.module.scss";

const RevealSRP: React.FC = () => {
  const dispatch = useDispatch<Dispatch>();
  const srp = useSelector((state: RootState) => state.wallet.srp);

  const exportSrpHandler = async (password: string) =>
    await dispatch.wallet.exportSRP({ password });

  return (
    <section className={cx(styles.revealSRP, "panel")}>
      <h1>Reveal SRP</h1>
      <div className={styles.content}>
        <SrpTextBox
          value={srp}
          exportSrpHandler={exportSrpHandler}
          onConfirm={() => {
            dispatch.wallet.resetSRP();
          }}
          title="Your Secret Recovery Phrase"
          description="Keep this phrase safe. It's the only way to recover your wallet if you lose access."
        />
      </div>
    </section>
  );
};

export default RevealSRP;
