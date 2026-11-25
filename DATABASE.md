# Tournament module — database specification

**Status:** Phase 1 additive schema approved and implemented locally; no remote
migration or production schema change has been applied.

Read [PRD.md](PRD.md) for approved rules/pending decisions,
[ARCHITECTURE.md](ARCHITECTURE.md) for write/permission contracts, and
[TASKS.md](TASKS.md) for delivery and test gates.

## 1. Existing data to preserve

The current D1 schema contains `users`, `courts`, `court_sessions`, `check_ins`,
`queue`, `teams`, `team_invites`, `matches`, `notifications`, `qr_tokens`,
`rate_limits`, and `settings`.

- Do not rename/reuse these as tournament storage.
- Preserve user IDs and player/supervisor/admin role meanings.
- Do not update casual matches, statistics, queues, reservations-by-status,
  session dates, or notification behavior as a side effect of draft editing.
- Existing casual `teams`/`team_invites` have different lifetimes and rules;
  tournament partnerships will have their own tables after Phase 2 approval.
- Casual daily reset currently deletes unfinished rows from `matches`, clears
  queue/QR state and rewrites `courts`. No tournament table should be targeted.
- Do not modify or backfill production data in planning or local verification.

## 2. Phase 1 entity model — approved D-02 / D-04

All tournament resource IDs are opaque UUID text IDs; existing user
IDs remain integers. Timestamps in new tables are integer UTC epoch seconds.
API boundaries serialize them consistently; do not compare them to casual
SQLite datetime text without explicit conversion.

Every event stores an explicit, validated IANA timezone. Draft date fields can
be null; date completeness/deadline eligibility gates belong to later approved
publication rules. A supplied start/end pair must be valid and ordered. Venue
metadata is textual in Phase 1; it does not reserve physical courts.

### 2.1 `user_capabilities`

Represents the additional Tournament Organizer business role while preserving
the user's primary casual role.

| Column | Type / constraint | Meaning |
| --- | --- | --- |
| `user_id` | INTEGER FK → users | Recipient |
| `capability` | TEXT; Phase 1 permits only `tournament_organizer` | Not a free-form client privilege |
| `granted_by_user_id` | INTEGER FK → users | Current grant attribution |
| `granted_at` | INTEGER, required | UTC grant time |
| `revoked_at` | INTEGER, nullable | Inactive grant marker |
| `revision` | INTEGER ≥ 1 | Optimistic concurrency for grant changes |

Primary key: `(user_id, capability)`. Reinstatement updates the grant record and
appends audit; do not erase prior grant/revocation audit history.

Current approved Admins have event-wide authority without needing this grant.
An active capability alone does not authorize any specific assigned event.

### 2.2 `tournaments`

| Column | Type / constraint | Meaning |
| --- | --- | --- |
| `id` | TEXT PK | Event ID |
| `title` | TEXT, required, nonblank | Event title |
| `description` | TEXT, required default empty | Plain-text event information |
| `venue_name` | TEXT, nullable in draft | Venue label |
| `venue_address` | TEXT, nullable | Venue details, not a court binding |
| `timezone` | TEXT, required | Valid IANA zone; server validation |
| `starts_at`, `ends_at` | INTEGER, nullable pair | UTC event period |
| `registration_deadline_at` | INTEGER, nullable | Stored metadata only in Phase 1 |
| `rules_text` | TEXT, required default empty | Plain-text rules |
| `status` | TEXT, default/check `draft` in Phase 1 | No public state transition yet |
| `created_by_user_id` | INTEGER FK → users, required | Attribution, not automatic ownership |
| `created_at`, `updated_at` | INTEGER, required | UTC audit metadata |
| `revision` | INTEGER ≥ 1 | Parent aggregate revision |

CHECK the null/pair/order consistency of supplied event times; validate actual
timezone/type/lengths in the service as well. Deadline-versus-event policy is
not finalized (D-07); do not introduce an unapproved “late entries impossible”
business constraint.

The Phase 1 status CHECK deliberately permits only `draft`; a later migration
must expand/rebuild that constraint when D-11 and state transitions are approved.
Test rebuilding constraints on a populated local database before that later
migration. This avoids defining an accidental final lifecycle now.

Indexes: `(status, updated_at, id)` for event lists; `(created_by_user_id, id)`
for attribution queries if needed. Assignment filtering uses staff indexes.

### 2.3 `tournament_categories`

| Column | Type / constraint | Meaning |
| --- | --- | --- |
| `id` | TEXT PK | Category ID |
| `tournament_id` | TEXT FK → tournaments, required | Parent scope |
| `code` | TEXT, required; unique per event | Stable event-local identifier |
| `name` | TEXT, required | Display label |
| `team_size` | INTEGER > 0 | Doubles use two; not a global doubles-only restriction |
| `rules_text` | TEXT, default empty | Draft category rules/eligibility description |
| `sort_order` | INTEGER ≥ 0 | Display order |
| `is_active` | INTEGER boolean | Disable in a draft rather than hard-delete |
| `created_at`, `updated_at` | INTEGER | UTC |

Unique: `(tournament_id, code)`. Index `(tournament_id, is_active, sort_order, id)`.
Validate team-size/category semantics before registration is later enabled;
Phase 1 does not enforce an invented gender/partner policy.

Suggested templates are men's doubles, women's doubles, mixed doubles; templates
do not make the category list exhaustive. Existing casual codes such as
`mens_double` are not a reason to mutate casual records or reuse their rules.

### 2.4 `tournament_staff`

