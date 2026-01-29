import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  fetchTransactionHistory,
  fetchTransactionDetails,
  getTransactionUrl,
  fetchProgramExecutions 
} from '../explorerAPI';

// Mock fetch globally
global.fetch = vi.fn();

describe('explorerAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchTransactionHistory', () => {
    it('should return transaction history when API succeeds', async () => {
      const mockResponse = [
        {
          id: 'tx1',
          timestamp: 1234567890,
          type: 'transfer',
          status: 'confirmed',
          program: 'passport.aleo',
          function: 'claim_points',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchTransactionHistory('aleo1test');
      
      expect(result).toHaveLength(1);
      expect(result[0].txId).toBe('tx1');
      expect(result[0].type).toBe('transfer');
    });

    it('should return empty array when API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const result = await fetchTransactionHistory('aleo1test');
      
      expect(result).toEqual([]);
    });

    it('should return empty array when API returns 404', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchTransactionHistory('aleo1test');
      
      expect(result).toEqual([]);
    });
  });

  describe('fetchTransactionDetails', () => {
    it('should return transaction details when API succeeds', async () => {
      const mockResponse = {
        id: 'tx1',
        timestamp: 1234567890,
        type: 'transfer',
        status: 'confirmed',
        program: 'passport.aleo',
        function: 'create_passport',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchTransactionDetails('tx1');
      
      expect(result).toBeTruthy();
      expect(result?.txId).toBe('tx1');
      expect(result?.status).toBe('confirmed');
    });

    it('should return null when API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const result = await fetchTransactionDetails('tx1');
      
      expect(result).toBeNull();
    });
  });

  describe('getTransactionUrl', () => {
    it('should return Provable testnet URL for testnet (default)', () => {
      const url = getTransactionUrl('tx1', 'testnet');
      expect(url).toContain('testnet.explorer.provable.com');
      expect(url).toContain('tx1');
    });

    it('should return correct URL for testnet3', () => {
      const url = getTransactionUrl('tx1', 'testnet3');
      expect(url).toContain('explorer.aleo.org');
      expect(url).toContain('tx1');
      expect(url).toContain('testnet3');
    });

    it('should return correct URL for mainnet', () => {
      const url = getTransactionUrl('tx1', 'mainnet');
      expect(url).toContain('explorer.aleo.org');
      expect(url).toContain('tx1');
      expect(url).toContain('mainnet');
    });
  });

  describe('fetchProgramExecutions', () => {
    it('should return program executions when API succeeds', async () => {
      const mockResponse = [
        {
          id: 'exec1',
          timestamp: 1234567890,
          status: 'confirmed',
          function: 'claim_points',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchProgramExecutions('passport.aleo');
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('execution');
      expect(result[0].program).toBe('passport.aleo');
    });

    it('should return empty array when API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const result = await fetchProgramExecutions('passport.aleo');
      
      expect(result).toEqual([]);
    });
  });
});

