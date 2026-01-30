/**
 * Calculate Solana wallet verification score based on criteria
 * @param {Object} walletData - Wallet data from Solscan/RPC
 * @returns {Object} { score: number, criteria: Array, maxScore: number }
 */
export const calculateSolanaScore = (walletData) => {
  let score = 0;
  const criteria = [];
  const walletAgeDays = walletData.walletAgeDays || 0;

  // 0. Base points for successful verification (wallet connected + signature verified)
  const basePoints = 5;
  score += basePoints;
  criteria.push({
    condition: 'Wallet connected & signature verified',
    description: 'Phantom/Solflare ownership verified',
    points: basePoints,
    achieved: true
  });

  // 1. Points for SOL balance (Cumulative Scoring)
  const balanceSol = walletData.balanceSol || 0;
  
  if (balanceSol >= 0.1) score += 5;
  if (balanceSol >= 1.0) score += 5;

  // Balance Criteria Display
  criteria.push({
    condition: 'Tier 2: Balance ≥ 1.0 SOL',
    description: `Current balance: ${balanceSol.toFixed(4)} SOL`,
    points: 5, // Cumulative (+5 on top of base 5)
    achieved: balanceSol >= 1.0
  });

  criteria.push({
    condition: 'Tier 1: Balance ≥ 0.1 SOL',
    description: `Current balance: ${balanceSol.toFixed(4)} SOL`,
    points: 5,
    achieved: balanceSol >= 0.1
  });

  // 2. Points for transaction count (Cumulative Scoring)
  const txCount = walletData.txCount || 0;
  
  if (txCount >= 20) score += 5;
  if (txCount >= 100) score += 5;

  // Transaction Criteria Display
  criteria.push({
    condition: 'Tier 2: ≥ 100 transactions',
    description: `Total transactions: ${txCount}`,
    points: 5, // Cumulative (+5 on top of base 5)
    achieved: txCount >= 100
  });

  criteria.push({
    condition: 'Tier 1: ≥ 20 transactions',
    description: `Total transactions: ${txCount}`,
    points: 5,
    achieved: txCount >= 20
  });

  // 3. Points for wallet age (in days)
  if (walletAgeDays >= 365) {
    score += 10;
  }

  criteria.push({
    condition: 'Wallet age ≥ 1 year',
    description: `Wallet age: ${Math.floor(walletAgeDays)} days`,
    points: 10,
    achieved: walletAgeDays >= 365
  });

  // 4. Bonus for regular activity (last 30 days)
  const hasRecentActivity = walletData.hasRecentActivity || false;
  if (hasRecentActivity) {
    score += 5;
  }

  criteria.push({
    condition: 'Recent activity (last 30 days)',
    description: hasRecentActivity ? 'Wallet has transactions in the last 30 days' : 'No transactions in the last 30 days',
    points: 5,
    achieved: hasRecentActivity
  });

  const maxScore = 40; // 5 base + 5+5 balance + 5+5 tx + 10 age + 5 recent
  const finalScore = Math.max(0, Math.min(score, maxScore));

  return {
    score: finalScore,
    criteria,
    maxScore
  };
};