| Column | Type / constraint | Meaning |
| --- | --- | --- |
| `tournament_id` | TEXT FK → tournaments | Assigned event |
| `user_id` | INTEGER FK → users | Assigned account |
| `staff_role` | TEXT enum `organizer`, `supervisor` | Event-scoped responsibility |
| `assigned_by_user_id` | INTEGER FK → users | Admin attribution under D-03 proposal |
| `assigned_at` | INTEGER | UTC |
| `revoked_at` | INTEGER nullable | Inactive assignment |

Primary key: `(tournament_id, user_id, staff_role)`. One account can retain both
responsibilities when eligible; one role string must not accidentally replace
another. Index `(user_id, revoked_at, tournament_id)` for authorized event lists.
An assignment is effective only while its required account/capability remains
eligible. Revoking Organizer capability immediately disables Organizer authority
even if historical assignment rows remain present.

All category/staff commands increment the parent event revision to serialize
concurrent changes to the aggregate. Do not rely on UI buttons to coordinate.

### 2.5 `tournament_audit_log`

| Column | Type / constraint | Meaning |
| --- | --- | --- |
| `id` | TEXT PK | Audit record ID |
| `request_id` | TEXT, required | Stable mutation/idempotency key |
| `request_fingerprint` | TEXT, required | Hash of normalized operation payload |
| `tournament_id` | TEXT FK → tournaments, nullable | Null only for global Organizer grants |
| `actor_user_id` | INTEGER FK → users, required | Actual authenticated actor |
| `action` | TEXT, required | Allowlisted operation name |
| `target_type`, `target_id` | TEXT, required | Changed entity |
| `resource_revision` | INTEGER ≥ 1, required | Committed event or capability-grant revision |
| `before_json`, `after_json` | TEXT JSON objects, nullable | Minimal staff-readable change metadata |
| `created_at` | INTEGER, required | UTC |

Unique: `(actor_user_id, request_id)`. Index `(tournament_id, created_at, id)`.
Repeated IDs with different normalized payloads must not replay a different
command. Replays re-check authorization before returning any resource details.

Append-only through the application; no audit edit/delete API. Do not store
passwords, JWTs, secrets, raw authorization headers, or unnecessary private
account fields in snapshots. Store only fields needed to explain changes.

### 2.6 Foreign keys and parent consistency

- Declare/enforce references, but do not assume a FK enforces authorization.
- No cascading deletion of tournament history on user/event deletion. Use
  restrictive references and explicit future archive/retention policy (D-12).
- A category's supplied event must equal its stored parent for every operation.
- Existing user soft-deletion must not physically delete historical staff/audit.
- Test FK/check/unique behavior against real SQLite and local D1, including
  invalid parents and duplicate category/staff/grant records.

## 3. Atomic mutation requirements

The event/grant/category/staff mutation and audit append must either both commit
or both fail. Write protocols must guard current authorization and expected
revision inside the command, not just in a prior read.

See ARCHITECTURE.md §5 and P1-03 in TASKS.md. Required failure tests include
audit insert failure, invalid category FK, stale parent revision, concurrent
same-revision edits, revoked access, and repeated request IDs.

If the proven D1 implementation requires an explicit guarded command table,
document its fields/constraints here and approve the design adjustment before
application mutation routes. Do not add an undocumented table or claim
`batch` automatically solves authorization/idempotency races.

## 4. Future logical entities — not Phase 1 migrations

These names express dependencies, not approved implementation scope:

| Later entity | Purpose / unresolved dependency |
| --- | --- |
| `tournament_entries`, `tournament_entry_members` | Category entries, partners; D-05/D-07 eligibility and confirmation. |
| `tournament_publications` | Versioned entry lists/draws/schedules/results; D-09 visibility and D-11 state model. |
| `tournament_draws`, `tournament_matches` | Seeds, byes, bracket dependencies, results; D-06 format/scoring. |
| `court_reservations`, possible participant reservation rows | Court/player interval conflicts; D-08 cross-module enforcement. |
| `tournament_announcements` | Published notices and changes; minimum private/public fields after D-09. |
| Match/result revision records | Score corrections and downstream advancement audit; approved in Phase 5. |

Do not reuse casual `matches` or `teams` for these entities. Separate storage
does not by itself prevent double-booking shared physical courts. An interval
overlap check done in a separate request is also not a concurrency guarantee;
Phase 4 must prove conflict-safe reservation/start commands.

Do not copy tournament wins into casual counters/leaderboards while D-10 is
unresolved. Phase 1 writes no scores of any kind.

## 5. Migration strategy after Phase 1 approval

1. Re-read the current head/schema/migrations; reserve the next unused number
   (`migrate_009_tournament_foundation.sql`).
2. Create additive tables/indexes/constraints only. No casual table rebuild,
   data reset, existing-role rewrite, remote command, or production backfill.
3. Update `schema.sql` so fresh databases match an upgraded existing database.
4. Validate both fresh-schema and upgrade paths in isolated local databases;
   compare tables/indexes/constraints and preserve representative casual rows.
5. Verify the same statements on local Wrangler D1, not only mocked adapters.
6. Migration is one-shot, explicitly tracked by the existing manual workflow;
   duplicate application should fail clearly rather than conceal schema drift.
7. Keep production migration/deployment instructions as an approval-gated
   checklist. Do not execute them as part of implementing/testing Phase 1.

Local recovery: discard/recreate only the isolated test database. Do not write a
destructive production “down” migration. Production rollback/data retention
requires its own reviewed operational plan before a later rollout.

## 6. Capacity and privacy

Scope and paginate event/staff/audit lists; keep query indexes aligned with
permission predicates. Do not claim performance or unlimited history capacity
without measurements. Future registration data collection and retention require
D-09/D-12 decisions. No new paid database/service is authorized by this design.
