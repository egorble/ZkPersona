// Database connection and models for verification system
// Supports PostgreSQL for production, in-memory fallback for development

import pg from 'pg';
const { Pool } = pg;
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Database connection pool
let pool = null;

// Local DB file for development persistence
const DB_FILE = path.join(process.cwd(), 'local_db.json');

/**
 * Initialize database connection
 */
export const initDatabase = async () => {
  const dbUrl = process.env.DATABASE_URL;
  
  if (dbUrl) {
    try {
      pool = new Pool({
        connectionString: dbUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      // Test connection
      await pool.query('SELECT NOW()');
      console.log('[Database] ✅ Connected to PostgreSQL');
      
      // Create tables if they don't exist
      await createTables();
    } catch (error) {
      console.error('[Database] ❌ PostgreSQL connection failed, using in-memory storage:', error.message);
      pool = null;
      loadLocalDb();
    }
  } else {
    console.log('[Database] ⚠️ DATABASE_URL not set, using in-memory storage');
    loadLocalDb();
  }
};

/**
 * Load local JSON database
 */
const loadLocalDb = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (data.verifications) inMemoryStorage.verifications = new Map(data.verifications);
      if (data.sessions) {
        // Restore dates in sessions
        const sessions = new Map(data.sessions);
        for (const [key, session] of sessions.entries()) {
          if (session.createdAt) session.createdAt = new Date(session.createdAt);
          if (session.expiresAt) session.expiresAt = new Date(session.expiresAt);
        }
        inMemoryStorage.sessions = sessions;
      }
      if (data.profiles) inMemoryStorage.profiles = new Map(data.profiles);
      console.log('[Database] 📂 Loaded local DB from', DB_FILE);
      console.log(`[Database] Stats: ${inMemoryStorage.sessions.size} sessions, ${inMemoryStorage.verifications.size} verifications`);
    }
  } catch (e) {
    console.error('[Database] ❌ Failed to load local DB:', e.message);
  }
};

/**
 * Save local JSON database
 */
