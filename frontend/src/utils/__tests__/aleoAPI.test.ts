import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getPassportPublic, 
  getStampPublic, 
  hasUserStamp, 
  getStampCount,
  getTaskCount,
  checkAdminStatus 
} from '../aleoAPI';

// Mock fetch globally
global.fetch = vi.fn();

describe('aleoAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPassportPublic', () => {
    it('should return passport data when API succeeds', async () => {
      const mockResponse = {
        output: '{ passport_owner: aleo1test, total_stamps: 5u32, total_points: 100u64, humanity_score: 50u64, created_at: 1234567890u64, updated_at: 1234567890u64 }',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getPassportPublic('aleo1test');
      
      expect(result).toBeTruthy();
      expect(result?.owner).toBe('aleo1test');
      expect(result?.total_stamps).toBe(5);
    });

    it('should return null when API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const result = await getPassportPublic('aleo1test');
      
      expect(result).toBeNull();
    });

    it('should return null when response is empty', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: null }),
      });

      const result = await getPassportPublic('aleo1test');
      
      expect(result).toBeNull();
    });
  });

  describe('getStampPublic', () => {
    it('should return stamp data when API succeeds', async () => {
      const mockResponse = {
        output: '{ stamp_id: 1u32, name: 123field, description: 456field, category: 789field, points: 10u64, is_active: true, created_at: 1234567890u64 }',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getStampPublic(1);
      
      expect(result).toBeTruthy();
      expect(result?.stamp_id).toBe(1);
      expect(result?.points).toBe(10);
      expect(result?.is_active).toBe(true);
    });

    it('should return null when API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const result = await getStampPublic(1);
      
      expect(result).toBeNull();
    });
  });

  describe('hasUserStamp', () => {
    it('should return true when user has stamp', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: 'true' }),
      });

      const result = await hasUserStamp('aleo1test', 1);
      
      expect(result).toBe(true);
    });

    it('should return false when user does not have stamp', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: 'false' }),
      });

      const result = await hasUserStamp('aleo1test', 1);
      
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const result = await hasUserStamp('aleo1test', 1);
      
      expect(result).toBe(false);
    });
  });

  describe('getStampCount', () => {
    it('should return stamp count', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: '5u32' }),
      });

      const result = await getStampCount();
      
      expect(result).toBe(5);
    });

    it('should return 0 on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const result = await getStampCount();
      
      expect(result).toBe(0);
    });
  });

  describe('getTaskCount', () => {
    it('should return task count', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: '3u32' }),
      });

      const result = await getTaskCount();
      
      expect(result).toBe(3);
    });

    it('should return 0 on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const result = await getTaskCount();
      
      expect(result).toBe(0);
    });
  });

  describe('checkAdminStatus', () => {
    it('should return true for admin', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: 'true' }),
      });

      const result = await checkAdminStatus('aleo1admin');
      
      expect(result).toBe(true);
    });

    it('should return false for non-admin', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: 'false' }),
      });

      const result = await checkAdminStatus('aleo1user');
      
      expect(result).toBe(false);
    });
  });
});

