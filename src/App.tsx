import React from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import ActiveLayout from "./ui/layouts/ActiveLayout";
import InactiveLayout from "./ui/layouts/InactiveLayout";
import {
  CommingSoon,
  CreateWallet,
  EjectWallet,
  ImportWallet,
  Receive,
  RevealSRP,
  Send,
  Deposit,
  RequestWithdraw,
  Withdraw,
  Wallet,
  Welcome,
} from "./ui/pages";
import { ROUTES } from "./ui/utils/constants";

// Detect if running on Github Pages
const isGithubPages = window.location.hostname.includes("github.io");
const repoName = isGithubPages ? window.location.pathname.split("/")[1] : "";
const basename = isGithubPages ? `/${repoName}` : "/";

const App: React.FC = () => {
  return (
    <Router basename={basename}>
      <Routes>
        <Route path={ROUTES.HOME} element={<InactiveLayout />}>
          <Route index element={<Navigate to={ROUTES.WELCOME} />} />
          <Route path={ROUTES.WELCOME} element={<Welcome />} />
          <Route path={ROUTES.CREATE_WALLET} element={<CreateWallet />} />
          <Route path={ROUTES.IMPORT_WALLET} element={<ImportWallet />} />
        </Route>
        <Route path={ROUTES.HOME} element={<ActiveLayout />}>
          <Route path={ROUTES.WALLET} element={<Wallet />} />
          <Route path={ROUTES.SEND} element={<Send />} />
          <Route path={ROUTES.RECEIVE} element={<Receive />} />
          <Route path={ROUTES.DAO.DEPOSIT} element={<Deposit />} />
          <Route path={ROUTES.DAO.REQUEST_WITHDRAW} element={<RequestWithdraw />} />
          <Route path={ROUTES.DAO.WITHDRAW} element={<Withdraw />} />
          <Route path={ROUTES.SETTINGS.REVEAL_SRP} element={<RevealSRP />} />
          <Route
            path={ROUTES.SETTINGS.EJECT_WALLET}
            element={<EjectWallet />}
          />
        </Route>
        <Route path={ROUTES.COMING_SOON} element={<CommingSoon />} />
        <Route path="*" element={<Navigate to={ROUTES.HOME} />} />
      </Routes>
    </Router>
  );
};

export default App;
