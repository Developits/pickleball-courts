# Tournament module — review findings and gated work plan

**Current mode:** PHASE 1 IMPLEMENTED LOCALLY — owner review required.

**Baseline reviewed:** `main` commit `c22dce6`, 2026-11-25.

**Phase 1 approval:** granted 2026-11-25 for D-01–D-04 as recorded in
[docs/tournaments/decisions/D-01-D-04-phase-1.md](docs/tournaments/decisions/D-01-D-04-phase-1.md).
The implementation is uncommitted and unpublished. Later phases, production
migration/deployment, infrastructure changes and branch/PR publication remain
unapproved.

Specifications:
[PRD.md](PRD.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [DATABASE.md](DATABASE.md).
Prepared structure: [docs/tournaments/README.md](docs/tournaments/README.md).

Checked implementation items below are backed by the evidence in §6. They do
not authorize Phase 2 or production rollout.

## 1. Planning deliverables

- [x] Inspect the current repository, authentication, schema, casual reset,
  session/UI roles and leaderboard boundaries.
- [x] Create all four specifications and cross-review their contracts.
- [x] Preserve approved business rules as BR-01–BR-15 and distinguish proposals.
- [x] Record contradictions, missing dependencies, and unresolved decisions.
- [x] Prepare documentation-only directory indexes and the future code layout.
- [x] Detail Phase 1 work, acceptance criteria, dependencies, and testing gates.
- [x] Owner reviews the specifications and resolves Phase 1 decisions.
- [x] Owner explicitly approves Phase 1 application implementation.

## 2. Cross-specification review

| ID | Finding / source | Resolution or dependency | Status |
| --- | --- | --- | --- |
| R-01 | “Assigned tournaments only” does not authorize Organizers to create/claim new events. Earlier assistant text suggested creation. | PRD D-01: Admin-only draft creation. Organizers never self-create or claim events. | Resolved and approved |
| R-02 | Existing `users.role` is single-valued and shared with casual auth/UI. Replacing it with `organizer` can remove privileges and fail the JWT whitelist. | D-02: additive Organizer capability plus assignments; existing primary roles retained. | Resolved and approved |
| R-03 | Supervisor operations and Organizer delegation scopes are not fully specified. | D-03: Admin-only staff assignment; assigned Organizers edit drafts; assigned Supervisors read drafts; operations deferred. | Resolved and approved |
| R-04 | Current API role checks use JWT claims; assignment revocation could otherwise remain stale until expiry. | Tournament routes load current eligibility/capabilities/assignments in preflight and inside guarded writes; replays re-check authority. Casual auth behavior is unchanged. | Implemented and tested |
| R-05 | D1 transactions are not JS callbacks; separate updates then audit can partially succeed. Revision checks alone do not solve revocation/retry races. | D-04 / P1-03: conditional atomic command + audit + idempotency protocol proven on real SQLite and isolated local Wrangler D1 before mutation routes. | Implemented and tested |
| R-06 | Separate matches do not prevent casual reset/status writes or casual starts from colliding with tournament reservations. | Phase 1 creates no reservations. D-08 and Phase 4 must integrate shared court availability with both modules. | Phase 4 blocker, not hidden Phase 1 work |
| R-07 | One linear lifecycle can conflict with categories running concurrently. Earlier lifecycle labels mixed state and publication milestones. | Phase 1 draft only. D-11 decides category/event states and versioned publication before Phase 2. | Later decision recorded |
| R-08 | Approved members only, single-elimination first, Organizer-created drafts, and separate rankings were recommendations awaiting confirmation. | D-01 is approved as Admin-only creation; D-05/D-06/D-10 remain proposals, not requirements. | No silent adoption of later rules |
| R-09 | Existing casual team invites expire quickly and casual scoring feeds its own ranking. Reuse would couple independent workflows. | Dedicated tournament tables now; no casual team/score writes in Phase 1. | Implemented boundary |
| R-10 | Venue metadata exists in the requested workflow, but the current court inventory has no venue model. | Draft textual venue now; canonical venue/court mapping and physical reservations require D-08 before scheduling. | Later dependency |
| R-11 | Existing casual time helpers assume Shanghai; tournaments may need event-specific dates/timezones. | D-04: explicit IANA event zone + UTC instants; casual time rules unchanged. | Implemented and tested |
| R-12 | “Published information” does not specify anonymous visibility, private fields, or retention. | D-09/D-12 before public lists or collecting entries. No public drafts/registration in Phase 1. | Phase 2 blocker |
| R-13 | No approved rules for category eligibility, partners, late entries, rest periods, corrections, or downstream bracket invalidation. | D-05–D-08; scoring correction design before Phase 5. No speculative implementation now. | Later dependency |
| R-14 | New migrations must support both fresh schema and already deployed schema; future states may require SQLite CHECK-table rebuilds. | DATABASE.md migration contract; fresh/upgrade parity and casual-data preservation proven locally. No remote migration executed. | Local gate passed; remote remains approval-gated |
| R-15 | A branch/PR can automatically produce a Cloudflare preview; that is not approval to merge or deploy production. | No branch/PR has been published. Isolate preview bindings and obtain approval before publication; never auto-merge or deploy production. | Operational gate still open |

The four documents share the same Phase 1 boundary and decision register.
Unresolved decisions are not “fixed” by silently choosing a convenient schema.

## 3. Phase boundaries

| Phase | Scope | Approval status |
| --- | --- | --- |
| 1 | Organizer/assignment security foundation; draft events/categories; Admin staff management; audit; regression protection | Approved; implemented locally, unmerged |
| 2 | Registration/partners/review/published category entry lists | Not approved; do not start |
| 3 | Draw generation, seeding/byes, reviewed publication | Not approved; do not start |
| 4 | Schedules/reservations/conflict checking | Not approved; do not start |
| 5 | Court operations/scores/advancement/live schedule | Not approved; do not start |
| 6 | Announcements/results/winners/archival completion | Not approved; do not start |

## 4. Detailed Phase 1 plan — execute ONLY after approval

Dependency order:
`P1-00 → P1-01 → P1-02 → P1-03 → P1-04/P1-05 → P1-06 → P1-07 → P1-08`.
Completed items are supported by the evidence log in §6. The branch is local
and uncommitted; publication is not authorized.

### P1-00 — Freeze decisions and permission matrix

- [x] Record explicit owner approval for Phase 1 and D-01/D-02/D-03/D-04.
- [x] Reconcile changed answers across all four documents before coding.
- [x] Freeze accepted permissions, API payloads/limits and migration scope.
- [x] Record any later decision as deferred, with its phase gate.
- **Acceptance:** no unresolved authorization/storage contradiction; approved
  scope and non-goals are unambiguous. Covers BR-01–BR-07, BR-14, BR-15.

### P1-01 — Baseline and implementation workspace

- [x] Re-read current head/AGENTS instructions; inspect unrelated user changes.
- [x] Create a dedicated implementation branch after approval.
- [x] Run a clean local baseline: install locked dependencies, full checks,
  dependency audit; record actual results rather than assuming prior counts.
- [x] Use isolated local D1/SQLite fixtures with synthetic accounts; no production
  bindings or secrets for tests.
- [x] Reserve the next migration number; do not reuse an occupied number.
- **Acceptance:** reproducible baseline, known existing failures, controlled
  workspace. Do not “fix” unrelated failures by disabling tests. BR-01/14/15.

### P1-02 — Additive foundation schema

- [x] Implement only the approved Phase 1 tables from DATABASE.md.
- [x] Add constraints, scoped indexes and fresh-schema parity.
- [x] Add fixtures for Admin, Organizer-capable player, Organizer-capable
  Supervisor, assigned Supervisor, unassigned member, banned/deleted/unapproved
  accounts, and two distinct events.
- [x] Verify upgrade preserves representative casual tables/rows/roles.
- [x] Test fresh schema, upgrade, duplicate migration failure, FKs and uniqueness
  on real SQLite and local Wrangler D1.
- **Acceptance:** no existing role rewrite, no future-phase tables/actions,
  no remote SQL execution. AC-01/02/06/09; BR-01/03/06/07.

### P1-03 — Policy, validation and audited write protocol

- [x] Implement current-account tournament authorization under D-02/D-03.
- [x] Centralize event visibility and action policies; parent-check every child.
- [x] Implement plain-text/type/length/timezone/date validation for draft fields.
- [x] Prove the D1 revision/permission/idempotency/audit protocol from the two
  technical specs before shipping mutation routes.
- [x] Test audit failure rollback, denied/stale commands with no partial writes,
  concurrent same-version edits, grant/assignment revocation, request replay and
  same-key/different-payload conflict.
- **Acceptance:** permission checks are not JWT/UI-only; every successful command
  has exactly one committed audit; failed commands cannot appear successful.
  If feasibility fails, stop and revise the design, not the requirements.
  AC-04/05/07; BR-02/03/14.

### P1-04 — Admin Organizer grants and event staff API

- [x] Add authenticated Admin-only grant/list/revoke endpoints.
- [x] Add approved event staff list/assign/revoke endpoints and eligibility checks.
- [x] Support a user's existing casual role plus Organizer capability.
- [x] Return only minimal staff identity/assignment data; never auth secrets.
- [x] Add paginated audit read access for Admin/assigned Organizer only.
- [x] Test cross-event access, forged IDs/roles/actor fields, stale JWT role,
  revoked capability, and concurrent assignment changes.
- **Acceptance:** Admin controls the module; Organizers cannot self-promote,
  claim other events, or grant Admin/Supervisor privileges. AC-02/04/05.

### P1-05 — Draft event and category API

- [x] Implement scoped event list, Admin creation under D-01, detail and
  allowlisted revision-checked metadata edits.
- [x] Implement category list/create/edit/disable within authorized draft scope.
- [x] Store BR-06 event information, venue, dates, rules, categories and deadline.
- [x] Permit incomplete draft metadata without implying it is publishable.
- [x] Reject state/publication/registration/draw/schedule/score fields/actions.
- [x] Return stable pagination and distinguish invalid, hidden, forbidden and
  stale requests without leaking another event's data.
- **Acceptance:** scoped drafts work end-to-end against local D1; only draft
  state exists; category templates are not an exhaustive category restriction.
  AC-03/05/06/07/10; BR-06/07.

### P1-06 — Phase 1 UI and session integration

- [x] Extend login/validate capability responses without breaking existing
  clients/primary-role booleans; keep server checks authoritative.
- [x] Add scoped tournament navigation/list and role-appropriate draft actions.
- [x] Add event/category editor, validation, saved/draft indicator and explicit
  stale-edit recovery; no fake enabled later-phase controls.
- [x] Add Admin Organizer-grant and event staff screens/controls.
- [x] Add assigned Supervisor read-only view according to the approved matrix.
- [x] Test keyboard/labels, responsive layout, errors/retries, empty lists,
  direct links, revoked access and two-tab stale edits.
  Desktop browser checks covered labels, focusable controls, errors/retries,
  empty lists, direct links, revocation and two-tab conflicts. Responsive
  utility classes were retained from the existing UI; no separate device-lab
  run was performed.
- **Acceptance:** loading/error states do not expose drafts or claim unsaved
  changes succeeded; existing casual/home navigation remains usable. AC-01/08/10.

### P1-07 — Integrated verification and regression evidence

- [x] Run the full testing strategy in §5; resolve failures and rerun affected
  suites plus the full gate.
- [x] Exercise local staff/draft flows against compiled Pages Functions/D1.
- [x] Verify casual reset leaves all Phase 1 tournament records unchanged.
- [x] Verify casual queue/check-in/match history/leaderboard behavior still passes.
- [x] Confirm no future-phase endpoints, infrastructure, or production commands
  were introduced.
- **Acceptance:** all approved AC-01–AC-10 met with actual evidence; no claim
  that mocks alone prove D1 transaction behavior. BR-01/14/15.

### P1-08 — Documentation and owner handoff

- [x] Update TASKS.md with completed items, exact commands, test counts/results,
  remaining limitations and any approved specification changes.
- [x] Inspect the diff for credentials, unrelated changes, production fixtures,
  unsupported claims and accidental future-phase scope.
- [x] Request approval before publishing a branch/PR if not already authorized.
  A review PR must not auto-merge; previews require isolated configuration.
- [x] Stop after Phase 1. Request separate Phase 2 and production rollout
  approvals; neither follows automatically from green CI.
- **Acceptance:** Phase 1 review package is complete; unapproved later work stays
  unchecked. BR-14/15.

## 5. Testing strategy

### A. Specification checks during planning

Relative Markdown links, stable BR/AC/decision/task references, consistent
scope/permission/state contracts and the docs-only planning diff were checked.
Phase 1 application/migration results are reported separately in §6.

### B. Domain and authorization tests after approval

- Table-driven role × assignment × account-status × action matrix.
- Organizer assigned/unassigned/other-event cases; Admin all-event access.
- Organizer-capable Supervisor retains casual Supervisor privileges.
- Forged JWT role versus current DB role; revoked grants/assignments; deleted,
  unapproved and banned accounts; invalid/missing JWT and missing secret.
- Nested resource ID mismatch, allowlisted writes, invalid metadata/timezones,
  UTC conversion, nullable draft dates and stale revision conflict handling.

### C. Real database and concurrency tests

- Use the actual schema/migration with `node:sqlite` fixtures; test FK/check/
  unique/index behavior and migration parity, not only SQL-string mocks.
- Run the same write protocol against local Wrangler D1.
- Force a late audit/constraint error and prove domain changes roll back.
- Race same-revision commands and permission revocation; verify no partial
  effects and truthful audit results.
- Repeat a request after simulated lost response; no duplicate draft/grant/audit.
- Compare casual data before/after draft/grant/edit/reset workflows.

### D. API, React and local browser integration

- API status/body/visibility/pagination tests with real route handlers.
- Vitest/React Testing Library tests for scoped lists, role controls, forms,
  validation, errors, stale responses and revoked sessions.
- Local browser checks using synthetic accounts: Admin grant/create/assign,
  Organizer edit assigned event, Supervisor read-only, member/visitor denied,
  second event inaccessible, two-editor conflict and refresh recovery.
- Keep these tests separate from production; do not create live accounts or
  modify deployed data to demonstrate the module.

### E. Existing regression and build gates

After implementation approval, from the project root:

```bash
npm ci --ignore-scripts
npm run test:api
npm run test:ui
npm run check
npm audit
git diff --check
```

Use the supported Node 24 baseline/CI. `check` already includes lint, both test
suites, frontend/PWA build and local Pages Functions compilation. Add local
migration/D1 verification evidence separately; do not label `check:functions`
as a production deployment or a database integration test.

Do **not** run `npm run deploy`, remote D1 migrations, resource-creation commands,
or production-secret changes as a test step.

## 6. Execution evidence log

### Planning iteration — 2026-11-25

- Reviewed current repository and all four newly created specifications.
- Added documentation and documentation-only directory indexes.
- Application code/migrations/dependencies changed: **none**.
- Infrastructure purchased/created: **none**.
- Production actions: **none**.
- Application test execution for these docs: **not run; docs-only change**.
- Documentation/link/scope validation: **passed** — 8 Markdown files, 28 local
  links, 15 business-rule IDs, 12 decision IDs, 10 acceptance criteria and 9
  Phase 1 work packages checked. All changed files are Markdown.
- Phase 1 approval: **pending**.

### Phase 1 implementation — 2026-11-25

**Approval and workspace**

- Owner approved Phase 1 and D-01–D-04 as proposed; decision record added at
  `docs/tournaments/decisions/D-01-D-04-phase-1.md`.
- Local branch: `feat/tournament-phase-1`. No commit, push, PR or preview was
  created.
- Baseline before implementation: `npm ci --ignore-scripts` succeeded; clean
  `npm run check` passed (29 API/utility + 16 React tests at that baseline);
  `npm audit` reported 0 vulnerabilities.
- Migration number `009` was free and reserved. No remote D1 command was run.

**Implemented scope**

- Additive `migrate_009_tournament_foundation.sql` and matching `schema.sql`
  additions for `user_capabilities`, `tournaments`, `tournament_categories`,
  `tournament_staff` and `tournament_audit_log`.
- Current-account tournament policy, allowlisted draft/category validation,
  bounded request-body reads, idempotent command fingerprints, atomic
  audit/domain batches, revision checks and in-batch permission guards.
- Admin Organizer grant/list/revoke, Admin event-staff replacement, scoped draft
  list/detail/edit, category create/edit/disable and paginated audit reads.
- Additive session `capabilities` in login/validate and an independent
  `isTournamentOrganizer` UI flag; primary roles and casual behavior unchanged.
- Scoped tournament list/editor, category/staff/audit sections, Admin Organizer
  access screen, Supervisor read-only view, saved/stale/error states and
  retry-safe idempotency handling.

**Verification commands and results**

```text
npm run check                         exit 0
  test:api                            43 passed, 0 failed
  test:ui (4 files)                   26 passed, 0 failed
  build                               passed
  check:functions                     passed
npm run test:tournaments:local        exit 0
npm audit                            0 vulnerabilities
git diff --check                     clean
```

- Real SQLite coverage: fresh schema vs legacy-plus-migration definitions are
  equal; representative casual `courts`/`court_sessions` rows survive; duplicate
  migration application fails; invalid staff FK fails; audit failure rolls back
  draft creation; category failure rolls back the audit and parent revision;
  competing same-revision writes produce one winner; replay after revocation is
  denied without another audit.
- Isolated local Wrangler D1 coverage: revision concurrency, atomic audit
  rollback and audit counts passed on a real local D1 binding.
- Compiled local Pages Functions + D1 coverage passed Admin grant/create/staff
  assignment, Organizer category/edit, stale-edit rejection, Supervisor
  read-only access, audit reads and immediate Organizer revocation.
- Local browser checks against compiled Pages Functions and isolated D1:
  Admin grant/create/assign; Organizer sees only its assigned draft and edits
  it without staff-assignment controls; Supervisor sees disabled fields and no
  save/audit controls; plain member sees no drafts and receives 404 for a
  guessed draft URL; visitor is redirected to login; an unassigned second draft
  is inaccessible to the Organizer; a two-tab edit produced one 409 with no
  automatic retry, and explicit reload showed the other tab's saved revision.
- Review fix: replay handling was tightened to re-check current authority before
  returning a replayed result. Tournament tests were rerun (14 passed) and the
  full gates were rerun successfully.

**Limitations / boundaries**

- Phase 1 is complete only at the approved boundary. Registration, draws,
  schedules, reservations, tournament scoring, announcements, winners, public
  pages and casual/tournament ranking integration are not implemented.
- D-05–D-12 remain pending with their recorded phase gates.
- Migration and deployment were verified only in isolated local databases. No
  production migration, deployment, secret change, infrastructure purchase or
  preview was performed.
- Responsive layout reuses existing responsive classes; no separate device-lab
  run was performed.
- Branch/PR publication and production rollout require explicit owner approval.
