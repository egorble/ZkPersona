// Twitter Platform
// Following Gitcoin Passport pattern

import { Platform } from '../utils/platform';
import { PlatformOptions } from '../utils/platformTypes';

export class TwitterPlatform extends Platform {
  platformId = 'Twitter';
  path = 'twitter';

  constructor(options: PlatformOptions = {}) {
    super({
      platformId: 'Twitter',
      path: 'twitter',
      clientId: options.clientId,
      redirectUri: options.redirectUri
    });
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri;
  }

  /**
   * Get Twitter OAuth authorization URL
   * Following Gitcoin Passport pattern
   */
  async getOAuthUrl(state?: string, selectedProviders?: string[]): Promise<string> {
    if (!this.clientId) {
      throw new Error('Twitter CLIENT_ID not configured');
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const redirectUri = this.redirectUri || `${backendUrl}/auth/twitter/callback`;

    // Twitter OAuth uses PKCE - backend generates auth URL with PKCE
    // For now, return backend URL that generates auth URL
    // In production, call backend API to generate auth URL with PKCE
    const authUrl = `${backendUrl}/auth/twitter/start?state=${state || ''}`;
    
    return authUrl;
  }
}

