# 🎯 Habit Tracker - Premium Edition

A **premium macOS-inspired productivity system** combining habit tracking, advanced analytics, Spotify integration, and focus sessions. Built with React, Supabase, and designed for deep personal productivity workflows.

## 👤 Owner & Credits

This project is owned and created by **Kishor Chaudhary**.

- GitHub: https://github.com/kishorchaudhary
- Instagram: https://instagram.com/kishor0513

---

## ✨ Key Features

### 📊 Advanced Analytics

- Real-time stats: streaks, completion rates, weekly/monthly performance
- GitHub-style heatmap calendar
- Weekday & time-of-day analysis
- Mood vs completion correlation
- Playlist performance tracking

### 🎯 Premium Today Dashboard

- Dynamic greeting & daily stats
- One-click habit completion
- Spotify current track display
- Mood selector & quick notes
- End-of-day review system

### ⏱️ Focus Mode + Sessions

- Customizable timer (5/15/25/45 min)
- Auto-play linked Spotify playlists
- Minimal distraction-free UI
- Session tracking & analytics

### 📝 Daily & Weekly Reviews

- Mood tracking with 5 emoji options
- "What went well / didn't go as planned"
- Daily notes & reflection
- Weekly summary with suggestions

### ⌘ Command Palette

- Quick action search (⌘ + K)
- Keyboard navigation
- Habit quick-complete
- Fast navigation

### 🎨 macOS-Style UI

- Glassmorphism cards with frosted glass effect
- Smooth animations & transitions
- Dark mode by default
- Premium shadows & rounded corners
- Fully responsive

### 🎵 Spotify Integration

- Current track display
- Mini player controls
- Link playlists to habits
- Playlist success analytics

---

## 🎁 Premium Features Breakdown

### 📊 Analytics Dashboard (`AnalyticsDashboard.jsx`)

**Comprehensive habit analytics with visual insights**

- **StatCard**: Key metrics with color coding and trends
- **WeeklyPerformanceChart**: Bar chart showing completion by weekday
- **BestHabitsCard**: Display top 3 performing habits
- **MostSkippedCard**: Identify problem habits
- **TimeOfDayChart**: Pie chart of best completion times
- **MoodCorrelationCard**: Emoji mood display with completion correlation
- **PlaylistAnalyticsCard**: Spotify playlist performance metrics
- **InsightCard**: Styled insight cards with action buttons

### 🎯 Today Dashboard (`TodayPage.jsx`)

**Premium dashboard as your main productivity hub**

- Dynamic greeting message based on time of day
- Quick stats: Completion %, Streak, Task count
- Today's habits with completion tracking
- Integrated Spotify current track display
- Mood selector (5 emoji options)
- Quick notes panel
- Focus mode entry point
- Last session summary

### ⏱️ Focus Mode (`FocusMode.jsx`)

**Pomodoro-style focusing with Spotify integration**

- Customizable durations: 5, 15, 25, 45 minutes
- Large timer display with play/pause/done controls
- Real-time Spotify track display
- Auto-play linked playlists on start
- Session summary with stats
- Distraction-free minimal UI
- Tracks focus sessions in database

### 📝 Review System (`ReviewModals.jsx`)

**End-of-day reflection and weekly planning**

**Daily Reviews**:

- Mood selector (energetic, happy, neutral, tired, stressed)
- "What went well" field
- "What didn't go as planned" field
- Personal notes section
- Today's stats summary
- Quick save with toast notification

**Weekly Reviews**:

- Week summary text area
- AI suggestions list (add/remove items)
- Week performance overview
- Progress tracking

### 🔍 Search & Filter (`SearchAndFilter.jsx`)

**Advanced habit discovery and organization**

- Real-time fuzzy search on name/category/tags
- Sort options: Priority, newest, name
- Multi-select filters: Category, priority
- Results count with clear option
- Lightweight performance optimized with useMemo

### 📅 Heatmap Calendar (`HeatmapCard.jsx`)

**GitHub-style 52-week contribution visualization**

- 7 rows (days) × weeks columns grid
- Color intensity scale (0-4) based on completion rate
- Interactive tooltips with date & stats
- "Less" to "More" legend
- Perfect for seeing habits at a glance

