# Payroll System — Part I: Frontend Steps

> Part 4 of 4 of the frontend bundle (final). Previous: [08_FRONTEND_STRUCTURE.md](./08_FRONTEND_STRUCTURE.md)
>
> **Point every `apps/web` session at this file + [07_FRONTEND_RULES.md](./07_FRONTEND_RULES.md),
> and say which Task ID you're on** — same pattern as §10/`04_STEPS.md` for the backend.

---

# PART I — FRONTEND STEPS

## 16. Frontend Roadmap (Task IDs FE-T01 …)

Build order mirrors the backend's dependency order (§10, Phases 1–8), because a screen can
only be built against an endpoint that exists — and all of them do, except the gaps in
§13.5. Foundation first (shell, API client, auth, shared components), then module by module
in backend-phase order.

Task ID format: `FE-T{seq}`. Referencing works exactly like the backend's: *"we finished
FE-T09, start FE-T10."*

### Definition of done — applies to every task below

A task is complete only when all of these hold. They are not repeated per row.

1. Server data goes through React Query; UI-only state is plain React (§14 R-01).
2. Forms are antd `Form` (§14 R-02); styling is tokens + CSS Modules (§14 R-03).
3. Every error path renders through `describeApiError()` (§14 R-04) — no raw error strings.
4. Every enum comes from `@payroll-system/shared-types`; no status/tax literals (§14 R-05).
5. Every §11 lock in scope is **disabled with a tooltip before the click** (§14 R-06a), or
   uses the documented R-06b fallback with the required code comment.
6. Role gating exists at **both** the nav and the route, from `src/routes/access.ts`
   (§14 R-11).
7. Loading, empty, and error states are implemented — not just the happy path.
8. `pnpm --filter @payroll-system/web lint` and `build` pass.

---

### FE Phase A — Foundation
*Depends on: the backend confirmations in FE-T00 (B-01 is a hard blocker).*

