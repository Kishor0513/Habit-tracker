# Phase 2 Checklist — LifeOS Transformation

## Completed

### Phase 1 — Audit
- [x] `docs/phase-1-audit.md` delivered
- [x] Architecture, stack, schema, design system, gaps documented

### Phase 2 — Data Layer
- [x] `src/lib/lifeSchema.js` — camelCase/snake_case normalization
- [x] `src/lib/money.js` — integer minor-unit money helpers, NPR formatting, CSV export
- [x] `src/lib/tasks.js` — task statuses, priorities, filters, counts
- [x] `src/lib/finance.js` — balances, monthly totals, budgets, recurring occurrences, invoices
- [x] `src/lib/invoices.js` — invoice totals, balances, statuses, numbering
- [x] `src/db.js` — IndexedDB v3 with additive stores: tasks, notes, noteFolders, accounts, transactions, budgets, recurringTransactions, savingsGoals, clients, invoices, invoicePayments, lifeSettings
- [x] `src/api/lifeApi.js` — local IndexedDB API
- [x] `src/supabase/lifeApi.js` — Supabase API with RLS-scoped operations
- [x] `src/state/AppState.jsx` — wired life API + Supabase life API with fallback
- [x] `src/state/useLifeData.js` — shared cached snapshot loader with error isolation
- [x] `supabase/migrations/001_lifeos.sql` — additive tables/RLS migration

### Phase 2 — Design System / Shell
- [x] `src/components/AppIcon.jsx` — unified SVG icon set
- [x] `src/components/AppSidebar.jsx` — grouped nav, collapse, project section, badges, mobile nav
- [x] `src/components/AppTopbar.jsx` — search, quick-add, notifications, profile, Spotify, clock
- [x] `src/components/CommandPalette.jsx` — actions + cross-module record search
- [x] `src/App.jsx` — new shell components, system/light/dark theme persistence, collapsed-sidebar state, lazy routes
- [x] `src/styles/index.scss` — shell classes, responsive layouts, theme tokens

### Phase 3 — Module Pages (all with real CRUD)
- [x] `src/pages/HomePage.jsx` — customizable dashboard with widgets
- [x] `src/pages/TasksPage.jsx`
- [x] `src/pages/NotesPage.jsx` — autosave, folders, archive, trash, restore
- [x] `src/pages/FinancePage.jsx`
- [x] `src/pages/InvoicesPage.jsx`
- [x] `src/pages/CalendarPage.jsx`
- [x] `src/pages/AnalyticsPage.jsx`

### Phase 4 — Dashboard Customization
- [x] `src/lib/dashboard.js` — widget registry, normalize, move, visible
- [x] `HomePage` — customize modal with add/hide/reorder widgets persisted via lifeSettings

### Phase 5 — Testing
- [x] Vitest config (`vitest.config.js`) — jsdom environment, globals
- [x] `tests/tasks.test.jsx` — task filters, sort, counts, overdue, My Day
- [x] `tests/money.test.jsx` — parse, format, arithmetic, tax, CSV
- [x] `tests/finance.test.jsx` — account balance, total balance, monthly totals, category spend, interval arithmetic
- [x] `tests/invoices.test.jsx` — line totals, invoice totals, balance, status, dashboard, numbering
- [x] `tests/habits.test.jsx` — schedule normalization, due dates, entry status
- [x] `tests/streaks.test.jsx` — currentStreak, completionRateLastNDays, isDueOn
- [x] `tests/lifeSchema.test.jsx` — camel/snake conversion, normalize, toRow/fromRow
- [x] `tests/date.test.jsx` — addDays, lastNDays, startOfISOWeek, dayOfWeek
- [x] `tests/dashboard.test.jsx` — widget registry, normalize, move
- [x] `npm run test` passes (112 tests, 9 files)
- [x] `npm run build` passes

### Phase 6 — Spotify Integration (preserved)
- [x] `src/lib/spotify.js` — PKCE auth, token refresh, player controls, playlist helpers
- [x] Spotify keys (`spotify_auth_v1`, `spotify_pkce_verifier`, `spotify_pkce_state`) untouched
- [x] `AppTopbar` still renders Spotify controls
- [x] `spotify-refresh` edge function references preserved

### Phase 7 — Supabase Migration
- [x] `supabase/migrations/001_lifeos.sql` — all new tables with snake_case columns
- [x] Uniform user-scoped RLS: SELECT/INSERT/UPDATE/DELETE with `auth.uid() = user_id`
- [x] JSON fields use `jsonb` with `[]` defaults
- [x] Money stored as `bigint` minor units
- [x] Additive only — no existing tables modified

## Remaining / Future Work
- [ ] Run Supabase migration against live instance and verify RLS policies
- [ ] Add drag-and-drop (library) for dashboard widget reordering
- [ ] Deepen CommandPalette record search across all tables (transactions, accounts, etc.)
- [ ] Refine responsive behavior on some module layouts (e.g., notes 3-column on small screens)
- [ ] Add integration tests using fake-indexeddb for LocalLifeApi CRUD
- [ ] Add data isolation tests for multi-user Supabase scenarios
- [ ] Add notes autosave test coverage via component tests

## Verification Commands
```bash
npm run test        # 112 tests pass
npm run build       # production build succeeds
npm run dev         # dev server starts
```