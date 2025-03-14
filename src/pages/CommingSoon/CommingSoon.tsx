import { HomeOutlined, RollbackOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import { cx } from "../../utils/methods";
import styles from "./CommingSoon.module.scss";

const CommingSoon: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className={cx(styles.commingSoon)}>
      <h1>Comming Soon</h1>
      <p>This feature is in development. Please check back later.</p>
      <div className={styles.buttonsGroup}>
        <NavLink to={ROUTES.HOME}>
          <Button type="primary">
            <HomeOutlined />
            Back to Home
          </Button>
        </NavLink>
      </div>
    </section>
  );
};

export default CommingSoon;
