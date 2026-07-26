import { defineConfig } from 'vitest/config';

// Deliberately separate from playwright.config.ts / e2e specs: this runs
// under Vite's own module resolution (which handles @payroll-system/shared-
// types' CJS build fine, same as the app's own src/ code does), specifically
// so it CAN import the real enums that Playwright's loader can't — see
// e2e/support/enums.ts's header comment and e2e/support/enums.spec.ts.
export default defineConfig({
  test: {
    include: ['e2e/support/**/*.spec.ts'],
  },
});
