/**
 * Platform ID mapping for Aleo claim_point transaction
 * Maps provider names to platform_id (u8) as defined in the smart contract
 */

export const PLATFORM_IDS: Record<string, number> = {
  discord: 1,
  twitter: 2,
  github: 3,
  telegram: 4,
  ethereum: 6,  // EVM wallets
  eth_wallet: 6,
  evm: 6,
  solana: 7,
  google: 8,
  steam: 9,
};

/**
 * Convert provider name to platform_id (u8)
 */
export function providerToPlatformId(provider: string): number {
  const normalized = provider.toLowerCase().replace(/[^a-z0-9]/g, '');
  return PLATFORM_IDS[normalized] || 0;
}

/**
 * Convert platform_id to provider name
 */
export function platformIdToProvider(platformId: number): string | null {
  for (const [provider, id] of Object.entries(PLATFORM_IDS)) {
    if (id === platformId) {
      return provider;
    }
  }
  return null;
}

/**
 * Validate if provider is supported
 */
export function isSupportedProvider(provider: string): boolean {
  const platformId = providerToPlatformId(provider);
  return platformId > 0;
}
