import { test, expect } from '@playwright/test';
import { ADMIN_STORAGE_STATE, HR_STORAGE_STATE } from '../support/session';

// FE-T04/T33 (09_FRONTEND_STEPS.md), §15.1/§15.15 (08_FRONTEND_STRUCTURE.md).
// Both halves of R-11 (07_FRONTEND_RULES.md) must hold at once: hiding a nav
// item is presentation only, so this asserts the ROUTE guard too (direct URL
// entry, not just "the link isn't in the Sider"). No fixture data needed —
// access control here is pure role/routing logic (routes/access.ts), not
// data-dependent — so there's nothing for afterEach to clean up.
test.describe('Role-based access', () => {
  test.describe('HR staff', () => {
    test.use({ storageState: HR_STORAGE_STATE });

    test('never sees an admin-only nav item', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('menuitem', { name: 'Komponen Payslip' })).toHaveCount(0);
      await expect(page.getByRole('menuitem', { name: 'Konstanta Pajak & BPJS' })).toHaveCount(0);
      await expect(page.getByRole('menuitem', { name: 'Pengguna' })).toHaveCount(0);
      // Sanity check the negative assertions above aren't just "nav is
      // empty" — a both-roles entry must still be there.
      await expect(page.getByRole('menuitem', { name: 'Karyawan' })).toBeVisible();
    });

    test('direct URL to an admin-only route redirects to /403', async ({ page }) => {
      await page.goto('/settings/users');
      await expect(page).toHaveURL(/\/403$/);
      // antd's <Result> renders the title as plain text, not a heading
      // element with a role — verified against the actual accessibility
      // tree (a bare "text: 403 ..." node), so match on text instead.
      await expect(page.getByText('403', { exact: true })).toBeVisible();
      await expect(
        page.getByText('Anda tidak punya akses untuk melihat halaman ini.'),
      ).toBeVisible();
    });
  });

  test.describe('Admin', () => {
    test.use({ storageState: ADMIN_STORAGE_STATE });

    test('positive control: admin reaches the same admin-only route directly', async ({ page }) => {
      await page.goto('/settings/users');
      await expect(page).toHaveURL('/settings/users');
      await expect(page.getByText('403')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Pengguna' })).toBeVisible();
    });
  });
});
