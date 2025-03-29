import { notification } from "antd";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Footer, Header } from "../components";
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
        await dispatch.wallet.loadCurrentAccount({});
      } catch (error: any) {
        try {
          const errorInfo = JSON.parse(error.message);
          if (errorInfo.code === "WALLET_NOT_READY") {
            navigate(ROUTES.CREATE_WALLET, {
              state: {
                step: Number(errorInfo.step),
              },
            });
            notification.info({
              message: "Wallet not ready",
              description: "Please finish your wallet creation",
            });
          }
        } catch (error) {
          console.error(error);
        }
      }
    };
    loadWallet();
  }, [dispatch.wallet.init]);

  return (
    <div className={cx(styles.layout, className)} {...rest}>
      <Header />
      <div className="container">{children}</div>
      <Footer />
    </div>
  );
};

export default Layout;
