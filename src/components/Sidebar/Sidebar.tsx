import { Menu, MenuProps } from "antd";
import React from "react";
import { useSelector } from "react-redux";
import { NavLink, useLocation } from "react-router-dom";
import { RootState } from "../../store";
import { ROUTES } from "../../utils/constants";
import { cx } from "../../utils/methods";
import CurrentAccount from "../ui/CurrentAccount/CurrentAccount";
import styles from "./Sidebar.module.scss";

type MenuItem = Required<MenuProps>["items"][number];
const items: MenuItem[] = [
  {
    key: ROUTES.WALLET,
    label: <NavLink to={ROUTES.WALLET}>My Wallet</NavLink>,
  },
  {
    key: ROUTES.SEND,
    label: <NavLink to={ROUTES.SEND}>Send</NavLink>,
  },
  {
    key: ROUTES.RECEIVE,
    label: <NavLink to={ROUTES.RECEIVE}>Receive</NavLink>,
  },
  {
    key: ROUTES.DAO.HOME,
    label: "DAO",
    children: [
      {
        key: ROUTES.DAO.DEPOSIT,
        label: <NavLink to={ROUTES.COMING_SOON}>Deposit</NavLink>,
      },
      {
        key: ROUTES.DAO.WITHDRAW,
        label: <NavLink to={ROUTES.COMING_SOON}>Withdraw</NavLink>,
      },
      {
        key: ROUTES.DAO.UNLOCK,
        label: <NavLink to={ROUTES.COMING_SOON}>Unlock</NavLink>,
      },
    ],
  },
  {
    type: "divider",
  },
  {
    key: ROUTES.SETTINGS.HOME,
    label: "Settings",
    children: [
      {
        key: ROUTES.SETTINGS.REVEAL_SRP,
        label: <NavLink to={ROUTES.SETTINGS.REVEAL_SRP}>Reveal SRP</NavLink>,
      },
      {
        key: ROUTES.SETTINGS.EJECT_WALLET,
        label: (
          <NavLink to={ROUTES.SETTINGS.EJECT_WALLET}>Eject Wallet</NavLink>
        ),
      },
    ],
  },
];

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}
const Sidebar: React.FC<SidebarProps> = () => {
  const location = useLocation();
  const wallet = useSelector((state: RootState) => state.wallet);

  return (
    <nav className={cx("panel", styles.sidebar)}>
      <div className="current-account">
        <CurrentAccount
          address={wallet.current.address!}
          name={wallet.current.name}
          balance={wallet.current.balance!}
        />
      </div>
      <Menu
        mode="inline"
        items={items}
        defaultSelectedKeys={[location.pathname]}
      />
    </nav>
  );
};

export default Sidebar;
