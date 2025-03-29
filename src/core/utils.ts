import { utils, blockchain, Transaction } from "@ckb-lumos/base";
const { computeScriptHash } = utils; //todo improve. misused but still fulfill what needs to be done
import { TransactionSkeletonType } from "@ckb-lumos/helpers";
import { Set } from "immutable";
import { bytes } from "@ckb-lumos/codec";
import { SPHINCSPLUS_LOCK } from "./config";
import { RPC } from "@ckb-lumos/rpc";
import { Util as KeyVaultUtil } from "../../key-vault/pkg/key_vault";

/**
 * Converts a hexadecimal string to a BigInt number, handling both positive and negative values.
 * @param hex - The hexadecimal string to convert.
 * @returns A BigInt representation of the hex value.
 * @throws {Error} If the hex string doesn't start with '0x' or '-0x'.
 */
export function hexToInt(hex: string) {
  if (hex.substr(0, 2) !== "0x" && hex.substr(0, 3) !== "-0x")
    throw new Error(`Invalid hex value: "${hex}"`);

  const negative = hex[0] === "-";
  const hexValue = hex.replace("-", "");
  let bigInt = BigInt(hexValue);
  if (negative) bigInt *= BigInt(-1);

  if (negative)
    console.warn(
      "Warning: A negative value was passed to hexToInt(). This usually means there has been a capacity miscalculation."
    );

  return bigInt;
}

/**
 * Converts a number to its hexadecimal string representation with optional padding.
 * @param num - The number to convert.
 * @param padding - Optional padding to ensure a fixed hex string length.
 * @returns A hexadecimal string prefixed with '0x' or '-0x' for negative numbers.
 */
export function intToHex(num: number, padding = 0) {
  let bigNum = BigInt(num);
  const negative = bigNum < BigInt(0);
  const prefix = !negative ? "0x" : "-0x";
  if (negative) bigNum *= BigInt(-1);
  let hexValue = bigNum.toString(16);

  if (padding !== 0) {
    while (hexValue.length < padding) {
      hexValue = "0" + hexValue;
    }
  }

  hexValue = prefix + hexValue;

  if (negative)
    console.warn(
      "Warning: A negative value was passed to intToHex(). This usually means there has been a miscalculation."
    );

  return hexValue;
}

/**
 * Overrides the default fetch function to fix 'Illegal invocation' errors in some environments.
 * @param request - The resource to fetch, can be a string, URL, or Request object.
 * @param init - Optional fetch options.
 * @returns A Promise that resolves to the Response object.
 */
export function fetch(
  request: string | URL | globalThis.Request,
  init?: RequestInit
): Promise<Response> {
  return globalThis.fetch(request, {
    ...init,
  });
}

/**
 * Inserts placeholder witnesses into a transaction skeleton for SPHINCS+ signatures.
 * @param transaction - The transaction skeleton to modify.
 * @param spSigSize - The size of the SPHINCS+ signature in bytes.
 * @returns The modified transaction skeleton.
 * @throws {Error} If the transaction already has witnesses.
 */
export function insertWitnessPlaceHolder(
  transaction: TransactionSkeletonType,
  spSigSize: number
): TransactionSkeletonType {
  if (transaction.witnesses.size !== 0)
    throw new Error(
      "This function can only be used on an empty witnesses structure."
    );

  let uniqueLocks = Set<string>();
  for (const input of transaction.inputs) {
    let witness = "0x";

    const lockHash = computeScriptHash(input.cellOutput.lock);
    if (!uniqueLocks.has(lockHash)) {
      uniqueLocks = uniqueLocks.add(lockHash);
      if (
        input.cellOutput.lock.hashType === SPHINCSPLUS_LOCK.hashType &&
        input.cellOutput.lock.codeHash === SPHINCSPLUS_LOCK.codeHash
      )
        witness = "0x" + "0".repeat(spSigSize * 2); //todo check with msg hash all
    }

    witness = bytes.hexify(blockchain.WitnessArgs.pack({ lock: witness }));
    transaction = transaction.update("witnesses", (w) => w.push(witness));
  }

  return transaction;
}

/**
 * https://github.com/xxuejie/rfcs/blob/cighash-all/rfcs/0000-ckb-tx-message-all/0000-ckb-tx-message-all.md
 * @param tx - The transaction skeleton to process.
 * @returns An Uint8Array representing the transaction message all hash.
 */
