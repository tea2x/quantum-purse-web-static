import { Button, Modal } from "antd";
import { useDispatch } from "react-redux";
import { Dispatch } from "../../store";
import { cx } from "../../utils/methods";
import styles from "./EjectWallet.module.scss";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import React, { useState } from "react";
import ConfirmDeleteWalletModal from "../../components/delete-wallet-confirm/delete_wallet_confirm";

const EjectWallet: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<Dispatch>();
    const [isDeleteWalletConfirmModalOpen, setIsDeleteWalletConfirmModalOpen] = useState(false);

  return (
    <section className={cx(styles.ejectWallet, "panel")}>
      <h1>Eject Wallet</h1>
      <div className={styles.content}>
        <h2 style={{fontWeight: 'bold', fontSize: '1.6rem' }}>Delete Your Wallet</h2>
        <p>WARNING! This action removes all keys from Quantum Purse's DB.</p>
        <Button 
          type="primary" 
          onClick={() => { setIsDeleteWalletConfirmModalOpen(true); }}
        >
          Eject Wallet
        </Button>
      </div>

      <ConfirmDeleteWalletModal
        isOpen={isDeleteWalletConfirmModalOpen}
        onOk={() => {
          dispatch.wallet.ejectWallet();
          navigate(ROUTES.WELCOME);
        }}
        onCancel={() => setIsDeleteWalletConfirmModalOpen(false)}
      />
    </section>
  );
};

export default EjectWallet;
