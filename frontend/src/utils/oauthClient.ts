// Frontend OAuth Client - Direct OAuth URL generation
// Works without backend API keys (uses public Client IDs)

/**
 * Public OAuth Client IDs (can be used by anyone)
 * These are public identifiers, not secrets
 */
const OAUTH_CLIENTS = {
  discord: {
    // Discord OAuth - Client ID only (no secret needed for PKCE)
    // Can be set via env or use default public client
    clientId: import.meta.env.VITE_DISCORD_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/oauth/callback?provider=discord`,
    scopes: 'identify email guilds guilds.members.read connections'
  },
  twitter: {
    // Twitter OAuth 2.0 with PKCE
    clientId: import.meta.env.VITE_TWITTER_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/oauth/callback?provider=twitter`,
    scopes: 'tweet.read users.read offline.access'
  },
  github: {
    // GitHub OAuth
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/oauth/callback?provider=github`,
    scopes: 'read:user user:email'
  },
  google: {
    // Google OAuth
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/oauth/callback?provider=google`,
    scopes: 'openid profile email'
  }
};

/**
 * Generate OAuth authorization URL for Discord
 */
export const generateDiscordAuthUrl = (state: string = ''): string => {
  const config = OAUTH_CLIENTS.discord;
  
  if (!config.clientId) {
    throw new Error('Discord CLIENT_ID not configured. Please set VITE_DISCORD_CLIENT_ID in frontend .env');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes,
    state: state || generateState()
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
};

/**
 * Generate OAuth authorization URL for Twitter (with PKCE)
 */
export const generateTwitterAuthUrl = async (state: string = ''): Promise<{ url: string; codeVerifier: string }> => {
  const config = OAUTH_CLIENTS.twitter;
  
  if (!config.clientId) {
    throw new Error('Twitter CLIENT_ID not configured. Please set VITE_TWITTER_CLIENT_ID in frontend .env');
  }

  // Generate PKCE
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const finalState = state || generateState();
  
  // Store codeVerifier in sessionStorage for later use
  sessionStorage.setItem(`twitter_code_verifier_${finalState}`, codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes,
    state: finalState,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  return {
    url: `https://twitter.com/i/oauth2/authorize?${params.toString()}`,
    codeVerifier
  };
};

/**
 * Generate OAuth authorization URL for GitHub
 */
export const generateGitHubAuthUrl = (state: string = ''): string => {
  const config = OAUTH_CLIENTS.github;
  
  if (!config.clientId) {
    throw new Error('GitHub CLIENT_ID not configured. Please set VITE_GITHUB_CLIENT_ID in frontend .env');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes,
    state: state || generateState()
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

/**
 * Generate OAuth authorization URL for Google
 */
export const generateGoogleAuthUrl = (state: string = ''): string => {
  const config = OAUTH_CLIENTS.google;
  
  if (!config.clientId) {
    throw new Error('Google CLIENT_ID not configured. Please set VITE_GOOGLE_CLIENT_ID in frontend .env');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes,
    state: state || generateState(),
    access_type: 'offline',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/**
 * Generate OAuth URL for any provider
 */
export const generateOAuthUrl = async (provider: string, state?: string): Promise<string | { url: string; codeVerifier: string }> => {
  switch (provider.toLowerCase()) {
    case 'discord':
      return generateDiscordAuthUrl(state);
    case 'twitter':
      return await generateTwitterAuthUrl(state);
    case 'github':
      return generateGitHubAuthUrl(state);
    case 'google':
      return generateGoogleAuthUrl(state);
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
};

/**
 * Generate random state for CSRF protection
 */
const generateState = (): string => {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate PKCE code verifier
 */
const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Generate PKCE code challenge from verifier (async)
 */
const generateCodeChallenge = async (verifier: string): Promise<string> => {
  // Use Web Crypto API for SHA-256 hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to base64url
  const hashArray = Array.from(new Uint8Array(hash));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  return hashBase64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

