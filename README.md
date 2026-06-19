# Pickleball Court Management

A Cloudflare Pages application for QR check-in, court sessions, player queues,
automatic match assignment, match scoring, and player statistics.

## Roles

- **Player:** scans the supervisor QR code, joins the queue, and views stats.
- **Supervisor:** opens/closes the court, generates QR codes, assigns matches,
  records scores, and cancels unfinished matches.
- **Admin:** approves registrations, manages users, and can perform a daily reset.

There are no default privileged credentials. New registrations remain pending
until an admin approves them.

## Stack

- React 19 and Vite
- Cloudflare Pages Functions
- Cloudflare D1 (SQLite)
- Tailwind CSS
- Server-Sent Events for live court, queue, match, and check-in updates
- Node's built-in test runner

## Prerequisites

- Node.js 20 or newer
- npm
- A Cloudflare account for D1 and deployment

Install dependencies:

```bash
npm install
```

## Local Configuration

Create `.dev.vars` in the project root:

```dotenv
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
```

`.dev.vars` is ignored by Git. Never commit JWT secrets or production
credentials.

Create the D1 database if needed:

```bash
npx wrangler d1 create pickleball-courts
```

Copy the returned database ID into `wrangler.toml`.

### New Database

Initialize a new local database from the current schema:

```bash
npx wrangler d1 execute pickleball-courts --local --file=./schema.sql
```

For a new remote database, replace `--local` with `--remote`.

### Existing Database

Run only pending migrations, in numeric order. The current migration chain is:

```text
migrate_002.sql
migrate_003.sql
migrate_004.sql
migrate_005_court_sessions.sql
migrate_006_remove_geofence.sql
migrate_007_remove_hard_sit_out.sql
migrate_008_durable_rate_limits.sql
```

Example:

```bash
npx wrangler d1 execute pickleball-courts --local --file=./migrate_008_durable_rate_limits.sql
```

Do not run historical migrations after `schema.sql` on a new database; the
schema already contains their final state.

## Privileged Accounts

For local development, create accounts with bcrypt-hashed passwords:

```bash
node create-admin.js admin002 "StrongPassword" "Admin Name"
node create-supervisor.js supervisor002 "StrongPassword" "Supervisor Name"
```

These scripts target the local D1 database and do not print passwords or raw
SQL.

For production, register an account normally, then promote and approve it from
an authenticated Cloudflare/Wrangler session:

```bash
npx wrangler d1 execute pickleball-courts --remote --command "UPDATE users SET role = 'admin', is_approved = TRUE WHERE student_id = 'YOUR_ID'"
```

Use `role = 'supervisor'` for a supervisor account.

## Development

```bash
npm run dev
```

The command builds the frontend and starts Wrangler Pages development with the
local D1 binding. Wrangler prints the local URL.

Available commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Build and run Pages Functions locally |
| `npm run build` | Create the production frontend build |
| `npm run lint` | Lint application, Functions, scripts, and tests |
| `npm test` | Run focused API and utility tests |
| `npm run test:watch` | Rerun tests while files change |
| `npm run check` | Run lint, tests, and production build |
| `npm run preview` | Preview the static Vite build |
| `npm run deploy` | Build and deploy to Cloudflare Pages |

Run the full quality gate before deployment:

```bash
npm run check
```

## Core Operational Rules

- Player check-in is QR-only; geofencing is not used.
- QR validation derives the player identity from the authenticated JWT.
- A court session must be open before check-in, queue join, or match creation.
- Queue lock prevents new joins near closing time but does not block assigning
  players who are already waiting.
- Player match/win/loss counters update only after a scored match is completed.
- Canceled or reset unfinished matches are removed and do not affect stats.
- API rate limits are stored in D1, so counts survive Worker instance changes.

## Notifications

The application currently provides authenticated in-app notifications stored
in D1 and live dashboard refreshes through SSE.

Browser push is intentionally not enabled yet. A production push rollout needs
a VAPID key pair, permission UX, subscription lifecycle endpoints, provider
delivery/retry handling, and secret configuration. The existing
`push_subscription` field is reserved for that future integration.

## Deployment

1. Update the D1 `database_id` in `wrangler.toml`.
2. Run pending migrations against the remote database.
3. Configure the production JWT secret:

   ```bash
   npx wrangler secret put JWT_SECRET
   ```

4. Run `npm run check`.
5. Deploy with `npm run deploy`.
6. In Cloudflare, configure the daily close cron trigger as `0 13 * * *`
   (21:00 Asia/Shanghai).

## Project Layout

```text
src/                 React application
functions/api/       Cloudflare Pages API routes
functions/scheduled/ Scheduled court-close handler
tests/               Node API and utility tests
schema.sql           Source of truth for new databases
migrate_*.sql        Ordered migrations for existing databases
wrangler.toml        Cloudflare Pages and D1 configuration
```