const saveLocalDb = () => {
  if (pool) return; // Don't save if using Postgres
  try {
    const data = {
      verifications: Array.from(inMemoryStorage.verifications.entries()),
      sessions: Array.from(inMemoryStorage.sessions.entries()),
      profiles: Array.from(inMemoryStorage.profiles.entries())
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[Database] ❌ Failed to save local DB:', e.message);
  }
};

/**
 * Create required database tables
 */
const createTables = async () => {
  if (!pool) return;
  
  try {
    // Verifications table - stores all verification records
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        provider_account_id VARCHAR(255),
        score INTEGER DEFAULT 0,
        max_score INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        metadata JSONB,
        access_token_hash VARCHAR(255),
        verified_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, provider)
      )
    `);
    
    // Sessions table - for OAuth state management
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255),
        provider VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        state_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `);
    
    // Profiles table - stores user profile data (Discord, etc.)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) UNIQUE NOT NULL,
        discord_id VARCHAR(255),
        discord_username VARCHAR(255),
        discord_discriminator VARCHAR(10),
        discord_nickname VARCHAR(255),
        discord_avatar_url TEXT,
        discord_profile_link TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON verifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_verifications_provider ON verifications(provider);
      CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON verification_sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON verification_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON profiles(discord_id);
    `);
    
    console.log('[Database] ✅ Tables created/verified');
  } catch (error) {
    console.error('[Database] ❌ Error creating tables:', error.message);
  }
};

/**
 * In-memory storage fallback (when DB not available)
 */
const inMemoryStorage = {
  verifications: new Map(),
  sessions: new Map(),
  profiles: new Map()
};

// Cleanup expired sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of inMemoryStorage.sessions.entries()) {
    if (session.expiresAt && session.expiresAt < now) {
      inMemoryStorage.sessions.delete(id);
    }
  }
}, 60 * 60 * 1000);

/**
 * Save verification result to database
 */
export const saveVerification = async (userId, provider, data) => {
  const {
    providerAccountId,
    score = 0,
    maxScore = 0,
    status = 'verified',
    metadata = {},
    accessTokenHash = null,
    expiresAt = null
  } = data;
  
  const verificationData = {
    userId,
    provider,
    providerAccountId: providerAccountId || null,
    score,
    maxScore,
    status,
    metadata,
    accessTokenHash,
    verifiedAt: new Date(),
    expiresAt: expiresAt ? new Date(expiresAt) : null
  };
  
  if (pool) {
    // PostgreSQL storage
    try {
      await pool.query(`
        INSERT INTO verifications 
        (user_id, provider, provider_account_id, score, max_score, status, metadata, access_token_hash, verified_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id, provider) 
        DO UPDATE SET
          provider_account_id = EXCLUDED.provider_account_id,
          score = EXCLUDED.score,
          max_score = EXCLUDED.max_score,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          access_token_hash = EXCLUDED.access_token_hash,
          verified_at = EXCLUDED.verified_at,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `, [
        userId, provider, providerAccountId, score, maxScore, status,
        JSON.stringify(metadata), accessTokenHash, verificationData.verifiedAt, verificationData.expiresAt
      ]);
    } catch (error) {
      console.error('[Database] Error saving verification:', error);
      throw error;
    }
  } else {
    // In-memory storage
    const key = `${userId}:${provider}`;
    inMemoryStorage.verifications.set(key, verificationData);
    saveLocalDb();
    console.log('[Database] 💾 Saved verification to memory:', {
      key: key.substring(0, 50) + '...',
      userId: userId.substring(0, 20) + '...',
      provider,
      score: verificationData.score,
      totalStored: inMemoryStorage.verifications.size
    });
  }
  
  return verificationData;
};

/**
 * Get verification by user ID and provider
 */
export const getVerification = async (userId, provider) => {
  if (pool) {
    const result = await pool.query(`
      SELECT * FROM verifications 
      WHERE user_id = $1 AND provider = $2
    `, [userId, provider]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      userId: row.user_id,
      provider: row.provider,
      providerAccountId: row.provider_account_id,
      score: row.score,
      maxScore: row.max_score,
      status: row.status,
      metadata: row.metadata,
      verifiedAt: row.verified_at,
      expiresAt: row.expires_at
    };
  } else {
    return inMemoryStorage.verifications.get(`${userId}:${provider}`) || null;
  }
};

/**
 * Get all verifications for a user
 */
export const getUserVerifications = async (userId) => {
  console.log('[Database] 🔍 Getting verifications for userId:', userId?.substring(0, 20) + '...');
  
  if (pool) {
    const result = await pool.query(`
      SELECT * FROM verifications 
      WHERE user_id = $1
      ORDER BY verified_at DESC
    `, [userId]);
    
    console.log('[Database] 📦 Found verifications in PostgreSQL:', {
      count: result.rows.length,
      providers: result.rows.map(r => r.provider),
      userIds: result.rows.map(r => r.user_id?.substring(0, 10) + '...')
    });
    
    return result.rows.map(row => {
      // Parse metadata to extract criteria
      let metadata = {};
      let criteria = [];
      
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
        // Extract criteria from metadata (stored by Discord provider)
        criteria = metadata.criteria || metadata.result?.criteria || [];
      } catch (e) {
        console.warn('[Database] Failed to parse metadata:', e);
      }
      
      return {
      userId: row.user_id,
      provider: row.provider,
      providerAccountId: row.provider_account_id,
      score: row.score,
      maxScore: row.max_score,
      status: row.status,
        metadata: metadata,
        criteria: criteria, // Include criteria in response
      verifiedAt: row.verified_at,
      expiresAt: row.expires_at
      };
    });
  } else {
    const verifications = [];
    for (const [key, value] of inMemoryStorage.verifications.entries()) {
      if (key.startsWith(`${userId}:`)) {
        verifications.push(value);
      }
    }
    // Extract criteria from metadata for in-memory storage
    const verificationsWithCriteria = verifications.map(v => {
      let criteria = [];
      try {
        const metadata = v.metadata || {};
        criteria = metadata.criteria || metadata.result?.criteria || [];
      } catch (e) {
        // Ignore
      }
      return {
        ...v,
        criteria: criteria
      };
    });
    
    console.log('[Database] 📦 Found verifications in memory:', {
      count: verificationsWithCriteria.length,
      providers: verificationsWithCriteria.map(v => v.provider),
      debug_userId: userId,
      debug_totalMapSize: inMemoryStorage.verifications.size,
      debug_firstKey: inMemoryStorage.verifications.size > 0 ? inMemoryStorage.verifications.keys().next().value : 'empty'
    });
    
    return verificationsWithCriteria;
  }
};

/**
 * Delete verification for a user and provider
 */
export const deleteVerification = async (userId, provider) => {
  console.log('[Database] 🗑️ Deleting verification:', { userId: userId?.substring(0, 20) + '...', provider });
  
  if (pool) {
    try {
      const result = await pool.query(`
        DELETE FROM verifications 
        WHERE user_id = $1 AND provider = $2
      `, [userId, provider]);
      
      console.log('[Database] ✅ Deleted verification from PostgreSQL:', {
        rowsAffected: result.rowCount,
        userId: userId?.substring(0, 20) + '...',
        provider
      });
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('[Database] Error deleting verification:', error);
      throw error;
    }
  } else {
    // In-memory storage
    const key = `${userId}:${provider}`;
    const deleted = inMemoryStorage.verifications.delete(key);
    saveLocalDb();
    console.log('[Database] ✅ Deleted verification from memory:', {
      deleted,
      key: key.substring(0, 50) + '...',
      remaining: inMemoryStorage.verifications.size
    });
    return deleted;
  }
};

/**
 * Get user total score
 */
export const getUserScore = async (userId) => {
  const verifications = await getUserVerifications(userId);
  return verifications.reduce((total, v) => {
    if (v.status === 'verified' && (!v.expiresAt || new Date(v.expiresAt) > new Date())) {
      return total + v.score;
    }
    return total;
  }, 0);
};

/**
 * Save verification session (for OAuth state)
 */
export const saveSession = async (sessionId, provider, userId, stateData) => {
  const session = {
    sessionId,
    provider,
    userId: userId || null,
    status: 'pending',
    stateData,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  };
  
  if (pool) {
    await pool.query(`
      INSERT INTO verification_sessions (session_id, user_id, provider, status, state_data, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (session_id) 
      DO UPDATE SET status = EXCLUDED.status, state_data = EXCLUDED.state_data
    `, [
      sessionId, userId, provider, session.status, JSON.stringify(stateData), session.expiresAt
    ]);
  } else {
    inMemoryStorage.sessions.set(sessionId, session);
    saveLocalDb();
    console.log(`[Database] 💾 In-memory session saved:`, sessionId, `Total sessions:`, inMemoryStorage.sessions.size);
  }
  
  return session;
};

/**
 * Get verification session
 */
export const getSession = async (sessionId) => {
  if (pool) {
    const result = await pool.query(`
      SELECT * FROM verification_sessions 
      WHERE session_id = $1 AND expires_at > NOW()
    `, [sessionId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      sessionId: row.session_id,
      provider: row.provider,
      userId: row.user_id,
      status: row.status,
      stateData: row.state_data,
      createdAt: row.created_at,
      expiresAt: row.expires_at
    };
  } else {
    const session = inMemoryStorage.sessions.get(sessionId);
    console.log(`[Database] 🔍 In-memory session lookup:`, sessionId, `Found:`, !!session, `Total sessions:`, inMemoryStorage.sessions.size);
    if (!session) {
      console.log(`[Database] ❌ Session not found in memory. Available sessions:`, Array.from(inMemoryStorage.sessions.keys()));
      return null;
    }
    if (session.expiresAt && session.expiresAt < new Date()) {
      console.log(`[Database] ⏰ Session expired:`, sessionId, `Expires:`, session.expiresAt, `Now:`, new Date());
      inMemoryStorage.sessions.delete(sessionId);
      return null;
    }
    return session;
  }
};

/**
 * Update session status
 */
export const updateSession = async (sessionId, updates) => {
  if (pool) {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (updates.status) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.stateData) {
      fields.push(`state_data = $${paramIndex++}`);
      values.push(JSON.stringify(updates.stateData));
    }
    
    if (fields.length === 0) return;
    
    values.push(sessionId);
    await pool.query(`
      UPDATE verification_sessions 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE session_id = $${paramIndex}
    `, values);
  } else {
    const session = inMemoryStorage.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }
};

/**
 * Hash sensitive data (like access tokens)
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Save or update user profile
 */
export const saveProfile = async (userId, profileData) => {
  const {
    discordId,
    discordUsername,
    discordDiscriminator,
    discordNickname,
    discordAvatarUrl,
    discordProfileLink
  } = profileData;
  
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO profiles 
        (user_id, discord_id, discord_username, discord_discriminator, discord_nickname, discord_avatar_url, discord_profile_link)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id) 
        DO UPDATE SET
          discord_id = EXCLUDED.discord_id,
          discord_username = EXCLUDED.discord_username,
          discord_discriminator = EXCLUDED.discord_discriminator,
          discord_nickname = EXCLUDED.discord_nickname,
          discord_avatar_url = EXCLUDED.discord_avatar_url,
          discord_profile_link = EXCLUDED.discord_profile_link,
          updated_at = NOW()
      `, [
        userId,
        discordId || null,
        discordUsername || null,
        discordDiscriminator || null,
        discordNickname || null,
        discordAvatarUrl || null,
        discordProfileLink || null
      ]);
    } catch (error) {
      console.error('[Database] Error saving profile:', error);
      throw error;
    }
  } else {
    // In-memory storage
    inMemoryStorage.profiles = inMemoryStorage.profiles || new Map();
    inMemoryStorage.profiles.set(userId, {
      userId,
      discordId,
      discordUsername,
      discordDiscriminator,
      discordNickname,
      discordAvatarUrl,
      discordProfileLink
    });
    saveLocalDb();
  }
  
  return profileData;
};

/**
 * Get user profile
 */
export const getProfile = async (userId) => {
  if (pool) {
    const result = await pool.query(`
      SELECT * FROM profiles 
      WHERE user_id = $1
    `, [userId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      userId: row.user_id,
      discordId: row.discord_id,
      discordUsername: row.discord_username,
      discordDiscriminator: row.discord_discriminator,
      discordNickname: row.discord_nickname,
      discordAvatarUrl: row.discord_avatar_url,
      discordProfileLink: row.discord_profile_link
    };
  } else {
    inMemoryStorage.profiles = inMemoryStorage.profiles || new Map();
    return inMemoryStorage.profiles.get(userId) || null;
  }
};

/**
 * Close database connection
 */
export const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    console.log('[Database] ✅ Connection closed');
  }
};