### ⌘ Command Palette (`EnhancedCommandPalette.jsx`)

**macOS-style rapid action access**

**Keyboard**: ⌘ + K to trigger

**System Commands**:

- Add habit
- View analytics
- Start focus mode
- Open daily review
- Settings
- Export data

**Habit Commands**: Quick-complete any habit

**Navigation**:

- ↑↓ arrows to navigate
- Enter to execute
- Esc to close
- Real-time search filtering

### 🎨 Glassmorphism UI System (`glassmorphism.css`)

**Premium visual design language**

**Components**:

- `.glassmorphic-card`: Frosted glass effect with backdrop blur
- `.btn-primary/.btn-success/.btn-danger`: Interactive buttons
- `.badge-success/.badge-warning/.badge-danger`: Status badges
- `.grid-cols-*`: Responsive grid layouts

**Effects**:

- Smooth animations: `slideIn`, `fadeIn`, `pulse`
- Gradients: Linear gradients with CSS variables
- Dark mode aware with theme variables
- Premium shadows and blur effects

### 🎵 Spotify Integration Components (`SpotifyIntegration.jsx`)

**5-component Spotify suite**

- **SpotifyCurrentTrack**: Now-playing display with artist info
- **PlaylistLinkModal**: Multi-select modal for linking playlists
- **SpotifyMiniPlayer**: Playback controls (play/pause/next/prev)
- **MoodSelector**: 5 emoji mood buttons
- **QuickNotesPanel**: Daily notes with save functionality

### ⚙️ Enhanced Settings (`EnhancedSettingsPage.jsx`)

**Comprehensive preferences and account management**

- **Profile Section**: Name, email management
- **Appearance**: Dark mode toggle (persistent)
- **Notifications**: Daily reminder toggle + time picker
- **Timezone**: 10+ timezone options
- **Spotify**: Connect/disconnect status + reconnection
- **Data Management**: One-click JSON export

### 🆕 April 2026 UI Redesign

- Reworked Today view with a stronger hero panel and status pills
- Added a dedicated KPI strip for clearer daily scanning
- Refined desktop/mobile composition with CSS-driven responsive layout
- Updated chart palette and panel contrast for improved readability
- Tuned spacing and visual rhythm across cards and sections

---

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Local Development

```bash
npm run dev
```

Open `http://localhost:5173`

### Build for Production

```bash
npm run build
```

---

## ⚙️ Configuration

### Environment Variables (`.env`)

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SPOTIFY_CLIENT_ID=your_spotify_app_id
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/
```

Copy from `.env.example` to start.

### Supabase Setup

1. **Database Schema**: Import `supabase/schema.sql` in Supabase SQL editor
   - Creates tables: habits, entries, habit_sessions, daily_reviews, weekly_reviews, projects, settings
   - Enables Row Level Security
   - Sets up indexes for performance

2. **Enable Auth**:
   - Go to Authentication → Providers
   - Enable "Email" provider
   - Configure email templates

3. **Deploy Edge Functions** (optional):
   ```bash
   supabase functions deploy spotify-refresh
   supabase functions deploy weekly-analytics
   ```

### Spotify Setup

1. Create app at [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Copy Client ID to `.env`
3. Add redirect URIs in Spotify app settings:
   - Local: `http://localhost:5173/`
   - Production: `https://your-domain.com/`

**Note**: Full playback control requires Spotify Premium.

---

## 📁 Project Structure

