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
  const dispatch = useDispatch<Dispatch>();
  const wallet = useSelector((state: RootState) => state.wallet);
  
  useEffect(() => {
    const loadWallet = async () => {
      try {
        await dispatch.wallet.init({});
        await dispatch.wallet.loadCurrentAccount({});
      } catch (error: any) {
        if (error.message.includes("SharedArrayBuffer is not defined")) {
          notification.error({
            message: "Insecure browser context",
            description: "You are accessing this site from an insecure context. Try localhost or https!",
          });
        } else if (error.message.includes("WALLET_NOT_READY")) {
          const errorInfo = JSON.parse(error.message);
          if (errorInfo.code === "WALLET_NOT_READY") {
            navigate(ROUTES.CREATE_WALLET, {
              state: {
                step: Number(errorInfo.step),
              },
            });
            notification.info({
              message: errorInfo.message,
              description: "Please finish the wallet creation process!",
            });
          }
        } else {
          // rethrow
          throw error;
        }
      }
    };
    loadWallet();
  }, [dispatch.wallet.init]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (wallet.active) {
      intervalId = setInterval(() => {
        dispatch.wallet.loadCurrentAccount({}).catch((error) => {
          console.error("Failed to load current account:", error);
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [dispatch, wallet.active]);

  return (
    <div className={cx(styles.layout, className)} {...rest}>
      <Header />
      <div className="container">{children}</div>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;
