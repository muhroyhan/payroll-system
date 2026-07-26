import { describe, expect, it } from 'vitest';
// Real package, imported here (not from a Playwright spec) specifically
// because vitest runs through Vite's own module resolution, which handles
// @payroll-system/shared-types' CJS build the same way the app's own src/
// code does — unaffected by the Playwright-loader-specific issue documented
// in ./enums.ts's header comment. This test exists ONLY to catch that local
// mirror drifting out of sync with the real source of truth; it is not part
// of the Playwright suite and needs no DB/API/browser.
import * as RealEnums from '@payroll-system/shared-types';
import * as MirroredEnums from './enums';

// One row per enum object mirrored in enums.ts. Each mirror is allowed to be
// a SUBSET of the real enum (enums.ts only mirrors the members this e2e
// suite actually uses) — the check is "every mirrored key/value pair must
// match the real enum exactly", not "the mirror must be complete".
const MIRRORED_ENUM_NAMES = [
  'Role',
  'EmployeeActiveStatus',
  'EmploymentStatus',
  'Gender',
  'MaritalStatus',
  'PtkpStatus',
  'PayrollRunStatus',
  'ScopeType',
  'SPLevel',
  'SuratIjinType',
] as const;

describe('e2e/support/enums.ts mirror stays in sync with @payroll-system/shared-types', () => {
  for (const enumName of MIRRORED_ENUM_NAMES) {
    it(`${enumName}`, () => {
      const real = (RealEnums as Record<string, unknown>)[enumName];
      const mirror = (MirroredEnums as Record<string, unknown>)[enumName];

      expect(real, `@payroll-system/shared-types no longer exports "${enumName}" at all`).toBeDefined();
      expect(mirror, `e2e/support/enums.ts no longer exports "${enumName}" at all`).toBeDefined();

      for (const [key, mirroredValue] of Object.entries(mirror as Record<string, string>)) {
        expect(
          (real as Record<string, unknown>)[key],
          `enums.ts mirror out of date, update manual: ${enumName}.${key} exists in the local ` +
            `mirror (e2e/support/enums.ts) but not in @payroll-system/shared-types — it was ` +
            `likely renamed or removed upstream.`,
        ).toBeDefined();

        expect(
          (real as Record<string, unknown>)[key],
          `enums.ts mirror out of date, update manual: ${enumName}.${key} = ${JSON.stringify(mirroredValue)} ` +
            `in the local mirror (e2e/support/enums.ts) but @payroll-system/shared-types.${enumName}.${key} ` +
            `= ${JSON.stringify((real as Record<string, unknown>)[key])}. Update e2e/support/enums.ts to match.`,
        ).toBe(mirroredValue);
      }
    });
  }
});
