# Production migration plan — `migrate_009_tournament_foundation.sql`

**Status: EXECUTED 2026-11-27 — applied successfully.**

This plan was used for applying the additive Phase 1 tournament schema to the
production D1 database. Execution was separately approved by the owner and the
sanitized result is recorded in
[production-migration-execution.md](production-migration-execution.md).

## 0. Execution summary — 2026-11-27

- Production Pages was on `70db4f2` with the Phase 1 code.
- Production D1 had none of the five tournament tables before migration.
- A Time Travel bookmark and a full logical export were captured.
- `migrate_009_tournament_foundation.sql` was applied once; 10 queries and 22
  schema rows were written.
- Five tables and five indexes were verified; existing user/court/setting
  counts were unchanged and new tables are empty.
- Authenticated admin smoke testing remains pending.
- No production data was seeded and no secret or binding was changed.

## 1. Scope

Apply only:

```text
migrate_009_tournament_foundation.sql
```

Target:

- Cloudflare account: `e248f5207322962a26d00e83c5289e4e`
- Pages project: `nuistpickleballclub`
- D1 database: `pickleball-courts`
- D1 ID: `d70a574a-bcdb-44d0-b1c7-d3784e8d4651`
- Migration checksum at review:
  `5694e8ef479debc7f80bd36d3d19264b8329a84d0fac3b347e4ec557348f1257`

The migration creates only:

- `user_capabilities`
- `tournaments`
- `tournament_categories`
- `tournament_staff`
- `tournament_audit_log`

plus their indexes.

## 2. Explicit non-actions

Do **not**:

- run `schema.sql` against production;
- run `npm run deploy` or a manual Pages deployment as part of the migration;
- seed users, Organizer grants, events, categories, staff, audit rows or test data;
- rewrite existing `users.role` values or casual tables;
- change production secrets, bindings, project settings or preview settings;
- run a second migration command after an ambiguous failure;
- write a destructive production “down” migration;
- run this against `pickleball-courts-preview` or any preview binding.

## 3. Preconditions

All must be true before execution:

- [ ] Owner has approved this plan and given a separate execution instruction.
- [ ] The execution window and responsible operator are recorded.
- [ ] `main` is the reviewed commit and still contains the checksum above
  (verify with `sha256sum migrate_009_tournament_foundation.sql`).
- [ ] Production Pages is running a commit that includes the Phase 1 code.
- [ ] A read-only production check confirms **none** of the five tournament
  tables exists.
- [ ] No unrelated production migration is pending or in progress.
- [ ] The operator has confirmed the target is the production database, not a
  preview database or local state.
- [ ] The backup location is outside the repository and access is restricted.

## 4. Backup before mutation

### 4.1 Time Travel bookmark

Capture the current bookmark and timestamp:

```bash
npx wrangler d1 time-travel info pickleball-courts --json
```

Record the returned bookmark and timestamp in the execution log. Time Travel has
a limited retention window (documented as 30 days at the time of writing) and is
a recovery aid, not the only backup.

### 4.2 Logical export

Create a full logical export outside the repository:

```bash
mkdir -p "$HOME/secure-d1-backups"
npx wrangler d1 export pickleball-courts \
  --remote \
  --output "$HOME/secure-d1-backups/pickleball-courts-pre-009-$(date -u +%Y%m%dT%H%M%SZ).sql"
```

The export contains account data and password hashes. Do not commit it, paste it
into an issue, or upload it to a public location. Restrict permissions and record
only the path, size and checksum in the execution log.

## 5. Read-only preflight

Run and save the JSON output:

```bash
npx wrangler d1 info pickleball-courts --json
```

```bash
npx wrangler d1 execute pickleball-courts --remote --json --command "
SELECT name FROM sqlite_master
WHERE type='table'
  AND name IN ('user_capabilities','tournaments','tournament_categories','tournament_staff','tournament_audit_log')
ORDER BY name;
"
```

Expected: zero rows. If any table exists, **stop**. Do not apply the migration
and do not attempt to repair the schema ad hoc.

Record baseline counts without exposing personal data:

```bash
npx wrangler d1 execute pickleball-courts --remote --json --command "
SELECT
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM courts) AS courts,
  (SELECT COUNT(*) FROM settings) AS settings;
"
```

Run `PRAGMA foreign_key_check;` and record the result. If it reports pre-existing
violations, stop and review before adding more foreign keys.

