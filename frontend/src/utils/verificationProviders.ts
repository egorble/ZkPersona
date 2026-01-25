// Verification providers configuration and API integration

export interface VerificationProvider {
  id: string;
  name: string;
  type: 'oauth' | 'api' | 'blockchain' | 'ai';
  authUrl?: string;
  scopes?: string[];
  apiDocs?: string;
}

export const VERIFICATION_PROVIDERS: Record<string, VerificationProvider> = {
  google: {
    id: 'google',
    name: 'Google',
    type: 'oauth',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['openid', 'profile', 'email'],
    apiDocs: 'https://developers.google.com/identity/protocols/oauth2'
  },
  twitter: {
    id: 'twitter',
    name: 'X (Twitter)',
    type: 'oauth',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    scopes: ['tweet.read', 'users.read'],
    apiDocs: 'https://developer.twitter.com/en/docs/twitter-api'
  },
  github: {
    id: 'github',
    name: 'GitHub',
    type: 'oauth',
    authUrl: 'https://github.com/login/oauth/authorize',
    scopes: ['read:user', 'user:email', 'public_repo'],
    apiDocs: 'https://docs.github.com/en/rest'
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    type: 'blockchain',
    apiDocs: 'https://ethereum.org/en/developers/docs/'
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini AI',
    type: 'ai',
    apiDocs: 'https://ai.google.dev/docs'
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    type: 'oauth',
    authUrl: 'https://discord.com/api/oauth2/authorize',
    scopes: ['identify', 'email', 'guilds'],
    apiDocs: 'https://discord.com/developers/docs/topics/oauth2'
  },
  steam: {
    id: 'steam',
    name: 'Steam',
    type: 'oauth',
    authUrl: 'https://steamcommunity.com/openid/login',
    scopes: [],
    apiDocs: 'https://steamcommunity.com/dev'
  }
};

export interface VerificationInstructions {
  provider: string;
  steps: {
    title: string;
    description: string;
    code?: string;
    link?: string;
  }[];
}

export const getVerificationInstructions = (providerId: string): VerificationInstructions => {
  const provider = VERIFICATION_PROVIDERS[providerId];
  
  if (!provider) {
    return {
      provider: providerId,
      steps: [{
        title: 'Unknown Provider',
        description: 'No instructions available for this provider.'
      }]
    };
  }

  switch (providerId) {
    case 'google':
      return {
        provider: 'Google',
        steps: [
          {
            title: '1. OAuth Setup',
            description: 'We will initiate OAuth 2.0 flow to verify your Google account.',
            link: 'https://developers.google.com/identity/protocols/oauth2'
          },
          {
            title: '2. Sign In with Google',
            description: 'Click the button below to sign in with your Google account.',
          },
          {
            title: '3. Verification',
            description: 'We will verify your account is active and has valid email verification.',
          }
        ]
      };

    case 'twitter':
      return {
        provider: 'X (Twitter)',
        steps: [
          {
            title: '1. Twitter OAuth',
            description: 'Connect your Twitter account using OAuth 2.0.',
            link: 'https://developer.twitter.com/en/docs/authentication/oauth-2-0'
          },
          {
            title: '2. Account Verification',
            description: 'We will check your account age and activity history.',
          },
          {
            title: '3. History Analysis',
            description: 'We verify your account has over 2 years of activity.',
          }
        ]
      };

    case 'github':
      return {
        provider: 'GitHub',
        steps: [
          {
            title: '1. GitHub OAuth',
            description: 'Connect your GitHub account.',
            link: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps'
          },
          {
            title: '2. Repository Access',
            description: 'We will check your public repositories and contributions.',
          },
          {
            title: '3. Contribution Analysis',
            description: 'We verify your open source contributions and activity.',
          }
        ]
      };

    case 'ethereum':
    case 'eth_wallet':
      return {
        provider: 'Ethereum Wallet',
        steps: [
          {
            title: '1. Connect EVM Wallet',
            description: 'Click "Start Verification" to connect your Ethereum wallet. We support MetaMask, WalletConnect, Coinbase Wallet, and other EIP-1193 compatible wallets.',
          },
          {
            title: '2. Automatic Analysis',
            description: 'We will automatically analyze your wallet: balance (min 0.01 ETH), transaction count, and wallet age.',
          },
          {
            title: '3. Get Score',
            description: 'Receive up to 35 points based on your wallet activity, balance, and history.',
            link: 'https://ethereum.org/en/developers/docs/'
          }
        ]
      };

    case 'solana':
      return {
        provider: 'Solana Wallet',
        providerId: 'solana',
        steps: [
          {
            title: '1. Connect Solana Wallet',
            description: 'Click "Start Verification" to connect your Solana wallet. We support Phantom, Solflare, and other Solana wallets.',
          },
          {
            title: '2. Automatic Analysis',
            description: 'We will automatically analyze your wallet: balance (min 0.1 SOL), transaction count, and wallet age.',
          },
          {
            title: '3. Get Score',
            description: 'Receive up to 35 points based on your wallet activity, balance, and history.',
            link: 'https://docs.solana.com/'
          }
        ]
      };

    case 'gemini':
      return {
        provider: 'Gemini AI Turing Test',
        steps: [
          {
            title: '1. Answer Questions',
            description: 'You will be asked philosophical questions to verify you are human.',
          },
          {
            title: '2. AI Analysis',
            description: 'Gemini AI will analyze your responses to determine if they were written by a human.',
          },
          {
            title: '3. Verification',
            description: 'If your answers pass the Turing test, you will receive the verification.',
            link: 'https://ai.google.dev/docs'
          }
        ]
      };

    case 'discord':
      return {
        provider: 'Discord',
        providerId: 'discord',
        steps: [
          {
            title: '1. Connect Discord Account',
            description: 'Verify genuine Discord engagement and Sybil resistance. Connect your Discord account to verify your identity.',
            link: 'https://discord.com/developers/docs/topics/oauth2'
          },
          {
            title: '2. Account Verification',
            description: 'We will verify your Discord account: email verification, server memberships, and account activity.',
          },
          {
            title: '3. Get Score',
            description: 'Receive up to 2.8 points based on your Discord account verification.',
          }
        ]
      };

    case 'steam':
      return {
        provider: 'Steam',
        providerId: 'steam',
        steps: [
          {
            title: '1. Connect Steam Account',
            description: 'Verify your Steam gaming credentials and activity. Connect your Steam account to verify your identity.',
            link: 'https://steamcommunity.com/dev'
          },
          {
            title: '2. Profile Verification',
            description: 'We will verify your Steam profile: account age, profile visibility, and gaming activity.',
          },
          {
            title: '3. Get Score',
            description: 'Receive up to 2.8 points based on your Steam account verification.',
          }
        ]
      };

    case 'telegram':
      return {
        provider: 'Telegram',
        providerId: 'telegram',
        steps: [
          {
            title: '1. Open Telegram Bot',
            description: 'Click "Start Verification" to open Telegram bot. You will be redirected to Telegram app or web.',
          },
          {
            title: '2. Click /start in Bot',
            description: 'In the Telegram bot, click the /start button or send /start command. The bot will provide you with a verification link.',
          },
          {
            title: '3. Return to Website',
            description: 'Click the verification link provided by the bot to return to the website and complete verification.',
          },
          {
            title: '4. Get Score',
            description: 'Receive up to 10 points based on your Telegram account verification: username, profile photo, and account age.',
          }
        ]
      };

    case 'tiktok':
      return {
        provider: 'TikTok',
        providerId: 'tiktok',
        steps: [
          {
            title: '1. Connect TikTok Account',
            description: 'Click "Start Verification" to open TikTok OAuth. You will be redirected to TikTok to authorize the connection.',
            link: 'https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info/'
          },
          {
            title: '2. Account Verification',
            description: 'We will verify your TikTok account: username, avatar, and display name.',
          },
          {
            title: '3. Get Score',
            description: 'Receive up to 10 points based on your TikTok account verification.',
          }
        ]
      };

    default:
      return {
        provider: provider.name,
        steps: [{
          title: 'Setup Required',
          description: 'Please follow the provider-specific instructions.'
        }]
      };
  }
};

