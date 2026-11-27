import { Suspense, lazy, useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppSidebar, { MobileNav } from './components/AppSidebar.jsx';
import AppTopbar from './components/AppTopbar.jsx';
import AuthGate from './components/AuthGate.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { SkeletonPage } from './components/Skeleton.jsx';
import ToastViewport from './components/ToastViewport.jsx';
import { isDueOn } from './lib/habits.js';
import { isoToday } from './lib/date.js';
import { AppProvider, useApp } from './state/AppState.jsx';
import { StudioProvider } from './state/StudioState.jsx';
import { ToastProvider, useToast } from './state/ToastState.jsx';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const TodayPage = lazy(() => import('./pages/TodayPage.jsx'));
const TasksPage = lazy(() => import('./pages/TasksPage.jsx'));
const HabitsPage = lazy(() => import('./pages/HabitsPage.jsx'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.jsx'));
const NotesPage = lazy(() => import('./pages/NotesPage.jsx'));
const FinancePage = lazy(() => import('./pages/FinancePage.jsx'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage.jsx'));
const CalendarPage = lazy(() => import('./pages/CalendarPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
const InsightsPage = lazy(() => import('./pages/InsightsPage.jsx'));
const DailyReviewPage = lazy(() => import('./pages/DailyReviewPage.jsx'));
const WeeklyReviewPage = lazy(() => import('./pages/WeeklyReviewPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));

function RouteFallback() {
	return <SkeletonPage />;
}

function NotFoundPage() {
	return (
		<div className="pageContent">
			<div className="card notFoundCard">
				<h1 className="notFoundTitle">404</h1>
				<p className="subtle notFoundSubtitle">Page not found</p>
				<a href="/" className="btn primary">Go to Today</a>
			</div>
		</div>
	);
}

function ReminderEngine() {
	const { api, isReady, dataVersion } = useApp();
	const toast = useToast();

	useEffect(() => {
		if (!isReady || !api || typeof Notification === 'undefined') return;
		const hasPrompted = localStorage.getItem('habitTrackerNotificationPrompted');
		if (!hasPrompted && Notification.permission === 'default') {
			const timer = window.setTimeout(() => {
				Notification.requestPermission().then((permission) => {
					if (permission === 'granted') {
						toast.push('Notifications enabled! You\'ll receive habit reminders.');
					}
				});
				localStorage.setItem('habitTrackerNotificationPrompted', '1');
			}, 3000);
			return () => window.clearTimeout(timer);
		}
	}, [api, isReady, toast]);

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

function AppShell({ theme, setTheme }) {
	const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lifeos.sidebar.collapsed') === 'true');

	const toggleCollapse = () => {
		const next = !collapsed;
		setCollapsed(next);
		localStorage.setItem('lifeos.sidebar.collapsed', String(next));
	};

	return (
		<div className="app">
			<ReminderEngine />
			<AppSidebar
				collapsed={collapsed}
				onToggleCollapse={toggleCollapse}
				onCreate={() => window.dispatchEvent(new CustomEvent('life:new-task'))}
			/>
			<div className="mainArea">
				<CommandPalette />
				<AppTopbar theme={theme} setTheme={setTheme} />
				<Suspense fallback={<RouteFallback />}>
					<ErrorBoundary>
						<Routes>
							<Route path="/home" element={<HomePage />} />
							<Route path="/" element={<TodayPage />} />
							<Route path="/tasks" element={<TasksPage />} />
							<Route path="/projects" element={<ProjectsPage />} />
							<Route path="/habits" element={<HabitsPage />} />
							<Route path="/notes" element={<NotesPage />} />
							<Route path="/finance" element={<FinancePage />} />
							<Route path="/invoices" element={<InvoicesPage />} />
							<Route path="/calendar" element={<CalendarPage />} />
							<Route path="/analytics" element={<AnalyticsPage />} />
							<Route path="/insights" element={<InsightsPage />} />
							<Route path="/review" element={<DailyReviewPage />} />
							<Route path="/review/weekly" element={<WeeklyReviewPage />} />
							<Route path="/settings" element={<SettingsPage />} />
							<Route path="*" element={<NotFoundPage />} />
						</Routes>
					</ErrorBoundary>
				</Suspense>
			</div>
			<MobileNav />
		</div>
	);
}

export default function App() {
	const [theme, setTheme] = useState(() => localStorage.getItem('habitTrackerTheme') || 'system');

	useEffect(() => {
		localStorage.setItem('habitTrackerTheme', theme);
		let effectiveTheme = theme;
		if (theme === 'system') {
			effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		document.documentElement.dataset.theme = effectiveTheme;
		document.documentElement.style.colorScheme = effectiveTheme;
	}, [theme]);

	return (
		<ToastProvider>
			<AppProvider>
				<AuthGate>
					<StudioProvider>
						<AppShell theme={theme} setTheme={setTheme} />
					</StudioProvider>
				</AuthGate>
				<ToastViewport />
			</AppProvider>
		</ToastProvider>
	);
}
