// OAuth Helper for automatic token exchange
// NOTE: In production, this should be done via backend API for security

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Exchange authorization code for access token
 * WARNING: This is a client-side implementation for demo purposes.
 * In production, this MUST be done server-side to protect Client Secret.
 */
export const exchangeCodeForToken = async (
  providerId: string,
  code: string,
  redirectUri: string
): Promise<string> => {
  // For production, call your backend API:
  // const response = await fetch('/api/oauth/token', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ provider: providerId, code, redirectUri })
  // });
  // const { accessToken } = await response.json();
  // return accessToken;

  // Client-side implementation (for demo only - requires public client)
  const clientId = import.meta.env[`VITE_${providerId.toUpperCase()}_CLIENT_ID`];
  
  if (!clientId) {
    throw new Error(`OAuth Client ID not configured for ${providerId}`);
  }

  let tokenUrl: string;
  let body: URLSearchParams;

  switch (providerId) {
    case 'google':
      tokenUrl = 'https://oauth2.googleapis.com/token';
      body = new URLSearchParams({
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });
      // Note: Google requires client_secret for server-side apps
      // For public clients (mobile/web), use PKCE flow instead
      break;

    case 'twitter':
      tokenUrl = 'https://api.twitter.com/2/oauth2/token';
      body = new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: localStorage.getItem(`oauth_code_verifier_${providerId}`) || ''
      });
      // Twitter OAuth 2.0 requires code_verifier for PKCE
      break;

    case 'github':
      tokenUrl = 'https://github.com/login/oauth/access_token';
      body = new URLSearchParams({
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        client_secret: '' // Should be server-side only!
      });
      // GitHub requires client_secret - this won't work client-side
      break;

    default:
      throw new Error(`Unsupported OAuth provider: ${providerId}`);
  }

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const data: OAuthTokenResponse = await response.json();
    
    if (!data.access_token) {
      throw new Error('No access token in response');
    }

    return data.access_token;
  } catch (error) {
    console.error(`[OAuth] Token exchange error for ${providerId}:`, error);
    throw error;
  }
};

/**
 * Generate PKCE code verifier and challenge for OAuth 2.0
 */
export const generatePKCE = async (): Promise<{ codeVerifier: string; codeChallenge: string }> => {
  // Generate random code verifier
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Generate code challenge (SHA256 hash of verifier)
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { codeVerifier, codeChallenge };
};

