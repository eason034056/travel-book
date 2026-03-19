# Travel Book Setup Guide

This guide walks through the full setup for:

- Google OAuth via `next-auth`
- Google Sheets as the app-owned metadata store
- Cloudflare R2 as the private photo bucket
- Initial seeding from the existing mock trips

Follow the steps in order. Do not skip ahead.

## 1. Prerequisites

You need these accounts and tools first:

- Node.js 22+
- npm 10+
- A Google account for Google Cloud setup
- A Cloudflare account with R2 enabled
- This repo checked out locally

From the project root:

```bash
npm install
```

## 2. Create `.env.local`

Copy the example file:

```bash
cp .env.example .env.local
```

You will fill this file gradually as you complete the setup:

```bash
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APP_URL=http://localhost:3000

GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=

R2_ACCOUNT_ID=
R2_BUCKET_NAME=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=

SEED_OWNER_EMAIL=
```

## 3. Generate `AUTH_SECRET`

Generate a secure secret:

```bash
openssl rand -base64 32
```

Paste the output into:

```bash
AUTH_SECRET=...
```

This is required by `next-auth`.

## 4. Set Up Google OAuth

### 4.1 Create a Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project for this app, or pick an existing one.

### 4.2 Configure the OAuth consent screen

1. Go to `APIs & Services` -> `OAuth consent screen`.
2. Choose `External` if you will sign in with more than one Google account.
3. Fill in the basic app info.
4. Add your own email as a developer contact.
5. If Google keeps the app in testing mode, add every login email you plan to use as a test user.

You do not need Sheets scopes here for end users. User login is only for identity.

### 4.3 Create OAuth credentials

1. Go to `APIs & Services` -> `Credentials`.
2. Click `Create Credentials` -> `OAuth client ID`.
3. Choose `Web application`.
4. Add these Authorized redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://YOUR_PRODUCTION_DOMAIN/api/auth/callback/google
```

Replace `YOUR_PRODUCTION_DOMAIN` with the real deployed domain later.

### 4.4 Copy the client credentials

Paste them into `.env.local`:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## 5. Set Up Google Sheets Service Account

This app uses one app-owned spreadsheet. End users do not grant Sheets permissions.

### 5.1 Enable the Google Sheets API

In the same Google Cloud project:

1. Go to `APIs & Services` -> `Library`.
2. Search for `Google Sheets API`.
3. Click `Enable`.

### 5.2 Create a service account

1. Go to `IAM & Admin` -> `Service Accounts`.
2. Click `Create Service Account`.
3. Give it a clear name such as `travel-book-sheets`.
4. Finish creation.

### 5.3 Create a JSON key

1. Open the service account.
2. Go to the `Keys` tab.
3. Click `Add Key` -> `Create new key`.
4. Choose `JSON`.
5. Download the file.

From the JSON file, copy:

- `client_email` -> `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` -> `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

Important:

- The private key in `.env.local` must stay on one line with escaped newlines.
- Replace actual line breaks with `\n`.

Example:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=travel-book-sheets@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nABC123...\n-----END PRIVATE KEY-----\n"
```

## 6. Create the Spreadsheet

### 6.1 Create a blank spreadsheet

1. Open [Google Sheets](https://sheets.google.com/).
2. Create a new blank spreadsheet.
3. Give it a clear name like `travel-book-prod` or `travel-book-dev`.

### 6.2 Copy the spreadsheet ID

The spreadsheet ID is the long string in the URL:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

Paste it into:

```bash
GOOGLE_SHEETS_SPREADSHEET_ID=...
```

### 6.3 Share the spreadsheet with the service account

1. Click `Share`.
2. Add the service account email from `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
3. Give it `Editor` access.

If you skip this, seeding and all reads/writes will fail with permissions errors.

## 7. Set Up Cloudflare R2

### 7.1 Create the bucket

1. Open the Cloudflare dashboard.
2. Go to `R2`.
3. Create a new bucket.
4. Use a name like `travel-book-photos`.
5. Keep it private. Do not configure public access.

Set:

```bash
R2_BUCKET_NAME=travel-book-photos
```

### 7.2 Get your account ID

In Cloudflare, copy your account ID and set:

```bash
R2_ACCOUNT_ID=...
```

### 7.3 Create R2 API credentials

1. In R2, create S3-compatible API credentials.
2. Use credentials that can read and write this bucket.
3. Copy:

```bash
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

### 7.4 Set the endpoint

Use:

```bash
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

Replace `YOUR_ACCOUNT_ID` with the same value from `R2_ACCOUNT_ID`.

### 7.5 Configure R2 CORS for direct browser uploads

The trip studio now uploads photos straight from the browser to R2, then calls the app again to finalize metadata writes. This avoids Vercel request body limits, but it means the bucket must allow browser `PUT` requests from your app origin.

In the Cloudflare dashboard, open the bucket and add a CORS policy like:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://YOUR_PRODUCTION_DOMAIN"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"]
  }
]
```

Notes:

- Replace `https://YOUR_PRODUCTION_DOMAIN` with your real site origin.
- If you use both a custom domain and `*.vercel.app`, add both origins.
- Keep the bucket private; the app still serves signed read URLs for display.

