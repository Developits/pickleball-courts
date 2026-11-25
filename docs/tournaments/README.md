# Tournament module documentation

Phase 1 is approved and implemented on an uncommitted local branch. This
directory is documentation, not a second implementation.

## Authoritative specifications

- [PRD.md](../../PRD.md): approved business rules, scope and unresolved decisions.
- [ARCHITECTURE.md](../../ARCHITECTURE.md): integration, permissions and code layout.
- [DATABASE.md](../../DATABASE.md): Phase 1 data model and migration boundaries.
- [TASKS.md](../../TASKS.md): cross-review, detailed Phase 1 plan, tests and evidence.

## Directories

- [decisions/](decisions/README.md): decision-record convention and the
  D-01–D-04 approval record.
- [phase-1/](phase-1/README.md): Phase 1 review and verification convention.

Do not put runnable route stubs into `functions/` merely to scaffold future
directories. Cloudflare Pages uses file-based routing. Phase 1 routes exist;
later-phase structure remains gated by its own approval.
