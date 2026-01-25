// Scoring calculations for Identity Portal platforms

/**
 * Calculate Google account score
 * Max: 15 points
 */
export function calculateGoogleScore(userInfo: {
  id?: string;
  verified_email?: boolean;
  created_at?: string;
}): number {
  let score = 0;

  // Account exists and is active
  if (userInfo.id) {
    score += 5;
  }

  // Email is verified
  if (userInfo.verified_email) {
    score += 5;
  }

  // Account age ≥ 1 year (if available)
  if (userInfo.created_at) {
    const createdDate = new Date(userInfo.created_at);
    const ageInYears = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (ageInYears >= 1) {
      score += 5;
    }
  }

  return Math.min(score, 15); // Max 15 points
}

/**
 * Calculate Twitter/X account score
 * Max: 30 points
 */
export function calculateTwitterScore(userData: {
  id?: string;
  created_at?: string;
  public_metrics?: {
    tweet_count?: number;
    followers_count?: number;
  };
}): number {
  let score = 0;

  // Account exists
  if (userData.id) {
    score += 5;
  }

  // Account age (2+ years = 10, 1+ years = 5)
  if (userData.created_at) {
    const createdDate = new Date(userData.created_at);
    const ageInYears = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (ageInYears >= 2) {
      score += 10;
    } else if (ageInYears >= 1) {
      score += 5;
    }
  }

  // Activity metrics
  if (userData.public_metrics) {
    // Tweets
    if (userData.public_metrics.tweet_count && userData.public_metrics.tweet_count >= 100) {
      score += 5;
    }

    // Followers
    if (userData.public_metrics.followers_count && userData.public_metrics.followers_count >= 10) {
      score += 5;
    }
  }

  return Math.min(score, 30); // Max 30 points
}

/**
 * Calculate EVM wallet score
 * Max: 35 points
 */
export function calculateWalletScore(params: {
  balanceEth: number;
  transactionCount: number;
  walletAgeYears?: number;
}): number {
  let score = 0;

  // Balance criteria
  if (params.balanceEth >= 0.01) {
    score += 10;
  } else if (params.balanceEth > 0) {
    score += 5;
  }

  // Transaction history
  if (params.transactionCount >= 10) {
    score += 10;
  } else if (params.transactionCount >= 5) {
    score += 5;
  }

  // Wallet age
  if (params.walletAgeYears && params.walletAgeYears >= 1) {
    score += 5;
  }

  return Math.min(score, 35); // Max 35 points
}

/**
 * Platform max scores
 */
export const PLATFORM_MAX_SCORES = {
  google: 15,
  twitter: 30,
  wallet: 35,
  github: 25,
  gemini: 50
} as const;

/**
 * Total max score (all platforms)
 */
export const TOTAL_MAX_SCORE = Object.values(PLATFORM_MAX_SCORES).reduce((sum, score) => sum + score, 0);

