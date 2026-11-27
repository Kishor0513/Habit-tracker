# Phase 1 — Technical Audit: Existing Habit Tracker → LifeOS

> Status: **Complete** (audit only — no destructive changes made)
> Date: 2026-11-27

## 1. Executive summary

The existing application is a **React 18 + Vite 8 + Sass + Recharts** single-page app with a
**Supabase (Postgres) backend** and a **local-first IndexedDB layer**, plus a **Spotify Web API**
integration. It already contains a substantial design system, habit tracking engine, analytics,
focus/studio mode, reviews, and command palette.

It is *not* a habit tracker with missing features anymore — it is a **habit tracker with a deep
productivity shell**. The LifeOS transformation therefore consists mostly of **adding new modules**
(task management, notes, finance, invoices, calendar, global search) and **upgrading the shell**
(dashboard widgets, sidebar navigation, topbar, command palette) — while preserving the habit data
semantics.

## 2. Technology stack

| Layer | Technology | Notes |
| --- | --- | --- |
| UI framework | React 18.2 | Function components + hooks |
| Build | Vite 8 (`@vitejs/plugin-react`) | Sass via `sass` package |
| Routing | react-router-dom 6.23 | `HashRouter` (used in `main.jsx`) |
| Charts | recharts 3.8 | Area/Bar charts in Today + Insights |
| Backend / Auth | `@supabase/supabase-js` 2.100 | When `VITE_SUPABASE_URL` + key are set |
| Local storage | IndexedDB (`habit_tracker_db`, v2) | Custom wrapper in `src/db.js`, API in `src/api.js` |
| Mobile | Capacitor 8 | Android wrapper |
| Backend functions | Supabase Edge Functions (Deno) | `spotify-refresh`, `weekly-analytics` |
| Tests | **None** | No test runner, no CI config |
| Linting | **None** | — |
| PDF / rich text / drag-drop | **None** | Must be added or replaced |

## 3. Architecture

```
src/
├── main.jsx                 # ReactDOM + HashRouter + global styles
├── App.jsx                  # AuthGate > StudioProvider > AppProvider > Shell
│                             #   Sidebar, Topbar, CommandPalette, Routes, ReminderEngine
├── api.js                   # HabitApi — local-first IndexedDB implementation
├── db.js                    # IndexedDB open/tx/get/put/del helpers
├── seed.js                  # TEMPLATE_PACKS (example habit/project packs)
├── supabase/
│   ├── client.js            # createSupabase + env detection
│   └── habitApi.js          # SupabaseHabitApi (user-scoped CRUD)
├── state/
│   ├── AppState.jsx         # AppProvider: api/user/session/auth/dataVersion/refresh
│   ├── StudioState.jsx      # StudioProvider: focus timer + Spotify state
│   └── ToastState.jsx       # ToastProvider
├── lib/
│   ├── habits.js            # Habit types, schedule normalization, due logic, streaks helpers
│   ├── stats.js             # currentStreak, completion rates, weekly goal progress
│   ├── analytics.js         # best/worst streaks, weekday, mood, playlist analytics
│   ├── date.js              # ISO date utils (local-time based)
│   ├── ids.js               # uid() generator
│   └── spotify.js           # PKCE auth, token refresh, playback control
├── components/              # AuthGate, CommandPalette, Modal, EmptyState, ErrorBoundary,
│                             #   Skeleton, ToastViewport, LogoMark, CircularClock, ProductivityHub
├── pages/                   # TodayPage, HabitsPage, ProjectsPage, InsightsPage,
│                             #   DailyReviewPage, WeeklyReviewPage, SettingsPage
└── styles/index.scss       # Design tokens + all component styles (~3426 lines)
supabase/
├── schema.sql               # Postgres schema + RLS for existing tables
└── functions/               # spotify-refresh, weekly-analytics (+ _shared/http.ts)
scripts/auditExternalLinks.mjs
```

### Data flow

- **Local mode** (no Supabase env): `AppState` boots a local `HabitApi` backed by IndexedDB.
- **Supabase mode**: `AppState` boots `SupabaseHabitApi(userId)`; all queries filtered by
  `user_id`; Supabase session persists via `@supabase/auth-js`.
- Pages subscribe via `useApp()` → `api`, `isReady`, `dataVersion`, `refresh`.
- After each write, pages call `refresh()` which increments `dataVersion` to re-fetch.
- Cross-cutting UI events via `window` CustomEvents: `habit:open-palette`, `command:add-habit`,
  `command:complete-next-habit`, `command:search-habits`.

