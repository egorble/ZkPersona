/**
 * Calculate Solana wallet verification score based on criteria
 * @param {Object} walletData - Wallet data from Solscan
 * @returns {Object} { score: number, criteria: Array, maxScore: number }
 */
export const calculateSolanaScore = (walletData) => {
  let score = 0;
  const criteria = [];
  const walletAgeDays = walletData.walletAgeDays || 0;

  // 1. Points for SOL balance (minimum 0.1 SOL required)
  const balanceSol = walletData.balanceSol || 0;
  
  // Minimum balance requirement: 0.1 SOL
  if (balanceSol < 0.1) {
    criteria.push({
      condition: 'Balance ≥ 0.1 SOL (minimum required)',
      description: `Current balance: ${balanceSol.toFixed(4)} SOL (insufficient)`,
      points: 10,
      achieved: false
    });
  } else if (balanceSol >= 1.0) {
    score += 10;
    criteria.push({
      condition: 'Balance ≥ 1.0 SOL',
      description: `Current balance: ${balanceSol.toFixed(4)} SOL`,
      points: 10,
      achieved: true
    });
  } else if (balanceSol >= 0.5) {
    score += 7;
    criteria.push({
      condition: 'Balance ≥ 0.5 SOL',
      description: `Current balance: ${balanceSol.toFixed(4)} SOL`,
      points: 10,
      achieved: false,
      partialPoints: 7
    });
  } else if (balanceSol >= 0.1) {
    score += 5;
    criteria.push({
      condition: 'Balance ≥ 0.1 SOL (minimum)',
      description: `Current balance: ${balanceSol.toFixed(4)} SOL`,
      points: 10,
      achieved: false,
      partialPoints: 5
    });
  }

  // 2. Points for transaction count
  const txCount = walletData.txCount || 0;
  if (txCount >= 100) {
    score += 10;
    criteria.push({
      condition: '≥ 100 transactions',
      description: `Total transactions: ${txCount}`,
      points: 10,
      achieved: true
    });
  } else if (txCount >= 50) {
    score += 7;
    criteria.push({
      condition: '≥ 100 transactions',
      description: `Total transactions: ${txCount}`,
      points: 10,
      achieved: false,
      partialPoints: 7
    });
  } else if (txCount >= 20) {
    score += 5;
    criteria.push({
      condition: '≥ 100 transactions',
      description: `Total transactions: ${txCount}`,
      points: 10,
      achieved: false,
      partialPoints: 5
    });
  } else if (txCount >= 5) {
    score += 3;
    criteria.push({
      condition: '≥ 100 transactions',
      description: `Total transactions: ${txCount}`,
      points: 10,
      achieved: false,
      partialPoints: 3
    });
  } else {
    criteria.push({
      condition: '≥ 100 transactions',
      description: `Total transactions: ${txCount}`,
      points: 10,
      achieved: false
    });
  }

  // 3. Points for wallet age (in days)
  if (walletAgeDays >= 365) {
    score += 10;
    criteria.push({
      condition: 'Wallet age ≥ 1 year',
      description: `Wallet age: ${Math.floor(walletAgeDays)} days`,
      points: 10,
      achieved: true
    });
  } else if (walletAgeDays >= 180) {
    score += 7;
    criteria.push({
      condition: 'Wallet age ≥ 1 year',
      description: `Wallet age: ${Math.floor(walletAgeDays)} days`,
      points: 10,
      achieved: false,
      partialPoints: 7
    });
  } else if (walletAgeDays >= 90) {
    score += 5;
    criteria.push({
      condition: 'Wallet age ≥ 1 year',
      description: `Wallet age: ${Math.floor(walletAgeDays)} days`,
      points: 10,
      achieved: false,
      partialPoints: 5
    });
  } else if (walletAgeDays >= 30) {
    score += 3;
    criteria.push({
      condition: 'Wallet age ≥ 1 year',
      description: `Wallet age: ${Math.floor(walletAgeDays)} days`,
      points: 10,
      achieved: false,
      partialPoints: 3
    });
  } else {
    criteria.push({
      condition: 'Wallet age ≥ 1 year',
      description: `Wallet age: ${Math.floor(walletAgeDays)} days`,
      points: 10,
      achieved: false
    });
  }

  // 4. Bonus for regular activity (last 30 days)
  const hasRecentActivity = walletData.hasRecentActivity || false;
  if (hasRecentActivity) {
    score += 5;
    criteria.push({
      condition: 'Recent activity (last 30 days)',
      description: 'Wallet has transactions in the last 30 days',
      points: 5,
      achieved: true
    });
  } else {
    criteria.push({
      condition: 'Recent activity (last 30 days)',
      description: 'No transactions in the last 30 days',
      points: 5,
      achieved: false
    });
  }

  const finalScore = Math.max(0, Math.min(score, 35));

  return {
    score: finalScore,
    criteria,
    maxScore: 35
  };
};
