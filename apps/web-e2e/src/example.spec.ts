import { test, expect } from '@playwright/test';

test('renders the CodePilot foundation shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('CodePilot');
  await expect(page.getByRole('heading', { name: 'CodePilot' })).toBeVisible();

  const navigation = page.getByRole('navigation', {
    name: 'Primary navigation',
  });
  await expect(navigation.getByRole('button')).toHaveCount(8);
  await expect(navigation).toContainText('Overview');
  await expect(navigation).toContainText('Repositories');
  await expect(navigation).toContainText('Issues');
  await expect(navigation).toContainText('Pull Requests');
  await expect(navigation).toContainText('Commits');
  await expect(navigation).toContainText('Branches');
  await expect(navigation).toContainText('Validation');
  await expect(navigation).toContainText('Settings');

  await expect(page.getByText('Welcome', { exact: false })).toHaveCount(0);
  await expect(page.getByText('ForgePilot AI', { exact: false })).toHaveCount(
    0,
  );
});
