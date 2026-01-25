// GitHub Platform
// Following Gitcoin Passport pattern

import { Platform } from '../utils/platform';
import { PlatformOptions } from '../utils/platformTypes';

export class GitHubPlatform extends Platform {
  platformId = 'GitHub';
  path = 'github';

  constructor(options: PlatformOptions = {}) {
    super({
      platformId: 'GitHub',
      path: 'github',
      clientId: options.clientId,
      redirectUri: options.redirectUri
    });
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri;
  }

  /**
   * Get GitHub OAuth authorization URL
   * Following Gitcoin Passport pattern
   */
  async getOAuthUrl(state?: string, selectedProviders?: string[]): Promise<string> {
    if (!this.clientId) {
      throw new Error('GitHub CLIENT_ID not configured');
    }

    const redirectUri = this.redirectUri || `${window.location.origin}/oauth/callback?provider=github`;

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state: state || ''
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }
}