## 6. Execution

Only after the separate execution approval:

```bash
npx wrangler d1 execute pickleball-courts \
  --remote \
  --file=./migrate_009_tournament_foundation.sql
```

Capture the full output, timestamp, `rows_written`, `changes` and any error.

Rules:

- Do not use `--preview`.
- Do not use `--local`.
- Do not run `schema.sql`.
- Do not retry on timeout, partial output or an ambiguous error.
- If a statement fails, stop and go to §8.

The migration is additive. It does not modify existing casual rows. The
tournament API still requires the Phase 1 code and current-account checks.

## 7. Verification after execution

### 7.1 Schema

```bash
npx wrangler d1 execute pickleball-courts --remote --json --command "
SELECT name, type FROM sqlite_master
WHERE name IN (
  'user_capabilities','tournaments','tournament_categories',
  'tournament_staff','tournament_audit_log',
  'idx_tournaments_list','idx_tournaments_creator',
  'idx_tournament_categories_list','idx_tournament_staff_user',
  'idx_tournament_audit_list'
)
ORDER BY type, name;
"
```

Expected: five tables and five named indexes.

Check the new table definitions and foreign keys:

```bash
npx wrangler d1 execute pickleball-courts --remote --json --command "
SELECT name, sql FROM sqlite_master
WHERE type='table'
  AND name IN ('user_capabilities','tournaments','tournament_categories','tournament_staff','tournament_audit_log')
ORDER BY name;
"
```

Compare the result with the reviewed migration and the local fresh/upgraded
parity test. Do not edit definitions manually.

### 7.2 Casual data preservation

Re-run the baseline counts from §5 and compare:

```bash
npx wrangler d1 execute pickleball-courts --remote --json --command "
SELECT
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM courts) AS courts,
  (SELECT COUNT(*) FROM settings) AS settings;
"
```

Counts must match unless unrelated casual activity occurred during the window.
Record any difference and explain it. Run `PRAGMA foreign_key_check;` again.

### 7.3 Application smoke test

- Unauthenticated `GET /api/tournaments` returns 401, not 500/503.
- The owner signs in with an existing admin account and opens `/tournaments`.
  The list should load without a 503.
- Do **not** create a production draft as part of the smoke test. A created
  draft cannot be deleted in Phase 1 and would remain production data.
- Check casual login, home, leaderboard and an existing casual read path.
- Organizer and Supervisor access should be tested only if an existing
  production account is intentionally granted/assigned by the owner and the
  resulting production audit/assignment is acceptable. Otherwise defer to the
  isolated preview evidence.

Expected: tournament reads succeed; no casual regression.

## 8. Failure and rollback

### Migration fails before creating any table

- Stop.
- Record the exact error.
- Do not retry blindly.
- Re-run the zero-table check. If no tournament table exists, no database
  rollback is needed; fix the cause through review before another attempt.

### Migration partially creates tables

- Stop all tournament writes.
- Capture the table/index list and the exact error.
- Prefer restoring the pre-migration Time Travel bookmark only with explicit
  owner approval:

```bash
npx wrangler d1 time-travel restore pickleball-courts --bookmark "<bookmark>"
```

A restore is destructive to data written after the bookmark. Do not run it
without confirming the impact and approval.

Alternative targeted cleanup (drop only newly created tournament tables) is
also destructive and must be separately approved. There is no automatic down
migration.

### Migration succeeds but the application fails

- Existing casual code remains compatible because the migration is additive.
- Do not drop the new tables merely because tournament reads fail.
- Capture the failing request, deployment commit and D1 error.
- Roll back application code only through a reviewed deployment decision.
- The schema may remain in place while the application issue is fixed.

## 9. Execution log

Record in the execution record (and summarize in `TASKS.md`):

- approving owner and timestamp;
- execution operator and window;
- `main` commit and migration checksum;
- Time Travel bookmark and timestamp;
- backup path, size and checksum (not contents);
- preflight table check result and baseline counts;
- exact execution command and output summary;
- post-migration schema result;
- casual count comparison;
- smoke-test result;
- any failure, rollback or follow-up;
- final status: applied, failed, or rolled back.

## 10. Approval record

This section is intentionally blank until execution is approved.

```text
Plan reviewed by:
Date:
Target database confirmed:
Backup location confirmed:
Execution window:
Approval to execute migration (separate message required):
```
