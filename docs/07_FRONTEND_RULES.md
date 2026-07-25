# Payroll System — Part G: Frontend Rules

> Part 2 of 4 of the frontend bundle. Previous: [06_FRONTEND_GENERAL.md](./06_FRONTEND_GENERAL.md) ·
> Next: [08_FRONTEND_STRUCTURE.md](./08_FRONTEND_STRUCTURE.md)
>
> **This is the frontend analogue of [02_RULES.md](./02_RULES.md) — the short file that
> should be in context for every `apps/web` session, alongside 09_FRONTEND_STEPS.md.**

---

# PART G — FRONTEND RULES

## 14. Hard Boundaries for the Admin Web UI

Same contract as §3: these are **boundaries, not suggestions**. If a request in a session
conflicts with one of them, flag the conflict instead of silently complying. §3 still applies
in full to anything under `apps/api` — this section adds the `apps/web` equivalents.

---

### R-01 — There is exactly one server-state library, and exactly one place UI state lives

**Prohibited:** Redux, Redux Toolkit, Zustand, Jotai, Recoil, MobX, Valtio, XState, or any
other global client-state library. Do not add one. Do not add one "just for auth". Do not add
one "just for the payroll run wizard".

**Required:** server state → TanStack React Query (already a dependency). UI-only state →
`useState` / `useReducer` / React `useContext`. See §13.3 for the full pattern and the
query-key conventions.

**Why it's a hard rule:** §2.1 decided this deliberately — "don't reach for a global
client-state library unless a concrete cross-cutting need for one actually shows up; nothing
in this app's scope currently needs it." Every screen in §15 is a list/detail/form over a
REST endpoint. A second state library would end up mirroring the React Query cache, and the
two copies would disagree exactly where it hurts most: a §11 lock or a payroll run status
that changed server-side.

**Escalation path if a genuine need appears:** stop and raise it, with the specific
cross-cutting state that cannot be expressed as (a) a query, (b) a URL param, or (c) a
context. Do not introduce the library first and document it after.

Corollaries:
- Never mirror a query result into `useState`. If a form needs to edit server data, seed
  antd `Form`'s `initialValues` from the query and let the form own the draft.
- Never store server data in `localStorage` as a cache. The only things allowed in
  `localStorage` are the auth token and the persisted `user` (§13.5 B-04).
- Never use `setQueryData` to hand-patch a record that is subject to a §11 lock — invalidate
  and refetch (§13.3).

---

### R-02 — antd is the only component library, and antd `Form` is the only form layer

**Prohibited:** React Hook Form, Formik, Final Form, or any other form library — and any
second component library (MUI, Chakra, shadcn/ui, Mantine, Headless UI, PrimeReact).

**Required:** `antd` `Form` + `Form.Item` + antd inputs for **every** form in the app,
including the login form, filter bars, and inline edits. `Form.useForm()` owns draft values
and validation state.

**Why:** §2.1 — "antd's form validation/state handling is already built for its own inputs,
so adding another form library would just duplicate that layer for no benefit." A mixed app
also produces two incompatible validation-error shapes, which breaks the single error-mapping
contract in R-04.

Corollaries:
- A validation rule written in a `Form.Item` is for **UX only** — it never replaces the
  server's authority (R-05, R-10).
- Reusable field groups (e.g. the scope-selector used by four masters, §15.4) are built as
  components that render `Form.Item`s, not as a parallel form abstraction.
- If antd genuinely lacks a component, build it in `src/components/` with CSS Modules — do
  not import a second library to get one widget.

---

### R-03 — Styling: antd theme tokens first, CSS Modules second, nothing third

**Prohibited:** styled-components, emotion (directly), Tailwind, SASS/LESS build pipelines,
global stylesheet overrides that target antd's internal class names (`.ant-*`).

**Required:** global look-and-feel (brand color, spacing scale, radius, font) via
`ConfigProvider` theme tokens in one place. One-off component styling via CSS Modules.

**Why:** §2.1 spells out the antd-v6 CSS-in-JS conflict in detail — this rule is that
decision, enforced. Targeting `.ant-*` class names is separately prohibited because antd's
generated class names are not a public API and break on minor upgrades; use tokens or
component-level `styles`/`classNames` props instead.