function get_ckb_tx_message_all_hash(tx: TransactionSkeletonType): Uint8Array {
  // Prepare mock transaction
  const tx_mock = {
    version: "0x0",
    cell_deps: tx.cellDeps.map((dep) => ({
      out_point: {
        tx_hash: dep.outPoint.txHash,
        index: dep.outPoint.index,
      },
      dep_type: dep.depType,
    })),
    header_deps: tx.headerDeps,
    inputs: tx.inputs.map((input) => ({
      previous_output: {
        tx_hash: input.outPoint!.txHash,
        index: input.outPoint!.index,
      },
      since: "0x0",
    })),
    outputs: tx.outputs.map((output) => ({
      capacity: output.cellOutput.capacity,
      lock: {
        code_hash: output.cellOutput.lock.codeHash,
        hash_type: output.cellOutput.lock.hashType,
        args: output.cellOutput.lock.args,
      },
      type: output.cellOutput.type,
    })),
    outputs_data: tx.outputs.map((output) => output.data),
    witnesses: tx.witnesses,
  };

  // Prepare mockInputs for mock_info.inputs
  const mockInputs = tx.inputs.map((input) => ({
    input: {
      previous_output: {
        tx_hash: input.outPoint!.txHash,
        index: input.outPoint!.index,
      },
      since: "0x0",
    },
    output: {
      capacity: input.cellOutput.capacity,
      lock: {
        code_hash: input.cellOutput.lock.codeHash,
        hash_type: input.cellOutput.lock.hashType,
        args: input.cellOutput.lock.args,
      },
      type: input.cellOutput.type ? {
        code_hash: input.cellOutput.type?.codeHash,
        hash_type: input.cellOutput.type?.hashType,
        args: input.cellOutput.type?.args
      } : null,
    },
    data: input.data,
    header: null,
  }));

  const defaultCellOutput = {
    capacity: "0x0",
    lock: {
      code_hash:
        "0x" + "0".repeat(64),
      hash_type: "data",
      args: "0x",
    },
    type: null,
  };

  const mockCellDeps = tx.cellDeps.map((dep) => ({
    cell_dep: {
      out_point: {
        tx_hash: dep.outPoint.txHash,
        index: dep.outPoint.index,
      },
      dep_type: dep.depType,
    },
    output: defaultCellOutput,
    data: "0x",
    header: null,
  }));

  // Prepare mock_info
  const mockInfo = {
    inputs: mockInputs,
    cell_deps: mockCellDeps,
    header_deps: [],
  };

  // Prepare reprMockTx
  const reprMockTx = {
    mock_info: mockInfo,
    tx: tx_mock,
  };

  // Serialize to JSON string and call the rust tool
  const serializedTx = new TextEncoder().encode(JSON.stringify(reprMockTx));
  return KeyVaultUtil.get_ckb_tx_message_all(new Uint8Array(serializedTx));
}

/**
 * Prepares entries for SPHINCS+ signing by hashing transaction data and witness information.
 * @param txSkeleton - The transaction skeleton to process.
 * @returns An updated transaction skeleton with signing entries.
 */
export function prepareSigningEntries(
  txSkeleton: TransactionSkeletonType
): TransactionSkeletonType {
  let processedArgs = Set<string>();
  const inputs = txSkeleton.get("inputs");
  let signingEntries = txSkeleton.get("signingEntries");
  for (let i = 0; i < inputs.size; i++) {
    const input = inputs.get(i)!;
    if (!processedArgs.has(input.cellOutput.lock.args)) {
      processedArgs = processedArgs.add(input.cellOutput.lock.args);
      const signingEntry = {
        type: "witness_args_lock",
        index: i,
        message: byteArrayToHex(get_ckb_tx_message_all_hash(txSkeleton)),
      };
      signingEntries = signingEntries.push(signingEntry);
    }
  }
  txSkeleton = txSkeleton.set("signingEntries", signingEntries);
  return txSkeleton;
}

/**
 * Waits for a transaction to be confirmed on the blockchain.
 * @param nodeURL - The URL of the CKB node to monitor.
 * @param txid - The transaction ID to wait for.
 */
export async function waitForTransactionConfirmation(
  nodeURL: string,
  txid: string
) {
  process.stdout.write("Waiting for transaction to confirm.");
  await waitForConfirmation(
    nodeURL,
    txid,
    (_status) => process.stdout.write("."),
    { recheckMs: 1_000 }
  );
}

/**
 * Generic function to wait for transaction confirmation with custom progress updates.
 * @param nodeURL - The URL of the CKB node to query.
 * @param txid - The transaction ID to confirm.
 * @param updateProgress - Callback to update progress, defaults to a no-op.
 * @param options - Configuration options for timeout, retry intervals, etc.
 * @returns A promise that resolves when the transaction is confirmed.
 * @throws {Error} If there's a timeout or transaction not found (if specified).
 */
export async function waitForConfirmation(
  nodeURL: string,
  txid: string,
  updateProgress = (_status: any) => {},
  options: any
) {
  const defaults = {
    timeoutMs: 300_000,
    recheckMs: 250,
    throwOnNotFound: true,
  };
  options = { ...defaults, ...options };
  return new Promise(async (resolve, reject) => {
    let timedOut = false;
    const timeoutTimer =
      options.timeoutMs !== 0
        ? setTimeout(() => {
            timedOut = true;
          }, options.timeoutMs)
        : false;
    const rpc = new RPC(nodeURL, { fetch });

    while (true) {
      if (timedOut) return reject(Error("Transaction timeout."));
      const transaction = await rpc.getTransaction(txid);
      if (!!transaction) {
        const status = transaction.txStatus.status;
        updateProgress(status);
        if (status === "committed") {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          break;
        }
      } else if (transaction === null) {
        if (options.throwOnNotFound)
          return reject(Error("Transaction was not found."));
        else updateProgress("not_found");
      }
      await new Promise((resolve) => setTimeout(resolve, options.recheckMs));
    }
    return resolve;
  });
}

/**
 * Converts a hex string to a Uint8Array.
 * @param hex - The hex string to convert.
 * @returns A Uint8Array representing the hex string.
 */
export function hexToByteArray(hex: string): Uint8Array {
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }

  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }

  const byteArray = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    byteArray[i / 2] = parseInt(hex.substr(i, 2), 16);
  }

  return byteArray;
}

/**
 * Converts a Uint8Array to a hex string.
 * @param arr - The uint8 array to convert.
 * @returns A hex string.
 */
export function byteArrayToHex(arr: Uint8Array): string {
  return (
    "0x" +
    Array.from(arr)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Convert JS string to byte array.
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
export function utf8ToBytes(str: string): Uint8Array {
  if (typeof str !== "string")
    throw new Error("utf8ToBytes expected string, got " + typeof str);
  return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}

/**
 * Converts a utf8 byte encoded as uint8raay to the utf8.
 * @param arr - The uint8 array to convert.
 * @returns A hex string.
 */
export function bytesToUtf8(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("bytesToUtf8 expected Uint8Array, got " + typeof bytes);
  }
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
}
