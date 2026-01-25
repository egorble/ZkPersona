/**
 * Calculate EVM wallet verification score based on criteria
 * @param {Object} walletData - Wallet data from Etherscan
 * @returns {Object} { score: number, criteria: Array, maxScore: number }
 */
export const calculateEVMScore = (walletData) => {
  let score = 0;
  const criteria = [];
  const walletAgeDays = walletData.walletAgeDays || 0;

  // 1. Points for ETH balance
  const balanceEth = walletData.balanceEth || 0;
  if (balanceEth >= 0.1) {
    score += 10;
    criteria.push({
      condition: 'Balance ≥ 0.1 ETH',
      description: `Current balance: ${balanceEth.toFixed(4)} ETH`,
      points: 10,
      achieved: true
    });
  } else if (balanceEth >= 0.05) {
    score += 7;
    criteria.push({
      condition: 'Balance ≥ 0.05 ETH',
      description: `Current balance: ${balanceEth.toFixed(4)} ETH`,
      points: 10,
      achieved: false,
      partialPoints: 7
    });
  } else if (balanceEth >= 0.01) {
    score += 5;
    criteria.push({
      condition: 'Balance ≥ 0.01 ETH',
      description: `Current balance: ${balanceEth.toFixed(4)} ETH`,
      points: 10,
      achieved: false,
      partialPoints: 5
    });
  } else if (balanceEth >= 0.001) {
    score += 2;
    criteria.push({
      condition: 'Balance ≥ 0.001 ETH',
      description: `Current balance: ${balanceEth.toFixed(4)} ETH`,
      points: 10,
      achieved: false,
      partialPoints: 2
    });
  } else {
    criteria.push({
      condition: 'Balance ≥ 0.1 ETH',
      description: `Current balance: ${balanceEth.toFixed(4)} ETH`,
      points: 10,
      achieved: false
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

