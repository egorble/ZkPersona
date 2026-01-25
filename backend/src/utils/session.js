// In-memory session storage
// In production, use Redis or database

const sessions = new Map();

export const createVerificationSession = (data) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const session = {
    id: sessionId,
    ...data,
    createdAt: Date.now()
  };
  sessions.set(sessionId, session);
  
  // Cleanup after 1 hour
  setTimeout(() => {
    sessions.delete(sessionId);
  }, 60 * 60 * 1000);
  
  return sessionId;
};

export const getVerificationSession = (sessionId) => {
  return sessions.get(sessionId) || null;
};

export const updateVerificationSession = (sessionId, updates) => {
  const session = sessions.get(sessionId);
  if (session) {
    Object.assign(session, updates);
    sessions.set(sessionId, session);
    return session;
  }
  return null;
};

export const deleteVerificationSession = (sessionId) => {
  sessions.delete(sessionId);
};

export const getAllSessions = () => {
  return Array.from(sessions.keys());
};

