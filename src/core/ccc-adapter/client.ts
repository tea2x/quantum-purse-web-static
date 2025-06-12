// client.ts
// A light client based ccc compatible client

import {
  Client,
  ClientCacheMemory,
  ClientIndexerSearchKeyLike,
  ClientBlock,
  ClientBlockHeader,
  ClientTransactionResponse,
  ClientFindCellsResponse,
  ClientFindTransactionsResponse,
  ClientFindTransactionsGroupedResponse,
  HexLike,
  NumLike,
  TransactionLike,
  OutputsValidator,
  ScriptInfo,
  KnownScript,
  Num,
  Hex,
  Cell,
  OutPointLike,
  OutPoint,
  ClientIndexerSearchKeyTransactionLike
} from "@ckb-ccc/core";
import {
  LightClient,
  LightClientSetScriptsCommand,
  ScriptStatus,
  NetworkSetting,
  FetchResponse,
  GetTransactionsResponse,
  TxWithCell,
  TxWithCells,
  GetCellsResponse,
  LocalNode
} from "ckb-light-client-js";
import { IS_MAIN_NET } from "../config";

export class QPClient extends Client {
  private lightClient: LightClient;

  constructor() {
    super({ cache: new ClientCacheMemory() });
    this.lightClient = new LightClient();
  }

  /** No url because this is light client based */
  get url(): string {
    return IS_MAIN_NET ? "light-client-mainnet" : "light-client-testnet";
  }

  /** Address prefix */
  get addressPrefix(): string {
    return IS_MAIN_NET ? "ckb" : "ckt";
  }

  /** Fetch known script info */
  async getKnownScript(script: KnownScript): Promise<ScriptInfo> {
    throw new Error("Unsupported method: getKnownScript");
  }

  /** Estimate fee rate statistics (approximation if not directly supported) */
  async getFeeRateStatistics(blockRange?: NumLike): Promise<{ mean: Num; median: Num }> {
    throw new Error("Unsupported method: getFeeRateStatistics");
  }

  /** Get the tip block number */
  async getTip(): Promise<Num> {
    const header = await this.lightClient.getTipHeader();
    return header.number;
  }

  /** Get the tip block header */
  async getTipHeader(verbosity?: number | null): Promise<ClientBlockHeader> {
    return await this.lightClient.getTipHeader();
  }

  /** Get block by number */
  async getBlockByNumber(blockNumber: NumLike, verbosity?: number | null, withCycles?: boolean | null): Promise<ClientBlock | undefined> {
    throw new Error("Unsupported method: getBlockByNumber");
  }

  /** Get block by hash */
  async getBlockByHash(blockHash: HexLike, verbosity?: number | null, withCycles?: boolean | null): Promise<ClientBlock | undefined> {
    throw new Error("Unsupported method: getBlockByHash");
  }

  /** Get header by number */
  async getHeaderByNumber(blockNumber: NumLike, verbosity?: number | null): Promise<ClientBlockHeader | undefined> {
    throw new Error("Unsupported method: getHeaderByNumber");
  }

  /** Get header by hash */
  async getHeaderByHash(blockHash: HexLike, verbosity?: number | null): Promise<ClientBlockHeader | undefined> {
    return await this.lightClient.getHeader(blockHash);
  }

  /** Estimate transaction cycles */
  async estimateCycles(transaction: TransactionLike): Promise<Num> {
    return this.lightClient.estimateCycles(transaction);
  }

  /** Dry run a transaction */
  async sendTransactionDry(transaction: TransactionLike, validator?: OutputsValidator): Promise<Num> {
    throw new Error("Unsupported method: sendTransactionDry");
  }

  /** Send a transaction without caching */
  async sendTransactionNoCache(transaction: TransactionLike, validator?: OutputsValidator): Promise<Hex> {
    return await this.lightClient.sendTransaction(transaction as any);
  }

  /** Get transaction without caching */
  async getTransactionNoCache(txHash: HexLike): Promise<ClientTransactionResponse | undefined> {
    const tx = await this.lightClient.getTransaction(txHash);
    if (!tx) return undefined;
    return {
      transaction: tx.transaction,
      status: tx.status,
      blockNumber: tx.blockNumber,
    };
  }

  /** Get live cell without caching */
  async getCellLiveNoCache(outPointLike: OutPointLike, withData?: boolean | null, includeTxPool?: boolean | null): Promise<Cell | undefined> {
    const outPoint = OutPoint.from(outPointLike);
    const tx = await this.lightClient.getTransaction(outPoint.txHash);
    if (!tx) return undefined;
    const index = Number(outPoint.index);
    if (index >= tx.transaction.outputs.length) return undefined;
    return Cell.from({
      cellOutput: tx.transaction.outputs[index],
      outputData: withData ? tx.transaction.outputsData[index] ?? "0x" : "0x",
      outPoint,
    });
  }

