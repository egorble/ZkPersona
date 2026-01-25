// Platform types and AppContext
// Following Gitcoin Passport pattern

import { Platform } from './platform';
import { ProviderPayload } from './oauthRedirect';

export type PROVIDER_ID = string;

// Re-export for convenience
export type { ProviderPayload };

/**
 * Application context for platform OAuth flow
 * Following Gitcoin Passport AppContext pattern
 */
export interface AppContext {
  state: string;
  window: {
    open: (url: string, target: string, features: string) => Window | null;
  };
  screen: {
    width: number;
    height: number;
  };
  userDid?: string;
  callbackUrl?: string;
  selectedProviders?: PROVIDER_ID[];
  waitForRedirect: (platform: Platform, timeout?: number) => Promise<ProviderPayload>;
  
  // Optional properties for EVM platforms
  address?: string;
  signMessageAsync?: (message: { message: string }) => Promise<string>;
  sendTransactionAsync?: (transaction: any) => Promise<string>;
  switchChainAsync?: (chainId: number) => Promise<void>;
}

