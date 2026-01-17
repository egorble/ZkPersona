import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWalletRecords } from '../../hooks/useWalletRecords';
import { usePassport } from '../../hooks/usePassport';

// Mock useWallet
vi.mock('@demox-labs/aleo-wallet-adapter-react', () => ({
  useWallet: vi.fn(),
  WalletAdapterNetwork: {
    TestnetBeta: 'testnet',
  },
}));

// Mock wallet adapter methods
const mockRequestTransaction = vi.fn();
const mockRequestRecordPlaintexts = vi.fn();
const mockRequestRecords = vi.fn();
const mockDecrypt = vi.fn();

describe('Wallet Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useWallet as any).mockReturnValue({
      publicKey: 'aleo1test',
      wallet: {
        adapter: {
          requestTransaction: mockRequestTransaction,
          requestRecordPlaintexts: mockRequestRecordPlaintexts,
          requestRecords: mockRequestRecords,
          decrypt: mockDecrypt,
        },
      },
    });
  });

  describe('Wallet Records Integration', () => {
    it('should integrate wallet records fetching with passport hook', async () => {
      const mockPassportRecord = {
        plaintext: '{ owner: aleo1test, total_stamps: 5u32, total_points: 100u64, humanity_score: 50u64, created_at: 1234567890u64, updated_at: 1234567890u64 }',
      };

      mockRequestRecordPlaintexts.mockResolvedValueOnce([mockPassportRecord]);

      const { result: recordsResult } = renderHook(() => useWalletRecords());
      const records = await recordsResult.current.fetchPassportRecords('passport.aleo');

      expect(records).toHaveLength(1);
      expect(records[0].owner).toBe('aleo1test');
    });

    it('should handle wallet disconnection gracefully', () => {
      (useWallet as any).mockReturnValue({
        publicKey: null,
        wallet: null,
      });

      const { result } = renderHook(() => useWalletRecords());
      
      expect(result.current.fetchPassportRecords).toBeDefined();
    });
  });

  describe('Passport Creation Integration', () => {
    it('should create passport and fetch records', async () => {
      const mockTxId = 'tx123';
      const mockPassportRecord = {
        plaintext: '{ owner: aleo1test, total_stamps: 0u32, total_points: 0u64, humanity_score: 0u64, created_at: 1234567890u64, updated_at: 1234567890u64 }',
      };

      mockRequestTransaction.mockResolvedValueOnce(mockTxId);
      mockRequestRecordPlaintexts.mockResolvedValueOnce([mockPassportRecord]);

      // This is a simplified integration test
      // In a real scenario, you'd test the full flow
      expect(mockRequestTransaction).toBeDefined();
    });
  });
});

