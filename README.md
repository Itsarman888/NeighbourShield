# NeighbourShield 🛟

**A community safety map for India.** Neighbours can pin a hazard or request for help, describe what is happening, and see recent community reports on a map. No account or email is required.

> **Safety notice:** NeighbourShield is a hackathon prototype, not an official emergency service. It does not dispatch responders or guarantee that anyone has seen a report. For immediate danger in India, call **112**. Do not delay emergency services to use this website.

## Features

- Interactive India map (OpenStreetMap) with click-to-pin reporting.
- Optional browser geolocation; permission is requested only when the user taps “Use my location”.
- Report types, severity levels, area label, and short description.
- Recent report feed, map markers, category filtering, and severity indicators.
- No sign-up, email, or account required.
- Vercel serverless API (`/api/reports`, `/api/health`).
- Demo mode works without cloud credentials; reports are saved only in that browser's local storage.
- Optional Supabase persistence for shared reports across devices.

## Stack

React + Vite, Leaflet / React Leaflet, Vercel Functions, optional Supabase Postgres, OpenStreetMap tiles.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Build check:

```bash
npm run build
```

The UI runs in demo mode if Supabase isn't configured. Vercel API routes run when deployed to Vercel; for local API testing, use `vercel dev` after installing the Vercel CLI.

## Deploy to Vercel

1. Extract this ZIP.
2. Create a new public GitHub repository and upload the project files (or use **Add file → Upload files**).
3. In Vercel, choose **Add New → Project**, import the repository.
4. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
5. Deploy. The demo works without accounts or email, but reports remain local to each browser until cloud storage is configured.

### Optional: enable shared reports with Supabase

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. In Supabase project settings, copy the Project URL and the **service_role** key.
4. In Vercel → Project → Settings → Environment Variables, add:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service-role key
5. Keep the service-role key server-only. Never add it to frontend variables such as `VITE_*`.
6. Redeploy. `/api/health` should report `"storage":"supabase"`.

The API validates report fields and India map bounds. The database is accessed only by the Vercel API; public browser access to the table is disabled by RLS.

## How to test

- Open the app and click a point on the map in India.
- Choose a category and severity, enter a non-identifying description (at least 8 characters), and submit.
- Check the marker and report card.
- Try category filters and “Use my location” if you want to test browser geolocation.
- Open `/api/health` after deployment to see the storage mode.

## Privacy and responsible use

- No email, login, name, or phone number is collected.
- Avoid posting names, faces, private addresses, or identifying details about people.
- The map location and description of a report are visible to people using the shared instance when Supabase is enabled.
- Reports are unverified user submissions and may be inaccurate or malicious. Treat them as community signals, not confirmed facts.
- Geolocation is optional and triggered by a button; the app does not continuously track location.
- OpenStreetMap map tiles require an internet connection and are subject to the tile provider's usage policy.

## Known prototype limitations

- No automated dispatch, SMS, push notifications, moderation queue, identity verification, or official responder integration.
- Demo mode uses browser local storage, which is not shared between browsers and may be cleared by the user.
- Production deployment should add abuse prevention, rate limiting, moderation, retention policies, and appropriate local safety review.

## Hackathon disclosure

This project uses React, Vite, Leaflet, OpenStreetMap, Vercel Functions, optional Supabase, and AI-assisted development. Describe the community problem you personally observed or researched; do not claim interviews or evidence you did not collect.
