import { BaseMessageSignerWalletAdapter, WalletName, WalletReadyState, DecryptPermission, WalletAdapterNetwork, AleoTransaction, AleoDeployment } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWallet, LeoWalletAdapterConfig } from '@demox-labs/aleo-wallet-adapter-leo';
export interface FoxWindow extends Window {
    foxwallet?: {
        aleo?: LeoWallet;
    };
}
export declare const FoxWalletName: WalletName<"Fox Wallet">;
export declare class FoxWalletAdapter extends BaseMessageSignerWalletAdapter {
    name: WalletName<"Fox Wallet">;
    url: string;
    icon: string;
    readonly supportedTransactionVersions: any;
    private _connecting;
    private _wallet;
    private _publicKey;
    private _decryptPermission;
    private _readyState;
    constructor({}?: LeoWalletAdapterConfig);
    get publicKey(): string;
    get decryptPermission(): string;
    get connecting(): boolean;
    get readyState(): WalletReadyState;
    set readyState(readyState: WalletReadyState);
    decrypt(cipherText: string, tpk?: string, programId?: string, functionName?: string, index?: number): Promise<string>;
    requestRecords(program: string): Promise<any[]>;
    requestTransaction(transaction: AleoTransaction): Promise<string>;
    requestExecution(transaction: AleoTransaction): Promise<string>;
    requestBulkTransactions(transactions: AleoTransaction[]): Promise<string[]>;
    requestDeploy(deployment: AleoDeployment): Promise<string>;
    transactionStatus(transactionId: string): Promise<string>;
    getExecution(transactionId: string): Promise<string>;
    requestRecordPlaintexts(program: string): Promise<any[]>;
    requestTransactionHistory(program: string): Promise<any[]>;
    connect(decryptPermission: DecryptPermission, network: WalletAdapterNetwork, programs?: string[]): Promise<void>;
    disconnect(): Promise<void>;
    signMessage(message: Uint8Array): Promise<Uint8Array>;
}
