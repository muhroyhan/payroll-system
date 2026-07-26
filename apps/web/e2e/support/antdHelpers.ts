import type { Page } from '@playwright/test';

/** Types a 'YYYY-MM' value directly into antd's month DatePicker rather than
 *  clicking through the calendar UI — the fixture periods this suite uses
 *  (E2E_PERIOD_PREFIX, year 2099) are decades away from "today", so paging
 *  the calendar forward month-by-month would be both slow and brittle.
 *  antd DatePicker accepts typed input matching its display format and
 *  commits it on Enter, which is the supported way to set an arbitrary date
 *  without simulating dozens of calendar-nav clicks. */
export async function setMonthPicker(page: Page, monthValue: string): Promise<void> {
  const input = page.locator('.ant-picker-input input').first();
  await input.click();
  await input.fill(monthValue);
  await input.press('Enter');
}

/** antd's Form.Item renders its label as plain text next to the control,
 *  not a `<label for="...">` bound to the input's id — so Playwright's
 *  `getByLabel` (which relies on that association, or an aria-label) can't
 *  find these fields. Scopes to the `.ant-form-item` block containing the
 *  given label text and returns the input inside it instead. */
export function formFieldInput(page: Page, labelText: string) {
  return page.locator('.ant-form-item').filter({ hasText: labelText }).locator('input');
}
