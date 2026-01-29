// Centralized configuration management for all OAuth providers
// Loads from environment variables and provides validation

/**
 * Get configuration for a specific provider
 * Returns { clientId, clientSecret, redirectUri } or throws error if not configured
 */
export const getProviderConfig = (provider) => {
  const configs = {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/callback?provider=google`
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      redirectUri: process.env.TWITTER_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/callback?provider=twitter`
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      redirectUri: process.env.DISCORD_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/callback?provider=discord`
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: process.env.GITHUB_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/callback?provider=github`
    },
    steam: {
      apiKey: process.env.STEAM_API_KEY,
      redirectUri: process.env.STEAM_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/callback?provider=steam`
    }
  };
  
  const config = configs[provider.toLowerCase()];
  
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  
  // Validate required fields based on provider
  if (provider === 'steam') {
    if (!config.apiKey) {
      throw new Error(`STEAM_API_KEY not configured for ${provider}`);
    }
  } else {
    if (!config.clientId || !config.clientSecret) {
      throw new Error(`${provider.toUpperCase()}_CLIENT_ID or ${provider.toUpperCase()}_CLIENT_SECRET not configured`);
    }
  }
  
  return config;
};

/**
 * Get status of all provider configurations
 * Returns object with provider names as keys and { configured: boolean, missing: string[] }
 */
export const getProviderStatus = () => {
  const providers = ['google', 'twitter', 'discord', 'github', 'steam', 'telegram'];
  const status = {};
  
  providers.forEach(provider => {
    try {
      // TikTok and Telegram have their own config functions
      if (provider === 'tiktok') {
        const TIKTOK_CLIENT_ID = (process.env.TIKTOK_CLIENT_ID || '').trim();
        const TIKTOK_CLIENT_SECRET = (process.env.TIKTOK_CLIENT_SECRET || '').trim();
        if (!TIKTOK_CLIENT_ID || !TIKTOK_CLIENT_SECRET) {
          throw new Error('TikTok not configured');
        }
        status[provider] = { configured: true, missing: [] };
      } else if (provider === 'telegram') {
        const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
        if (!TELEGRAM_BOT_TOKEN) {
          throw new Error('Telegram not configured');
        }
        status[provider] = { configured: true, missing: [] };
      } else {
        getProviderConfig(provider);
        status[provider] = { configured: true, missing: [] };
      }
    } catch (error) {
      const missing = [];
      
      if (provider === 'steam') {
        if (!process.env.STEAM_API_KEY) missing.push('STEAM_API_KEY');
      } else if (provider === 'telegram') {
        if (!process.env.TELEGRAM_BOT_TOKEN) missing.push('TELEGRAM_BOT_TOKEN');
      } else {
        const upper = provider.toUpperCase();
        if (!process.env[`${upper}_CLIENT_ID`]) missing.push(`${upper}_CLIENT_ID`);
        if (!process.env[`${upper}_CLIENT_SECRET`]) missing.push(`${upper}_CLIENT_SECRET`);
      }
      
      status[provider] = { 
        configured: false, 
        missing,
        error: error.message 
      };
    }
  });
  
  return status;
};

/**
 * Validate redirect URI to prevent open redirects
 */
export const validateRedirectUri = (uri) => {
  if (!uri) return false;
  
  try {
    const url = new URL(uri);
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    
    const origin = `${url.protocol}//${url.host}`;
    return allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed));
  } catch {
    return false;
  }
};

/**
 * Get backend base URL
 */
export const getBackendUrl = () => {
  return process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || 'http://localhost:3001';
};

/**
 * Get frontend URL
 */
export const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
};

