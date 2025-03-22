// QuantumPurse.ts
import {
  CKB_INDEXER_URL,
  NODE_URL,
  IS_MAIN_NET,
  SPHINCSPLUS_LOCK,
} from "./config";
import {
  hexToInt,
  insertWitnessPlaceHolder,
  prepareSphincsPlusSigningEntries,
  hexStringToUint8Array,
} from "./utils";
import { Reader } from "ckb-js-toolkit";
import { scriptToAddress } from "@nervosnetwork/ckb-sdk-utils";
import { CellCollector, Indexer } from "@ckb-lumos/ckb-indexer";
import { Script, HashType, Transaction } from "@ckb-lumos/base";
import { CKBIndexerQueryOptions } from "@ckb-lumos/ckb-indexer/src/type";
import { TransactionSkeletonType, sealTransaction } from "@ckb-lumos/helpers";
import keyVaultWasmInit, {
  KeyVault,
  Util as KeyVaultUtil,
} from "../../key-vault/pkg/key_vault";
import { CKBSphincsPlusHasher } from "./hasher";
import Worker from "worker-loader!../../light-client/status_worker.js";
import {
  LightClient,
  randomSecretKey,
  LightClientSetScriptsCommand,
} from "ckb-light-client-js";
import networkConfig from "../../light-client/network.toml";
import { ClientIndexerSearchKeyLike, Hex } from "@ckb-ccc/core";

/**
 * Manages a wallet using the SPHINCS+ post-quantum signature scheme (shake-128f simple)
 * on the Nervos CKB blockchain. This class provides functionality for generating accounts, signing transactions,
 * managing seed phrases, and interacting with the blockchain.
 */