```
src/
├── components/              # Reusable UI components
│   ├── AnalyticsDashboard.jsx      # Charts & metrics
│   ├── CommandPalette.jsx          # Active command palette in App shell
│   ├── FocusMode.jsx               # Focus timer UI
│   ├── ReviewModals.jsx            # Daily/weekly reviews
│   ├── SearchAndFilter.jsx         # Search & filtering
│   ├── HeatmapCard.jsx             # GitHub-style heatmap
│   ├── SpotifyIntegration.jsx      # Spotify components
│   ├── EnhancedCommandPalette.jsx  # Command palette (⌘+K)
│   └── ...
├── pages/                          # Route pages
│   ├── TodayPage.jsx               # Premium daily execution dashboard
│   ├── HabitsPage.jsx              # Habit management
│   ├── ProjectsPage.jsx            # Project tracking
│   ├── InsightsPage.jsx            # Analytics views
│   └── SettingsPage.jsx            # User preferences and integrations
├── lib/                            # Utilities
│   ├── analytics.js                # Analytics calculations
│   ├── date.js                     # Date utilities
│   ├── habits.js                   # Habit logic
│   ├── stats.js                    # Statistics
│   └── spotify.js                  # Spotify helpers
├── state/                          # React Context
│   ├── AppState.jsx
│   ├── StudioState.jsx
│   └── ToastState.jsx
├── styles/
│   ├── index.scss                  # Main styles
│   └── glassmorphism.css           # Premium UI classes
└── supabase/                       # Backend
    ├── client.js
    └── habitApi.js

supabase/
├── schema.sql                      # Database schema + RLS policies
└── functions/                      # Edge Functions
    ├── spotify-refresh/
    └── weekly-analytics/
```

---

## 🎮 Keyboard Shortcuts

| Shortcut | Action               |
| -------- | -------------------- |
| `⌘ + K`  | Open Command Palette |
| `↑ ↓`    | Navigate commands    |
| `Enter`  | Execute              |
| `Esc`    | Close                |

---

## 🔐 Security

- **Row Level Security (RLS)** enforced on all tables
- **User isolation**: `auth.uid() = user_id` on all queries
- **OAuth**: Secure Spotify integration
- **No external dependencies**: Core functionality is self-contained

---

## 📊 Building Analytics Features

Key analytics functions in `src/lib/analytics.js`:

```javascript
import {
	bestPerformingHabits,
	mostSkippedHabits,
	completionByWeekday,
	timeOfDaySuccessRate,
	moodCompletionCorrelation,
	playlistUsageAndCompletion,
} from './lib/analytics';
```

### Example Usage

```javascript
// Get top performing habits (last 30 days)
const topHabits = bestPerformingHabits(habits, entriesByKey, lastNDays(30));

// Find most skipped habits
const skipped = mostSkippedHabits(habits, entriesByKey, lastNDays(60));

// Analyze by weekday
const weekday = completionByWeekday(habits, entriesByKey);
```

---

## 🎨 Styling & Components

### Available CSS Classes

```html
<!-- Glassmorphism -->
<div class="glassmorphic-card">Premium Card</div>

<!-- Buttons -->
<button class="btn-primary">Primary</button>
<button class="btn-success">Success</button>
<button class="btn-danger">Danger</button>

<!-- Badges -->
<span class="badge success">Success</span>
<span class="badge warning">Warning</span>

<!-- Animations -->
<div class="animate-slide-in">Animated</div>
<div class="animate-pulse">Pulsing</div>
```

### Dark Mode

Automatically applies dark theme. Control via:

```javascript
localStorage.setItem('isDarkMode', true);
document.documentElement.setAttribute('data-theme', 'dark');
```

---

## 🚀 Deployment (Vercel)

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

---

## 📈 Real-World Usage

1. **Create a Project**: Define a goal (e.g., "Run a 5K")
2. **Add Habits**: Link 1-3 habits that drive the goal
3. **Track Daily**: Use the Today page to log completions
4. **Review Weekly**: Check analytics and adjust strategy
5. **Focus Sessions**: Use Focus Mode with Spotify for deep work

---

## 🤝 Contributing

This is a personal productivity system. Feel free to:

- Add custom analytics
- Build new export formats
- Extend Spotify integration
- Create custom themes

---

## 📄 License

MIT - Open source and free to use

---

## 🙏 Built With

- **React 18** - UI framework
- **Supabase** - Backend & authentication
- **Vite** - Build tool
- **Recharts** - Data visualization
- **Spotify Web API** - Music integration
- **Sass** - Styling

---

## 📞 Need Help?

- Review component examples in `src/components/`
- Start with `src/pages/TodayPage.jsx` for the main dashboard flow
- Check `.env.example` for required variables
- Inspect browser console for errors

---

**Start tracking habits like a pro. Let Spotify fuel your focus. 🎉**
