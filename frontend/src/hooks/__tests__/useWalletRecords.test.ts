import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWalletRecords } from '../useWalletRecords';

// Mock useWallet
vi.mock('@demox-labs/aleo-wallet-adapter-react', () => ({
  useWallet: vi.fn(),
}));

describe('useWalletRecords', () => {
  const mockRequestRecordPlaintexts = vi.fn();
  const mockRequestRecords = vi.fn();
  const mockDecrypt = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useWallet as any).mockReturnValue({
      publicKey: 'aleo1test',
      wallet: {
        adapter: {
          requestRecordPlaintexts: mockRequestRecordPlaintexts,
          requestRecords: mockRequestRecords,
          decrypt: mockDecrypt,
        },
      },
    });
  });

  it('should fetch passport records successfully', async () => {
    const mockRecords = [
      {
        plaintext: '{ owner: aleo1test, total_stamps: 5u32, total_points: 100u64, humanity_score: 50u64, created_at: 1234567890u64, updated_at: 1234567890u64 }',
      },
    ];

    mockRequestRecordPlaintexts.mockResolvedValueOnce(mockRecords);

    const { result } = renderHook(() => useWalletRecords());

    const records = await result.current.fetchPassportRecords('passport.aleo');

    expect(records).toHaveLength(1);
    expect(records[0].owner).toBe('aleo1test');
    expect(records[0].total_stamps).toBe(5);
  });

  it('should fallback to requestRecords when requestRecordPlaintexts fails', async () => {
    const mockEncryptedRecords = ['record1encrypted'];
    const mockDecrypted = '{ owner: aleo1test, total_stamps: 3u32, total_points: 50u64, humanity_score: 25u64, created_at: 1234567890u64, updated_at: 1234567890u64 }';

    mockRequestRecordPlaintexts.mockRejectedValueOnce(new Error('Permission denied'));
    mockRequestRecords.mockResolvedValueOnce(mockEncryptedRecords);
    mockDecrypt.mockResolvedValueOnce(mockDecrypted);

    const { result } = renderHook(() => useWalletRecords());

    const records = await result.current.fetchPassportRecords('passport.aleo');

    expect(mockRequestRecords).toHaveBeenCalled();
    expect(records.length).toBeGreaterThan(0);
  });

  it('should return empty array when no wallet connected', () => {
    (useWallet as any).mockReturnValue({
      publicKey: null,
      wallet: null,
    });

    const { result } = renderHook(() => useWalletRecords());

    expect(result.current.fetchPassportRecords).toBeDefined();
  });

  it('should fetch user stamp records successfully', async () => {
    const mockRecords = [
      {
        plaintext: '{ passport_owner: aleo1test, stamp_id: 1u32, earned_at: 1234567890u64, verification_hash: 123field, is_verified: true }',
      },
    ];

    mockRequestRecordPlaintexts.mockResolvedValueOnce(mockRecords);

    const { result } = renderHook(() => useWalletRecords());

    const stamps = await result.current.fetchUserStampRecords('passport.aleo');

    expect(stamps).toHaveLength(1);
    expect(stamps[0].stamp_id).toBe(1);
    expect(stamps[0].is_verified).toBe(true);
  });
});

