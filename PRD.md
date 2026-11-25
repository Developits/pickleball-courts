# Tournament module — product requirements

**Status:** Phase 1 approved and implemented on an unmerged local branch;
later phases and production rollout NOT approved.

**Reviewed against:** repository `main`, commit `c22dce6`, 2026-11-25.

**Scope owner:** the project owner approves business decisions, Phase 1, and each subsequent phase.

## 1. Specification contract

Read this document with [ARCHITECTURE.md](ARCHITECTURE.md),
[DATABASE.md](DATABASE.md), and [TASKS.md](TASKS.md).

- The owner's tournament workflow is the approved product direction.
- An earlier assistant recommendation is not an approved business rule.
- Creating/reviewing these documents does not authorize application implementation.
- Approval of Phase 1 does not authorize any later phase, production deployment,
  infrastructure purchase, or production database operation.
- Conflicts must be raised and resolved in these specifications, not decided
  silently while coding. Approved business rules take precedence over proposed
  implementation details.

## 2. Goal and isolation boundary

Add a separate Tournament module to the existing React / Cloudflare Pages
Functions / D1 application. Cover event setup through registration, draws,
scheduling, operations, announcements, results, and winners.

Keep the existing casual court queue, check-in, session lifecycle, match history,
member home, roles, and leaderboard functioning. Do not treat a tournament as
another casual queue session or repurpose existing casual teams/matches.

## 3. Approved business-rule register

These IDs remain stable across the four specifications.

| ID | Approved rule | Planned delivery / acceptance |
| --- | --- | --- |
| BR-01 | Tournament is a separate module; casual court queue remains intact. | All phases: separate domain data; casual regression gates; shared-court safety before scheduling. |
| BR-02 | Admins have full management control. | Phase 1 onward: Admin access across tournaments, not limited by assignments. |
| BR-03 | Introduce a Tournament Organizer role; organizers manage assigned tournaments only. | Phase 1: explicit capability/assignment checks; no cross-event access. Storage model awaits D-02. |
| BR-04 | Supervisors operate courts and record tournament match results. | Phase 1 prepares staff assignments; Phase 5 delivers operations. Assignment/delegation details await D-03. |
| BR-05 | Players register and view published tournament information. | Phase 2 onward; no access to staff drafts/private entry details. |
| BR-06 | Event setup includes information, venue, dates, rules, categories, and registration deadline. | Phase 1 draft editors and persistence; publication completeness checks arrive with Phase 2. |
| BR-07 | Registration supports men's doubles, women's doubles, mixed doubles, etc., including partners. | Phase 1 category metadata; Phase 2 actual entries and partnerships. Do not silently restrict “etc.” to three hardcoded categories. |
| BR-08 | Staff publish registration, then close registration and review entries. | Phase 2: controlled registration state/deadline and review workflow. |
| BR-09 | Publish category-wise player/team lists after registration review. | Phase 2: deliberate publication; private fields excluded. |
| BR-10 | Generate/review brackets, seeding, and byes before publishing the drawsheet. | Phase 3: separate draft/review/publication, not generation-as-publication. |
| BR-11 | Assign courts/times while checking player/team conflicts. | Phase 4: cross-category/player and shared-court conflict checks. |
| BR-12 | Run matches with supervisor status/score updates and a live player schedule. | Phase 5: authorized operations, validated results, live read views. |
| BR-13 | Publish notices, schedule changes, results, and winners. | Phases 4–6: explicit publication/versioning and player-visible updates. |
| BR-14 | No application code before plan approval; implement Phase 1 only after approval; test and update TASKS.md. | Approval and completion gates in TASKS.md. |
| BR-15 | No infrastructure purchase, production deployment, or next phase without separate approval. | Applies to all work, including migrations, cron, and automatic release actions. |

## 4. Permissions: required boundaries and proposed Phase 1 contract

Required: Admins manage all events; organizers only their assigned events;
supervisors operate tournament courts/results; players register and read
published information.

The following is the **proposed** Phase 1 matrix, pending D-01 through D-03:

| Phase 1 action | Admin | Active assigned Organizer | Active assigned Supervisor | Other member / visitor |
| --- | --- | --- | --- | --- |
| Grant/revoke Organizer capability | Yes | No | No | No |
| Create a tournament draft | Yes | Pending D-01; proposed No | No | No |
| List/read event drafts | All events | Assigned events | Assigned events, read-only | No draft visibility |
| Edit draft metadata/categories | Yes | Assigned events | No | No |
| Assign/revoke tournament staff | Yes | Pending D-03; proposed No | No | No |
| Read event staff and event audit history | Yes | Assigned events | Staff names/roles only; no audit | No |
| Open registration / publish / generate draws / schedule / score | Not implemented in Phase 1, for any role | Same | Same | Same |

“Full control” means Admin ownership overrides across the module, not permission
to bypass integrity checks or erase audit records. The complete Admin workflow
arrives over the approved phases, not by exposing unfinished actions in Phase 1.

Account eligibility for staff commands is checked server-side: current approved,
non-deleted, non-banned account; current primary Admin/Supervisor status or
Organizer capability; and current assignment where applicable. UI visibility
and old JWT claims are not authorization.

## 5. End-to-end workflow

1. **Draft:** staff enter BR-06 metadata and configure categories.
2. **Registration:** publish registration; accept category entries and partners;
   close registration; review and publish category lists.
3. **Draws:** generate privately, review seeding/byes, then explicitly publish.
4. **Schedule:** assign courts/times and validate participant/court availability.
5. **Operations:** supervisors call/start/update matches and record results;
   players follow the live published schedule.
