import { createModel, init } from "@rematch/core";
import { message, Modal } from "antd";
import { NODE_URL } from "../../core/config";
import Quantum from "../../core/quantum_purse";
import { transfer } from "../../core/transaction_builder";
import { bytesToUtf8, sendTransaction, utf8ToBytes } from "../../core/utils";
import { RootModel } from "./index";

interface IAccount {
  name: string;
  address: string | null;
  sphincsPlusPubKey: string;
  balance?: string;
}

interface IWallet {
  active: boolean;
  current: IAccount;
  accounts: IAccount[];
}

type StateType = IWallet;

let isInitializing = false;
export let quantum: Quantum;

const initState: StateType = {
  active: !localStorage.getItem("wallet-step"),
  current: {
    name: "",
    address: "",
    balance: "0",
    sphincsPlusPubKey: "",
  },
  accounts: [],
};

export const wallet = createModel<RootModel>()({
  state: initState,
  reducers: {
    setActive(state: StateType, active: boolean) {
      return { ...state, active };
    },
    setCurrent(state: StateType, current: IAccount) {
      return { ...state, current };
    },
    setAccounts(state: StateType, accounts: IAccount[]) {
      return { ...state, accounts };
    },
    setAccountBalance(state: StateType, { sphincsPlusPubKey, balance }) {
      const accounts = state.accounts.map((account) => {
        if (account.sphincsPlusPubKey === sphincsPlusPubKey) {
          return { ...account, balance };
        }
        return account;
      });
      return { ...state, accounts };
    },
    reset() {
      return initState;
    },
  },
  effects: (dispatch) => ({
    async loadAccounts() {
      if (!quantum) return;
      try {
        const accounts = await quantum.getAllAccounts();
        const accountsData = accounts.map((account, index) => ({
          name: `Account ${index + 1}`,
          sphincsPlusPubKey: account,
          address: quantum.getAddress(account),
        }));
        this.setAccounts(accountsData);
        return accountsData;
      } catch (error) {
        throw error;
      }
    },
    async init(_, rootState) {
      if (isInitializing) return;
      const step = localStorage.getItem("wallet-step");
      if (step) {
        throw new Error(
          JSON.stringify({
            code: "WALLET_NOT_READY",
            step,
            message: "Wallet is not ready to use",
          })
        );
      }
      isInitializing = true;
      quantum = await Quantum.getInstance();
      try {
        const accountsData: any = await this.loadAccounts();
        await quantum.setAccPointer(accountsData[0].sphincsPlusPubKey);
        this.setActive(true);
      } catch (error) {
        this.setActive(false);
        // throw error;
        // console.error("Error initializing wallet", error);
      } finally {
        isInitializing = false;
      }
    },
    async loadCurrentAccount(_, rootState) {
      if (!quantum.accountPointer || !rootState.wallet.accounts.length) return;
      try {
        const accountPointer = quantum.accountPointer;
        console.log("Load current account: ", accountPointer);
        const accountData = rootState.wallet.accounts.find(
          (account) => account.sphincsPlusPubKey === accountPointer
        );
        if (!accountData) return;
        const currentBalance = await quantum.getBalance();
        this.setCurrent({
          address: quantum.getAddress(accountPointer),
          balance: currentBalance.toString(),
          sphincsPlusPubKey: accountData.sphincsPlusPubKey,
          name: accountData.name,
        });
      } catch (error) {
        throw error;
      }
    },
    async createAccount(payload: { password: string }, rootState) {
      try {
        await quantum.genAccount(utf8ToBytes(payload.password));
        const accountsData: any = await this.loadAccounts();
        return accountsData?.at(-1);
      } catch (error) {
        throw error;
      }
    },
    async createWallet({ password }) {
      try {
        await quantum.init(utf8ToBytes(password));
        await quantum.genAccount(utf8ToBytes(password));
        this.loadCurrentAccount({});
      } catch (error) {
        throw error;
      }
    },
    async exportSRP({ password }) {
      try {
        const srp = await quantum.exportSeedPhrase(utf8ToBytes(password));
        return bytesToUtf8(srp);
      } catch (error) {
        throw error;
      }
    },
    async getAccountBalance({ sphincsPlusPubKey }) {
      try {
        const balance = await quantum.getBalance(sphincsPlusPubKey);
        // this.setAccountBalance({
        //   sphincsPlusPubKey,
        //   balance: balance.toString(),
        // });
        return balance.toString();
      } catch (error) {
        throw error;
      }
    },
    async switchAccount({ sphincsPlusPubKey }, rootState) {
      try {
        await quantum.setAccPointer(sphincsPlusPubKey);
        this.loadCurrentAccount({});
      } catch (error) {
        throw error;
      }
    },
    async send({ from, to, amount, password }, rootState) {
      try {
        const tx = await transfer(from, to, amount);
        const fromSphincsPlusPubKey = rootState.wallet.accounts.find(
          (account) => account.address === from
        )?.sphincsPlusPubKey;
        const signedTx = await quantum.sign(
          tx,
          utf8ToBytes(password),
          fromSphincsPlusPubKey
        );
        const txId: string = await sendTransaction(NODE_URL, signedTx);

        if (
          from === rootState.wallet.current.address ||
          to === rootState.wallet.current.address
        ) {
          this.loadCurrentAccount({});
        }
        return txId;
      } catch (error) {
        throw error;
      }
    },
    async ejectWallet() {
      try {
        await quantum.dbClear();
        this.reset();
      } catch (error) {
        throw error;
      }
    },
  }),
});