## 8. Set the Base App URL

For local development:

```bash
APP_URL=http://localhost:3000
```

For production, this must be your real HTTPS domain.

Examples:

```bash
APP_URL=https://travel.example.com
```

This affects:

- Invite link generation
- OAuth callback flow

## 9. Choose the Initial Owner

Set the first owner email:

```bash
SEED_OWNER_EMAIL=your-google-login@gmail.com
```

This email should be the Google account you will use to sign in first.

The seed script creates owner memberships using this email.

## 10. Final `.env.local` Example

Your completed file should look roughly like this:

```bash
AUTH_SECRET=your-generated-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APP_URL=http://localhost:3000

GOOGLE_SHEETS_SPREADSHEET_ID=your-sheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=travel-book-sheets@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

R2_ACCOUNT_ID=your-cloudflare-account-id
R2_BUCKET_NAME=travel-book-photos
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_ENDPOINT=https://your-cloudflare-account-id.r2.cloudflarestorage.com

SEED_OWNER_EMAIL=your-google-login@gmail.com
```

## 11. Seed the Spreadsheet

Run:

```bash
npm run seed:sheet
```

Expected behavior:

- If the spreadsheet is empty, the script creates the required tabs and seeds the existing mock trips.
- If the spreadsheet already has trip rows, it skips seeding instead of duplicating data.

The seed creates these tabs:

- `trips`
- `trip_days`
- `trip_stops`
- `trip_photos`
- `trip_memberships`
- `invite_tokens`

## 12. Start the App

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Because the home page is protected, you should be redirected to:

```text
http://localhost:3000/sign-in
```

## 13. First Login Verification

Sign in with the exact Google account from `SEED_OWNER_EMAIL`.

Expected result:

- Login succeeds
- You land on the archive page
- You can see the seeded trips

If login succeeds but you see no trips:

- Check that `SEED_OWNER_EMAIL` matched your Google login
- Check that the seed script actually completed
- Check that `trip_memberships` contains an `owner` row for your email

## 14. Invite Flow Verification

After owner login:

1. Open a trip.
2. Use the invite section.
3. Enter another Google email.
4. Generate the invite link.
5. Open that link in another browser profile.
6. Sign in with the exact invited email.

Expected result:

- The invite is accepted once
- A new `editor` membership row appears in `trip_memberships`
- The token becomes `used` in `invite_tokens`

If you sign in with a different email, the app should reject the invite.

## 15. Import Flow Verification

### 15.1 Google Maps import

1. Open a trip.
2. Choose a day from the day selector.
3. Paste one or more Google Maps place or route URLs.
4. Click `Build draft`.

Expected result:

- Resolved stops are written to `trip_stops`
- Unsupported links are reported back in the UI

### 15.2 Photo upload

1. Upload one or more photos.
2. The browser reads EXIF timestamps locally.
3. The app prepares signed upload URLs for that trip.
4. The browser uploads files directly into the private R2 bucket.
5. The app writes metadata rows into `trip_photos`.

Expected result:

- Photos with matching dates get `status=ready` and a `day_id`
- Photos without a matching day get `status=unassigned`

## 16. Production Setup

When deploying:

1. Deploy the app first.
2. Set the production env vars in your hosting platform.
3. Change:

```bash
APP_URL=https://YOUR_PRODUCTION_DOMAIN
```

4. Add the production OAuth redirect URI in Google Cloud:

```text
https://YOUR_PRODUCTION_DOMAIN/api/auth/callback/google
```

5. Redeploy if needed.

Use the same spreadsheet and bucket unless you want separate dev/prod data.

## 17. Common Failures

### `Missing or invalid environment variables`

Cause:

- `.env.local` is incomplete

Fix:

- Fill every required value before running the app or seed script

### Google login redirects but then fails

Cause:

- Wrong callback URL
- Missing OAuth redirect URI in Google Cloud
- Wrong `APP_URL`

Fix:

- Verify both localhost and production callback URLs exactly match the app

### Seed script fails with Sheets permission errors

Cause:

- Spreadsheet was not shared with the service account

Fix:

- Share the sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as `Editor`

### Photos upload but never display

Cause:

- R2 credentials or endpoint are wrong
- Signed URL generation is failing
- Bucket CORS does not allow your app origin or the `Content-Type` header

Fix:

- Recheck `R2_*` values
- Confirm the bucket CORS policy includes `http://localhost:3000` and your production origin
- Confirm the bucket is private and the credentials can read and write objects

### Invited user signs in but cannot join

Cause:

- They used a different Google email than the invited one
- The one-time token expired or was already used

Fix:

- Regenerate a new invite link and use the correct Google account

## 18. Recommended Dev Workflow

When you need to reset locally:

1. Create a fresh spreadsheet
2. Share it with the service account
3. Point `GOOGLE_SHEETS_SPREADSHEET_ID` to the new sheet
4. Run:

```bash
npm run seed:sheet
```

This is the simplest way to get back to a clean metadata state without manually deleting rows.