### Existing API surface (`HabitApi` / `SupabaseHabitApi` share a normalized JS shape)

- Habits: `listHabits`, `upsertHabit`, `archiveHabit`, `unarchiveHabit`
- Entries: `getEntry`, `setEntry`, `deleteEntry`, `listEntries`, `entryId`
- Projects: `listProjects`, `upsertProject`, `deleteProject`
- Settings: `getSetting`, `setSetting`
- Sessions: `listHabitSessions`, `upsertHabitSession`
- Reviews: `listDailyReviews`, `upsertDailyReview`, `listWeeklyReviews`, `upsertWeeklyReview`

Normalized shapes use camelCase client fields (e.g. `goalFrequency`, `skipRule`,
`linkedPlaylistId`) mapped onto snake_case DB columns (e.g. `goal_frequency`, `skip_rule`,
`linked_playlist_id`). New modules must follow this dual-shape convention.

## 4. Existing database schema (Supabase/Postgres)

Tables (all with user-scoped RLS enabled + policies):

1. `habits` — uuid PK, `user_id` FK auth.users, `name`, `type` (binary/quantity),
   `color`, `unit`, `target`, `schedule` jsonb, `notes`, `category`, `tags` jsonb,
   `goal_frequency`, `reminder` jsonb, `skip_rule`, `priority`, `linked_playlist_id`,
   `order_index`, `archived_at`, `created_at`, `updated_at`.
2. `entries` — uuid PK, `user_id`, `habit_id` FK, `date`, `value numeric`, `note`, `status`
   (pending/done/skipped), `mood`, `playlist_id`, `completed_at`; **unique (user_id, habit_id, date)**.
3. `projects` — uuid PK, `user_id`, `name`, `goal`, `why`, `start_date`, `target_date`,
   `milestones` jsonb, `habit_ids` uuid[], `archived_at`, timestamps.
4. `settings` — PK (user_id, key), `value` jsonb.
5. `habit_sessions` — `habit_id`, `user_id`, `start_time`, `end_time`, `playlist_id`, `success`,
   `duration_seconds`.
6. `daily_reviews` — `user_id`, `date`, `mood`, `notes`, `wins`, `misses`; unique (user_id, date).
7. `weekly_reviews` — `user_id`, `week_start`, `completion_rate` double, best/worst habit FK,
   `suggestions` jsonb; unique (user_id, week_start).

**Gaps to fill for LifeOS** (additive migrations only, no destructive changes):
- `tasks` (+ statuses, tags, subtasks, project association, priority, due/start dates, checklist,
  completed_at).
- `notes` (+ folders, tags, relations).
- `accounts`, `transactions`, `transaction_categories`, `budgets`, `recurring_transactions`,
  `savings_goals`.
- `clients`, `invoices`, `invoice_items`, `invoice_payments`.
- `calendar_preferences` / unified `calendar_events` (task/deadline references).
- `user_preferences` (dashboard layout, theme overrides).

All new tables must be created with `user_id uuid not null references auth.users(id) on delete
cascade`, RLS enabled, and `auth.uid() = user_id` policies (mirror existing pattern).

## 5. Current implemented features (checklist)

- ✅ Today dashboard: greeting/hero, KPI strip, execution queue, 7-day trend charts, heatmap,
  daily review save, productivity hub.
- ✅ Habit tracking: daily/weekly/custom/interval schedules, binary + quantity types, targets,
  weekly goals, skip rules, reminders, priorities, colors, tags, notes, archive.
- ✅ Habit analytics: streaks, best/worst, weekday, time-of-day, mood correlation, playlist usage,
  heatmap, sparkline.
- ✅ Focus mode + Spotify playback controls + focus session history.
- ✅ Daily/weekly reviews.
- ✅ Settings: account, notifications, example packs, JSON data export/import/reset.
- ✅ Command palette (`⌘K`): actions for habits/focus/analytics/reviews/settings.
- ✅ Theme: light/dark via `data-theme` + `localStorage['habitTrackerTheme']`.
- ✅ Mobile bottom nav + responsive breakpoints.

## 6. Design system status

Tokens live in `src/styles/index.scss`:

