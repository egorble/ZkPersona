export const calculateGitHubScore = (userInfo, publicRepos) => {
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
    
    if (ageYears >= 0.5) {
      score += 10;
      criteria.push({ condition: 'Account age ≥ 6 months', points: 10 });
    }
  }

  // Public repos
  if (publicRepos >= 3) {
    score += 10;
    criteria.push({ condition: '≥ 3 public repositories', points: 10 });
  } else if (publicRepos >= 1) {
    score += 5;
    criteria.push({ condition: 'Has public repositories', points: 5 });
  }

  // Followers
  if (userInfo.followers >= 10) {
    score += 5;
    criteria.push({ condition: '≥ 10 followers', points: 5 });
  }

  return {
    score: Math.min(score, 30), // Max 30 points
    criteria,
    maxScore: 30
  };
};

