// Discord Platform
// Following Gitcoin Passport pattern

import { Platform } from '../utils/platform';
import { PlatformOptions } from '../utils/platformTypes';

export class DiscordPlatform extends Platform {
  platformId = 'Discord';
  path = 'discord';

  constructor(options: PlatformOptions = {}) {
    super({
      platformId: 'Discord',
      path: 'discord',
      clientId: options.clientId,
      redirectUri: options.redirectUri
    });
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri;
  }

  /**
   * Get Discord OAuth authorization URL
   * Following Gitcoin Passport pattern
   */
  async getOAuthUrl(state?: string, selectedProviders?: string[]): Promise<string> {
    if (!this.clientId) {
      throw new Error('Discord CLIENT_ID not configured');
    }

    const redirectUri = this.redirectUri || `${window.location.origin}/oauth/callback?provider=discord`;

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify email guilds guilds.members.read connections',
      state: state || ''
    });

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }
}

