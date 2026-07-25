# Payroll System — Development Reference Doc Set

This is the same spec you've been using, split into files so you can point Claude at only
the part relevant to the current session instead of the whole thing every time. Keep this
whole folder (e.g. `docs/payroll-spec/`) together — the files cross-reference each other by
section number (`§5.2`, `§11`, etc.), and those numbers still refer to the *original* combined
doc's numbering, not per-file numbering.

Two bundles: **00–05 is the backend** (built, Phases 1–8 complete) and **06–09 is the Admin
Web frontend**. The frontend bundle never restates business logic — it cites the backend
sections instead.

## Backend bundle (`apps/api`)

| File | Contents | When to point Claude at it |
|---|---|---|
| [01_GENERAL.md](./01_GENERAL.md) | §1–2: Project overview, tech stack | Once, at project kickoff. Rarely needs re-reading after Phase 1. |
| [02_RULES.md](./02_RULES.md) | §3–4: Rules for AI (boundaries), Scope & Assumptions | **Every session**, regardless of phase — this is the short file that should always be in context. |
| [03_STRUCTURE.md](./03_STRUCTURE.md) | §5–9: Core data model, PTKP derivation, scope engine, folder structure, PPh21/BPJS rules, calculation logic | Any session touching schema, the resolver, or the tax/BPJS/payslip math. This is the largest file. |
| [04_STEPS.md](./04_STEPS.md) | §10: Feature roadmap with Task IDs (P1–P10) per phase | Every session — tell Claude which Task ID you're on (e.g. "we're starting P3-T04"). |
| [05_BOUNDARIES_AND_TESTS.md](./05_BOUNDARIES_AND_TESTS.md) | §11–12: Immutability/validation rules, full test suite with edge cases, sign-off checklist | Whenever building anything with a lock/CRUD-restriction (§11), and mandatory for Phase 10 (P10-T01). |

## Frontend bundle (`apps/web`)

| File | Contents | When to point Claude at it |
|---|---|---|
| [06_FRONTEND_GENERAL.md](./06_FRONTEND_GENERAL.md) | §13: Frontend scope, stack delta, state-management pattern, auth flow as the backend actually implements it, **and the ⛔ backend gaps (B-01…B-08) that block FE work** | Once at frontend kickoff, and again whenever an auth or blocker question comes up. |
| [07_FRONTEND_RULES.md](./07_FRONTEND_RULES.md) | §14: Hard frontend boundaries R-01…R-13 (one state library, antd Form only, one error-mapping contract, no hardcoded enums, locks disabled before the click) | **Every `apps/web` session** — the frontend analogue of 02_RULES.md. |
| [08_FRONTEND_STRUCTURE.md](./08_FRONTEND_STRUCTURE.md) | §15: Screen/module inventory — routes, endpoints + their real guards, state-machine visualisations, and the lock-derivability matrix | Point at the **one subsection** for the module being built (e.g. §15.12 for payroll runs), not the whole file. |
| [09_FRONTEND_STEPS.md](./09_FRONTEND_STEPS.md) | §16: Frontend roadmap, Task IDs FE-T00…FE-T34, plus the frontend sign-off checklist | Every `apps/web` session — say which FE Task ID you're on. |

## Suggested prompt pattern

Backend:

```
Read 02_RULES.md and 04_STEPS.md.
We're on P3-T03 (attendance reconciliation service).
Also read the relevant part of 03_STRUCTURE.md (§5.3) for the data shapes.
```

Frontend:

```
Read 07_FRONTEND_RULES.md and 09_FRONTEND_STEPS.md.
We're on FE-T17 (attendance records screen + period lock).
Also read 08_FRONTEND_STRUCTURE.md §15.8 and §15.2.
```

This keeps context small and cheap per prompt instead of re-pasting the whole spec, while
still guaranteeing Claude sees the two files that matter every session (Rules + Steps).

## A note on cross-references

Sections keep their original numbers across files (e.g. `03_STRUCTURE.md` still contains
§5–§9, not a renumbered §1–§5) specifically so a note like "see §11" written in one file
still points to the right place in another file without needing to be rewritten. If you add
new sections later, append rather than renumber, to keep old cross-references valid.

---

*This doc set reflects PP 58/2023 (TER), Perpres 64/2020 (BPJS Kesehatan), and BPJS
Ketenagakerjaan structure as of mid-2026. Re-verify rates before each tax year if this
project is still evolving.*
