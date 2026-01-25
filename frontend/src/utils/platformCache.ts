// Platform Cache for OAuth sessions
// Following Gitcoin Passport pattern: platform-cache

export type CacheToken = string;

export type CacheSession<T extends Record<string, string> = Record<string, string>> = T;

/**
 * Platform Session wrapper
 * Following Gitcoin Passport PlatformSession pattern
 */
export class PlatformSession<T extends Record<string, string>> {
  private token: CacheToken;
  private data: T;

  constructor(token: CacheToken, data: T) {
    this.token = token;
    this.data = data;
  }

  get(key: keyof T): T[keyof T] {
    return this.data[key];
  }

  async set(key: keyof T, value: T[keyof T]): Promise<void> {
    this.data[key] = value;
    // Save to localStorage
    const cacheKey = `oauth_session_${this.token}`;
    localStorage.setItem(cacheKey, JSON.stringify(this.data));
  }

  getData(): T {
    return { ...this.data };
  }
}

/**
 * Platform Cache Manager
 * Following Gitcoin Passport PlatformsDataCache pattern
 */
class PlatformsDataCache {
  private initialTimeout: number = 1000 * 60 * 5; // 5 minutes
  private timeout: number = 1000 * 60 * 3; // 3 minutes
  private timeoutMap: Map<CacheToken, ReturnType<typeof setTimeout>> = new Map();

  /**
   * Initialize OAuth session
   * Following Gitcoin Passport initCacheSession pattern
   */
  async initSession(token?: CacheToken): Promise<CacheToken> {
    const cacheToken = token || this.generateToken();
    const sessionData: Record<string, string> = { initiated: 'true' };
    
    // Save to localStorage
    const cacheKey = `oauth_session_${cacheToken}`;
    localStorage.setItem(cacheKey, JSON.stringify(sessionData));
    
    // Set timeout (will be cleared/refreshed on access)
    this.setTimeOut(cacheToken, this.initialTimeout);
    
    return cacheToken;
  }

  /**
   * Load session from cache
   * Following Gitcoin Passport loadCacheSession pattern
   */
  async loadSession<T extends Record<string, string>>(token: CacheToken): Promise<PlatformSession<T>> {
    const cacheKey = `oauth_session_${token}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (!cachedData) {
      throw new Error('Cache session not found');
    }

    const data = JSON.parse(cachedData) as T;
    const session = new PlatformSession<T>(token, data);

    // Refresh timeout on access
    this.setTimeOut(token, this.timeout);
    
    return session;
  }

  /**
   * Clear session from cache
   * Following Gitcoin Passport clearCacheSession pattern
   */
  async clearSession(token: CacheToken): Promise<void> {
    const cacheKey = `oauth_session_${token}`;
    localStorage.removeItem(cacheKey);
    
    // Clear timeout if exists
    const timeoutId = this.timeoutMap.get(token);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeoutMap.delete(token);
    }
  }

  /**
   * Set timeout for session
   */
  private setTimeOut(token: CacheToken, timeout: number): void {
    // Clear existing timeout
    const existingTimeout = this.timeoutMap.get(token);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeoutId = setTimeout(() => {
      this.clearSession(token).catch(console.error);
    }, timeout);
    
    this.timeoutMap.set(token, timeoutId);
  }

  /**
   * Generate random token
   */
  private generateToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

// Singleton instance
const platformsDataCache = new PlatformsDataCache();

/**
 * Initialize OAuth cache session
 * Following Gitcoin Passport initCacheSession pattern
 * 
 * @param token - Optional token (if not provided, random token is generated)
 * @returns Cache token for session
 */
export const initCacheSession = async (token?: CacheToken): Promise<CacheToken> => {
  return await platformsDataCache.initSession(token);
};

/**
 * Load OAuth cache session
 * Following Gitcoin Passport loadCacheSession pattern
 * 
 * @param cacheToken - Session token
 * @returns PlatformSession instance
 */
export const loadCacheSession = async <T extends Record<string, string>>(
  cacheToken: CacheToken
): Promise<PlatformSession<T>> => {
  return await platformsDataCache.loadSession<T>(cacheToken);
};

/**
 * Clear OAuth cache session
 * Following Gitcoin Passport clearCacheSession pattern
 * 
 * @param cacheToken - Session token to clear
 */
export const clearCacheSession = async (cacheToken: CacheToken): Promise<void> => {
  return await platformsDataCache.clearSession(cacheToken);
};