export default class QuantumPurse {
  /* All in one lock script configuration */
  private static readonly MULTISIG_ID = "80";
  private static readonly REQUIRE_FISRT_N = "00";
  private static readonly THRESHOLD = "01";
  private static readonly PUBKEY_NUM = "01";
  private static readonly LOCK_FLAGS = "6d"; // [0110110]|[1]: [shake128f-id]|[signature-flag]
  private static readonly SPX_SIG_LEN: number = 17088;
  private static instance?: QuantumPurse;
  /* CKB light client wasm worker */
  private worker: Worker | undefined;
  private pendingRequests: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
    }
  > = new Map();
  private client?: LightClient;
  private static readonly CLIENT_ID = "ckb-light-client-wasm-secret-key";
  private static readonly START_BLOCK = "ckb-light-client-wasm-start-block";
  /* Account management */
  private accountPointer?: string; // Is a sphincs+ public key
  private sphincsLock: { codeHash: string; hashType: HashType };

  /** Constructor that takes sphincs+ on-chain binary deployment info */
  private constructor(sphincsCodeHash: string, sphincsHashType: HashType) {
    this.sphincsLock = { codeHash: sphincsCodeHash, hashType: sphincsHashType };
  }

  /**
   * Gets the singleton instance of QuantumPurse.
   * @returns The singleton instance of QuantumPurse.
   */
  public static async getInstance(): Promise<QuantumPurse> {
    if (!QuantumPurse.instance) {
      QuantumPurse.instance = new QuantumPurse(
        SPHINCSPLUS_LOCK.codeHash,
        SPHINCSPLUS_LOCK.hashType as HashType
      );
    }
    return QuantumPurse.instance;
  }

  /** Conjugate the first 4 bytes of the witness.lock for the hasher */
  private spxAllInOneSetupHashInput(): string {
    return (
      QuantumPurse.MULTISIG_ID +
      QuantumPurse.REQUIRE_FISRT_N +
      QuantumPurse.THRESHOLD +
      QuantumPurse.PUBKEY_NUM
    );
  }

  /** Initialize web worker to poll sync status */
  private startClientSyncStatusWorker() {
    if (!this.worker) {
      this.worker = new Worker();
      this.worker!.onmessage = (event) => {
        const { command, data, requestId } = event.data;
        if (command === "getSyncStatus") {
          // Worker requests sync status from the client
          this.getSyncStatusInternal().then((status) => {
            this.worker!.postMessage({
              type: "syncStatus",
              data: status,
              requestId,
            });
          });
        } else if (requestId && this.pendingRequests.has(requestId)) {
          const { resolve } = this.pendingRequests.get(requestId)!;
          resolve(data);
          this.pendingRequests.delete(requestId);
        }
      };
      // Start the worker’s polling loop
      this.sendRequest("start");
    }
  }

  /** Request to ckb light client web worker */
  private sendRequest(command: string): Promise<any> {
    if (!this.worker) throw new Error("Worker not initialized");
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(7);
      this.pendingRequests.set(requestId, { resolve, reject });
      this.worker!.postMessage({ command, requestId });
    });
  }

  /* Get balance */
  public async getBalanceN(sphincsPlusPubKey?: string): Promise<bigint> {
    if (!this.client) throw new Error("Light client not initialized");

    const lock = this.getLock(sphincsPlusPubKey);
    const searchKey: ClientIndexerSearchKeyLike = {
      scriptType: "lock",
      script: lock,
      scriptSearchMode: "prefix",
    };
    const capacity = await this.client.getCellsCapacity(searchKey);
    return capacity;
  }

  /* Send transaction */
  public async sendTransaction(signedTx: Transaction): Promise<string> {
    if (!this.client) throw new Error("Light client not initialized");

    const txid = this.client.sendTransaction(signedTx);
    return txid;
  }

  /* Helper to infer start block based on sphincs+ pub key */
  private async inferStartBlock(sphincsPlusPubKey: string): Promise<bigint> {
    const tipHeader = await this.client!.getTipHeader();
    const storageKey = QuantumPurse.START_BLOCK + "-" + sphincsPlusPubKey;

    let startStr = localStorage.getItem(storageKey);
    let start: bigint = BigInt(0);
    if (startStr === null) {
      startStr = tipHeader.number.toString();
      localStorage.setItem(storageKey, startStr);
    }
    start = BigInt(parseInt(startStr));
    return start;
  }

  /* Set sync filter on account, starting block*/
  public async setSellectiveSyncFilter(
    sphincsPlusPubKey: string,
    startingBlock?: bigint
  ): Promise<void> {
    if (!this.client) throw new Error("Light client not initialized");

    const lock = this.getLock(sphincsPlusPubKey);
    const storageKey = QuantumPurse.START_BLOCK + "-" + sphincsPlusPubKey;

    let start: bigint = BigInt(0);
    if (startingBlock !== undefined) {
      start = startingBlock;
      localStorage.setItem(storageKey, start.toString());
    } else {
        start = await this.inferStartBlock(sphincsPlusPubKey);
    }
    
    this.client.setScripts(
      [{ blockNumber: start, script: lock, scriptType: "lock" }],
      LightClientSetScriptsCommand.Partial
    );
  }

  /* Calculate sync status */
  private async getSyncStatusInternal() {
    if (!this.client) throw new Error("Light client not initialized");

    const lock = this.getLock();
    const scripts = await this.client.getScripts();
    const script = scripts.find((script) => script.script.args === lock.args);
    const syncedBlock = Number(script?.blockNumber ?? 0);
    const topBlock = Number((await this.client.getTipHeader()).number);
    const startBlock = Number(await this.inferStartBlock(this.accountPointer!));
    const syncedStatus =
      topBlock > startBlock
        ? ((syncedBlock - startBlock) / (topBlock - startBlock)) * 100
        : 0;
    return { syncedBlock, topBlock, syncedStatus, startBlock };
  }

  /* Get sync status from the worker */
  public async getSyncStatusFromWorker() {
    return this.sendRequest("getSyncStatus");
  }

  /* Start light client thread*/
  private async startLightClient() {
    const config = await (await fetch(networkConfig)).text();
    this.client = new LightClient();

    let secretKey = localStorage.getItem(QuantumPurse.CLIENT_ID);
    if (!secretKey) {
      secretKey = randomSecretKey();
      if (secretKey) {
        localStorage.setItem(QuantumPurse.CLIENT_ID, secretKey);
      } else {
        throw new Error("Failed to generate a secret key.");
      }
    }

    let enableDebug = undefined;
    await this.client.start(
      { type: IS_MAIN_NET ? "MainNet" : "TestNet", config },
      secretKey as Hex,
      enableDebug ? "debug" : "info"
    );
  }

  /* Fetch the sphincs+ celldeps to the light client in quantumPurse wallet setup */
  private async fetchSphincsPlusCellDeps() {
    if (!this.client) throw new Error("Light client not initialized");
    await this.client.fetchTransaction(SPHINCSPLUS_LOCK.outPoint.txHash);
  }

  /**
   * Gets the CKB lock script.
   * @param sphincsPlusPubKey - The sphincs+ public key to get a lock script from.
   * @returns The CKB lock script (an asset lock in CKB blockchain).
   * @throws Error if no account pointer is set by default.
   */
  public getLock(sphincsPlusPubKey?: string): Script {
    const accPointer =
      sphincsPlusPubKey !== undefined ? sphincsPlusPubKey : this.accountPointer;
    if (!accPointer || accPointer === "") {
      throw new Error("Account pointer not available!");
    }

    const hasher = new CKBSphincsPlusHasher();
    hasher.update("0x" + this.spxAllInOneSetupHashInput());
    hasher.update(
      "0x" +
        ((parseInt(QuantumPurse.LOCK_FLAGS, 16) >> 1) << 1)
          .toString(16)
          .padStart(2, "0")
    );
    hasher.update("0x" + accPointer);

    return {
      codeHash: this.sphincsLock.codeHash,
      hashType: this.sphincsLock.hashType,
      args: hasher.digestHex(),
    };
  }

  /**
   * Gets the blockchain address.
   * @param sphincsPlusPubKey - The sphincs+ public key to get an address from.
   * @returns The CKB address as a string.
   * @throws Error if no account pointer is set by default (see `getLock` for details).
   */
  public getAddress(sphincsPlusPubKey?: string): string {
    const lock = this.getLock(sphincsPlusPubKey);
    return scriptToAddress(lock, IS_MAIN_NET);
  }

  /**
   * Calculates the wallet's balance on the Nervos CKB blockchain.
   * @param sphincsPlusPubKey - The sphincs+ public key to get an address from which a balance is retrieved.
   * @returns A promise resolving to the balance in BigInt (in shannons).
   * @throws Error if no account is set (see `getLock` for details).
   */
  public async getBalance(sphincsPlusPubKey?: string): Promise<bigint> {
    const lock =
      sphincsPlusPubKey !== undefined
        ? this.getLock(sphincsPlusPubKey)
        : this.getLock();
    const query: CKBIndexerQueryOptions = {
      lock: lock,
      type: "empty",
    };
    const cellCollector = new CellCollector(
      new Indexer(CKB_INDEXER_URL, NODE_URL),
      query
    );
    let balance = BigInt(0);

    for await (const cell of cellCollector.collect()) {
      balance += hexToInt(cell.cellOutput.capacity);
    }
    return balance;
  }

  /**
   * Signs a Nervos CKB transaction using the SPHINCS+ signature scheme.
   * @param tx - The transaction skeleton to sign.
   * @param password - The password to decrypt the private key (will be zeroed out after use).
   * @param sphincsPlusPubKey - The sphincs+ public key to get a lock script from.
   * @returns A promise resolving to the signed transaction.
   * @throws Error if no account is set or decryption fails.
   * @remark The password and sensitive data are overwritten with zeros after use.
   */
  public async sign(
    tx: TransactionSkeletonType,
    password: Uint8Array,
    sphincsPlusPubKey?: string
  ): Promise<Transaction> {
    const accPointer =
      sphincsPlusPubKey !== undefined ? sphincsPlusPubKey : this.accountPointer;
    if (!accPointer || accPointer === "") {
      password.fill(0);
      throw new Error("Account pointer not available!");
    }

    const witnessLen =
      QuantumPurse.SPX_SIG_LEN + hexStringToUint8Array(accPointer).length;
    tx = insertWitnessPlaceHolder(tx, witnessLen);
    tx = prepareSphincsPlusSigningEntries(tx);

    const signingEntries = tx.get("signingEntries").toArray();

    const spxSig = await KeyVault.sign(
      password,
      accPointer,
      hexStringToUint8Array(signingEntries[0].message)
    );
    const serializedSpxSig = new Reader(spxSig.buffer).serializeJson();

    const fullCkbQrSig =
      "0x" +
      this.spxAllInOneSetupHashInput() +
      QuantumPurse.LOCK_FLAGS +
      accPointer +
      serializedSpxSig.replace(/^0x/, "");

    password.fill(0);
    return sealTransaction(tx, [fullCkbQrSig]);
  }

  /**
   * Clears all data from a specific store in IndexedDB.
   * @returns A promise that resolves when the store is cleared.
   */
  public async dbClear(): Promise<void> {
    await KeyVault.clear_database();
    localStorage.removeItem(QuantumPurse.CLIENT_ID);
    const accList = await this.getAllAccounts();
    accList.forEach((acc) => {
      localStorage.removeItem(QuantumPurse.START_BLOCK + "-" + acc);
    });
  }

  /**
   * Generates a new account derived from the master seed.
   * @param password - The password to decrypt the master seed and encrypt the child key (will be zeroed out).
   * @returns A promise that resolves when the account is generated and set.
   * @throws Error if the master seed is not found or decryption fails.
   * @remark The password should be overwritten with zeros after use.
   */
  public async genAccount(password: Uint8Array): Promise<string> {
    const sphincs_pub = await KeyVault.gen_new_key_pair(password);
    await this.setSellectiveSyncFilter(sphincs_pub);
    password.fill(0);
    return sphincs_pub;
  }

  /**
   * Sets the account pointer (There can be many sub/child accounts in db but at a time Quantum Purse will show just 1).
   * @param accPointer - The SPHINCS+ public key (as a pointer to the encrypted privatekey in DB) to set.
   */
  public async setAccPointer(accPointer: string): Promise<void> {
    const accList = await this.getAllAccounts();
    if (!accList.includes(accPointer)) throw Error("Invalid account pointer");
    this.accountPointer = accPointer;
  }

  /**
   * Calculates the entropy of an alphabetical password in bits.
   * @param password - The password as a Uint8Array (UTF-8 encoded). Will be zeroed out after processing.
   * @returns The entropy in bits (e.g., 1, 2, 128, 256, 444, etc.), or 0 for invalid/empty input.
   * @remark The input password is overwritten with zeros after calculation.
   */
  public static checkPassword(password: Uint8Array): number {
    return KeyVaultUtil.password_checker(password);
  }

  /**
   * Imports a seed phrase and stores it encrypted in IndexedDB, overwriting any existing seed.
   * @param seedPhrase - The seed phrase as a Uint8Array (UTF-8 encoded).
   * @param password - The password to encrypt the seed phrase (will be zeroed out).
   * @returns A promise that resolves when the seed is imported.
   * @remark SeedPhrase, password and sensitive data are overwritten with zeros after use.
   */
  public async importSeedPhrase(
    seedPhrase: Uint8Array,
    password: Uint8Array
  ): Promise<void> {
    await KeyVault.import_seed_phrase(seedPhrase, password);
    password.fill(0);
    seedPhrase.fill(0);
  }

  /**
   * Exports the wallet's seed phrase.
   * @param password - The password to decrypt the seed (will be zeroed out).
   * @returns A promise resolving to the seed phrase as a Uint8Array.
   * @throws Error if the master seed is not found or decryption fails.
   * @remark The password is overwritten with zeros after use. Handle the returned seed carefully to avoid leakage.
   */
  public async exportSeedPhrase(password: Uint8Array): Promise<Uint8Array> {
    const seed = await KeyVault.export_seed_phrase(password);
    password.fill(0);
    return seed;
  }

  /**
   * QuantumPurse wallet initialization for wasm code init, key-vault, light-client and light-client status worker.
   * @param password - The password to encrypt the seed (will be zeroed out) in key-vault initilization.
   * @remark The password is overwritten with zeros after use. Handle the returned seed carefully to avoid leakage.
   */
  public async init(password: Uint8Array): Promise<void> {
    await keyVaultWasmInit();
    await this.startLightClient();
    await this.fetchSphincsPlusCellDeps();
    this.startClientSyncStatusWorker();
    await KeyVault.key_init(password);
    password.fill(0);
  }

  /**
   * Retrieve all sphincs plus public keys from all child accounts in the indexed DB.
   * @returns An ordered array of all child key's sphincs plus public keys.
   */
  public async getAllAccounts(): Promise<string[]> {
    return await KeyVault.get_all_sphincs_pub();
  }

  /**
   * Retrieve a list of on-the-fly sphincs+ public key for wallet recovery process.
   * @param password - The password to decrypt the master seed (will be zeroed out).
   * @param startIndex - The index to start searching from.
   * @param count - The number of keys to search for.
   * @returns An ordered array of all child key's sphincs plus public keys.
   */
  public async searchAccount(
    password: Uint8Array,
    startIndex: number,
    count: number
  ): Promise<string[]> {
    return await KeyVault.search_accounts(password, startIndex, count);
  }

  /**
   * Retrieve a list of on-the-fly sphincs+ public key for wallet recovery process.
   * @param password - The password to decrypt the master seed (will be zeroed out).
   * @param count - The number of keys to search for.
   */
  public async recoverAccount(
    password: Uint8Array,
    count: number
  ): Promise<void> {
    return await KeyVault.recover_wallet(password, count);
  }
}
