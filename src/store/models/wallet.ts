import { createModel } from "@rematch/core";
import { notification } from "antd";
import { NODE_URL } from "../../core/config";
import Quantum from "../../core/quantum_purse";
import { transfer } from "../../core/transaction_builder";
import { bytesToUtf8, sendTransaction, utf8ToBytes } from "../../core/utils";
import { FIND_ACCOUNT_THRESHOLD, STORAGE_KEYS } from "../../utils/constants";
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
  srp: string | undefined;
}

type StateType = IWallet;

let isInitializing = false;
export let quantum: Quantum;

const initState: StateType = {
  active: !localStorage.getItem(STORAGE_KEYS.WALLET_STEP),
  current: {
    name: "",
    address: "",
    balance: "0",
    sphincsPlusPubKey: "",
  },
  accounts: [],
  srp: undefined,
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
    setSRP(state: StateType, srp: string) {
      return { ...state, srp };
    },
    resetSRP(state: StateType) {
      return { ...state, srp: undefined };
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
      isInitializing = true;
      quantum = await Quantum.getInstance();

      // Get the pending step from local storage
      const step = localStorage.getItem(STORAGE_KEYS.WALLET_STEP);
      if (step) {
        isInitializing = false;
        throw new Error(
          JSON.stringify({
            code: "WALLET_NOT_READY",
            step,
            message: "Wallet is not ready to use",
          })
        );
      }

      try {
        const accountsData: any = await this.loadAccounts();

        const preservedAccountSphincsPlusPubKey = localStorage.getItem(
          STORAGE_KEYS.CURRENT_ACCOUNT_SPHINC
        );

        if (preservedAccountSphincsPlusPubKey) {
          await quantum.setAccPointer(preservedAccountSphincsPlusPubKey);
        } else {
          localStorage.setItem(
            STORAGE_KEYS.CURRENT_ACCOUNT_SPHINC,
            accountsData[0].sphincsPlusPubKey
          );
          await quantum.setAccPointer(accountsData[0].sphincsPlusPubKey);
        }

        this.setActive(true);
      } catch (error) {
        this.setActive(false);
        // throw error;
      } finally {
        isInitializing = false;
      }
    },
    async loadCurrentAccount(_, rootState) {
      if (!quantum.accountPointer || !rootState.wallet.accounts.length) return;
      try {
        const accountPointer = quantum.accountPointer;
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

        // Load accounts after creating a new account
        const accountsData: any = await this.loadAccounts();

        // The new account is the last account in the accountsData array
        // Return it to the caller to explorer the new account
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
        this.setSRP(bytesToUtf8(srp));
      } catch (error) {
        throw error;
      }
    },
    async getAccountBalance({ sphincsPlusPubKey }) {
      if (!quantum) return null;
      try {
        const balance = await quantum.getBalance(sphincsPlusPubKey);
        // this.setAccountBalance({
        //   sphincsPlusPubKey,
        //   balance: balance.toString(),
        // });
        return balance.toString();
      } catch (error) {
        return "0";
        // throw error;
      }
    },
    async switchAccount({ sphincsPlusPubKey }, rootState) {
      try {
        await quantum.setAccPointer(sphincsPlusPubKey);
        this.loadCurrentAccount({});
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_ACCOUNT_SPHINC,
          sphincsPlusPubKey
        );
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
          // Load current balance after sending transaction
          // TODO: It's not working as expected because the blockchain transaction needs time to be confirmed
          // TODO: We need to listen to the blockchain event and update the balance
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
        localStorage.removeItem(STORAGE_KEYS.CURRENT_ACCOUNT_SPHINC);
        notification.info({
          message: "Wallet ejected",
          description: "You have successfully ejected your wallet",
        });
        this.reset();
      } catch (error) {
        throw error;
      }
    },
    async importWallet({ srp, password }) {
      try {
        await quantum.importSeedPhrase(utf8ToBytes(srp), utf8ToBytes(password));

        let accountsLength = 1;

        const checkAccount = async (offset: number, limit: number) => {
          const accounts = await quantum.searchAccount(
            utf8ToBytes(password),
            offset,
            limit
          );

          const accountsWithBalance = await Promise.all(
            accounts.map(async (sphincsPlusPubKey) => {
              const balance = await quantum.getBalance(sphincsPlusPubKey);
              return { sphincsPlusPubKey, balance };
            })
          );

          const lastAccountWithBalance = accountsWithBalance.reduceRight(
            (lastIndex, account, currentIndex) =>
              lastIndex === -1 && account.balance > BigInt(0)
                ? currentIndex
                : lastIndex,
            -1
          );

          if (lastAccountWithBalance !== -1) {
            accountsLength = offset + lastAccountWithBalance + 1;
            await checkAccount(accountsLength + 1, limit);
          }
        };

        await checkAccount(0, FIND_ACCOUNT_THRESHOLD);

        await quantum.recoverAccount(utf8ToBytes(password), accountsLength);

        this.setActive(true);
      } catch (error) {
        throw error;
      }
    },
  }),
});