6. **Updates/completion:** publish notices, schedule revisions, results, winners,
   and archive according to an approved retention policy.

This sequence describes business milestones, **not** a finalized single global
state machine. Categories may need parallel progress; see D-11. Phase 1 only
allows draft state. A draft save cannot publish anything.

## 6. Decision register

D-01–D-04 were approved by the owner on 2026-11-25 for Phase 1 only; the
approved choices are recorded in
[docs/tournaments/decisions/D-01-D-04-phase-1.md](docs/tournaments/decisions/D-01-D-04-phase-1.md).
D-05–D-12 remain proposals and must be confirmed before their gated work.

| ID | Question / conflict | Answer (approved for D-01–D-04; otherwise proposed) | Gate |
| --- | --- | --- | --- |
| D-01 | Can Organizers create events, or only manage events assigned by Admins? | **Approved:** Admin creates drafts and assigns Organizers initially; no self-assignment/global creation grant. | Phase 1 |
| D-02 | How can Organizer coexist with existing player/supervisor privileges, given the single `users.role` column? | **Approved:** Add an Organizer capability without replacing primary roles; require per-event assignments. | Phase 1 |
| D-03 | Who assigns staff, and which supervisors may operate an event? | **Approved:** Admin-only assignments in Phase 1. Existing approved Supervisors/Admins are eligible as event supervisors; operations are event-scoped. Organizers may not delegate until separately approved. | Phase 1 |
| D-04 | Accept the proposed Phase 1 technical contract: additive local-tested migrations, UTC + event timezone, revision checks, atomic audited writes, and plain-text rules? | **Approved:** Adopt the designs in ARCHITECTURE.md/DATABASE.md after local D1 feasibility tests; do not weaken atomicity if a proposed SQL pattern fails. | Phase 1; feasibility passed locally |
| D-05 | Registration eligibility: members only, guests, approval, limits, waitlists, partner consent, withdrawals, staff-entered entries? | Start with approved members and confirmed partners; details still need explicit agreement. None are implemented in Phase 1. | Before Phase 2 |
| D-06 | First draw formats and scoring rules? | Single-elimination doubles first; round-robin/group stages later. This was only a recommendation. | Before Phase 3 |
| D-07 | Category eligibility, partner replacement, duplicate/cross-category entries, deadlines and late entry exceptions? | Define per-category policy; do not infer eligibility solely from existing gender fields. | Before Phase 2; replacement rules before draws |
| D-08 | Venue/court inventory, rest periods, provisional times, and shared casual-court reservations? | Explicit tournament reservations and a common availability gate before scheduling is enabled. | Before Phase 4 |
| D-09 | Is published information public to guests or only authenticated members? What player details may be shown? | Public event summary with minimal player identifiers; private registration data staff-only. Visibility policy is not yet approved. | Before Phase 2 publication |
| D-10 | Do tournament results affect casual rankings/statistics? | Separate tournament standings; casual leaderboard unchanged. This was only a recommendation. | Before Phase 5 |
| D-11 | Event-wide versus per-category registration/draw/schedule states and republication rules? | Coarse event lifecycle plus independently versioned category/publication artifacts. | Before Phase 2 state transitions |
| D-12 | Cancellation, deletion, audit retention, and historical identity policy? | No hard-deletion APIs in Phase 1; later cancel/archive with retained audit/history. Define retention before collecting entry data. | Retention/cancellation before Phase 2; later destructive operations separately approved |

Phase 1 does not resolve later decisions by creating speculative application
features. Metadata storage must leave room for them without enabling them.

## 7. Phase 1 acceptance criteria

- **AC-01:** Existing casual roles, routes, queues, check-ins, reset behavior,
  member home, match history, and ranking rules continue to pass regression tests.
- **AC-02:** Admin can grant/revoke Organizer capability and manage assignments,
  subject to the approved D-02/D-03 model.
- **AC-03:** Admin can create/read/edit a draft with BR-06 fields. Assigned
  Organizers can read/edit allowed draft fields/categories, not unrelated events.
- **AC-04:** Staff are assigned to a specific event. Current revocation,
  unapproval, deletion, or ban denies subsequent tournament commands.
- **AC-05:** Drafts and internal audit/staff details do not leak to members or
  visitors; guessed event/category/staff IDs cannot bypass scope checks.
- **AC-06:** Categories store configurable metadata, including partner/team-size
  requirements, without implementing entry eligibility or draws.
- **AC-07:** Invalid metadata, stale revisions, unauthorized writes, and database
  failures do not cause partial writes or misleading audit records.
- **AC-08:** Phase 1 UI has role-appropriate navigation, forms, validation,
  loading/error/empty states, and visible confirmation of saved drafts.
- **AC-09:** Tests, schema/migration comparison, local Functions checks, lint,
  build and audit succeed; actual outcomes are recorded in TASKS.md.
- **AC-10:** Registration, publication, brackets, reservations, scheduling, match
  scoring, announcements, and winners remain unavailable until later approval.

## 8. Not included in Phase 1

No entries/partner invitations, payments/fees, brackets, draw publication,
schedule generation, court reservations, tournament check-in, tournament scores,
notifications, background jobs, public tournament pages, new infrastructure, or
production changes. Do not purchase services or create production resources.

## 9. Approval record

- Plan reviewed by owner: **completed 2026-11-25**
- D-01 / D-02 / D-03 / D-04 confirmed: **approved 2026-11-25, as proposed**
- Phase 1 implementation explicitly approved: **approved 2026-11-25**
- Phase 1 review package / branch publication: **not yet requested**
- Production rollout approved: **not requested**
- Phase 2 approved: **not requested**
