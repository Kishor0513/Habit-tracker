# Habit Tracker (Projects + Real-life Examples)

A lightweight, professional habit tracker you can run locally (no external dependencies). It supports:

- Daily tracking (binary + quantity habits)
- Projects that link to habits (so real-life goals have structure)
- Insights (streaks, completion rate, recent trends)
- Auth options: magic link and email/password (Supabase)
- Focus Hub: live clock, monthly calendar, focus timer, and Spotify embed panel
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
```

Restart `npm run dev`, then sign in via the email link. Your habits/projects/entries will be stored per-user in Supabase.

For email/password auth, ensure Email provider is enabled in Supabase Auth settings.

Spotify note: this app supports embedding public Spotify content via URL. Full account playback control requires Spotify OAuth and a Premium-compatible integration.

If you update this project later, re-run `supabase/schema.sql`. It is idempotent and safely applies missing schema/policies (including settings storage).

## How to use (real-life workflow)

- Create (or load) a **project** with a concrete outcome (e.g., “Run a 5K”, “Learn React by shipping a demo app”).
- Link **1–3 habits** that drive the outcome (e.g., “Run training 30 min”, “Deep work 45 min”).
- Track only what you can sustain; increase targets after 2 consistent weeks.
- Use **Insights** weekly: remove low-value habits, simplify schedules, and keep the system.

## Tests

```bash
npm test
```
