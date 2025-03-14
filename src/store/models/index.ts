import { Models } from '@rematch/core';
import { wallet } from './wallet';

export interface RootModel extends Models<RootModel> {
  wallet: typeof wallet;
}

export const models: RootModel = {
  wallet,
}; 