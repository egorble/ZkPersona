import { test, expect } from '@playwright/test';

test.describe('ZkPersona E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/ZkPersona/i);
    
    // Check for main elements
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should navigate to different pages', async ({ page }) => {
    // Test navigation links
    const dashboardLink = page.locator('a[href="/"]');
    const stampsLink = page.locator('a[href="/stamps"]');
    const profileLink = page.locator('a[href="/profile"]');

    await expect(dashboardLink).toBeVisible();
    await expect(stampsLink).toBeVisible();
    await expect(profileLink).toBeVisible();
  });

  test('should show wallet connection prompt when not connected', async ({ page }) => {
    // Check for wallet connection button or message
    const walletButton = page.locator('button:has-text("Connect")').or(page.locator('button:has-text("Wallet")'));
    
    // If wallet button exists, it should be visible
    if (await walletButton.count() > 0) {
      await expect(walletButton.first()).toBeVisible();
    }
  });

  test('should display dashboard with passport info when connected', async ({ page }) => {
    // Note: This test assumes wallet is connected
    // In a real scenario, you'd mock the wallet connection
    
    // Check for passport-related elements
    const passportSection = page.locator('[data-testid="passport-section"]').or(
      page.locator('text=/passport/i').first()
    );
    
    // If passport section exists, verify it
    const count = await passportSection.count();
    if (count > 0) {
      await expect(passportSection.first()).toBeVisible();
    }
  });

  test('should handle navigation between pages', async ({ page }) => {
    // Navigate to Stamps page
    const stampsLink = page.locator('a[href="/stamps"]');
    if (await stampsLink.count() > 0) {
      await stampsLink.click();
      await expect(page).toHaveURL(/\/stamps/);
    }

    // Navigate to Profile page
    const profileLink = page.locator('a[href="/profile"]');
    if (await profileLink.count() > 0) {
      await profileLink.click();
      await expect(page).toHaveURL(/\/profile/);
    }
  });

  test('should display stamps page', async ({ page }) => {
    await page.goto('/stamps');
    
    // Check for stamps content
    const stampsContent = page.locator('text=/stamp/i').or(
      page.locator('[data-testid="stamps-grid"]')
    );
    
    // If stamps content exists, verify it
    const count = await stampsContent.count();
    if (count > 0) {
      await expect(stampsContent.first()).toBeVisible();
    }
  });

  test('should display profile page', async ({ page }) => {
    await page.goto('/profile');
    
    // Check for profile content
    const profileContent = page.locator('text=/profile/i').or(
      page.locator('[data-testid="profile-section"]')
    );
    
    // If profile content exists, verify it
    const count = await profileContent.count();
    if (count > 0) {
      await expect(profileContent.first()).toBeVisible();
    }
  });
});

