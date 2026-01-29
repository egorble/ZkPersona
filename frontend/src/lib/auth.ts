// Auth client - Propel-like interface for Discord authentication
// Works with our backend instead of Supabase

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    user_name?: string;
    avatar_url?: string;
    sub?: string;
    [key: string]: any;
  };
}

export interface Session {
  user: User | null;
  access_token?: string;
}

type AuthStateChangeCallback = (event: string, session: Session | null) => void;

let currentUser: User | null = null;
let authStateChangeCallbacks: AuthStateChangeCallback[] = [];
let storageKey = 'zkpersona-auth';

// Initialize from localStorage
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const session = JSON.parse(stored);
      currentUser = session?.user || null;
    }
  } catch (e) {
    console.error('Failed to load auth from storage:', e);
  }
}

/**
 * Get current user
 */
export const getUser = async (): Promise<{ data: { user: User | null }, error: any }> => {
  try {
    // Check if we have a stored session
    if (currentUser) {
      return { data: { user: currentUser }, error: null };
    }

    // Try to get user from backend using stored userId
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const session = JSON.parse(stored);
        const userId = session?.user?.id;
        if (userId) {
          // Verify session with backend or get profile
          const profileRes = await fetch(`${BACKEND_URL}/user/${userId}/profile`);
          if (profileRes.ok) {
            const { profile } = await profileRes.json();
            if (profile) {
              currentUser = {
                id: profile.userId || userId,
                user_metadata: {
                  full_name: profile.discordNickname || profile.discordUsername,
                  user_name: profile.discordUsername,
                  avatar_url: profile.discordAvatarUrl,
                  sub: profile.discordId
                }
              };
              return { data: { user: currentUser }, error: null };
            }
          }
        }
      }
    }

    return { data: { user: null }, error: null };
  } catch (error) {
    return { data: { user: null }, error };
  }
};

/**
 * Sign in with Discord OAuth (Propel-like interface)
 */
export const signInWithOAuth = async (options: { provider: 'discord', options?: { redirectTo?: string } }): Promise<void> => {
  if (options.provider !== 'discord') {
    throw new Error('Only Discord provider is supported');
  }

  const walletId = localStorage.getItem('wallet_id') || 
                    localStorage.getItem('aleo_public_key')?.slice(0, 8) || 
                    'default';

  const redirectUrl = options.options?.redirectTo || window.location.origin;
  localStorage.setItem('discord_redirect_after_auth', redirectUrl);
  
  const url = `${BACKEND_URL}/auth/discord/start?walletId=${encodeURIComponent(walletId)}`;
  window.location.href = url;
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
  currentUser = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(storageKey);
  }
  
  // Notify all listeners
  authStateChangeCallbacks.forEach(cb => cb('SIGNED_OUT', null));
};

/**
 * Subscribe to auth state changes (Propel-like interface)
 */
export const onAuthStateChange = (callback: AuthStateChangeCallback): { data: { subscription: { unsubscribe: () => void } } } => {
  authStateChangeCallbacks.push(callback);

  return {
    data: {
      subscription: {
        unsubscribe: () => {
          authStateChangeCallbacks = authStateChangeCallbacks.filter(cb => cb !== callback);
        }
      }
    }
  };
};

/**
 * Save session after successful Discord auth (called from callback handler)
 */
export const saveSession = (session: Session): void => {
  currentUser = session.user;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(session));
    
    // Notify all listeners
    authStateChangeCallbacks.forEach(cb => cb('SIGNED_IN', session));
  }
};

/**
 * Save profile to backend (Propel-like interface)
 * Called automatically after Discord auth (like in Propel navbar)
 */
export const saveProfile = async (profileData: {
  id: string;
  user_id: string;
  discord_nickname?: string;
  discord_avatar_url?: string;
}): Promise<void> => {
  try {
    const response = await fetch(`${BACKEND_URL}/user/${profileData.user_id}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        discordNickname: profileData.discord_nickname,
        discordAvatarUrl: profileData.discord_avatar_url
      })
    });

    if (!response.ok) {
      // Silently fail if profile save fails (Propel pattern)
      console.warn('Failed to save profile:', response.status);
    }
  } catch (error) {
    // Silently fail (Propel pattern - don't fail auth if profile save fails)
    console.warn('Error saving profile:', error);
  }
};

/**
 * Get profile from backend (Propel-like interface)
 */
export const getProfile = async (userId: string): Promise<any> => {
  try {
    const response = await fetch(`${BACKEND_URL}/user/${userId}/profile`);
    if (!response.ok) {
      return null;
    }
    const { profile } = await response.json();
    return profile;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
};

// Check for auth state changes from callback
if (typeof window !== 'undefined') {
  // Listen for verification completion
  window.addEventListener('storage', () => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session?.user && session.user !== currentUser) {
          currentUser = session.user;
          authStateChangeCallbacks.forEach(cb => cb('SIGNED_IN', session));
        }
      } catch (e) {
        // Ignore
      }
    }
  });
}

