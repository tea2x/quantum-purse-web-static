import { useDispatch, useSelector } from "react-redux";
import { SrpTextBox } from "../../components";
import { Dispatch, RootState } from "../../store";
import { cx } from "../../utils/methods";
import styles from "./RevealSRP.module.scss";
import QuantumPurse, { SphincsVariant } from "../../../core/quantum_purse";
import { STORAGE_KEYS } from "../../utils/constants";

const RevealSRP: React.FC = () => {
  const dispatch = useDispatch<Dispatch>();
  const srp = useSelector((state: RootState) => state.wallet.srp);
  const exportSrpHandler = async (password: string) => await dispatch.wallet.exportSRP({ password });
  
  let paramSet;
  try {
    paramSet = QuantumPurse.getInstance().getSphincsPlusParamSet();
  } catch (e) {
    const paramId = localStorage.getItem(STORAGE_KEYS.SPHINCS_PLUS_PARAM_SET);
    paramSet = SphincsVariant[Number(paramId)];
  }

  const description = 
    "WARNING: Never copy or screenshot! Only handwrite to backup your chosen SPHINCS+ variant \"" 
    + paramSet + "\" with the mnemonic seed.";

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
          title="Reveal Secret Recovery Phrase"
          description={description}
        />
      </div>
    </section>
  );
};

export default RevealSRP;
