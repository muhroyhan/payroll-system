# Payroll System — Part F: Frontend General

> Part 1 of 4 of the **frontend bundle** (files 06–09), appended to the backend doc set
> (00–05). Previous: [05_BOUNDARIES_AND_TESTS.md](./05_BOUNDARIES_AND_TESTS.md) ·
> Next: [07_FRONTEND_RULES.md](./07_FRONTEND_RULES.md)

---

# PART F — FRONTEND GENERAL

## 13. Frontend Overview & Ground Rules

### 13.0 What this bundle is — and what it is not

The backend (Phases 1–8) is **built and final**. This bundle describes the Admin Web UI
(`apps/web`) that consumes it. It is deliberately *only* about screens, components, client
state, and API consumption.

**Every business rule already lives in 01–05 and is not restated, re-derived, or
re-decided here.** Where this bundle needs a rule (a status transition, a lock, a
calculation), it **cites** the backend section (`§5.8`, `§9`, `§11`) or the actual endpoint
rather than describing the rule again. If a frontend doc and a backend doc ever disagree,
**the backend doc wins and the frontend doc is the bug.**

Concretely, out of scope for this bundle:
- Any tax/BPJS math (§7, §8, §9) — the UI displays numbers the API returns; it never
  computes a payslip figure client-side.
- Any state-machine semantics (§5.8, §11) — the UI *reflects* `draft → calculated →
  approved → disbursed`; it does not define it.
- Any validation rule that decides whether data is legal — the API is the authority
  (§14 R-05).

In scope: routes, page layout, forms, tables, client caching, role-gated navigation,
loading/empty/error states, and the visual encoding of state machines and locks.

**Employee self-service remains out of scope** (§4): every screen in this bundle is
operated by admin/HR staff. There is no employee login, no "my payslip" page, no
self-submitted leave/kasbon request.

### 13.1 Stack — delta only

The full stack rationale is §2.1 in [01_GENERAL.md](./01_GENERAL.md) and is **not duplicated
here.** This section records only (a) what is already installed and (b) what the frontend
still has to add, because `apps/web` at the time of writing is still the unmodified Vite
starter (`App.tsx` + `main.tsx`, no router, no API client, no antd usage).

**Already installed and locked in (verified in `apps/web/package.json`):**

| Package | Version | Locked by |
|---|---|---|
| `react` / `react-dom` | ^19.2 | §2.1 |
| `vite` + `@vitejs/plugin-react` | ^8.1 | §2.1 |
| `antd` | ^6.5 | §2.1 — the *only* UI component library (§14 R-02) |
| `@tanstack/react-query` | ^5.101 | §2.1 — the *only* server-state layer (§14 R-01) |
| `@payroll-system/shared-types` | workspace | §6 — the *only* source of enums (§14 R-05) |
| `typescript` | ~6.0 | — |
| `oxlint` | ^1.71 | `pnpm --filter @payroll-system/web lint` |

**Still to add at FE-T01 (frontend-scope decisions, no business impact):**

| Need | Decision | Why this one |
|---|---|---|
| Routing | `react-router-dom` v7 (declarative `createBrowserRouter`) | §2.1 never named a router, so this is an open frontend choice; react-router is the default for a Vite SPA and needs no framework migration. Not a business decision — recorded here so it isn't re-litigated per phase. |
| HTTP client | `axios` + one shared instance | Interceptors are the mechanism §14 R-04 (error mapping) and §13.3 (auth header / 401 handling) depend on; `fetch` would mean hand-rolling both. |
| Styling beyond antd | antd `ConfigProvider` theme tokens first, **CSS Modules** for the remainder | Already decided in §2.1 — restated because it is a hard rule (§14 R-03), not a preference. |
| Date handling | whatever antd v6 ships with (`dayjs`) | Do not add a second date library; antd's `DatePicker` already depends on one. |

Anything not in these two tables is a **new dependency** and falls under §14 R-09.

### 13.2 App-shell shape

```
main.tsx
└── <QueryClientProvider>            ← one client, app-wide (§13.3)
    └── <ConfigProvider theme>       ← antd tokens; the only global theming layer
        └── <AuthProvider>           ← plain React context, UI/session state only
            └── <RouterProvider>
                ├── /login                     public
                └── <ProtectedLayout>          antd Layout + Sider nav, role-filtered
                    └── feature routes         (§15)
```

Folder layout follows the one **already specified in §6** — `src/pages`, `src/features`,
`src/components`, `src/api`, `src/hooks`, `src/routes`. `features/*` mirrors backend module
names 1:1 (`features/kasbon`, `features/payroll-runs`, …) so a screen's code is findable
from the endpoint it calls, and vice versa.

### 13.3 State management pattern — mandatory, not a preference

§2.1 already states this. It is repeated here as an **enforceable rule** because it is the
one architectural decision most likely to erode screen-by-screen:

**Server state → TanStack React Query. Always. No exceptions.**
Anything that originates from the API — lists, detail records, resolved scope values, run
progress — is a `useQuery`/`useMutation`. It is never copied into `useState` "so the form
can edit it", never mirrored into context, never cached in a module-level variable.

