// Configuration validation utility

export const checkProviderConfig = (provider) => {
  const configs = {
    google: {
      required: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      optional: []
    },
    twitter: {
      required: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'],
      optional: []
    },
    github: {
      required: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
      optional: []
    },
    discord: {
      required: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
      optional: []
    },
    steam: {
      required: [],
      optional: ['STEAM_API_KEY']
    },
    evm: {
      required: [],
      optional: ['ETHERSCAN_API_KEY']
    }
  };

  const config = configs[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const missing = config.required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `${provider.toUpperCase()} not configured. Missing: ${missing.join(', ')}. ` +
      `Please add these to backend/.env file.`
    );
  }

  return true;
};

export const getProviderStatus = () => {
  const providers = ['google', 'twitter', 'github', 'discord', 'steam', 'evm'];
  const status = {};

  for (const provider of providers) {
    try {
      checkProviderConfig(provider);
      status[provider] = { configured: true };
    } catch (error) {
      status[provider] = { 
        configured: false, 
        error: error.message 
      };
    }
  }

  return status;
};

