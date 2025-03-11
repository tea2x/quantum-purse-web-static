import "antd/dist/reset.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { Provider as ReduxProvider } from "react-redux";
import App from "./App";
import { AntdProvider } from "./providers/AntdProvider";
import LayoutProvider from "./providers/LayoutProvider";
import { store } from "./store";
import "./styles.css";

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <ReduxProvider store={store}>
      <AntdProvider>
        <LayoutProvider>
          <App />
        </LayoutProvider>
      </AntdProvider>
    </ReduxProvider>
  </React.StrictMode>
);
