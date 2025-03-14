import { Button } from "antd";
import { useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { RootState } from "../../store";
import { ROUTES } from "../../utils/constants";
import { cx } from "../../utils/methods";
import styles from "./Welcome.module.scss";

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const wallet = useSelector((state: RootState) => state.wallet);

  if (wallet.active) {
    return <Navigate to={ROUTES.WALLET} />;
  }

  return (
    <section className={cx(styles.welcome, "panel")}>
      <h1>Let's get started</h1>
      <p>Quantum Purse is a secure and easy-to-use wallet for the future.</p>
      <Button onClick={() => navigate(ROUTES.CREATE_WALLET)}>
        Create a new wallet
      </Button>
      <Button onClick={() => navigate(ROUTES.IMPORT_WALLET)}>
        Import an existing wallet
      </Button>
    </section>
  );
};

export default Welcome;
