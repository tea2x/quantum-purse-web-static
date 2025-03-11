import React, { Dispatch, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { Header, Sidebar } from "../components";
import { RuntimeRootState } from "../store/types";
import { ROUTES } from "../utils/constants";

type AuthLayoutProps = React.HTMLAttributes<HTMLDivElement>;

const Layout: React.FC<AuthLayoutProps> = ({ ...rest }) => {
  const wallet = useSelector<RuntimeRootState>((state) => state.wallet);
  const dispatch = useDispatch<Dispatch>();

  useEffect(() => {
    dispatch.wallet.init();
  }, [dispatch.wallet.init]);

  console.log("Layout log wallet data: ", wallet);
  return (
    <div {...rest}>
      <Header />
      <Sidebar />
      <Outlet />
    </div>
  );
};

export default Layout;