---

### R-04 — One error-mapping contract for the whole app; no per-screen raw errors

**Prohibited:** rendering `error.message`, `error.response.data.message`, or a raw axios
error object anywhere in a component. Prohibited: per-screen `try/catch` that invents its own
wording for a status the app already has a rule for.

**Required:** one module — `src/api/errors.ts` — exporting a single normalizer:

```ts
type ApiErrorPresentation = {
  kind: 'auth' | 'forbidden' | 'notfound' | 'validation' | 'conflict' | 'network' | 'unknown';
  title: string;          // short, user-facing, Indonesian-ready
  detail?: string;        // normalized server message (see below)
  fieldErrors?: Record<string, string[]>;  // 400 only, feeds antd Form
  surface: 'toast' | 'inline' | 'modal' | 'redirect';
};

function describeApiError(error: unknown): ApiErrorPresentation;
```

Every screen renders from `describeApiError()`. The mapping is fixed:

| Status | Backend shape (verified) | `kind` | Surface | UI behaviour |
|---|---|---|---|---|
| **401** | Passport rejects an absent/expired/invalid token | `auth` | `redirect` | Clear session → `/login` with a "sesi berakhir, silakan login kembali" notice. **Never** a toast that leaves the user on a broken page. There is no refresh endpoint (§13.5 B-03) — do not retry. |
| **403** | `RolesGuard` returned false | `forbidden` | `inline` | "Anda tidak punya akses ke tindakan ini." **Never log the user out** — a 403 means the session is fine and the role is wrong. If it fires, the nav/route guard has a bug (R-11) — log it. |
| **404** | `NotFoundException` — e.g. `Kasbon {id} not found` | `notfound` | `inline` | Full-page "data tidak ditemukan" state on a detail route, with a link back to the list. Never a bare white screen. |
| **400** | `ValidationPipe` → `{ message: string[] }` (array, one entry per failed constraint) | `validation` | `inline` | Map each entry back onto its antd `Form.Item` via `form.setFields`. Show unmappable entries in a form-level `Alert`. Note: the pipe runs `whitelist` + `forbidNonWhitelisted`, so an *unexpected extra field* also yields 400 — that is a frontend bug, not user error; surface it loudly in dev. |
| **409** | `ConflictException` — the §11 lock / state-machine / uniqueness family | `conflict` | `modal` or `inline` | **Persistent** surface with the explanation, never a 3-second toast — the user must be able to read why and what to do instead. See below. |
| **5xx / network** | — | `network` | `toast` | "Gagal menghubungi server" + retry affordance. |

**409 is the important one.** The backend's conflict messages are *deliberately explanatory*
and already tell the user the correct alternative action, e.g.:

> `Kasbon {id}'s amount is locked — at least one installment has already been deducted (§11);
> cancel future installments and open a new kasbon instead of editing this one retroactively`

> `Source data for period {period} is locked — its payroll run is past draft (§11). Revert the
> run to draft before editing this period.`

Rules for these:
- **Show the server's message** — it carries the remedy. Do not replace it with a generic
  "operation failed".
- **Strip the spec references before display.** `describeApiError()` normalizes the message
  by removing `(§11)`, `§5.8`, `TC-…`, and `P8-T0…` tokens — those are for developers, not
  for HR staff.
- **Never a transient toast.** Use an antd `Modal.warning` for a destructive/blocked action,
  or a persistent `Alert` above the form.
- 409 is also used for a few non-lock cases (duplicate holiday date, leave request exceeding
  balance, summarizing a still-draft run). The same presentation works for all of them —
  which is exactly why this mapping is centralized rather than per-screen.

---

### R-05 — The backend is the single source of truth for enums, statuses, labels, and amounts

**Prohibited:**
- Declaring a status/type/enum literal in `apps/web` that already exists in
  `packages/shared-types` — no `const STATUSES = ['draft','calculated',…]`, no
  `type Role = 'admin' | 'hr_staff'`, no stringly-typed `'pending'` comparisons.
