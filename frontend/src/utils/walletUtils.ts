// Wallet utilities with timeout and retry (pattern from tipzo)

const WALLET_TIMEOUT = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2_000;

export interface WalletCallOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
}

export async function withWalletTimeout<T>(
  operation: () => Promise<T>,
  options: WalletCallOptions = {}
): Promise<T> {
  const timeout = options.timeout ?? WALLET_TIMEOUT;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const retryDelay = options.retryDelay ?? RETRY_DELAY;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Wallet operation timed out after ${timeout}ms`)), timeout);
      });
      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } catch (e: unknown) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message;

      if (/user rejected|user cancelled/i.test(msg)) throw lastError;
      if (/INVALID_PARAMS|invalid parameters/i.test(msg)) throw lastError;

      if (options.onRetry && attempt > 1) options.onRetry(attempt);
      if (attempt === maxRetries) {
        throw new Error(`Wallet operation failed after ${maxRetries} attempts: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, retryDelay));
    }
  }
  throw lastError ?? new Error("Wallet operation failed");
}

export async function requestTransactionWithRetry(
  adapter: { requestTransaction?: (tx: unknown) => Promise<string> },
  transaction: unknown,
  options: WalletCallOptions = {}
): Promise<string> {
  return withWalletTimeout(
    async () => {
      if (!adapter?.requestTransaction) {
        throw new Error("Wallet adapter does not support requestTransaction");
      }
      const txId = await adapter.requestTransaction(transaction);
      if (!txId) throw new Error("Transaction was rejected or failed");
      return txId;
    },
    { ...options }
  );
}

/** Request records with timeout and retry (pattern from tipzo). */
export async function requestRecordsWithRetry(
  adapter: { requestRecords?: (programId: string) => Promise<unknown[]> },
  programId: string,
  options: WalletCallOptions = {}
): Promise<unknown[]> {
  return withWalletTimeout(
    async () => {
      if (!adapter?.requestRecords) {
        throw new Error("Wallet adapter does not support requestRecords");
      }
      const records = await adapter.requestRecords(programId);
      return records ?? [];
    },
    options
  );
}

/** Decrypt record with timeout and retry (pattern from tipzo). */
export async function decryptWithRetry(
  adapter: { decrypt?: (ciphertext: string) => Promise<unknown> },
  ciphertext: string,
  options: WalletCallOptions = {}
): Promise<string> {
  return withWalletTimeout(
    async () => {
      if (!adapter?.decrypt) {
        throw new Error("Wallet adapter does not support decrypt");
      }
      const decrypted = await adapter.decrypt(ciphertext);
      return typeof decrypted === "string" ? decrypted : JSON.stringify(decrypted);
    },
    options
  );
}