**UI-only state → plain React `useState` / `useReducer` / `useContext`.**
Modal open/closed, selected table rows, filter inputs before they are applied, wizard step,
sider collapsed, unsubmitted form draft values (which antd `Form` owns anyway).

**Nothing else exists.** No Redux, no Zustand, no Jotai, no Recoil, no MobX — see §14 R-01
for the hard prohibition and the escalation path if a genuine cross-cutting need appears.

Practical conventions that follow from this:

- **Query keys mirror the endpoint**: `['kasbon', { employeeId }]`, `['payroll-runs', id]`,
  `['payroll-runs', id, 'summary']`. A key is derived from the URL + query params, never
  invented per screen, so invalidation is predictable.
- **Every mutation declares what it invalidates.** A `PUT /kasbon/:id/approve` invalidates
  `['kasbon']` and `['kasbon', id]`. Never hand-patch the cache with `setQueryData` to
  "avoid a refetch" for records subject to §11 locks — the server may have changed derived
  state (a lock, a balance, a status) that the client cannot reproduce.
- **One `QueryClient`, created once**, with app-wide defaults. Per-screen `QueryClient`
  instances are a bug.
- **Polling is a React Query concern** (`refetchInterval`), not a `setInterval` in a
  component — this matters for exactly one screen today (payroll run calculation progress,
  §15.9) and must not be hand-rolled there.

### 13.4 Auth flow — what the backend actually provides

⚠️ **Everything in this subsection was read out of the backend source, not assumed.**
Anything the backend does *not* provide is listed in §13.5 as a blocker, **not** invented
here.

**The one auth endpoint that exists** (`apps/api/src/modules/auth/auth.controller.ts`):

```
POST /auth/login          — public (no guard on the controller)
  body:     { email: string, password: string }
  200 →     { accessToken: string,
              user: { id, name, email, role } }
  401 →     "Invalid credentials"  (wrong password, unknown email, or isActive = false)
```

**Token facts** (`auth.module.ts`, `auth.service.ts`, `strategies/jwt.strategy.ts`):
- Signed by `@nestjs/jwt` with `JWT_SECRET`; `expiresIn` = `JWT_EXPIRES_IN`, **defaulting to
  `8h`** (`.env.example` ships `8h`).
- Payload is `{ sub: userId, email, role }` plus standard `iat`/`exp`. **`name` is not in
  the token** — it comes only from the login response body.
- Transported as `Authorization: Bearer <token>`
  (`ExtractJwt.fromAuthHeaderAsBearerToken()`); `ignoreExpiration: false`, so an expired
  token yields a plain `401`.

**Roles** (`packages/shared-types/src/enums/role.ts`): exactly two — `admin`, `hr_staff`.

**How the guards actually behave** (`common/guards/roles.guard.ts`) — this drives every
role-gating decision in §15:
- Every controller except `auth` is wrapped in `@UseGuards(JwtAuthGuard, RolesGuard)`.
- `RolesGuard` returns **`true` when no `@Roles` decorator is present** on the handler or
  the class. This is why `GET /salary-period-config` is readable by any authenticated user
  while `PUT /salary-period-config` is `@Roles(Role.ADMIN)`.
- A method-level `@Roles` **overrides** the class-level one (`getAllAndOverride`) — e.g.
  `POST /holidays/sync` is admin-only inside an otherwise admin+HR controller.
- A role failure is a **`403`**; a missing/expired token is a **`401`**. The UI must treat
  these differently (§14 R-04).

**Frontend auth contract as it must be built (given the above):**

1. `/login` posts credentials, stores `accessToken` + `user` (see the storage decision
   below), and redirects to the last-attempted route or `/`.
2. An axios request interceptor attaches `Authorization: Bearer <token>` to every request.
3. An axios response interceptor: on **401** → clear session, redirect to `/login` with a
   "session expired" notice. On **403** → do *not* log out; show a "you don't have access"
   message (§14 R-04). There is **no silent refresh**, because there is no refresh endpoint.
4. `AuthProvider` (plain React context — this is session/UI state, not server state, so it
   is *not* a React Query cache) exposes `{ user, isAdmin, login, logout }`.
5. `logout()` is **client-side only** — it discards the token. There is no server-side
   revocation endpoint, so a logged-out token stays technically valid until `exp`.
6. Route guarding: `<ProtectedLayout>` redirects to `/login` when there is no token;
   admin-only routes additionally check `user.role === 'admin'` and render a 403 page rather
   than a blank screen.
7. Navigation is **filtered by role** so HR staff never see menu entries for admin-only
   modules (§15.13) — but the route guard still enforces it, because hiding a link is not
   access control.

### 13.5 ⛔ Backend confirmations required before FE-T01 can start

These are **gaps found in the backend, not frontend design choices.** Each one blocks or
degrades a specific frontend behaviour. They are repeated as tasks FE-T00a…FE-T00f in
[09_FRONTEND_STEPS.md](./09_FRONTEND_STEPS.md).

