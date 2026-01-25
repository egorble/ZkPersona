/**
 * Calculate TikTok verification score based on criteria
 * @param {Object} userInfo - TikTok user info from API
 * @returns {Object} { score: number, criteria: Array, maxScore: number }
 */
export const calculateTikTokScore = (userInfo) => {
  let score = 0;
  const criteria = [];

  // Criterion 1: Account exists
  if (userInfo.user && userInfo.user.open_id) {
    score += 3.0;
    criteria.push({
      condition: 'Account exists',
      description: 'Active TikTok account',
      points: 3.0,
      achieved: true
    });
  } else {
    criteria.push({
      condition: 'Account exists',
      description: 'Active TikTok account',
      points: 3.0,
      achieved: false
    });
  }

  // Criterion 2: Username set
  if (userInfo.user && userInfo.user.username) {
    score += 2.0;
    criteria.push({
      condition: 'Username set',
      description: 'TikTok username is configured',
      points: 2.0,
      achieved: true
    });
  } else {
    criteria.push({
      condition: 'Username set',
      description: 'TikTok username is configured',
      points: 2.0,
      achieved: false
    });
  }

  // Criterion 3: Avatar set
  if (userInfo.user && userInfo.user.avatar_url) {
    score += 2.0;
    criteria.push({
      condition: 'Profile avatar',
      description: 'Profile avatar is set',
      points: 2.0,
      achieved: true
    });
  } else {
    criteria.push({
      condition: 'Profile avatar',
      description: 'Profile avatar is set',
      points: 2.0,
      achieved: false
    });
  }

  // Criterion 4: Display name set
  if (userInfo.user && userInfo.user.display_name) {
    score += 3.0;
    criteria.push({
      condition: 'Display name set',
      description: 'Display name is configured',
      points: 3.0,
      achieved: true
    });
  } else {
    criteria.push({
      condition: 'Display name set',
      description: 'Display name is configured',
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

