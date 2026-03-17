# travel-book

Editorial scrapbook travel journal built with Next.js App Router, Tailwind CSS, and a demo-ready import flow for Google Maps links and photo batches.

## Scripts

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

## Demo scope

- Multi-trip archive landing page
- Trip detail page with overview map, import panel, invite panel, and day cards
- `POST /api/import/google-links`
- `POST /api/uploads/photos`
- `POST /api/trips/:tripId/invite`

The UI works without Supabase. The sign-in page shows the planned Google OAuth path and switches out of demo mode once the env vars below are configured.

## Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

