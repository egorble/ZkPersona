/**
 * Calculate Telegram verification score based on criteria
 * @param {Object} telegramData - Telegram user data
 * @returns {Object} { score: number, criteria: Array, maxScore: number }
 */
export const calculateTelegramScore = (telegramData) => {
  let score = 0;
  const criteria = [];

  // Criterion 1: Account exists
  if (telegramData.id) {
    score += 3.0;
    criteria.push({
      condition: 'Account exists',
      description: 'Active Telegram account',
      points: 3.0,
      achieved: true
    });
  } else {
    criteria.push({
      condition: 'Account exists',
      description: 'Active Telegram account',
      points: 3.0,
      achieved: false
    });
  }

  // Criterion 2: Username set
  if (telegramData.username) {
    score += 2.0;
    criteria.push({
      condition: 'Username set',
      description: 'Telegram username is configured',
      points: 2.0,
      achieved: true
    });
  } else {
    criteria.push({
      condition: 'Username set',
      description: 'Telegram username is configured',
      points: 2.0,
      achieved: false
    });
  }

  // Criterion 3: Profile photo
  if (telegramData.photo_url) {
    score += 2.0;
    criteria.push({
      condition: 'Profile photo',
      description: 'Profile photo is set',
      points: 2.0,
      achieved: true
    });
  } else {
    criteria.push({
      condition: 'Profile photo',
      description: 'Profile photo is set',
      points: 2.0,
      achieved: false
    });
  }

  // Criterion 4: Account age
  const accountAgeDays = telegramData.accountAgeDays || 0;
  if (accountAgeDays >= 365) {
    score += 3.0;
    criteria.push({
      condition: 'Account age ≥ 1 year',
      description: `Account age: ${accountAgeDays} days`,
      points: 3.0,
      achieved: true
    });
  } else if (accountAgeDays >= 180) {
    score += 1.5;
    criteria.push({
      condition: 'Account age ≥ 1 year',
      description: `Account age: ${accountAgeDays} days`,
      points: 3.0,
      achieved: false,
      partialPoints: 1.5
    });
  } else {
    criteria.push({
      condition: 'Account age ≥ 1 year',
      description: `Account age: ${accountAgeDays} days`,
      points: 3.0,
      achieved: false
    });
  }

  const finalScore = Math.max(0, Math.min(score, 10.0));

  return {
    score: finalScore,
    criteria,
    maxScore: 10.0
  };
};

