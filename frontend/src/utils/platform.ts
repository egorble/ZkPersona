// Platform base class and types
// Following Gitcoin Passport pattern

import { AppContext } from './platformTypes';
import { waitForRedirect, ProviderPayload } from './oauthRedirect';

export interface PlatformOptions {
  platformId: string;
  path: string;
  clientId?: string;
  redirectUri?: string;
}

/**
 * Platform base class
 * Following Gitcoin Passport Platform pattern
 * 
 * Each social platform (Twitter, Discord, GitHub) extends this class
 * to implement platform-specific OAuth flow
 */
export abstract class Platform {
  platformId: string = '';
  path: string = '';
  clientId?: string;
  redirectUri?: string;
  isEVM?: boolean = false;

  constructor(options: PlatformOptions) {
    this.platformId = options.platformId;
    this.path = options.path;
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri;
  }

  /**
   * Get OAuth authorization URL
   * Must be implemented by each platform
   * 
   * @param state - OAuth state parameter for CSRF protection
   * @param selectedProviders - Optional array of provider IDs for multi-provider platforms
   * @returns Promise resolving to OAuth authorization URL
   */
  abstract getOAuthUrl(state?: string, selectedProviders?: string[]): Promise<string>;

  /**
   * Get provider payload from OAuth flow
   * Following Gitcoin Passport pattern
   * 
   * Opens OAuth popup window and waits for redirect
   * 
   * @param appContext - Application context with window, screen, etc.
   * @returns Promise resolving to provider payload (code, state, signature)
   */
  async getProviderPayload(appContext: AppContext): Promise<ProviderPayload> {
    const state = appContext.state || `${this.path}-${this.generateUID(10)}`;
    
    // Get OAuth URL
    const authUrl = await this.getOAuthUrl(state, appContext.selectedProviders);
    
    // Open OAuth popup window
    const width = 600;
    const height = 800;
    const left = appContext.screen.width / 2 - width / 2;
    const top = appContext.screen.height / 2 - height / 2;

    const popup = appContext.window.open(
      authUrl,
      '_blank',
      `toolbar=no, location=no, directories=no, status=no, menubar=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );

    if (!popup) {
      throw new Error('Popup window blocked. Please allow popups for this site.');
    }

    // Wait for OAuth redirect via BroadcastChannel
    return appContext.waitForRedirect(this);
  }

  /**
   * Generate unique ID for state parameter
   */
  protected generateUID(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