- [ ] **B-01 — CORS is not enabled.** `apps/api/src/main.ts` never calls
      `app.enableCors()`. The API listens on `:3000`, the Vite dev server on `:3001`
      (`apps/web/vite.config.ts`), so **every browser request will fail preflight today.**
      Decide one: enable CORS on the API for the web origin, or add a `server.proxy` entry
      in `vite.config.ts` for dev + serve the built SPA same-origin in production. *This is
      a hard blocker — no screen can call any endpoint until it is resolved.*

- [ ] **B-02 — No global API prefix.** Routes are mounted at the root (`/employees`, not
      `/api/employees`); `main.ts` has no `setGlobalPrefix`. Confirm this stays, because the
      shared axios `baseURL` is built from it — and if the SPA is later served same-origin,
      the absence of a prefix makes route collisions with client routes likely.

- [ ] **B-03 — No token refresh, no `/auth/me`, no logout endpoint.** With `JWT_EXPIRES_IN=8h`
      and no refresh path, a user is hard-logged-out mid-session after 8 hours, losing
      unsaved form state. Also, on a page reload the frontend can only restore the user from
      whatever it persisted itself — it **cannot** re-validate the token or re-fetch the
      current user, because no `GET /auth/me` exists. Confirm the intended behaviour:
      (a) accept it and persist `user` client-side alongside the token, (b) add
      `GET /auth/me`, or (c) add a refresh token. **Do not assume a refresh endpoint exists
      and build against it.**

- [ ] **B-04 — Token storage is undecided and has a security trade-off.** No backend
      decision exists (no cookie is issued — the token is returned in a JSON body, which
      rules out `httpOnly` cookies without a backend change). `localStorage` survives reload
      and is what the current API shape implies, but is XSS-readable; in-memory is safer but
      logs the user out on every refresh, which is unusable at an 8-hour session length.
      **Recommendation: `localStorage`**, consistent with the single-tenant, internal-staff
      threat model — but record the decision explicitly rather than letting FE-T02 pick one
      by accident.

- [ ] **B-05 — No payslip PDF download endpoint.** P8-T05 generates payslip PDFs and stores
      `payslips.pdf_path`, and all three letters expose `GET /:id/pdf` returning a
      `StreamableFile` — but `payslips.controller.ts` has **only** `GET /payslips` and
      `GET /payslips/:id`. There is no way for the browser to fetch a payslip PDF.
      `pdf_path` is a **server filesystem path**, not a URL, so the frontend cannot link to
      it. The payslip screen (§15.10) cannot ship its download action until
      `GET /payslips/:id/pdf` exists, mirroring the letters. *Blocks FE-T18 only, not FE-T01.*

- [ ] **B-06 — Two lock states are not observable by the client.** §11 requires the UI to
      disable edit/delete *before* the user clicks (§14 R-06), which means the client must
      know a record is locked. Most locks are derivable client-side (see §15.2), but two are
      not:
      1. **`surat_peringatan` / `overtime_letter` locked by payslip reference** — the lock
         lives in `PayslipLineItemReferenceChecker` (a `payslip_line_items` lookup). Nothing
         in the list/detail response exposes it.
      2. **`payslip_component_master.is_taxable` / `component_type` immutability once
         referenced** (§11) — same problem.
      Ask the backend for a derived read-only flag on those responses (e.g.
      `isLocked: boolean` + `lockReason: string`). **Until it exists**, those screens must
      fall back to the degraded pattern in §14 R-06b (attempt, then explain the 409) and
      must say so in a code comment referencing this item.

- [ ] **B-07 — Two tax constant masters have no API at all.** `biaya_jabatan_master` and
      `pasal17_bracket_master` exist as entities
      (`modules/tax-bpjs-constants/{biaya-jabatan-master,pasal17-bracket-master}/entities/`)
      and are consumed by the December true-up (§7 R7), but have **no controller, no
      service, and are not registered in `TaxBpjsConstantsModule`** — unlike the four
      masters that are (PTKP, TER, BPJS Kesehatan, BPJS Ketenagakerjaan). §7 requires *every*
      tax constant to be admin-editable. The Tax & Statutory Constants screen (§15.12) can
      therefore only cover four of six tables. Confirm whether the remaining two get CRUD
      endpoints (then §15.12 grows two tabs) or stay seed-only (then the screen states so
      explicitly rather than silently omitting them).

- [ ] **B-08 — No list endpoint is paginated.** `GET /employees`, `GET /payslips`,
      `GET /attendance-records`, `GET /attendance-raw-logs` etc. all return **full result
      sets**; there is no `page`/`limit`/`total` anywhere. §2.2 anticipates hundreds-to-
      thousands of employees, and `attendance_raw_logs` grows by ~2 rows per employee per
      working day — a year of 300 employees is >150k rows in one response. Confirm whether
      server-side pagination is coming. **Until then**, every table in §15 uses antd's
      client-side pagination over the full response, and the two highest-volume screens
      (raw logs, attendance records) **must** send a narrowing filter (`employeeId` and/or
      `from`/`to`) rather than fetching unfiltered — see §14 R-08.

---
