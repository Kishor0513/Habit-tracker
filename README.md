# Habit Tracker (Projects + Real-life Examples)

A lightweight, professional habit tracker you can run locally (no external dependencies). It supports:

- Daily tracking (binary + quantity habits)
- Projects that link to habits (so real-life goals have structure)
- Insights (streaks, completion rate, recent trends)
- Advanced analytics (weekday, streak, skips, sessions, mood, playlist correlation)
- Auth options: magic link and email/password (Supabase)
- Focus Hub: command palette, focus timer, Spotify playback, session history, and daily review
- Import/export (JSON) and example templates

## Install

```bash
npm install
```

## Run (React + Sass)

```bash
npm run dev
```

Then open the printed URL (Vite default is `http://localhost:5173`).

## Supabase (cloud sync)

Important: if you’ve posted your Supabase key publicly, **rotate it** in the Supabase dashboard.

1. Create or update tables + RLS policies by running `supabase/schema.sql` in Supabase SQL editor.
2. Enable Auth (Email) in Supabase (Authentication → Providers).
3. Create a `.env` file (see `.env.example`):

```bash
VITE_SUPABASE_URL=YOUR_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_APP_URL=http://localhost:5173
```

Restart `npm run dev`, then sign in via the email link. Your habits/projects/entries will be stored per-user in Supabase.

For email/password auth, ensure Email provider is enabled in Supabase Auth settings.

Spotify note: this app supports full control integration (connect, play/pause, next/prev, seek, volume) using Spotify OAuth + Web Playback SDK.

### Spotify Full Control Setup

1. Create a Spotify app at https://developer.spotify.com/dashboard and copy its Client ID.
2. Add `VITE_SPOTIFY_CLIENT_ID` to `.env` and Vercel env variables.
3. In Spotify app settings, add Redirect URI(s):
   - local: `http://localhost:5173/`
   - production: your Vercel URL (for example `https://your-app.vercel.app/`)
4. Restart the app and use "Connect Spotify" inside Focus Hub.

Important:

- Full playback control typically requires a Spotify Premium account.
- Browser autoplay and Spotify account/device restrictions may still limit automatic playback in some sessions.

If you update this project later, re-run `supabase/schema.sql`. It is idempotent and safely applies missing schema/policies (including settings storage).

### Edge Functions

This repo now includes Supabase Edge Function scaffolding in `supabase/functions/` for:

- `spotify-refresh`
- `weekly-analytics`

Deploy with the Supabase CLI after logging in:

```bash
supabase functions deploy spotify-refresh
supabase functions deploy weekly-analytics
```

## How to use (real-life workflow)

- Create (or load) a **project** with a concrete outcome (e.g., “Run a 5K”, “Learn React by shipping a demo app”).
- Link **1–3 habits** that drive the outcome (e.g., “Run training 30 min”, “Deep work 45 min”).
- Track only what you can sustain; increase targets after 2 consistent weeks.
- Use **Insights** weekly: remove low-value habits, simplify schedules, and keep the system.

## Tests

```bash
npm test
```

## React Native (Android + Web)

This repo also includes an Expo (React Native) app in `rn/`.

```bash
npm run rn:install
npm run rn:web
# or
npm run rn:android
```