  /** Find cells with pagination */
  async findCellsPagedNoCache(key: ClientIndexerSearchKeyLike, order?: "asc" | "desc", limit?: NumLike, after?: string): Promise<ClientFindCellsResponse> {
    const cellsResponse = await this.lightClient.getCells(key, order ?? "asc", limit ?? 10, after as Hex);
    return {
      cells: cellsResponse.cells.map(cell => (Cell.from({
        cellOutput: cell.cellOutput,
        outputData: cell.outputData,
        outPoint: cell.outPoint,
      }))),
      lastCursor: cellsResponse.lastCursor,
    };
  }

  /** Find transactions with pagination */
  async findTransactionsPaged(
    key: Omit<ClientIndexerSearchKeyLike, "groupByTransaction"> & { groupByTransaction: true },
    order?: "asc" | "desc",
    limit?: NumLike,
    after?: string
  ): Promise<ClientFindTransactionsGroupedResponse>;
  async findTransactionsPaged(
    key: Omit<ClientIndexerSearchKeyLike, "groupByTransaction"> & { groupByTransaction: false } | Omit<ClientIndexerSearchKeyLike, "groupByTransaction">,
    order?: "asc" | "desc",
    limit?: NumLike,
    after?: string
  ): Promise<ClientFindTransactionsResponse>;
  async findTransactionsPaged(
    key: any,
    order?: "asc" | "desc",
    limit?: NumLike,
    after?: string
  ): Promise<ClientFindTransactionsResponse | ClientFindTransactionsGroupedResponse> {
    const txsResponse = await this.lightClient.getTransactions(
      key,
      order ?? "asc",
      limit ?? 10,
      after as Hex
    );

    if (key.groupByTransaction === true) {
      const groupedTransactions = txsResponse.transactions.map(tx => ({
        txHash: tx.transaction.hash(),
        blockNumber: tx.blockNumber,
        txIndex: tx.txIndex,
        cells: [
          ...tx.transaction.inputs.map((input, i) => ({
            isInput: true,
            cellIndex: BigInt(i),
          })),
          ...tx.transaction.outputs.map((output, i) => ({
            isInput: false,
            cellIndex: BigInt(i),
          }))
        ]
      }));
      return {
        transactions: groupedTransactions,
        lastCursor: txsResponse.lastCursor,
      } as ClientFindTransactionsGroupedResponse;
    } else {
      const nonGroupedTransactions = txsResponse.transactions.flatMap(tx => {
        const inputCells = tx.transaction.inputs.map((input, i) => ({
          txHash: tx.transaction.hash(),
          blockNumber: tx.blockNumber,
          txIndex: tx.txIndex,
          isInput: true,
          cellIndex: BigInt(i),
        }));
        const outputCells = tx.transaction.outputs.map((output, i) => ({
          txHash: tx.transaction.hash(),
          blockNumber: tx.blockNumber,
          txIndex: tx.txIndex,
          isInput: false,
          cellIndex: BigInt(i),
        }));
        return [...inputCells, ...outputCells];
      });
      return {
        transactions: nonGroupedTransactions,
        lastCursor: txsResponse.lastCursor,
      } as ClientFindTransactionsResponse;
    }
  }

  /** Get total capacity of cells */
  async getCellsCapacity(key: ClientIndexerSearchKeyLike): Promise<Num> {
    return this.lightClient.getCellsCapacity(key);
  }
  
  /* Delegating calls to this.lightClient */
  public async setScripts(scripts: ScriptStatus[], command?: LightClientSetScriptsCommand) {
    await this.lightClient.setScripts(scripts, command);
  }

  public async getScripts(): Promise<ScriptStatus[]> {
    return this.lightClient.getScripts();
  }

  public async localNodeInfo(): Promise<LocalNode> {
    return this.lightClient.localNodeInfo();
  }

  public async start(networkSetting: NetworkSetting, networkSecretKey: Hex, logLevel?: "trace" | "debug" | "info" | "error", transportType?: "ws" | "wss") {
    await this.lightClient.start(networkSetting, networkSecretKey, logLevel, transportType);
  }

  public async fetchTransaction(txHash: HexLike): Promise<FetchResponse<ClientTransactionResponse>> {
    return this.lightClient.fetchTransaction(txHash);
  }

  public async getTransactions(searchKey: ClientIndexerSearchKeyTransactionLike, order?: "asc" | "desc", limit?: NumLike, afterCursor?: Hex): Promise<GetTransactionsResponse<TxWithCell> | GetTransactionsResponse<TxWithCells>>{
    return this.lightClient.getTransactions(searchKey, order, limit, afterCursor);
  }

  public async getCells(searchKey: ClientIndexerSearchKeyLike, order?: "asc" | "desc", limit?: NumLike, afterCursor?: Hex): Promise<GetCellsResponse> { 
    return this.lightClient.getCells(searchKey, order, limit, afterCursor);
  }

  public async getHeader(hash: HexLike): Promise<ClientBlockHeader | undefined> {
    return this.lightClient.getHeader(hash);
  }

  public async getTransaction(txHash: HexLike): Promise<ClientTransactionResponse | undefined> {
    return this.lightClient.getTransaction(txHash);
  }
}