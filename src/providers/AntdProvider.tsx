import React from "react";
import { ConfigProvider } from "antd";

const theme = {
  token: {
    colorPrimary: "#009EA7",
  },
};

export const AntdProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <ConfigProvider theme={theme}>{children}</ConfigProvider>;
};
