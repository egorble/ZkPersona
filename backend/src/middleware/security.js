// Security middleware for validation and protection

export default {
  validateUserId,
  validateWalletAddress,
  validateProvider,
  rateLimit,
  requestLogger
};

/**
 * Validate userId format (prevent injection)
 */
export const validateUserId = (req, res, next) => {
  const userId = req.params.id || req.body.userId;
  
  if (userId) {
    // Basic validation: alphanumeric, dots, dashes, underscores, @
    // Adjust regex based on your user ID format requirements
    if (!/^[a-zA-Z0-9._@-]+$/.test(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID format'
      });
    }
    
    // Limit length
    if (userId.length > 255) {
      return res.status(400).json({
        error: 'User ID too long'
      });
    }
  }
  
  next();
};

/**
 * Validate wallet address format
 */
export const validateWalletAddress = (req, res, next) => {
  const address = req.body.walletAddress || req.params.address;
  
  if (address) {
    // Ethereum address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Invalid wallet address format'
      });
    }
  }
  
  next();
};

/**
 * Validate provider name
 */
export const validateProvider = (req, res, next) => {
  const provider = req.params.provider || req.body.provider;
  const allowedProviders = ['google', 'twitter', 'discord', 'github', 'steam', 'evm', 'wallet'];
  
  if (provider && !allowedProviders.includes(provider.toLowerCase())) {
    return res.status(400).json({
      error: `Invalid provider: ${provider}. Allowed: ${allowedProviders.join(', ')}`
    });
  }
  
  next();
};

/**
 * Rate limiting helper (basic in-memory implementation)
 * In production, use Redis-based rate limiting
 */
const rateLimitStore = new Map();

export const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    const requests = rateLimitStore.get(key) || [];
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.'
      });
    }
    
    recentRequests.push(now);
    rateLimitStore.set(key, recentRequests);
    
    // Cleanup old entries every 5 minutes
    if (Math.random() < 0.01) {
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.every(time => now - time >= windowMs)) {
          rateLimitStore.delete(k);
        }
      }
    }
    
    next();
  };
};

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  
  next();
};

