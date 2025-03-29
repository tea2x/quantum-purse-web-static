import { TransactionSkeleton } from "@ckb-lumos/helpers";
import { List, Map } from 'immutable';

// Minimal dummy TransactionSkeletonType
export const dummyTx = TransactionSkeleton({
  cellProvider: null,
  cellDeps: List(),
  headerDeps: List(),
  inputs: List([
    {
      cellOutput: {
        capacity: "0x0",
        lock: {
          codeHash: "0x" + "0".repeat(64),
          hashType: "data1",
          args: "0x"
        },
      },
      data: "0x",
      outPoint: {
        txHash: "0x" + "0".repeat(64),
        index: "0x0"
      },
      blockNumber: "0x0"
    }
  ]),
  outputs: List([
    {
      cellOutput: {
        capacity: "0x0",
        lock: {
          codeHash: "0x" + "0".repeat(64),
          hashType: "data1",
          args: "0x"
        }
      },
      data: "0x"
    }
  ]),
  witnesses: List(),
  fixedEntries: List(),
  signingEntries: List(),
  inputSinces: Map()
});