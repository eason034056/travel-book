# travel-book

Editorial scrapbook travel journal built with Next.js App Router, Tailwind CSS, Google OAuth via NextAuth, Google Sheets as the invite-only metadata store, and private Cloudflare R2 photo storage.

## Scripts

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
npm run seed:sheet
```

## App scope

- Multi-trip archive landing page
- Trip detail page with overview map, import panel, invite panel, and day cards
- Google OAuth sign-in
- One-time invite links
- `POST /api/import/google-links`
- `POST /api/trips/:tripId/photos/upload/prepare`
- `POST /api/trips/:tripId/photos/upload/complete`
- `POST /api/trips/:tripId/invite`

## Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APP_URL=http://localhost:3000

GOOGLE_SHEETS_SPREADSHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

R2_ACCOUNT_ID=...
R2_BUCKET_NAME=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com

SEED_OWNER_EMAIL=owner@example.com
```

## Setup flow

1. Create a Google OAuth web app and authorize:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-production-domain>/api/auth/callback/google`
2. Create a spreadsheet and share it with the service account email from `.env.local`.
3. Create a private R2 bucket, issue S3-compatible access keys, and allow browser `PUT` uploads from `http://localhost:3000` plus your production origin in the bucket CORS policy.
4. Run `npm run seed:sheet` once to create the initial tabs and seed the mock trips as owner-visible data.
5. Start the app with `npm run dev`.

For the full step-by-step setup, see [docs/setup-google-auth-sheets-r2.md](/Users/wuyusen/Desktop/travel/docs/setup-google-auth-sheets-r2.md).
