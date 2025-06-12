import { Util as KeyVaultUtil } from "quantum-purse-key-vault";
import { Transaction } from "@ckb-ccc/core";

/**
 * https://github.com/xxuejie/rfcs/blob/cighash-all/rfcs/0000-ckb-tx-message-all/0000-ckb-tx-message-all.md
 * @param tx - The transaction skeleton to process.
 * @returns An Uint8Array representing the transaction message all hash.
 */
export function get_ckb_tx_message_all_hash(tx: Transaction): Uint8Array {
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
        tx_hash: input.previousOutput.txHash,
        index: input.previousOutput.index,
      },
      since: "0x0",
    })),
    outputs: tx.outputs.map((output) => ({
      capacity: output.capacity,
      lock: {
        code_hash: output.lock.codeHash,
        hash_type: output.lock.hashType,
        args: output.lock.args,
      },
      type: output.type ? {
        code_hash: output.type?.codeHash,
        hash_type: output.type?.hashType,
        args: output.type?.args,
      } : null,
    })),
    outputs_data: tx.outputsData,
    witnesses: tx.witnesses,
  };

  // Prepare mockInputs for mock_info.inputs
  const mockInputs = tx.inputs.map((input) => ({
    input: {
      previous_output: {
        tx_hash: input.previousOutput.txHash,
        index: input.previousOutput.index,
      },
      since: "0x0",
    },
    output: {
      capacity: input.cellOutput?.capacity,
      lock: {
        code_hash: input.cellOutput?.lock.codeHash,
        hash_type: input.cellOutput?.lock.hashType,
        args: input.cellOutput?.lock.args,
      },
      type: input.cellOutput?.type ? {
        code_hash: input.cellOutput.type.codeHash,
        hash_type: input.cellOutput.type.hashType,
        args: input.cellOutput.type.args
      } : null,
    },
    data: input.outputData,
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
  const stringified = JSON.stringify(reprMockTx, (key, value) =>
    typeof value === 'bigint' ? '0x' + value.toString(16) : value
  );
  const serializedTx = new TextEncoder().encode(stringified);
  return KeyVaultUtil.get_ckb_tx_message_all(new Uint8Array(serializedTx));
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
