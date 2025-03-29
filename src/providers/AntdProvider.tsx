import React from "react";
import { ConfigProvider } from "antd";
import { notification } from "antd";

notification.config({
  maxCount: 2,
  duration: 15,
  placement: "bottomRight",
});

export const AntdProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#009EA7",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};
