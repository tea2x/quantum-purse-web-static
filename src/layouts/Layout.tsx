import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Header } from "../components";
import { Dispatch, RootState } from "../store";
import { ROUTES } from "../utils/constants";
import { cx } from "../utils/methods";
import styles from "./Layout.module.scss";
type AuthLayoutProps = React.HTMLAttributes<HTMLDivElement>;

const Layout: React.FC<AuthLayoutProps> = ({
  className,
  children,
  ...rest
}) => {
  const navigate = useNavigate();
  const wallet = useSelector((state: RootState) => state.wallet);
  const dispatch = useDispatch<Dispatch>();
  useEffect(() => {
    const loadWallet = async () => {
      try {
        await dispatch.wallet.init({});
        await dispatch.wallet.loadAccounts();
        await dispatch.wallet.loadCurrentAccount({});
      } catch (error: any) {
        const errorInfo = JSON.parse(error.message);
        if (errorInfo.code === "WALLET_NOT_READY") {
          navigate(ROUTES.CREATE_WALLET, {
            state: {
              step: errorInfo.step,
            },
          });
        }
      }
    };
    loadWallet();
  }, [dispatch.wallet.init]);

  return (
    <div className={cx(styles.layout, className)} {...rest}>
      <Header />
      <div className="container">{children}</div>
    </div>
  );
};

export default Layout;
