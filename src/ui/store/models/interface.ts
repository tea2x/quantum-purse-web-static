interface IAccount {
  name: string;
  address: string | null;
  spxLockArgs: string;
}

interface CurrentAccount extends IAccount {
  balance: string;
}

interface IWallet {
  active: boolean;
  current: CurrentAccount;
  accounts: IAccount[];
}

export type { IAccount, IWallet };
