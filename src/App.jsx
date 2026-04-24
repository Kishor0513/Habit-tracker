import { Suspense, lazy, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import AuthGate from './components/AuthGate.jsx';
import CircularClock from './components/CircularClock.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import LogoMark from './components/LogoMark.jsx';
import ToastViewport from './components/ToastViewport.jsx';
import { isoToday } from './lib/date.js';
import { isDueOn } from './lib/habits.js';
import { AppProvider, useApp } from './state/AppState.jsx';
import { StudioProvider, useStudio } from './state/StudioState.jsx';
import { ToastProvider } from './state/ToastState.jsx';

const TodayPage = lazy(() => import('./pages/TodayPage.jsx'));
const HabitsPage = lazy(() => import('./pages/HabitsPage.jsx'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.jsx'));
const InsightsPage = lazy(() => import('./pages/InsightsPage.jsx'));
const DailyReviewPage = lazy(() => import('./pages/DailyReviewPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));

const NAV_ITEMS = [
	{ to: '/', label: 'Today', shortLabel: 'Pulse', icon: 'pulse' },
	{ to: '/habits', label: 'Habits', shortLabel: 'Habits', icon: 'habit' },
	{
		to: '/projects',
		label: 'Projects',
		shortLabel: 'Projects',
		icon: 'target',
	},
	{ to: '/insights', label: 'Insights', shortLabel: 'Insights', icon: 'chart' },
	{ to: '/review', label: 'Review', shortLabel: 'Review', icon: 'review' },
	{
		to: '/settings',
		label: 'Settings',
		shortLabel: 'Settings',
		icon: 'settings',
	},
];

function NavGlyph({ name }) {
	switch (name) {
		case 'pulse':
			return (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
				>
					<path
						d="M3 12h4l2.2-5 4.4 10 2.4-5H21"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			);
		case 'habit':
			return (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
				>
					<path
						d="M7 7h10v10H7z"
						rx="3"
					/>
					<path
						d="M8 12h8"
						strokeLinecap="round"
					/>
					<path
						d="M12 8v8"
						strokeLinecap="round"
					/>
				</svg>
			);
		case 'target':
			return (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
				>
					<circle
						cx="12"
						cy="12"
						r="7"
					/>
					<circle
						cx="12"
						cy="12"
						r="3"
					/>
					<path
						d="M19 5l-4.5 4.5"
						strokeLinecap="round"
					/>
				</svg>
			);
		case 'chart':
			return (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
				>
					<path
						d="M4 19h16"
						strokeLinecap="round"
					/>
					<path
						d="M7 15l3-3 3 2 4-6"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			);
		case 'review':
			return (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
				>
					<path
						d="M7 4h8l4 4v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path
						d="M15 4v4h4"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path
						d="M9 13h6"
						strokeLinecap="round"
					/>
					<path
						d="M9 16h4"
						strokeLinecap="round"
					/>
				</svg>
			);
		default:
			return (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
				>
					<path d="M12 3.5l2.2 1.3 2.5-.2 1 2.3 2 1.5-.8 2.4.8 2.4-2 1.5-1 2.3-2.5-.2L12 20.5l-2.2-1.3-2.5.2-1-2.3-2-1.5.8-2.4-.8-2.4 2-1.5 1-2.3 2.5.2L12 3.5z" />
					<circle
						cx="12"
						cy="12"
						r="2.5"
					/>
				</svg>
			);
	}
}

function Sidebar({ theme, onThemeToggle }) {
	const themeLabel = {
		light: 'Light',
		dark: 'Dark',
	};
	const nextThemeLabel = {
		light: 'Dark',
		dark: 'Light',
	};
	const ownerLinks = {
		github: 'https://github.com/kishorchaudhary',
		website: 'https://kishorchaudhary.com',
		socials: 'https://instagram.com/kishor0513',
	};

	return (
		<aside className="sidebarArea">
			<div className="sidebarHeader">
				<div className="sidebarBrand">
					<div
						className="sidebarAvatar"
						aria-hidden="true"
					>
						<LogoMark size={28} />
					</div>
					<div className="sidebarBrandText">
						<div className="sidebarEyebrow">Habit</div>
						<div className="sidebarWorkspace">Workspace</div>
					</div>
				</div>
				<button
					className="themeToggleBtn"
					onClick={onThemeToggle}
					aria-label={`Switch to ${nextThemeLabel[theme]} mode`}
					title={`Current: ${themeLabel[theme]} mode`}
				>
					{themeLabel[theme]}
				</button>
			</div>
			<div className="navGroup">
				<div className="navGroupLabel">Workspace</div>
				{NAV_ITEMS.map((item) => (
					<NavLink
						key={item.to}
						end={item.to === '/'}
						className={({ isActive }) =>
							isActive ? 'navItem isActive' : 'navItem'
						}
						to={item.to}
					>
						<span
							className="navIcon"
							aria-hidden="true"
						>
							<NavGlyph name={item.icon} />
						</span>
						<span>{item.label}</span>
					</NavLink>
				))}
			</div>
			<div className="sidebarFooter">
				<div className="sidebarFooterLine">Build steady systems.</div>
				<div className="sidebarFooterLinks">
					<a
						href={ownerLinks.github}
						target="_blank"
						rel="noreferrer"
					>
						GitHub
					</a>
					<a
						href={ownerLinks.website}
						target="_blank"
						rel="noreferrer"
					>
						Website
					</a>
					<a
						href={ownerLinks.socials}
						target="_blank"
						rel="noreferrer"
					>
						Socials
					</a>
				</div>
				<div className="sidebarFooterMeta">Habit Tracker</div>
			</div>
		</aside>
	);
}

function Topbar() {
	const location = useLocation();
	const [now, setNow] = useState(() => new Date());
	const { spotify } = useStudio();
	const title =
		NAV_ITEMS.find((n) => n.to === location.pathname)?.label || 'Page';
	const dateLabel = isoToday();

	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(id);
	}, []);

	const timeLabel = now.toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
	const longDate = now.toLocaleDateString([], {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	});
	const trackName = spotify.spotifyState?.item?.name || 'Spotify idle';
	const isPlaying = Boolean(
		spotify.spotifyState?.is_playing || spotify.spotifyState?.paused === false,
	);

	return (
		<header className="topbar">
			<div>
				<div className="breadcrumb">
					<span>Habit Workspace</span>
					<span className="breadcrumbSeparator">/</span>
					<span className="breadcrumb active">{title}</span>
				</div>
				<div className="topbarTitle">{title}</div>
			</div>
			<div className="topbarMeta">
				<div className="topbarSpotify">
					<div className="topbarSpotifyInfo">
						<div className="topbarSpotifyLabel">Spotify</div>
						<div className="topbarSpotifyTrack">{trackName}</div>
					</div>
					<div className="topbarSpotifyControls">
						<button
							className="iconBtn topbarSpotifyIconBtn"
							type="button"
							onClick={spotify.previous}
							disabled={!spotify.spotifyAuthed}
							title="Previous track"
						>
							⏮
						</button>
						<button
							className="btn ghost"
							type="button"
							onClick={() => {
								if (!spotify.spotifyAuthed) spotify.connect();
								else spotify.playPause();
							}}
						>
							{!spotify.spotifyAuthed
								? 'Connect'
								: isPlaying
									? 'Pause'
									: 'Play'}
						</button>
						<button
							className="iconBtn topbarSpotifyIconBtn"
							type="button"
							onClick={spotify.next}
							disabled={!spotify.spotifyAuthed}
							title="Next track"
						>
							⏭
						</button>
					</div>
				</div>
				<div className="topbarClock">
					<CircularClock
						now={now}
						compact
					/>
					<div>
						<div className="topbarClockTime">{timeLabel}</div>
						<div className="topbarClockDate">
							{longDate} · {dateLabel}
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}

function BottomNav() {
	return (
		<nav
			className="mobileNav"
			aria-label="Mobile navigation"
		>
			{NAV_ITEMS.map((item) => (
				<NavLink
					key={item.to}
					end={item.to === '/'}
					className={({ isActive }) =>
						isActive ? 'mobileNavItem isActive' : 'mobileNavItem'
					}
					to={item.to}
				>
					<span className="mobileNavItemIcon">
						<NavGlyph name={item.icon} />
					</span>
					<span className="mobileNavItemLabel">{item.shortLabel}</span>
				</NavLink>
			))}
		</nav>
	);
}

function RouteFallback() {
	return (
		<div className="pageContent">
			<div className="card">
				<div className="subtle">Loading workspace...</div>
			</div>
		</div>
	);
}

function ReminderEngine() {
	const { api, isReady, dataVersion } = useApp();

	useEffect(() => {
		if (!isReady || !api || typeof Notification === 'undefined') return;
		let timer = null;
		let cancelled = false;

		async function checkReminders() {
			if (Notification.permission !== 'granted') return;
			const habits = (await api.listHabits()).filter((habit) => {
				return (
					!habit.archivedAt &&
					habit.reminder?.enabled &&
					habit.reminder?.time &&
					isDueOn(habit, isoToday())
				);
			});
			const now = new Date();
			const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
			for (const habit of habits) {
				if (habit.reminder.time !== currentTime) continue;
				const key = `${habit.id}__${isoToday()}__${currentTime}`;
				if (localStorage.getItem(key)) continue;
				new Notification(`Habit reminder: ${habit.name}`, {
					body: habit.category
						? `${habit.category} habit is due today.`
						: 'This habit is due today.',
				});
				localStorage.setItem(key, '1');
			}
		}

		checkReminders().catch((error) => console.error(error));
		timer = window.setInterval(() => {
			if (cancelled) return;
			checkReminders().catch((error) => console.error(error));
		}, 30000);

		return () => {
			cancelled = true;
			if (timer) window.clearInterval(timer);
		};
	}, [api, isReady, dataVersion]);

	return null;
}

function AppShell({ theme, onThemeToggle }) {
	return (
		<div className="app">
			<ReminderEngine />
			<Sidebar
				theme={theme}
				onThemeToggle={onThemeToggle}
			/>
			<div className="mainArea">
				<CommandPalette />
				<Topbar />
				<Suspense fallback={<RouteFallback />}>
					<Routes>
						<Route
							path="/"
							element={<TodayPage />}
						/>
						<Route
							path="/habits"
							element={<HabitsPage />}
						/>
						<Route
							path="/projects"
							element={<ProjectsPage />}
						/>
						<Route
							path="/insights"
							element={<InsightsPage />}
						/>
						<Route
							path="/review"
							element={<DailyReviewPage />}
						/>
						<Route
							path="/settings"
							element={<SettingsPage />}
						/>
					</Routes>
				</Suspense>
			</div>
			<BottomNav />
		</div>
	);
}

export default function App() {
	const [theme, setTheme] = useState(() => {
		const saved = localStorage.getItem('habitTrackerTheme');
		if (saved && ['light', 'dark'].includes(saved)) return saved;
		const prefersDark = window.matchMedia(
			'(prefers-color-scheme: dark)',
		).matches;
		return prefersDark ? 'dark' : 'light';
	});

	useEffect(() => {
		localStorage.setItem('habitTrackerTheme', theme);
		document.documentElement.dataset.theme = theme;
		if (theme === 'dark') {
			document.documentElement.style.colorScheme = 'dark';
		} else {
			document.documentElement.style.colorScheme = 'light';
		}
	}, [theme]);

	const cycleTheme = () => {
		const themes = ['light', 'dark'];
		const currentIndex = themes.indexOf(theme);
		const nextIndex = (currentIndex + 1) % themes.length;
		setTheme(themes[nextIndex]);
	};

	return (
		<ToastProvider>
			<AppProvider>
				<AuthGate>
					<StudioProvider>
						<AppShell
							theme={theme}
							onThemeToggle={cycleTheme}
						/>
					</StudioProvider>
				</AuthGate>
				<ToastViewport />
			</AppProvider>
		</ToastProvider>
	);
}
