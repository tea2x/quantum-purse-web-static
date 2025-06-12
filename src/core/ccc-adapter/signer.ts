// signer.ts
// A sphincs+ based ccc compatible signer

import {
  Signer,
  SignerType,
  SignerSignType,
  Address,
  TransactionLike,
  Transaction,
  Signature,
  BytesLike,
  Script,
  hexFrom,
  WitnessArgs,
  HashTypeLike
} from "@ckb-ccc/core";
import { QPClient } from "./client";
import { IS_MAIN_NET } from "../config";
import __wbg_init, { KeyVault, SphincsVariant } from "quantum-purse-key-vault";
import { scriptToAddress } from "@nervosnetwork/ckb-sdk-utils";
import { get_ckb_tx_message_all_hash, utf8ToBytes } from "../utils";

export class QPSigner extends Signer {
  public accountPointer?: BytesLike;
  protected spxLock: { codeHash: BytesLike, hashType: HashTypeLike };
  protected keyVault?: KeyVault;
  public requestPassword?: (
    resolve: (password: string) => void,
    reject: () => void
  ) => void;

  constructor(spxLockInfo: { codeHash: BytesLike, hashType: HashTypeLike }) {
    super(new QPClient());
    this.spxLock = spxLockInfo;
  }

  override get client(): QPClient {
    return this.client_ as QPClient;
  }

  async setAccountPointer(accPointer: BytesLike) {
    const lockArgsList = await this.getAllLockScriptArgs();
    if (!lockArgsList.includes(accPointer as string)) throw Error("Invalid account pointer");
    this.accountPointer = accPointer;
  }

  /**
   * Retrieve all sphincs+ lock script arguments from all child accounts in the indexed DB.
   * @returns An ordered array of all child key's sphincs+ lock script argument.
   */
  public async getAllLockScriptArgs(): Promise<string[]> {
    return await KeyVault.get_all_sphincs_lock_args();
  }

  /**
   * Initialize the key-vault instance from within Signer with a pre-determined SPHINCS variant.
   * @param variant The SPHINCS+ parameter set to start with
   * @returns void.
   */
  protected initKeyVaultCore(variant: SphincsVariant) {
    if (this.keyVault) {
      this.keyVault.free();
    }
    this.keyVault = new KeyVault(variant);
  }

  /* Wasm-bindgen module init code for Key Vault */
  protected async initKeyVaultWBG(): Promise<void> {
    await __wbg_init();
  }

  /** CKB network */
  get type(): SignerType {
    return SignerType.CKB;
  }

  /** Signature type is SPHINCS+ */
  get signType(): SignerSignType {
    return SignerSignType.Unknown;
  }

  /** Connect (no-op since private key must be authenticated via password each use) */
  async connect(): Promise<void> {
    return;
  }

  /** Check connection status */
  async isConnected(): Promise<boolean> {
    return true; // Always connected. todo
  }

  /** Get internal address */
  async getInternalAddress(): Promise<string> {
    return scriptToAddress(
      Script.from({
        codeHash: this.spxLock.codeHash,
        hashType: this.spxLock.hashType,
        args: this.accountPointer as string
      }),
      IS_MAIN_NET
    );
  }

  /** Get address objects 
   * Due to the current design of Quantum Purse, this function will only return 
   * the address object matching this.accountPointer, not all the address objects.
   */
  async getAddressObjs(): Promise<Address[]> {
    return [
      {
        script: Script.from({
          codeHash: this.spxLock.codeHash,
          hashType: this.spxLock.hashType,
          args: this.accountPointer as string
        }),
        prefix: IS_MAIN_NET ? "ckb" : "ckt"
      }
    ];
  }

  /** Verify message */
  async verifyMessage(message: string | BytesLike, signature: string | Signature): Promise<boolean> {
    throw new Error("Unsupported method: verifyMessage");
  }

  /** Prepare transaction */
  async prepareTransaction(txLike: TransactionLike): Promise<Transaction> {
    if (!this.keyVault) throw new Error("KeyVault not initialized!");

    const tx = Transaction.from(txLike);
    const { script } = await this.getRecommendedAddressObj();
    const witnessSizeMap = {
      [SphincsVariant.Sha2128F]: 17144,
      [SphincsVariant.Shake128F]: 17144,
      [SphincsVariant.Sha2128S]: 7912,
      [SphincsVariant.Shake128S]: 7912,
      [SphincsVariant.Sha2192F]: 35736,
      [SphincsVariant.Shake192F]: 35736,
      [SphincsVariant.Sha2192S]: 16296,
      [SphincsVariant.Shake192S]: 16296,
      [SphincsVariant.Sha2256F]: 49944,
      [SphincsVariant.Shake256F]: 49944,
      [SphincsVariant.Sha2256S]: 29880,
      [SphincsVariant.Shake256S]: 29880,
    };
    const variant = this.keyVault.variant;
    const witnessSize = witnessSizeMap[variant] || 0;
    await tx.prepareSighashAllWitness(script, witnessSize, this.client);
    return tx;
  }

  /** Sign only the transaction */
  async signOnlyTransaction(txLike: TransactionLike): Promise<Transaction> {
    if (!this.keyVault) throw new Error("KeyVault not initialized!");

    const tx = Transaction.from(txLike);
    const message = get_ckb_tx_message_all_hash(tx); // TODO: Update when new CCC core support is released

    const passwordPromise = new Promise<string>((resolve, reject) => {
      if (this.requestPassword) {
        this.requestPassword(resolve, reject);
      } else {
        reject(new Error("Password request callback not available"));
      }
    });

    let passwordBytes: Uint8Array | undefined;
    try {
      passwordBytes = utf8ToBytes(await passwordPromise);
      const spxSig = await this.keyVault.sign(passwordBytes, this.accountPointer as string, message);
      const position = 0;
      const witness = tx.getWitnessArgsAt(position) ?? WitnessArgs.from({});
      witness.lock = hexFrom(spxSig);
      tx.setWitnessArgsAt(position, witness);
      return tx;
    } catch (error: any) {
      throw new Error("Failed to sign transaction: " + error);
    } finally {
      if (passwordBytes) {
        passwordBytes.fill(0);
      }
    }
  }
}