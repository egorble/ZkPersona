export const calculateTwitterScore = (userInfo) => {
  let score = 0;
  const criteria = [];

  // Account exists
  if (userInfo.id) {
    score += 5;
    criteria.push({ condition: 'Account exists', points: 5 });
  }

  // Account age
  if (userInfo.created_at) {
    const createdDate = new Date(userInfo.created_at);
    const ageYears = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    if (ageYears >= 2) {
      score += 10;
      criteria.push({ condition: 'Account age ≥ 2 years', points: 10 });
    } else if (ageYears >= 1) {
      score += 5;
      criteria.push({ condition: 'Account age ≥ 1 year', points: 5 });
    }
  }

  // Tweet count
  if (userInfo.public_metrics?.tweet_count >= 100) {
    score += 5;
    criteria.push({ condition: '≥ 100 tweets', points: 5 });
  }

  // Followers count
  if (userInfo.public_metrics?.followers_count >= 10) {
    score += 5;
    criteria.push({ condition: '≥ 10 followers', points: 5 });
  }

  // Verified account
  if (userInfo.verified) {
    score += 5;
    criteria.push({ condition: 'Verified account', points: 5 });
  }

  return {
    score: Math.min(score, 30), // Max 30 points
    criteria,
    maxScore: 30
  };
};