- `:root` (light) and `[data-theme='dark']` — colors, radii, shadows, motion, heat scales.
- Reusable classes: `.card`, `.btn` (+ primary/ghost/danger/accent/btn-sm/btn-bordered), `.badge`
  (+success/warning/danger/brand/accent/playful), `.input/.select/.textarea`, `.stack/.row/.grid.two`,
  `.list/.item/.itemName`, `.kpiGrid/.kpi`, `.bento`, `.premiumPanel`, `.heroCard`,
  `.todayLayout`, `.taskList/.taskRow`, `.heatmap/.heatCell`, `.modalBackdrop/.modal`,
  `.toastViewport/.toast`, `.commandPalette`, `.chartStack/.chartPanel`, `.focusStudio`,
  `.spotify*`, `.countdownMachine`, `.historyItem`, `.levelPill`, `.gradientText`, `.moodBtn`,
  `.emptyPlayful`, `.auth*`, `.skeleton*`.
- Glassmorphism layer + gradient/gamification layer (two appended blocks at bottom of file).
- Animations: fadeIn/slideIn/pulse/skeleton shimmer; `@media (prefers-reduced-motion: reduce)`.

This is a solid base to extend without redesigning.

## 7. Gaps vs. the LifeOS master spec

**Shell / navigation**
- ❌ Sidebar nav does not yet include Tasks, Notes, Finance, Invoices, Calendar, Analytics as
  first-class items (Insights exists as "Insights").
- ❌ Sidebar not collapsible; no tooltips; no quick-create actions; no expandable project/folder
  sections (projects exist but sidebar doesn't group them).
- ❌ Topbar lacks global search across modules, notifications center, user profile menu, quick-add.
  (Global search = new work; command palette currently holds only static actions.)

**Dashboard**
- ❌ No customizable widget layout (reorder/hide/size/configure).

**New modules** — none exist yet:
- Tasks (kanban, table, list, calendar, my day, upcoming, completed; statuses/priorities/subtasks…)
- Notes (three-column, rich text, folders/tags/pins/archived/deleted)
- Finance (accounts, transactions, budgets, recurring, savings goals, reports, CSV)
- Invoices (clients, items, totals, statuses, payments, PDF)
- Calendar (tasks/projects/habits/recurring/invoices)
- Analytics (finance + productivity)

**Other spec items not yet present**
- Invoice PDF generation (no lib), print support.
- Global search across tasks/projects/notes/habits/transactions/invoices.
- Recurring transaction engine with dedupe guarantees.
- Financial decimal handling (avoid float; use numeric/integer minor units).
- Mobile priority flows for finance/note entry.

## 8. Risks & dependencies

1. **No tests / no CI** — must add at least unit tests for pure logic (streaks, finance math,
   invoice totals) and ideally component tests later. Vite-based test runner needed.
2. **No migration framework** — `supabase/schema.sql` is a single manual script; new migrations must
   be additive and idempotent (`create table if not exists`, `add column if not exists`).
3. **Missing backend pieces** — recurring transactions need a reliable generator (cron/edge function
   or client-side derivation with dedupe keys).
4. **Data source duality** — new modules should follow the same local-vs-Supabase dual pattern to
   keep offline-first behavior and Supabase sync consistent.
5. **Auth** — magic link + password; user isolation via RLS; keep it.
6. **Spotify** — client-side PKCE + polling is implemented; edge function `spotify-refresh` is
   currently secondary; do not break token logic.
7. **Existing data semantics** — entries keyed `${habitId}__${isoDate}` in local mode;
   unique (user_id, habit_id, date) in Supabase; `skipRule`, `goalFrequency`, `priority`,
   `reminder`, `linkedPlaylistId` are part of the stored contract — preserve them.

## 9. Recommended implementation strategy

- **Incremental, phase-driven** (as the master plan dictates). Do not rewrite.
- Extend existing design system and API patterns rather than introducing parallel systems.
- New modules: create normalized shapes + local IndexedDB stores + Supabase tables + API classes
  following `HabitApi` / `SupabaseHabitApi` conventions.
- Shared financial math in `src/lib/finance.js` using integer minor units (NPR default) — no floats.
- Shared task/status helpers in `src/lib/tasks.js`.
- Keep local-first behavior; add Supabase sync paths for new modules.

## 10. Phase completion checklist (Phase 1)

- [x] Inspect entire codebase.
- [x] Identify framework/libraries/architecture.
- [x] Understand DB schema + relationships.
- [x] List implemented features.
- [x] Identify auth/user management.
- [x] Inspect pages/components/routes/layouts.
- [x] Understand Spotify integration.
- [x] Identify APIs/env vars/third-party services.
- [x] Produce this audit.
- [ ] Optional follow-up: run build + typecheck baseline (pending `npm install` completion).

---

**Next step:** Phase 2 — design system + application shell (sidebar navigation redesign,
topbar quick-add/global search/notifications/profile, theme persistence, dashboard redesign) with
all existing habit functionality preserved.
