# Production migration execution — `migrate_009_tournament_foundation.sql`

**Status: APPLIED successfully on 2026-11-27.**

**Approval:** explicit owner instruction to start the approval-gated production
steps, following [production-migration-plan.md](production-migration-plan.md).
The owner is the `Developits` repository account.

## Target

- Cloudflare account: `e248f5207322962a26d00e83c5289e4e`
- Pages project: `nuistpickleballclub`
- D1 database: `pickleball-courts`
- D1 ID: `d70a574a-bcdb-44d0-b1c7-d3784e8d4651`
- Migration checksum:
  `5694e8ef479debc7f80bd36d3d19264b8329a84d0fac3b347e4ec557348f1257`
- Production Pages commit: `70db4f2`

## Backup

- Time Travel bookmark before migration:
  `00000065-00000000-00005130-85ba5b8dd596b634b85242387f47adca`
- Logical export:
  `~/secure-d1-backups/pickleball-courts-pre-009-20261127T083850Z.sql`
- Export size: 32,342 bytes
- Export SHA-256:
  `52c2610e32a94265a1545ceacd8b62aade12a6d62c0cd1a5129c9de8f6f83332`

The export was kept outside the repository and its contents were not copied into
this record.

## Preflight

- Tournament tables present before migration: **0**
- Existing rows:
  - users: 22
  - courts: 3
  - settings: 16
- `PRAGMA foreign_key_check`: no rows
- Production Pages was on `70db4f2` and included the Phase 1 code.

## Execution

Command:

```bash
npx wrangler d1 execute pickleball-courts \
  --remote \
  --file=./migrate_009_tournament_foundation.sql
```

Result:

- Processed queries: 10
- Rows read: 15
- Rows written: 22
- Final bookmark:
  `00000065-00000005-00005130-feca6745ab1fb49c4962310f0ff8c1f3`
- `num_tables`: 17
- Database size after: 303,104 bytes
- Exit status: 0

## Verification

- Tables created: 5
  - `user_capabilities`
  - `tournaments`
  - `tournament_categories`
  - `tournament_staff`
  - `tournament_audit_log`
- Named indexes created: 5
  - `idx_tournaments_list`
  - `idx_tournaments_creator`
  - `idx_tournament_categories_list`
  - `idx_tournament_staff_user`
  - `idx_tournament_audit_list`
- Table definitions in production match the reviewed migration.
- Existing counts after migration:
  - users: 22
  - courts: 3
  - settings: 16
- New table counts:
  - capabilities: 0
  - tournaments: 0
  - categories: 0
  - staff: 0
  - audit: 0
- `PRAGMA foreign_key_check`: no rows
- `PRAGMA integrity_check` was attempted but D1 returned
  `not authorized: SQLITE_AUTH`; this is a D1 permission limitation, not a
  reported corruption result.

## Application smoke test

- `GET /` returned 200.
- `GET /login` returned 200.
- Unauthenticated `GET /api/tournaments` returned 401 with
  `Authentication required`.
- No production account was used, created or modified.
- Authenticated admin smoke test is still pending; the owner must sign in with
  an existing admin account and open `/tournaments`.

## Not performed

- No production data seeding.
- No Organizer capability grant or staff assignment.
- No production secret or binding change.
- No additional Pages deployment was required for the migration.
- No rollback was needed.

## Post-migration schema drift remediation — 2026-11-27

After the migration, an authenticated `GET /api/tournaments?offset=0` returned
500 with `Unable to complete tournament request`. The React DevTools source-map
messages in the browser console were unrelated noise.

Root cause: production had never applied `migrate_004.sql`. The `users` and
`matches` tables had no `deleted_at` column, and `idx_users_deleted_at` did not
exist, even though later migrations 005–008 were present. The tournament
eligibility predicate in `functions/api/utils/tournaments/policy.js` requires
`u.deleted_at IS NULL`; running the exact list SQL on production reproduced
`no such column: u.deleted_at at offset 105: SQLITE_ERROR [code: 7500]`.
The same drift affects casual endpoints that filter on `deleted_at`, including
profile, live matches and leaderboard.

Owner approved applying the missing additive change directly to production.

- Time Travel bookmark before the fix:
  `00000067-00000006-00005130-80cfe73c58a00ecaffcb75109d63ceb7`
- Logical export:
  `~/secure-d1-backups/pickleball-courts-pre-004-fix-20261127T090230Z.sql`
  (35,673 bytes; SHA-256
  `fe67aeb63072a8cf14af5b8b6332ee1c3c61be91370f18f94edecfba6e0fdad6`)
- Applied SQL (SHA-256
  `843e76d1870cbc4facf34b83ac20ad5edd45716010c4657407bbc4ae1bf57f73`):

  ```sql
  ALTER TABLE users ADD COLUMN deleted_at DATETIME;
  ALTER TABLE matches ADD COLUMN deleted_at DATETIME;
  CREATE INDEX idx_users_deleted_at ON users(deleted_at);
  ```

- Result: exit 0, final bookmark
  `00000067-0000000c-00005130-0e5a616d67d096bccad366a5620e3b01`, 17 tables
  retained; no data rewritten.
- Verified: both columns exist, `idx_users_deleted_at` exists, counts unchanged
  (22 users, 7 matches, 3 courts, 16 settings), `PRAGMA foreign_key_check` clean.
- The exact admin list query now returns `success: true` with an empty result
  instead of a missing-column error.

This was a pre-existing production drift, not a Phase 1 code or migration
defect. The repository migration chain already contains `migrate_004.sql`; the
index was also missing there and is declared by `schema.sql`, so it was added
for fresh/upgrade parity.

## Follow-up

- Owner authenticated smoke test of `/tournaments` after a page refresh.
- Record the smoke-test result.
- Only after that, consider a real Organizer grant/staff assignment.
