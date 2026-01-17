import { BaseMessageSignerWalletAdapter, WalletName, WalletReadyState, DecryptPermission, WalletAdapterNetwork, AleoTransaction, AleoDeployment } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWallet } from '@demox-labs/aleo-wallet-adapter-leo';
export interface SoterWindow extends Window {
    soterWallet?: LeoWallet;
    soter?: LeoWallet;
}
export interface SoterWalletAdapterConfig {
    appName?: string;
}
export declare const SoterWalletName: WalletName<"Soter Wallet">;
export declare class SoterWalletAdapter extends BaseMessageSignerWalletAdapter {
    name: WalletName<"Soter Wallet">;
    url: string;
    icon: string;
    readonly supportedTransactionVersions: any;
    private _connecting;
    private _wallet;
    private _publicKey;
    private _decryptPermission;
    private _readyState;
    constructor({}?: SoterWalletAdapterConfig);
    get publicKey(): string;
    get decryptPermission(): string;
    get connecting(): boolean;
    get readyState(): WalletReadyState;
    set readyState(readyState: WalletReadyState);
    decrypt(cipherText: string, tpk?: string, programId?: string, functionName?: string, index?: number): Promise<string>;
    requestRecords(program: string): Promise<any[]>;
    requestTransaction(transaction: AleoTransaction): Promise<string>;
    requestBulkTransactions(transactions: AleoTransaction[]): Promise<string[]>;
    requestDeploy(deployment: AleoDeployment): Promise<string>;
    transactionStatus(transactionId: string): Promise<string>;
    requestExecution(_transaction: AleoTransaction): Promise<string>;
    getExecution(transactionId: string): Promise<string>;
    requestRecordPlaintexts(program: string): Promise<any[]>;
    requestTransactionHistory(program: string): Promise<any[]>;
    connect(decryptPermission: DecryptPermission, network: WalletAdapterNetwork, programs?: string[]): Promise<void>;
    disconnect(): Promise<void>;
    signMessage(message: Uint8Array): Promise<Uint8Array>;
}
