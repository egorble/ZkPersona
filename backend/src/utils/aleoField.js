/**
 * Utility for generating Aleo-compatible field elements from commitments
 * 
 * Aleo field elements are numbers in Fp where p (FIELD_MODULUS) is:
 * 8444461749428370424248824938781546531375899335154063827935233455917409239041
 * 
 * This ensures commitments can be used directly in Aleo smart contracts
 */

import crypto from 'crypto';

// Aleo BLS12-377 field modulus
export const FIELD_MODULUS = BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239041');

/**
 * Generate Aleo-compatible commitment from platform verification data
 * 
 * @param {number} platformId - Platform ID (1=Discord, 2=Twitter, 3=GitHub, 4=Telegram, 6=EVM, 7=Solana, 8=Google, 9=Steam)
 * @param {string} userId - User ID from platform
 * @param {string} salt - Secret salt (from env)
 * @returns {string} Aleo field element with "field" suffix (e.g., "123456789field")
 */
export function generateAleoCommitment(platformId, userId, salt) {
  // 1. Create input string matching spec
  const input = `${platformId}:${userId}:${salt}`;
  
  // 2. SHA-256 hash
  const hash = crypto
    .createHash('sha256')
    .update(input)
    .digest('hex');
  
  // 3. Convert hex to BigInt
  const hashBigInt = BigInt(`0x${hash}`);
  
  // 4. Modulo for Aleo field (ensures it's a valid field element)
  const fieldElement = hashBigInt % FIELD_MODULUS;
  
  // 5. Return as string with "field" suffix
  return `${fieldElement.toString()}field`;
}

/**
 * Validate if a string is a valid Aleo field element
 * 
 * @param {string} commitment - Commitment to validate
 * @returns {boolean} True if valid
 */
export function validateAleoField(commitment) {
  try {
    if (!commitment || !commitment.endsWith('field')) {
      return false;
    }
    
    const value = commitment.replace('field', '');
    const bigInt = BigInt(value);
    
    // Must be positive and less than modulus
    return bigInt >= 0n && bigInt < FIELD_MODULUS;
  } catch {
    return false;
  }
}

/**
 * Convert hex hash to Aleo field element
 * 
 * @param {string} hexHash - Hex hash (with or without 0x prefix)
 * @returns {string} Aleo field element
 */
export function hexToAleoField(hexHash) {
  const cleanHex = hexHash.startsWith('0x') ? hexHash.slice(2) : hexHash;
  const hashBigInt = BigInt(`0x${cleanHex}`);
  const fieldElement = hashBigInt % FIELD_MODULUS;
  return `${fieldElement.toString()}field`;
}
