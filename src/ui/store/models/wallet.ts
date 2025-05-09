import { createModel } from "@rematch/core";
import { notification } from "antd";
import Quantum from "../../../core/quantum_purse";
import { bytesToUtf8, utf8ToBytes } from "../../../core/utils";
import { FIND_ACCOUNT_THRESHOLD, STORAGE_KEYS } from "../../utils/constants";
import { RootModel } from "./index";

interface IAccount {
  name: string;
  address: string | null;
  spxLockArgs: string;
  balance?: string;
}

interface IWallet {
  active: boolean;
  current: IAccount;
  accounts: IAccount[];
  syncStatus: {
    nodeId: string;
    connections: number;
    syncedBlock: number;
    tipBlock: number;
    syncedStatus: number;
    startBlock: number;
  };
  srp: string | undefined;
}

type StateType = IWallet;

let isInitializing = false;
export let quantum: Quantum;
let syncStatusListener: ((status: any) => void) | null = null;

const initState: StateType = {
  active: !localStorage.getItem(STORAGE_KEYS.WALLET_STEP),
  current: {
    name: "",
    address: "",
    balance: "0",
    spxLockArgs: "",
  },
  accounts: [],
  syncStatus: {
    nodeId: "NULL",
    connections: 0,
    syncedBlock: 0,
    tipBlock: 0,
    syncedStatus: 0,
    startBlock: 0,
  },
  srp: undefined,
};

export const wallet = createModel<RootModel>()({
  state: initState,
  reducers: {
    setSyncStatus(state: StateType, syncStatus: any) {
      return { ...state, syncStatus };
    },
    setActive(state: StateType, active: boolean) {
      return { ...state, active };
    },
    setCurrent(state: StateType, current: IAccount) {
      return { ...state, current };
    },
    setAccounts(state: StateType, accounts: IAccount[]) {
      return { ...state, accounts };
    },
    setAccountBalance(state: StateType, { spxLockArgs, balance }) {
      const accounts = state.accounts.map((account) => {
        if (account.spxLockArgs === spxLockArgs) {
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
        const accounts = await quantum.getAllLockScriptArgs();
        const accountsData = accounts.map((account, index) => ({
          name: `Account ${index + 1}`,
          spxLockArgs: account,
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

      try {
        await quantum.initBackgroundServices();
        
        // when refreshed, keyvault needs sphincs+ param set chosen by user
        const paramSet = localStorage.getItem(STORAGE_KEYS.SPHINCS_PLUS_PARAM_SET);
        paramSet && quantum.initKeyVault(Number(paramSet));

        // Setup listener for the light client status worker
        syncStatusListener = (status) => {
          this.setSyncStatus(status);
        };
        quantum.addSyncStatusListener(syncStatusListener);

        // Get the pending step from local storage
        const step = localStorage.getItem(STORAGE_KEYS.WALLET_STEP);
        if (step) {
          isInitializing = false;
          throw new Error(
            JSON.stringify({
              code: "WALLET_NOT_READY",
              step,
              message: "Wallet is not ready",
            })
          );
        }

        const accountsData: any = await this.loadAccounts();
        if (accountsData && accountsData.length !== 0) {
          const preservedAccountLockArgs = localStorage.getItem(
            STORAGE_KEYS.CURRENT_ACCOUNT_POINTER
          );
  
          if (preservedAccountLockArgs) {
            await quantum.setAccountPointer(preservedAccountLockArgs);
          } else {
            localStorage.setItem(
              STORAGE_KEYS.CURRENT_ACCOUNT_POINTER,
              accountsData[0].spxLockArgs
            );
            await quantum.setAccountPointer(accountsData[0].spxLockArgs);
          }
          this.setActive(true);
        } else {
          this.setActive(false);
        }
      } catch (error) {
        this.setActive(false);
        throw error;
      } finally {
        isInitializing = false;
      }
    },
    async loadCurrentAccount(_, rootState) {
      if (!quantum.accountPointer || !rootState.wallet.accounts.length) return;
      try {
        const accountPointer = quantum.accountPointer;
        const accountData = rootState.wallet.accounts.find(
          (account) => account.spxLockArgs === accountPointer
        );
        if (!accountData) return;
        const currentBalance = await quantum.getBalance();
        this.setCurrent({
          address: quantum.getAddress(accountPointer),
          balance: currentBalance.toString(),
          spxLockArgs: accountData.spxLockArgs,
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
        await quantum.generateMasterSeed(utf8ToBytes(password));
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
    async getAccountBalance({ spxLockArgs }) {
      if (!quantum) return null;
      try {
        const balance = await quantum.getBalance(spxLockArgs);
        // this.setAccountBalance({
        //   spxLockArgs,
        //   balance: balance.toString(),
        // });
        return balance.toString();
      } catch (error) {
        return "0";
        // throw error;
      }
    },
    async switchAccount({ spxLockArgs }, rootState) {
      try {
        await quantum.setAccountPointer(spxLockArgs);
        this.loadCurrentAccount({});
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_ACCOUNT_POINTER,
          spxLockArgs
        );
      } catch (error) {
        throw error;
      }
    },
    async send({ from, to, amount, password }, rootState) {
      try {
        const tx = await quantum.buildTransfer(from, to, amount);
        const fromSphincsPlusPubKey = rootState.wallet.accounts.find(
          (account) => account.address === from
        )?.spxLockArgs;
        const signedTx = await quantum.sign(
          tx,
          utf8ToBytes(password),
          fromSphincsPlusPubKey
        );
        const txId: string = await quantum.sendTransaction(signedTx);

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
        // remove light client sync status listener
        if (syncStatusListener) {
          quantum.removeSyncStatusListener(syncStatusListener);
          syncStatusListener = null;
        }
        await quantum.deleteWallet();
        localStorage.removeItem(STORAGE_KEYS.CURRENT_ACCOUNT_POINTER);
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

        const checkAccount = async (startIndex: number, limit: number) => {
          const accounts = await quantum.genAccountInBatch(
            utf8ToBytes(password),
            startIndex,
            limit
          );

          const accountsWithBalance = await Promise.all(
            accounts.map(async (spxLockArgs) => {
              const balance = await quantum.getBalance(spxLockArgs);
              return { spxLockArgs, balance };
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
            accountsLength = startIndex + lastAccountWithBalance + 1;
            await checkAccount(accountsLength + 1, limit);
          }
        };

        await checkAccount(0, FIND_ACCOUNT_THRESHOLD);
        await quantum.recoverAccounts(utf8ToBytes(password), accountsLength);

        this.setActive(true);
      } catch (error) {
        throw error;
      }
    },
  }),
});
