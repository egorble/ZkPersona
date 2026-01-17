# Testing Guide

This document describes the testing setup and how to run tests for the ZkPersona frontend.

## Test Types

### Unit Tests
Unit tests are located in `src/utils/__tests__/` and `src/hooks/__tests__/`. They test individual functions and hooks in isolation.

### Integration Tests
Integration tests are located in `src/test/integration/`. They test interactions between multiple components, hooks, and utilities.

### E2E Tests
End-to-end tests are located in `e2e/`. They test complete user flows using Playwright.

## Running Tests

### Install Dependencies
```bash
cd frontend
npm install
```

### Run Unit Tests
```bash
npm test
```

### Run Tests with UI
```bash
npm run test:ui
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Run All Tests
```bash
npm test && npm run test:e2e
```

## Test Structure

### Unit Tests

#### `aleo.test.ts`
Tests for Aleo utility functions:
- `stringToField` - String to field conversion
- `fieldToString` - Field to string conversion
- `formatAddress` - Address formatting

#### `aleoAPI.test.ts`
Tests for Aleo API functions:
- `getPassportPublic` - Fetch passport from blockchain
- `getStampPublic` - Fetch stamp from blockchain
- `hasUserStamp` - Check if user has stamp
- `getStampCount` - Get total stamp count
- `getTaskCount` - Get total task count
- `checkAdminStatus` - Check admin permissions

#### `explorerAPI.test.ts`
Tests for Explorer API functions:
- `fetchTransactionHistory` - Fetch transaction history
- `fetchTransactionDetails` - Fetch transaction details
- `getTransactionUrl` - Generate transaction URL
- `fetchProgramExecutions` - Fetch program execution history

#### `useWalletRecords.test.ts`
Tests for wallet records hook:
- `fetchPassportRecords` - Fetch passport records from wallet
- `fetchUserStampRecords` - Fetch user stamp records from wallet
- Fallback mechanisms
- Error handling

### Integration Tests

#### `wallet.integration.test.ts`
Tests wallet integration:
- Wallet connection/disconnection
- Records fetching integration
- Passport creation flow
- Error handling

### E2E Tests

#### `passport.spec.ts`
Tests complete user flows:
- Homepage display
- Navigation between pages
- Wallet connection
- Dashboard display
- Stamps page
- Profile page

## Writing New Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../myModule';

describe('myModule', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Integration Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMyHook } from '../hooks/useMyHook';

describe('useMyHook Integration', () => {
  it('should integrate with dependencies', async () => {
    const { result } = renderHook(() => useMyHook());
    // Test integration
  });
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('should complete user flow', async ({ page }) => {
  await page.goto('/');
  // Test user interactions
});
```

## Mocking

### Mock Wallet Adapter
```typescript
vi.mock('@demox-labs/aleo-wallet-adapter-react', () => ({
  useWallet: vi.fn(),
}));
```

### Mock Fetch
```typescript
global.fetch = vi.fn();
(global.fetch as any).mockResolvedValueOnce({
  ok: true,
  json: async () => mockData,
});
```

## Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Cover all major integration points
- **E2E Tests**: Cover all critical user flows

## CI/CD Integration

Tests run automatically in CI/CD pipeline:
1. Unit tests run on every commit
2. Integration tests run on pull requests
3. E2E tests run before deployment

## Troubleshooting

### Tests Fail in CI but Pass Locally
- Check for environment differences
- Verify all mocks are properly set up
- Check for timing issues (use `waitFor`)

### E2E Tests Timeout
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify network connectivity

### Coverage Not Showing
- Run `npm run test:coverage`
- Check `vitest.config.ts` coverage settings
- Verify files are not excluded