| Task ID | Task | Details |
|---|---|---|
| **FE-T00** | **Close the backend gaps in §13.5** | ✅ **Done — both hard blockers resolved.** **B-01**: `app.enableCors()` added to `apps/api/src/main.ts`, origins from `CORS_ORIGIN` env var (default `http://localhost:3001`), no credentials mode (no cookie is issued). **B-04**: token storage decided — `localStorage`, holding both `accessToken` and the full `user` object from the login response (no `/auth/me` to re-fetch it from). Remaining items are **not** blockers for FE-T01/T02 — deferred to the task that needs them: B-02 confirm-only (no action needed for the current separate-origin setup), B-03 blocks FE-T03 (auth flow) only, B-05 blocks FE-T31 (payslip PDF) only, B-06 forces the R-06b fallback in FE-T19/T20/T22, B-07 narrows FE-T24's scope to 4 of 6 tax tables, B-08 requires the required-filter workaround already specified in FE-T16/T17. Also flagged but not blocking: the `/payslip-components` admin-only read gap (§15.6, affects FE-T19/T23) and the missing `/users` PUT/DELETE (§15.14, affects FE-T25 scope). |
| FE-T01 | Scaffold `apps/web` | ✅ **Done.** Vite starter removed. `react-router-dom` + `axios` added (§13.1 — the complete sanctioned addition list). §6 folder skeleton created: `pages/ features/ components/ api/ hooks/ routes/`. `App.tsx` wires `QueryClientProvider` (one client, module scope) → `ConfigProvider` (empty theme placeholder) → `RouterProvider` per §13.2. |
| FE-T02 | Typed API client + error contract | ✅ **Done.** `src/api/client.ts` — request interceptor attaches `Authorization: Bearer <token>` from `src/api/session.ts` (the one place the B-04 `localStorage` keys are named); response interceptor's only job is the 401 side effect (clear session, `markSessionExpired`, redirect to `/login` — no refresh endpoint exists, B-03, so no retry). `src/api/errors.ts` → `describeApiError()` implements the full R-04 status table (401/403/404/400/409/5xx-network/unknown) with the exact `ApiErrorPresentation` shape, a 400 `message[]` → `fieldErrors` parser (`toAntdFormFields()` feeds `form.setFields()` directly; unparseable/whitelist-rejection messages land under `FORM_ERROR_KEY` instead of being guessed at), and a 409 spec-reference stripper (`§11`, `TC-…`, `P\d-T\d…`) verified against six real backend conflict messages. |
| FE-T03 | Auth: login, session, guards | ✅ **Done.** `/login` (antd `Form`, `features/auth/LoginPage.tsx`) using `api/client.ts` + `describeApiError()`. `AuthProvider` (`features/auth/AuthProvider.tsx`, plain React context per R-01 — `useAuth()` split into its own file to satisfy fast-refresh) exposes `{user, isAdmin, login, logout}`; `login()` runs through a React Query `useMutation` (the network call is server state) but its result is mirrored into context state since there's no `/auth/me` query to hold it (B-03, documented inline as the deliberate exception to R-01). B-03 decided as option (a): 8h hard session, no refresh, session restore reads `session.ts`'s `localStorage` directly. **Non-obvious fix required to make this work**: `describeApiError()` now special-cases a 401 from `POST /auth/login` itself (`kind:'auth'`, but `surface:'inline'`, message "Email atau kata sandi salah") — otherwise a wrong-password attempt would trigger the global session-expiry redirect with no session to expire. `client.ts`'s interceptor keys off `surface === 'redirect'` (not `kind === 'auth'`) so this falls out automatically without a second endpoint check. `sessionExpired` flag from `session.ts` shown once on `/login` via an `Alert`. `logout()` is client-side only (no revocation endpoint exists). |
| FE-T04 | App shell + access map | ✅ **Done.** `src/routes/access.ts` — `ACCESS_ENTRIES` (§15.1/§15.15), one row per nav section (subroutes inherit role via longest-prefix match in `requiredRolesFor()`, so a future `/employees/:id/edit` needs no new entry). `ProtectedLayout.tsx` combines the R-11 route guard (redirects to `/login` if unauthenticated, `/403` if the role doesn't match) with the antd `Layout`/`Sider`/`Header` shell, breadcrumbs, and a user-menu `Dropdown` with **Keluar**. Both the Sider's nav filtering and the guard read the same `ACCESS_ENTRIES` — cannot drift. `/403` (`ForbiddenPage`) and `*` (`NotFoundPage`) are public, outside the shell. Nav items for not-yet-built screens resolve to the `*` page until their FE task lands — documented as intentional, not a bug. |
| FE-T05 | Shared UI kit | ✅ **Done.** The four archetypes in §15.0 — `ListPage`, `DetailPage`, `FormDrawer` (Drawer form; centralizes 400→`form.setFields()` via `toAntdFormFields()` and 409→persistent `Modal`, both through `describeApiError()`), `EffectiveDatedMasterPage` (appends berlaku-sejak/sampai + status columns and an "Akhiri Masa Berlaku" action; deliberately no delete prop, per §11). Plus: `QueryStateGuard` (the shared loading/empty/error wrapper every archetype composes), `<LockedAction>` (disabled control + reason tooltip via antd's disabled-button-in-a-`<span>` `Tooltip` workaround, §14 R-06), `<StatusTag>` (generic over `Record<Enum, {label,color}>` — enum-agnostic itself; the exhaustiveness guarantee comes from each feature's own label map per R-05), `formatIDR()`/`formatDate()` (format only — never derive, §14 R-07), `useDownloadPdf()` (authenticated blob download via `apiClient`, for the letters' `/:id/pdf` and eventually the payslip once B-05 lands). **Every later task composes these; none re-implements them.** |

### FE Phase B — Employees & organization
*Mirrors backend Phase 1. Depends on: FE-T05.*

| Task ID | Task | Details |
|---|---|---|
| FE-T06 | Employees list + detail + form | §15.4. Raw PTKP inputs in, server-derived `ptkpStatus` out — **no client-side derivation** (§14 R-10). `ptkpManuallyOverridden` as an explicit switch with its consequence stated. `MAX_DEPENDENT_COUNT` from shared-types. Detail shows the **resolved** salary via `GET /salary-master/resolve` (read-only). **No Delete action** — deactivate via `status`. |
| FE-T07 | Employee Excel/CSV import | `POST /employees/import` (multipart field `file`). Per-row success/failure result table — partial failure is a normal outcome, not a toast. |
| FE-T08 | Organization masters | 4-tab CRUD page: divisions, departments, positions, employee-types (§15.4). These feed every scope selector, so they come before FE-T09. |

### FE Phase C — Scope masters & holidays
*Mirrors backend Phase 2. Depends on: FE-T08.*

| Task ID | Task | Details |
|---|---|---|
| FE-T09 | Scope selector + salary master | Build the reusable scope selector (`scope_type` → dependent `scope_value` picker) **once** here; FE-T10, FE-T12, FE-T23 reuse it. Effective-dated master page + `GET /salary-master/resolve` preview panel. **No Delete** — "Akhiri masa berlaku" sets `effectiveEndDate` (§11). Order/label rows by `SCOPE_TYPE_PRIORITY`, but **never pick the winner client-side** (§14 R-13). |
| FE-T10 | Incentive master | Same archetype, same components, `/incentive-master` (§15.5). Should be a thin task — if it isn't, FE-T09 didn't generalize properly. |
| FE-T11 | Holidays | §15.7. Sync button is **admin-only inside an A+H screen** → disabled with tooltip for HR, not hidden. Tag rows by `HolidaySource`; state that sync never overwrites manual rows; show the created/updated/skipped result. |

### FE Phase D — Leave
*Mirrors backend Phase 3 (P3-T04/T05). Depends on: FE-T09 (scope selector), FE-T06.*

| Task ID | Task | Details |
|---|---|---|
| FE-T12 | Leave types + policy master | `/leave-types` full CRUD; `/leave-policy-master` via the effective-dated archetype + `GET /resolve?leaveTypeId&employeeId&asOf` (§15.9). |
| FE-T13 | Leave balances | List by employee/year, quota edit via `PUT /:id/quota`, `manuallyAdjusted` tag, and the two resolve actions (single + bulk year-start seeding). **`used` has no input** — the API exposes none (§11). |
| FE-T14 | Leave requests + approval | List/detail/form + approve/reject. `Steps`/`Tag` state machine (§15.9). Edit/Delete disabled once decided (R-06a). Surface the balance-exceeded 409 per R-04. Note the weekday-only counting caveat (§5.4) in the UI **without** computing an alternative. |

### FE Phase E — Attendance
*Mirrors backend Phase 3 (P3-T01…T03). Depends on: FE-T06, FE-T11 (holidays), FE-T14 (leave), and `GET /payroll-runs` for the period lock.*

| Task ID | Task | Details |
|---|---|---|
| FE-T15 | Fingerprints | Enrolment CRUD, employee ↔ `deviceUserId`/`deviceId` mapping (§15.8 A). |
| FE-T16 | Raw logs + ingestion | List **with a required filter** (§14 R-08 — this table grows ~2 rows/employee/working day), file import (`POST /import`, multipart `file`), single manual entry, delete. Render null `scanType` as "—" with an explanation, not an error (§5.3). |
| FE-T17 | Attendance records + reconciliation + **period lock** | §15.8 C. Required date-range filter. Reconcile action (`POST /reconcile`). Edit = upsert with `overwrite`, and the "already exists from source X" 409 becomes a **confirm dialog**, not an error. Flags (`isHoliday`/`isOnLeave`/`hasPermission`/incomplete) as tags. **The period-lock banner + full write-surface disable is the headline deliverable of this task** — cross-reference `GET /payroll-runs` for the filtered period, link to the run that must be reverted (§11 / TC-PAYROLL-04). |

### FE Phase F — HR letters
*Mirrors backend Phase 4. Depends on: FE-T05 (`useDownloadPdf`), FE-T06.*

| Task ID | Task | Details |
|---|---|---|
| FE-T18 | Surat ijin | §15.10 A. Full CRUD + approve/reject + PDF. Locks are fully derivable (`status !== 'pending'`) → R-06a, no fallback needed. Link an approved letter to the attendance date it affects. |
| FE-T19 | Surat peringatan | §15.10 B. `SPLevel`, optional sanction pair (component + amount) with its payslip consequence stated in the form. ⚠️ **R-06b fallback** — payslip-reference lock is invisible client-side (B-06); required code comment. ⚠️ Component picker hits admin-only `/payslip-components` — see the §15.6 role gap; do not swallow a 403. |
| FE-T20 | Overtime letters | §15.10 C. Verify/reject + PDF. Show planned vs actual side by side and state that **payroll pays `actual`, only when `verified`** (§9 R9). **Two stacked locks**: status (R-06a) + payslip reference (R-06b). |

### FE Phase G — Kasbon & temp components
*Mirrors backend Phases 5–6. Depends on: FE-T06, FE-T09.*

| Task ID | Task | Details |
|---|---|---|
| FE-T21 | Kasbon | §15.11. CRUD + approve/reject, repayment `Progress`, deduction history on the detail page. **Three layered locks, all client-derivable** → R-06a throughout: status-not-pending, the three money fields frozen once `remainingBalance < amount`, and the terminal `paid_off`/`rejected` states. |
| FE-T22 | Payslip component master | §15.6, **admin-only**. No Delete (§11). ⚠️ R-06b fallback for the `is_taxable`/`component_type` immutability, plus a pre-save warning. |
| FE-T23 | Temp components | §15.6. Period-bound list (defaults to current period, period switcher), scope selector reused from FE-T09, `GET /active?employeeId&asOf` preview. |

### FE Phase H — Tax constants & settings
*Mirrors backend Phases 1 (P1-T08/T09) and 7. Depends on: FE-T05.*

| Task ID | Task | Details |
|---|---|---|
| FE-T24 | Tax & BPJS constants | §15.14, **admin-only**, 4 tabs (PTKP / TER / BPJS Kesehatan / BPJS Ketenagakerjaan), each with an `asOf` effective-date picker. **No tax number is ever hardcoded in the frontend** — not in a placeholder, helper text, or validation rule (§14 R-05). State explicitly that `biaya_jabatan` and `pasal17_bracket` are **not** editable here pending B-07. |
| FE-T25 | Salary period + users | §15.14. Salary period: **read for any authenticated user, write admin-only** — reflect the asymmetry. Users: list + create only; there is no PUT/DELETE on `/users`, so build no UI for them. |

### FE Phase I — Payroll runs & payslips
*Mirrors backend Phase 8. Depends on: everything above — this is where the whole system converges.*

| Task ID | Task | Details |
|---|---|---|
| FE-T26 | Payroll runs list + create + **state-machine visualisation** | §15.12. antd `Steps` with `current` from `PayrollRunStatus`, the **revert edge drawn explicitly**, `disbursed` shown as permanently locked, and actor/timestamp per step. The next legal action is the single primary button; illegal transitions are hidden, admin-only ones disabled with *"Hanya admin"*. |
| FE-T27 | Calculate + progress polling | `POST /:id/calculate` → **202 = started, not done**. `Progress` from `processedCount/totalCount`, polled via React Query `refetchInterval` on `['payroll-runs', id]`, enabled only while in flight and stopped at `calculated` (§13.3 — **never** a bare `setInterval`). Explain that a retry restarts the chunk count (P8-T04). |
| FE-T28 | Approve / disburse / revert | Admin-only actions. **Revert's confirm modal must enumerate the consequences** — it deletes the run's payslips + line items and rolls back kasbon installments (§11 / P8-T07) — not a bare "Yakin?". Revert must be *absent*, not merely disabled, once `approved`. |
| FE-T29 | Payroll summary report + CSV | §15.12. `GET /:id/summary` → totals + `byDepartment`. **Aggregation is server-side; never recomputed** (§14 R-07). A `draft` run's **409 renders as an explanatory empty state**, not an error toast. CSV via `useDownloadPdf`'s blob path. |
| FE-T30 | Payslips list + detail | §15.13. Read-only by construction — **no edit/delete affordance anywhere**. Line items grouped by `PayslipLineSource`, deep-linked by `sourceId` where non-null; `tax`/`bpjs` lines render link-less by design. |
| FE-T31 | Payslip PDF download | **⛔ BLOCKED on §13.5 B-05** — `GET /payslips/:id/pdf` does not exist and `pdfPath` is a server filesystem path, not a URL. Ships only after the backend adds the route, mirroring the letters' `StreamableFile` pattern. **Do not build a workaround that exposes `pdfPath` to the browser.** |

### FE Phase J — Closing
*Depends on: all of the above.*

| Task ID | Task | Details |
|---|---|---|
| FE-T32 | Dashboard | §15.3 — composes existing endpoints only (recent runs, pending-approval counts, current period). No new API, no computed money figures. Built last so it reuses finished components rather than inventing them. |
| FE-T33 | Lock & role audit | The frontend analogue of P8-T07. Walk **§15.2 row by row** and confirm each lock is actually pre-empted in the shipped UI (or carries the R-06b comment). Walk **§15.15 row by row** as both roles and confirm nav *and* route both enforce it. Confirm no `.ant-*` overrides, no stray enum literals, no raw error rendering — this is the pass where drift accumulated across FE-T06…FE-T31 gets caught. |
| FE-T34 | End-to-end UI smoke | The P10-T02 cycle driven entirely through the UI: attendance → letters → kasbon → temp components → create run → calculate (watch progress) → review payslips → approve → disburse → summary + CSV. Then **attempt each §11-locked mutation through the UI** and confirm it is blocked *before* the click wherever §15.2 says it should be. |

---

### 16.1 Frontend sign-off checklist

Mirrors §12.10. Confirm before calling the admin UI production-ready:

- [ ] Every item in §13.5 (B-01…B-08) is closed or explicitly accepted with its consequence
      documented in the UI.
- [ ] FE-T33's lock audit passed: every §15.2 "✅ derivable" row is disabled-with-tooltip in
      the running app, and every "⚠️ fallback" row shows a readable, spec-reference-stripped
      409.
- [ ] Both roles were exercised end to end. `hr_staff` never sees an admin-only nav item and
      never reaches an admin-only route by typing the URL.
- [ ] `grep` confirms zero hardcoded tax/BPJS figures and zero status-string literals in
      `apps/web/src` (§14 R-05).
- [ ] `grep` confirms no `redux`/`zustand`/`jotai`/`mobx`/`react-hook-form`/`formik`/
      `styled-components` in `apps/web/package.json` (§14 R-01/R-02/R-03).
- [ ] No component calls `axios`/`fetch` directly — all traffic goes through `src/api/*`
      (§14 R-08).
- [ ] The payroll run state machine is *visually* legible: a first-time admin can tell from
      the screen alone that revert disappears after approval and that disbursed is terminal.
- [ ] Every money figure on screen came from an API response verbatim (§14 R-07).

---
