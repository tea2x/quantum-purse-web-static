import { Menu, MenuProps } from "antd";
import React from "react";
import { useSelector } from "react-redux";
import { NavLink, useLocation } from "react-router-dom";
import { RootState } from "../../store";
import { ROUTES } from "../../utils/constants";
import { cx } from "../../utils/methods";
import CurrentAccount from "../current-account/current_account";
import styles from "./sidebar.module.scss";
import Icon from "../icon/icon";

type MenuItem = Required<MenuProps>["items"][number];
const items: MenuItem[] = [
  {
    key: ROUTES.WALLET,
    icon: <Icon.Wallet />,
    label: <NavLink to={ROUTES.WALLET}>Accounts</NavLink>,
  },
  {
    key: ROUTES.SEND,
    icon: <Icon.Send />,
    label: <NavLink to={ROUTES.SEND}>Send</NavLink>,
  },
  {
    key: ROUTES.RECEIVE,
    icon: <Icon.Receive />,
    label: <NavLink to={ROUTES.RECEIVE}>Receive</NavLink>,
  },
  {
    key: ROUTES.NERVOS_DAO.HOME,
    icon: <Icon.Dao />,
    label: "Nervos DAO",
    children: [
      {
        key: ROUTES.NERVOS_DAO.DEPOSIT,
        icon: <Icon.Deposit />,
        label: <NavLink to={ROUTES.NERVOS_DAO.DEPOSIT}>Deposit</NavLink>,
      },
      {
        key: ROUTES.NERVOS_DAO.REQUEST_WITHDRAW,
        icon: <Icon.RequestWithdraw />,
        label: <NavLink to={ROUTES.NERVOS_DAO.REQUEST_WITHDRAW}>Request Withdraw</NavLink>,
      },
      {
        key: ROUTES.NERVOS_DAO.WITHDRAW,
        icon: <Icon.Withdraw />,
        label: <NavLink to={ROUTES.NERVOS_DAO.WITHDRAW}>Withdraw</NavLink>,
      },
    ],
  },
  {
    type: "divider",
  },
  {
    key: ROUTES.SETTINGS.HOME,
    icon: <Icon.Settings />,
    label: "Settings",
    children: [
      {
        key: ROUTES.SETTINGS.REVEAL_SRP,
        icon: <Icon.Reveal />,
        label: <NavLink to={ROUTES.SETTINGS.REVEAL_SRP}>Reveal SRP</NavLink>,
      },
      {
        key: ROUTES.SETTINGS.EJECT_WALLET,
        icon: <Icon.Eject />,
        label: (
          <NavLink to={ROUTES.SETTINGS.EJECT_WALLET}>Eject Wallet</NavLink>
        ),
      },
    ],
  },
];

const getDefaultOpenKeys = (pathname: string, items: MenuItem[]): string[] => {
  for (const item of items) {
    if (
      item &&
      "key" in item &&
      typeof item.key === "string" &&
      "children" in item &&
      item.children
    ) {
      if (pathname.startsWith(item.key)) {
        return [item.key];
      }
    }
  }
  return [];
};

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}
const Sidebar: React.FC<SidebarProps> = () => {
  const location = useLocation();
  const wallet = useSelector((state: RootState) => state.wallet);
  const defaultOpenKeys = getDefaultOpenKeys(location.pathname, items);

  return (
    <nav className={cx("panel", styles.sidebar)}>
      <div className="current-account">
        <CurrentAccount
          address={wallet.current.address!}
          name={wallet.current.name}
          balance={wallet.current.balance!}
          lockedInDao={wallet.current.lockedInDao}
        />
      </div>
      <Menu
        mode="inline"
        items={items}
        defaultSelectedKeys={[location.pathname]}
        defaultOpenKeys={defaultOpenKeys}
      />
    </nav>
  );
};

export default Sidebar;