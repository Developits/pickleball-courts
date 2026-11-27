# D-01 to D-04 — Phase 1 approval record

**Approved:** 2026-11-25 by the project owner, in the implementation conversation
that followed review of [PRD.md](../../../PRD.md),
[ARCHITECTURE.md](../../../ARCHITECTURE.md), [DATABASE.md](../../../DATABASE.md)
and [TASKS.md](../../../TASKS.md).

**Scope:** Phase 1 only. This approval did not authorize Phase 2–6,
infrastructure purchase, remote migration execution, production deployment,
branch/PR publication, or a Cloudflare preview.

**Amendment (2026-11-25):** The owner later explicitly approved publishing
`feat/tournament-phase-1` as a draft PR and creating an isolated preview. That
approval did not authorize merge, production deployment, or a production
migration. The preview uses a dedicated free preview D1 database, enforced by
the `[env.preview]` binding in `wrangler.toml`; production keeps its separate
database binding.

**Merge note (2026-11-25):** The owner subsequently merged PR #3 as `e8cfa3b`,
which automatically deployed the application code to production Pages. The
production database migration was applied separately on 2026-11-27 after
explicit approval. This note does not authorize Phase 2.

## Approved decisions

### D-01 — Admin-controlled draft creation

Admin creates tournament drafts and assigns Organizers. Organizers manage only
events to which they are assigned; they cannot self-create, claim, or discover
unrelated drafts. Rejected alternative: letting Organizers create or claim
events under a broad Organizer grant.

### D-02 — Additive Organizer capability

`tournament_organizer` is stored as an additive capability in
`user_capabilities`. Existing primary `users.role` values
(`player`/`supervisor`/`admin`) and casual privileges remain unchanged. An
Organizer capability alone grants no event access; a per-event assignment is
also required. Rejected alternative: adding an `organizer` primary role that
could remove casual privileges or fail the existing JWT role whitelist.

### D-03 — Admin-only staffing and scoped supervision

Admin alone grants/revokes Organizer capability and assigns/revokes event
staff. Assigned Organizers may edit allowed draft fields/categories. Assigned
Supervisors have read-only draft access in Phase 1; tournament court operations
and scoring remain Phase 5 work. Organizers cannot delegate. Rejected
alternative: Organizer self-delegation or global Supervisor access to all
drafts.

### D-04 — Phase 1 technical contract

Approved technical choices:

- Additive migration plus fresh-schema parity; production execution required
  separate approval and was completed on 2026-11-27.
- Integer UTC epoch seconds for tournament instants, plus an event IANA
  timezone; casual Shanghai date rules are unchanged.
- Revision-checked writes with `Idempotency-Key` replay protection.
- Atomic command/audit batches with in-batch current permission checks; an
  audit failure rolls back domain writes.
- Plain-text rules/description fields; no rich HTML.
- Draft-only status; no registration, draw, schedule, score or publication
  actions.

The atomic write protocol was proven on real `node:sqlite` and isolated local
Wrangler D1 before mutation routes were completed. If a future D1 change breaks
atomicity, implementation stops and the design is revised rather than weakening
these requirements.

## Affected rules and phases

- Business rules: BR-01–BR-07, BR-14, BR-15.
- Acceptance criteria: AC-01–AC-10 for Phase 1.
- Work packages: P1-00 through P1-08 in [TASKS.md](../../../TASKS.md).
- Later decisions D-05–D-12 remain pending with their recorded gates.

## Specification changes

PRD status, decision register and approval record updated. ARCHITECTURE and
DATABASE status text updated to reflect the approved Phase 1 design. No
approved business rule was changed by implementation; the Phase 1 boundary and
all later-phase prohibitions remain in force.
