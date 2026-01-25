// 90-day expiration logic for Identity Portal

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Check if platform verification has expired (90 days)
 */
export function isExpired(timestamp: number): boolean {
  if (!timestamp) return true;
  return Date.now() - timestamp > NINETY_DAYS_MS;
}

/**
 * Get expiry date from timestamp
 */
export function getExpiryDate(timestamp: number): Date {
  return new Date(timestamp + NINETY_DAYS_MS);
}

/**
 * Get days remaining until expiry
 */
export function getDaysRemaining(timestamp: number): number {
  if (!timestamp) return 0;
  const remaining = NINETY_DAYS_MS - (Date.now() - timestamp);
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

/**
 * Format expiry date as string
 */
export function formatExpiryDate(timestamp: number): string {
  const expiryDate = getExpiryDate(timestamp);
  return expiryDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Platform status type
 */
export type PlatformStatus = 'connected' | 'disconnected' | 'expired';

/**
 * Get platform status based on timestamp
 */
export function getPlatformStatus(timestamp?: number): PlatformStatus {
  if (!timestamp) return 'disconnected';
  if (isExpired(timestamp)) return 'expired';
  return 'connected';
}