- Hardcoding any tax or BPJS number in the frontend — PTKP amounts, TER percentages, BPJS
  rates or caps, the Rp 500.000/month biaya jabatan cap, Pasal 17 brackets. §3 forbids this
  in business logic; it is equally forbidden in a UI label, a form placeholder, a helper
  text, or a validation rule.
- Recomputing a payslip figure client-side — including "harmless" ones like re-adding line
  items to check the total, or deriving `net_pay` from displayed fields. Display what the API
  returned (§14 R-07).
- Hardcoding an installment/quota/balance derivation the API already returns.

**Required:** import every enum from `@payroll-system/shared-types`
(`PayrollRunStatus`, `KasbonStatus`, `LeaveRequestStatus`, `SuratIjinStatus`, `SPLevel`,
`OvertimeLetterStatus`, `ScopeType`, `PtkpStatus`, `TerCategory`, `PayslipComponentType`,
`PayslipLineSource`, `AttendanceSource`, `HolidaySource`, `MaritalStatus`, `Gender`,
`EmploymentStatus`, `EmployeeActiveStatus`, `Role`, plus `MAX_DEPENDENT_COUNT`,
`SCOPE_TYPE_PRIORITY`, `TER_CATEGORY_BY_PTKP_STATUS`).

The **one** thing the frontend owns is the *display mapping* — a single
`src/features/<module>/labels.ts` per enum, mapping the shared enum value → Indonesian label
+ antd `Tag` color. Those files must be exhaustive `Record<Enum, …>` so adding a backend enum
value becomes a **compile error**, not a blank cell.

**If an enum is missing from `shared-types`, add it there** and rebuild the package — never
work around it with a local literal in `apps/web`. That package exists (§6) precisely so
"enums like `ptkp_status`, `scope_type`, and `payroll_run.status` can't drift between backend
and frontend."

---

### R-06 — Locks are shown *before* the click, not discovered after it

§11's whole point is that certain records must not be mutated. A UI that offers an Edit
button, lets the user fill a form, and only then surfaces a 409 is a broken UI — it wastes
work and teaches users that the system is unreliable.

**Required (R-06a — the default):** for every action that §11 can block, the control is
**rendered disabled**, wrapped in an antd `Tooltip` stating the reason in plain Indonesian,
derived from data the client already has. §15.2 lists which lock is derivable from which
field. Examples:
- `kasbon` where `remainingBalance < amount` → Edit/Delete disabled, tooltip "Kasbon sudah
  mulai dipotong — buat kasbon baru untuk koreksi."
- any approval-workflow record whose `status !== 'pending'` → Edit/Delete disabled.
- a payroll run that is `approved`/`disbursed` → Revert hidden entirely, not merely disabled.
- attendance for a period whose run is past `draft` → the whole edit surface disabled with a
  banner naming the run to revert.

**Required (R-06b — the documented fallback):** where the lock is **not** client-derivable
(§13.5 B-06: `surat_peringatan`, `overtime_letter`, `payslip_component_master`), the action
stays enabled and the 409 is surfaced per R-04 as a persistent modal. Every such site carries
a code comment: `// R-06b fallback — no isLocked flag on this response yet, see 06_FRONTEND_GENERAL.md B-06`.
This fallback is **not** a general licence to skip pre-emptive disabling; it applies only to
those three, and only until the backend exposes a lock flag.

**Prohibited:** a "delete" or "edit" affordance for an entity whose API has **no such
endpoint** — `payslips` (never deletable, §11), `salary_master`, `incentive_master`,
`leave_policy_master`, `payslip_component_master` (no DELETE route exists). Do not render a
button that cannot possibly succeed. Retirement of a master row is `effective_end_date` via
the edit form (§11), and the UI must present it that way.

---

### R-07 — The frontend never computes money, and never recalculates a payroll figure

All amounts shown on a payslip, summary, or line-item table come from the API response
verbatim. The frontend may **format** (thousand separators, `Rp` prefix, negative-in-red) but
never **derive**. No client-side sums across line items, no `gross - deductions`, no
percentage previews, no "estimated take-home".

