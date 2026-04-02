import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import AuthGate from './components/AuthGate.jsx';
import ToastViewport from './components/ToastViewport.jsx';
import { isoToday } from './lib/date.js';
import HabitsPage from './pages/HabitsPage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import TodayPage from './pages/TodayPage.jsx';
import { AppProvider } from './state/AppState.jsx';
import { ToastProvider } from './state/ToastState.jsx';

const NAV_ITEMS = [
	{ to: '/', label: 'Today', shortLabel: 'Pulse', icon: 'pulse' },
	{ to: '/habits', label: 'Habits', shortLabel: 'Habits', icon: 'habit' },
	{ to: '/projects', label: 'Projects', shortLabel: 'Projects', icon: 'target' },
	{ to: '/insights', label: 'Insights', shortLabel: 'Insights', icon: 'chart' },
	{ to: '/settings', label: 'Settings', shortLabel: 'Settings', icon: 'settings' },
];

function NavGlyph({ name }) {
	switch (name) {
		case 'pulse':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
					<path d="M3 12h4l2.2-5 4.4 10 2.4-5H21" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
		case 'habit':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
					<path d="M7 7h10v10H7z" rx="3" />
					<path d="M8 12h8" strokeLinecap="round" />
					<path d="M12 8v8" strokeLinecap="round" />
				</svg>
			);
		case 'target':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
					<circle cx="12" cy="12" r="7" />
					<circle cx="12" cy="12" r="3" />
					<path d="M19 5l-4.5 4.5" strokeLinecap="round" />
				</svg>
			);
		case 'chart':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
					<path d="M4 19h16" strokeLinecap="round" />
					<path d="M7 15l3-3 3 2 4-6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
		default:
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
					<path d="M12 3.5l2.2 1.3 2.5-.2 1 2.3 2 1.5-.8 2.4.8 2.4-2 1.5-1 2.3-2.5-.2L12 20.5l-2.2-1.3-2.5.2-1-2.3-2-1.5.8-2.4-.8-2.4 2-1.5 1-2.3 2.5.2L12 3.5z" />
					<circle cx="12" cy="12" r="2.5" />
				</svg>
			);
	}
}

function Sidebar({ isDark, onThemeToggle }) {
	return (
		<aside className="sidebarArea">
			<div className="sidebarHero">
				<div className="sidebarEyebrow">Premium Workspace</div>
				<div className="sidebarHeroTop">
					<div
						className="sidebarAvatar"
						aria-hidden="true"
					>
						H
					</div>
					<button
						className="themeToggleBtn"
						onClick={onThemeToggle}
						aria-label="Toggle dark mode"
						title={isDark ? 'Light mode' : 'Dark mode'}
					>
						{isDark ? 'Light' : 'Dark'}
					</button>
				</div>
				<div className="sidebarHeroCopy">
					<div className="sidebarWorkspace">Habit Workspace</div>
					<div className="sidebarWorkspaceMeta">
						Precision habit tracking with focus loops, streak telemetry, and project momentum in one command center.
					</div>
				</div>
				<div className="sidebarStats">
					<div className="sidebarStat">
						<span className="sidebarStatValue">24/7</span>
						<span className="sidebarStatLabel">Sync ready</span>
					</div>
					<div className="sidebarStat">
						<span className="sidebarStatValue">Pro</span>
						<span className="sidebarStatLabel">Visual system</span>
					</div>
				</div>
			</div>
			<div className="navGroup">
				<div className="navGroupLabel">Navigation</div>
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
		</aside>
	);
}

function Topbar() {
	const location = useLocation();
	const title =
		NAV_ITEMS.find((n) => n.to === location.pathname)?.label || 'Page';
	const dateLabel = isoToday();

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
				<span className="badge brand">{dateLabel}</span>
				<span className="badge">Premium UI</span>
				<span className="badge success">Live session</span>
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

function AppShell({ isDark, onThemeToggle }) {
	return (
		<div className="app">
			<Sidebar
				isDark={isDark}
				onThemeToggle={onThemeToggle}
			/>
			<div className="mainArea">
				<Topbar />
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
						path="/settings"
						element={<SettingsPage />}
					/>
				</Routes>
			</div>
			<BottomNav />
		</div>
	);
}

export default function App() {
	const [isDark, setIsDark] = useState(() => {
		const saved = localStorage.getItem('habitTrackerDarkMode');
		if (saved !== null) return saved === 'true';
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	});

	useEffect(() => {
		localStorage.setItem('habitTrackerDarkMode', isDark);
		document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
		if (isDark) {
			document.documentElement.style.colorScheme = 'dark';
		} else {
			document.documentElement.style.colorScheme = 'light';
		}
	}, [isDark]);

	return (
		<ToastProvider>
			<AppProvider>
				<AuthGate>
					<AppShell
						isDark={isDark}
						onThemeToggle={() => setIsDark(!isDark)}
					/>
				</AuthGate>
				<ToastViewport />
			</AppProvider>
		</ToastProvider>
	);
}
