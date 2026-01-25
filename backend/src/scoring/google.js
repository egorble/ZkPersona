export const calculateGoogleScore = (userInfo) => {
  let score = 0;
  const criteria = [];

  // Account exists
  if (userInfo.sub) {
    score += 5;
    criteria.push({ condition: 'Account exists', points: 5 });
  }

  // Email verified
  if (userInfo.email_verified) {
    score += 5;
    criteria.push({ condition: 'Email verified', points: 5 });
  }

  // Account age (if available)
  // Google doesn't provide creation date directly, but we can check if account is active
  if (userInfo.sub) {
    // Assume account is at least 1 year old if it has verified email
    if (userInfo.email_verified) {
      score += 5;
      criteria.push({ condition: 'Account age ≥ 1 year (estimated)', points: 5 });
    }
  }

  return {
    score: Math.min(score, 15), // Max 15 points
    criteria,
    maxScore: 15
  };
};

