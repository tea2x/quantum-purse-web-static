import { useDispatch, useSelector } from "react-redux";
import { AccountDetail } from "../../components";
import { Dispatch, RootState } from "../../store";
import { cx } from "../../utils/methods";
import styles from "./Receive.module.scss";
const Receive: React.FC = () => {
  const dispatch = useDispatch<Dispatch>();
  const activeAccount = useSelector((state: RootState) => state.wallet.current);

  return (
    <section className={cx(styles.wallet, "panel")}>
      <h1>Receive</h1>

      <AccountDetail account={activeAccount} />
    </section>
  );
};

export default Receive;
