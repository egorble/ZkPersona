export const calculateSteamScore = (steamId, profileData) => {
  let score = 0;
  const criteria = [];

  // Account exists
  if (steamId) {
    score += 1.0;
    criteria.push({ condition: 'Account exists', points: 1.0 });
  }

  // Profile visibility (if API available)
  if (profileData) {
    // Profile is public
    if (profileData.profilestate === 1) {
      score += 0.8;
      criteria.push({ condition: 'Public profile', points: 0.8 });
    }

    // Account age (estimated from profile)
    // Steam doesn't provide creation date, but we can check if profile is established
    if (profileData.profilestate === 1 && profileData.communityvisibilitystate === 3) {
      score += 1.0;
      criteria.push({ condition: 'Established account', points: 1.0 });
    }
  }

  return {
    score: Math.min(score, 2.8), // Max 2.8 points
    criteria,
    maxScore: 2.8
  };
};

