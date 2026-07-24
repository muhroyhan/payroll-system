# Payroll System — Development Reference Doc Set

This is the same spec you've been using, split into 5 files so you can point Claude at only
the part relevant to the current session instead of the whole thing every time. Keep this
whole folder (e.g. `docs/payroll-spec/`) together — the files cross-reference each other by
section number (`§5.2`, `§11`, etc.), and those numbers still refer to the *original* combined
doc's numbering, not per-file numbering.

## Files

| File | Contents | When to point Claude at it |
|---|---|---|
| [01_GENERAL.md](./01_GENERAL.md) | §1–2: Project overview, tech stack | Once, at project kickoff. Rarely needs re-reading after Phase 1. |
| [02_RULES.md](./02_RULES.md) | §3–4: Rules for AI (boundaries), Scope & Assumptions | **Every session**, regardless of phase — this is the short file that should always be in context. |
| [03_STRUCTURE.md](./03_STRUCTURE.md) | §5–9: Core data model, PTKP derivation, scope engine, folder structure, PPh21/BPJS rules, calculation logic | Any session touching schema, the resolver, or the tax/BPJS/payslip math. This is the largest file. |
| [04_STEPS.md](./04_STEPS.md) | §10: Feature roadmap with Task IDs (P1–P10) per phase | Every session — tell Claude which Task ID you're on (e.g. "we're starting P3-T04"). |
| [05_BOUNDARIES_AND_TESTS.md](./05_BOUNDARIES_AND_TESTS.md) | §11–12: Immutability/validation rules, full test suite with edge cases, sign-off checklist | Whenever building anything with a lock/CRUD-restriction (§11), and mandatory for Phase 10 (P10-T01). |

## Suggested prompt pattern

```
Read 02_RULES.md and 04_STEPS.md.
We're on P3-T03 (attendance reconciliation service).
Also read the relevant part of 03_STRUCTURE.md (§5.3) for the data shapes.
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
