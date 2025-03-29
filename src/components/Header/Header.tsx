import { Button, Grid } from "antd";
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import LayoutCtx from "../../context/LayoutCtx";
import { ROUTES } from "../../utils/constants";
import { cx } from "../../utils/methods";
import Icon from "../Icon/Icon";
import styles from "./Header.module.scss";
import { useSelector } from 'react-redux';
import { RootState } from "../../store";

const { useBreakpoint } = Grid;

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const Header: React.FC<HeaderProps> = ({ className, ...rest }) => {
  const syncStatus = useSelector((state: RootState) => state.wallet.syncStatus);
  const navigate = useNavigate();
  const { showSidebar, setShowSidebar } = useContext(LayoutCtx);
  const screens = useBreakpoint();

  return (
    <header className={cx(styles.header, className)} {...rest}>
      <div className="header-left">
        <Icon.Chip color="var(--white)" onClick={() => navigate(ROUTES.HOME)} />
        <p className={styles.text}>Quantum Purse</p>
      </div>
      <div className="header-right">
        {syncStatus && (
          <div>
            Peers: {parseInt(syncStatus.connections.toString())} | Sync: {syncStatus.syncedStatus.toFixed(1)}%
          </div>
        )}
        {!screens.md && (
          <Button
            type="text"
            onClick={() => setShowSidebar(!showSidebar)}
            icon={<Icon.Hamburger color="var(--white)" />}
          />
        )}
      </div>
    </header>
  );
};

export default Header;