**Why:** §1 — "a payroll tool that looks nice but miscalculates PPh 21 is worse than no tool
at all." A client-side figure that disagrees with the stored payslip by one rupiah of
rounding (§7's nearest-100 rule) destroys trust in the number that was actually paid.

The only arithmetic the frontend may do: **counting rows** and rendering a progress
percentage from `processedCount / totalCount` on a payroll run.

---

### R-08 — Query discipline: no unbounded fetches, no fetch outside the API layer

**Prohibited:** calling `axios`/`fetch` directly from a component or page. All requests go
through typed functions in `src/api/<module>.ts`, consumed by hooks in
`src/features/<module>/hooks/`.

**Prohibited:** loading `GET /attendance-raw-logs` or `GET /attendance-records` without a
narrowing filter. No list endpoint is paginated (§13.5 B-08) and these two grow ~2 rows per
employee per working day — an unfiltered fetch will eventually hang the browser. Those
screens require a filter (`employeeId`, and/or `from`/`to` defaulting to the current month)
**before** the query is enabled (`enabled: !!filter`).

**Required:** every table uses antd `Table`'s client-side pagination over the full response
until server-side pagination exists. When it does exist, it is added in the API layer and the
tables switch to controlled pagination — no screen rewrite.

---

### R-09 — New dependencies need a reason recorded in this bundle

The additions sanctioned by §13.1 (`react-router-dom`, `axios`) are the complete list.
Anything else — a chart library, a table library, a date library, a PDF viewer, an i18n
framework, a state library (already prohibited by R-01) — requires flagging first, with what
it does that antd + React Query + the existing stack cannot. §2.1's closing line applies to
the frontend too: "Do not introduce a different ORM, database, or frontend framework
mid-project."

---

### R-10 — Client validation is UX, server validation is truth

antd `Form` rules exist to catch obvious mistakes before a round trip (required fields,
number vs text, date ordering). They must **never** be the only enforcement, and must never
encode a business rule the frontend would have to keep in sync:

- Do not validate `dependent_count <= 3` with a local literal — use `MAX_DEPENDENT_COUNT`
  from shared-types (R-05).
- Do not pre-check "is this kasbon editable", "does this leave request fit the balance",
  "is this period locked" as a substitute for the server's answer — pre-emptive *disabling*
  (R-06) is a UX affordance; the server's 409 is still the authority and must still be
  handled.
- Do not implement the PTKP derivation (§5.1a) client-side to preview `ptkp_status`. That
  service lives on the backend and its output arrives on the employee record.

---

### R-11 — Role gating is enforced at the route, not just in the menu

Hiding a nav item is presentation. The route itself must check the role and render a 403
page. Both layers are required, and both derive from the **same** map
(`src/routes/access.ts`) so they cannot drift.

That map is built from the backend's **actual** guards (§15 lists them per endpoint, read out
of the controllers) — never from an assumption about what "feels" admin-only. Two concrete
traps already present in the backend:
- Controllers can be admin+HR while *individual actions* are admin-only
  (`POST /holidays/sync`, all four `payroll-runs` lifecycle actions,
  `PUT /salary-period-config`). Screens for these are visible to HR staff with the
  admin-only **actions** disabled — not hidden wholesale.
- `GET /salary-period-config` has **no** `@Roles` at all, so any authenticated user can read
  it while only admin can write it (§13.4).

---

### R-12 — Mirror the backend's module boundaries; don't invent a parallel taxonomy

`src/features/<name>` matches the backend module name (§6). A screen that consumes
`/surat-peringatan` lives in `features/letters/surat-peringatan`, not in a `features/warnings`
someone invented. Query keys derive from endpoint paths (§13.3). This is what makes "which
screen breaks if this endpoint changes" answerable by grep rather than by memory.

---

### R-13 — Never build a second implementation of something the backend resolves

The frontend consumes `GET /salary-master/resolve`, `GET /incentive-master/resolve`,
`GET /leave-policy-master/resolve`, and `GET /payslip-temp-components/active` to *show* a
resolved value. It must never reimplement the §5.2 priority order
(`employee > division > department > position > employee_type`) client-side to preview what
*would* resolve — that is the exact "second/parallel scope-resolution implementation" §3
prohibits, just moved across the wire. `SCOPE_TYPE_PRIORITY` from shared-types may be used to
**sort/label** scope rows for display; it may not be used to pick a winner.

---