// Helper function to initiate OAuth flow with PKCE support
export const initiateOAuth = async (providerId: string, redirectUri: string): Promise<string | null> => {
  const provider = VERIFICATION_PROVIDERS[providerId];
  
  if (!provider || provider.type !== 'oauth' || !provider.authUrl) {
    return null;
  }

  // Check if client ID is configured
  // Vite automatically exposes VITE_* environment variables via import.meta.env
  // See: https://vitejs.dev/guide/env-and-mode.html
  const envKey = `VITE_${providerId.toUpperCase()}_CLIENT_ID`;
  const clientId = import.meta.env[envKey] || localStorage.getItem(`${providerId}_client_id`) || '';
  
  // If no client ID configured, return null - don't initiate OAuth
  if (!clientId || clientId.trim() === '') {
    console.warn(`[OAuth] ⚠️ Client ID not configured for ${providerId}. OAuth flow cannot be initiated.`);
    console.warn(`[OAuth] Configure ${envKey} in your .env file. See .env.example for setup instructions.`);
    console.warn(`[OAuth] For ${providerId}: Get Client ID from provider's developer console.`);
    return null;
  }

  // Generate state
  const state = Math.random().toString(36).substring(7);
  
  // Get passport ID for state
  const passportId = localStorage.getItem('passport_id') || 
                    localStorage.getItem('aleo_public_key')?.slice(0, 8) || 
                    'default';
  const stateWithPassport = `${state}_${passportId}`;
  
  // Generate PKCE for providers that support it (Twitter, Google)
  let codeChallenge: string | undefined;
  let codeVerifier: string | undefined;
  
  if (providerId === 'twitter' || providerId === 'google') {
    try {
      // Dynamic import to avoid issues if crypto is not available
      const { generatePKCE } = await import('./oauthHelper');
      const pkce = await generatePKCE();
      codeChallenge = pkce.codeChallenge;
      codeVerifier = pkce.codeVerifier;
      localStorage.setItem(`oauth_code_verifier_${providerId}`, codeVerifier);
    } catch (error) {
      console.warn(`[OAuth] PKCE generation failed for ${providerId}, continuing without PKCE:`, error);
    }
  }
  
  // Store state with passport ID
  localStorage.setItem(`oauth_state_${providerId}`, stateWithPassport);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider.scopes?.join(' ') || '',
    state: stateWithPassport
  });

  // Add PKCE parameters if available
  if (codeChallenge) {
    params.append('code_challenge', codeChallenge);
    params.append('code_challenge_method', 'S256');
  }

  return `${provider.authUrl}?${params.toString()}`;
};

