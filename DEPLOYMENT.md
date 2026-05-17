# Pickleball Courts - Deployment Guide

This guide will walk you through deploying your app to Cloudflare Pages.

## Prerequisites

- Node.js installed on your computer
- A Cloudflare account
- Wrangler CLI installed (should already be installed via npm)

---

## Step 1: Initialize Local Database (For Development)

If you haven't already, set up your local database:

```bash
# Initialize local database
wrangler d1 execute pickleball-courts --file=./init-db.sql --local
```

Test the app locally:

```bash
# Start local development server
npm run dev
```

Then visit `http://127.0.0.1:8788` to test your app!

You can login with:
- **Admin**: `admin001` / `Admin123!`
- **Supervisor**: `supervisor001` / `Supervisor123!`

---

## Step 2: Prepare for Deployment

### 2.1: Set JWT Secret

First, set the JWT_SECRET secret for your app (this is required for authentication to work):

```bash
# Generate a strong secret (or use your own)
# On Windows, you can use a password generator

# Set the secret locally and for deployment
wrangler secret put JWT_SECRET
```

When prompted, enter a long, random string (at least 32 characters). Example:
```
my-very-strong-jwt-secret-key-32-characters-or-more
```

### 2.2: Verify D1 Database ID

Check `wrangler.toml` and verify the `database_id` for your D1 database:

```bash
# List your D1 databases to get the ID
wrangler d1 list
```

Update `wrangler.toml` if needed with your actual database ID.

---

## Step 3: Initialize Remote Database

Before deploying, you need to initialize your remote database:

```bash
# Run this to create tables and initial data in your remote D1 database
wrangler d1 execute pickleball-courts --file=./init-db.sql --remote
```

---

## Step 4: Deploy to Cloudflare Pages

### Option 1: Automatic Deployment from GitHub (Recommended)

1. Create a GitHub repository for your project
2. Push your code
3. Go to https://dash.cloudflare.com/ → Pages
4. Click "Create a project" → Connect to Git
5. Follow the prompts to connect your repository
6. **Important**: In the "Build Settings" section:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
7. Under "Environment variables" and "Secrets", add your secrets.
8. Click "Save and Deploy"

### Option 2: Manual Deployment via CLI

First, build your app:

```bash
npm run build
```

Then deploy:

```bash
# Deploy to Cloudflare Pages
wrangler pages deploy dist
```

Follow the prompts to configure your Pages project.

---

## Step 5: Post-Deployment Setup

After deploying, you need to:

1. **Link your D1 Database to Pages**
   - In the Cloudflare Dashboard, go to your Pages project
   - Go to **Settings → Functions**
   - Scroll down to **D1 database bindings**
   - Add binding:
     - Variable name: `DB`
     - D1 database: (select your pickleball-courts database)
   
2. **Add Secrets to Pages**
   - Go to **Settings → Environment variables**
   - Add your `JWT_SECRET` as a secret (same value you used earlier)

---

## Complete Authentication Flow

### Registration (User Self-Service)

1. User visits `/register`
2. Fills out the form with student ID, password, name, etc.
3. Backend validates inputs, checks for existing users
4. Password is hashed and stored in D1
5. User account is created with `is_approved = false`
6. User is told to wait for admin approval

### Login

1. User visits `/login`
2. Enters student ID and password
3. Backend:
   - Finds user by student ID
   - Verifies password with bcrypt
   - Checks if user is approved and not banned
4. If successful, issues a JWT token
5. Token is stored in localStorage and a cookie is set for authentication
6. User is redirected to appropriate dashboard based on role

### Logout

1. User clicks logout button
2. Frontend sends POST request to `/api/auth/logout`
3. Backend invalidates the token (in a full implementation)
4. Frontend clears localStorage and cookie
5. User is redirected to home page

---

## Project Structure

```
pickleball-courts/
├── functions/               # Cloudflare Pages Functions (backend API)
│   └── api/
│       ├── auth/
│       │   ├── login.js     # Login endpoint
│       │   ├── register.js  # Register endpoint
│       │   ├── logout.js    # Logout endpoint
│       │   └── validate.js  # Token validation endpoint
│       ├── queue/
│       │   ├── index.js     # Get queue
│       │   ├── join.js      # Join queue
│       │   └── leave.js     # Leave queue
│       ├── matches/
│       │   ├── index.js     # Get matches
│       │   ├── start.js     # Start match (supervisor+)
│       │   └── end.js       # End match (supervisor+)
│       ├── checkin/
│       │   ├── index.js     # Check-in status & self check-in
│       │   ├── checkout.js  # Check-out
│       │   └── manual.js    # Manual check-in (supervisor+)
│       ├── qr/
│       │   ├── generate.js  # Generate QR token (supervisor+)
│       │   └── validate.js  # Validate QR token
│       ├── admin/
│       │   ├── users.js     # List users (admin only)
│       │   ├── approve.js   # Approve/reject users (admin only)
│       │   └── manage.js    # Ban/warn users (admin only)
│       └── utils/
│           ├── jwt.js       # JWT utilities
│           ├── validation.js# Input validation
│           ├── auth.js      # Authentication middleware
│           └── rateLimit.js # Rate limiting
├── src/                     # Frontend React code
│   ├── components/
│   │   └── Navbar.jsx
│   ├── contexts/
│   │   ├── AuthContext.js
│   │   └── AuthProvider.jsx
│   ├── hooks/
│   │   └── useAuth.js
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── PlayerDashboard.jsx
│   │   ├── SupervisorDashboard.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── Rules.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
├── index.html
├── vite.config.js
├── wrangler.toml
├── package.json
├── schema.sql
└── init-db.sql
```

---

## Useful Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Run database migration locally
wrangler d1 execute pickleball-courts --file=./init-db.sql --local

# Run database migration remotely
wrangler d1 execute pickleball-courts --file=./init-db.sql --remote

# Deploy to Cloudflare Pages
wrangler pages deploy dist

# List your D1 databases
wrangler d1 list

# Set secrets
wrangler secret put JWT_SECRET

# View Wrangler logs (for debugging)
wrangler pages deployment tail --project-name=pickleball-courts
```

---

## Notes for Production

1. **Change Default Passwords**: The init script creates admin/supervisor users with default passwords. Change these immediately after first login!

2. **HTTPS**: Cloudflare Pages automatically provides HTTPS, so your API will be secure.

3. **CORS**: Your app is served from the same domain as your API, so CORS won't be an issue.

4. **Error Monitoring**: For production, consider adding error tracking like Sentry.

5. **Daily Reset**: You might want to implement a daily reset for queue, matches, and daily statistics.

---

## Troubleshooting

### Error: "no such table: users"
- Make sure you ran the `init-db.sql` script on the appropriate (local/remote) database.
- Double-check that your D1 binding is correctly set in Pages Settings.

### Error: "Invalid signature" or "Token expired"
- Make sure your `JWT_SECRET` is set correctly both locally and in Pages.
- JWT tokens expire after 24 hours by default.

### Login not working
- Check browser console and Wrangler logs for errors.
- Verify that the D1 binding is configured correctly.
- Make sure you're using the correct password (hashed passwords can't be recovered).

### For more help, check the [Cloudflare Pages documentation](https://developers.cloudflare.com/pages/)
