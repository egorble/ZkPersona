import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stringToField, fieldToString, formatAddress } from '../aleo';

describe('aleo utils', () => {
  describe('stringToField', () => {
    it('should convert string to field', () => {
      const result = stringToField('test');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle empty string', () => {
      const result = stringToField('');
      expect(result).toBeTruthy();
    });

    it('should handle special characters', () => {
      const result = stringToField('test@123!');
      expect(result).toBeTruthy();
    });
  });

  describe('fieldToString', () => {
    it('should convert field to string', () => {
      const field = '123field';
      const result = fieldToString(field);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle field format', () => {
      const field = '456u64field';
      const result = fieldToString(field);
      expect(result).toBeTruthy();
    });
  });

  describe('formatAddress', () => {
    it('should format address correctly', () => {
      const address = 'aleo1abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234';
      const formatted = formatAddress(address);
      expect(formatted).toContain('aleo1');
      expect(formatted.length).toBeLessThanOrEqual(address.length + 10); // Account for ellipsis
    });

    it('should handle short addresses', () => {
      const address = 'aleo1short';
      const formatted = formatAddress(address);
      expect(formatted).toBeTruthy();
    });

    it('should handle empty address', () => {
      const address = '';
      const formatted = formatAddress(address);
      expect(formatted).toBe('');
    });
  });
});

