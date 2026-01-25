/**
 * Calculate Discord verification score based on criteria
 * IMPORTANT: Only awards points for criteria that are actually met
 * @param {Object} userInfo - Discord user info from API
 * @param {Array} guilds - Array of Discord guilds/servers user is member of
 * @returns {Object} { score: number, criteria: Array, maxScore: number }
 */
export const calculateDiscordScore = (userInfo, guilds) => {
  let score = 0;
  const criteria = [];

  // Criterion 1: Account exists (required - always true if verification passed)
  // This is a basic requirement, so we award points if account exists
  if (userInfo.id) {
    score += 1.0;
    criteria.push({ 
      condition: 'Account exists', 
      description: 'Active Discord account',
      points: 1.0,
      achieved: true
    });
  } else {
    criteria.push({ 
      condition: 'Account exists', 
      description: 'Active Discord account',
      points: 1.0,
      achieved: false
    });
  }

  // Criterion 2: Verified email (optional - gives bonus points)
  if (userInfo.verified === true) {
    score += 0.8;
    criteria.push({ 
      condition: 'Email verified', 
      description: 'Email address is confirmed',
      points: 0.8,
      achieved: true
    });
  } else {
    criteria.push({ 
      condition: 'Email verified', 
      description: 'Email address is confirmed',
      points: 0.8,
      achieved: false
    });
  }

  // Criterion 3: Guild membership (indicates account activity)
  // Note: validateUser() requires ≥10 servers, so if verification passed, this will be true
  // But we still check here to be safe and award points accordingly
  if (guilds && Array.isArray(guilds)) {
    if (guilds.length >= 5) {
      score += 1.0;
      criteria.push({ 
        condition: '≥ 5 server memberships', 
        description: `Active Discord user (${guilds.length} servers)`,
        points: 1.0,
        achieved: true
      });
    } else if (guilds.length >= 1) {
      score += 0.5;
      criteria.push({ 
        condition: '≥ 5 server memberships', 
        description: `Active Discord user (${guilds.length} servers)`,
        points: 1.0,
        achieved: false,
        partialPoints: 0.5
      });
    } else {
      criteria.push({ 
        condition: '≥ 5 server memberships', 
        description: 'Active Discord user',
        points: 1.0,
        achieved: false
      });
    }

    // Criterion 4: Official Aleo Blockchain Server membership (+5 bonus points)
    // Official Aleo server IDs
    // Note: Replace with actual Aleo official Discord server ID
    // You can find server ID by enabling Developer Mode in Discord and right-clicking the server
    const ALEO_OFFICIAL_SERVER_IDS = [
      // Add actual Aleo official server ID here
      // Example format: '123456789012345678'
    ];
    
    // Also check for common Aleo server name patterns
    const ALEO_SERVER_NAME_PATTERNS = [
      'aleo',
      'aleo blockchain',
      'aleo official',
      'aleo community'
    ];
    
    // Check if user is member of Aleo official server
    const isOnAleoServer = guilds.some(guild => {
      // Check by server ID or name
      const guildId = guild.id?.toString() || '';
      const guildName = (guild.name || '').toLowerCase();
      
      // Check by ID
      if (ALEO_OFFICIAL_SERVER_IDS.includes(guildId)) {
        return true;
      }
      
      // Check by name patterns (case-insensitive)
      const matchesPattern = ALEO_SERVER_NAME_PATTERNS.some(pattern => 
        guildName.includes(pattern.toLowerCase())
      );
      
      if (matchesPattern) {
        return true;
      }
      
      return false;
    });

    if (isOnAleoServer) {
      score += 5.0;
      criteria.push({ 
        condition: 'Aleo Official Server', 
        description: 'Member of official Aleo blockchain Discord server',
        points: 5.0,
        achieved: true
      });
    } else {
      criteria.push({ 
        condition: 'Aleo Official Server', 
        description: 'Member of official Aleo blockchain Discord server',
        points: 5.0,
        achieved: false
      });
    }
  } else {
    criteria.push({ 
      condition: '≥ 5 server memberships', 
      description: 'Active Discord user',
      points: 1.0,
      achieved: false
    });
    criteria.push({ 
      condition: 'Aleo Official Server', 
      description: 'Member of official Aleo blockchain Discord server',
      points: 5.0,
      achieved: false
    });
  }

  // Ensure score is never negative and doesn't exceed max (now 7.8: 2.8 base + 5 bonus)
  const finalScore = Math.max(0, Math.min(score, 7.8));

  return {
    score: finalScore,
    criteria,
    maxScore: 7.8 // Updated max score: 2.8 base + 5 bonus
  };
};

