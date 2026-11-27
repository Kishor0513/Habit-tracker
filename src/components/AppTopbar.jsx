import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppIcon from './AppIcon.jsx';
import CircularClock from './CircularClock.jsx';
import { useApp } from '../state/AppState.jsx';
import { useLifeData } from '../state/useLifeData.js';
import { useStudio } from '../state/StudioState.jsx';
import { isoToday } from '../lib/date.js';
import { isDueOn } from '../lib/habits.js';
import { isOverdue } from '../lib/tasks.js';
import { effectiveInvoiceStatus } from '../lib/invoices.js';
import { budgetProgress } from '../lib/finance.js';
import { routeTitle } from './AppSidebar.jsx';

const READ_KEY = 'lifeos.notifications.read';

function NotificationsPanel({ onClose }) {
	const { data } = useLifeData();
	const navigate = useNavigate();
	const today = isoToday();
	const [read, setRead] = useState(() => {
		try {
			return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]'));
		} catch {
			return new Set();
		}
	});

	const items = useMemo(() => {
		const list = [];
		for (const task of data.tasks) {
			if (isOverdue(task, today)) {
				list.push({ id: `task-overdue-${task.id}`, icon: 'task', title: 'Task overdue', body: task.title, to: '/tasks?view=upcoming', tone: 'danger' });
			} else if (task.dueDate === today && task.status !== 'done') {
				list.push({ id: `task-today-${task.id}`, icon: 'task', title: 'Due today', body: task.title, to: '/tasks?view=my-day', tone: 'warning' });
			}
		}
		for (const habit of data.habits) {
			if (!isDueOn(habit, today)) continue;
			const entry = data.entries.find((entry) => entry.habitId === habit.id && entry.date === today);
			if (entry?.status !== 'done') {
				list.push({ id: `habit-${habit.id}-${today}`, icon: 'habit', title: 'Habit pending', body: habit.name, to: '/', tone: 'brand' });
			}
		}
		for (const invoice of data.invoices) {
			if (effectiveInvoiceStatus(invoice, data.invoicePayments, today) === 'overdue') {
				list.push({ id: `invoice-${invoice.id}`, icon: 'invoice', title: 'Invoice overdue', body: invoice.number || 'Unnumbered invoice', to: '/invoices', tone: 'danger' });
			}
		}
		for (const budget of budgetProgress(data.budgets, data.transactions)) {
			if (budget.percent >= 100) {
				list.push({ id: `budget-${budget.id}-${today}`, icon: 'finance', title: 'Budget reached', body: budget.category, to: '/finance', tone: 'warning' });
			}
		}
		return list.slice(0, 12);
	}, [data, today]);

	const unread = items.filter((item) => !read.has(item.id)).length;

	const markAll = () => {
		const next = new Set([...read, ...items.map((item) => item.id)]);
		setRead(next);
		localStorage.setItem(READ_KEY, JSON.stringify([...next]));
	};

	const open = (item) => {
		const next = new Set([...read, item.id]);
		setRead(next);
		localStorage.setItem(READ_KEY, JSON.stringify([...next]));
		navigate(item.to);
		onClose();
	};

	return (
		<>
			<div className="popoverScrim" onClick={onClose} />
			<div className="popover notificationsPanel" role="dialog" aria-label="Notifications">
				<div className="popoverHeader">
					<strong>Notifications</strong>
					<div className="row gap-sm">
						<span className="badge">{unread} new</span>
						<button className="btn btn-sm ghost" type="button" onClick={markAll}>Mark all read</button>
					</div>
				</div>
				<div className="popoverBody">
					{items.length === 0 && (
						<div className="emptyPanelState">🌿 You're all caught up.</div>
					)}
					{items.map((item) => (
						<button
							key={item.id}
							className={`notificationRow ${read.has(item.id) ? 'isRead' : ''}`}
							type="button"
							onClick={() => open(item)}
						>
							<span className={`notificationIcon tone-${item.tone}`}><AppIcon name={item.icon} size={16} /></span>
							<span className="notificationCopy">
								<span className="notificationTitle">{item.title}</span>
								<span className="subtle">{item.body}</span>
							</span>
							<AppIcon name="chevron" size={14} />
						</button>
					))}
				</div>
			</div>
		</>
	);
}

function QuickAddMenu({ onClose }) {
	const navigate = useNavigate();
	const actions = [
		{ label: 'Task', icon: 'task', to: '/tasks', event: 'life:new-task' },
		{ label: 'Note', icon: 'note', to: '/notes', event: 'life:new-note' },
		{ label: 'Habit', icon: 'habit', to: '/habits', event: 'command:add-habit' },
		{ label: 'Transaction', icon: 'finance', to: '/finance', event: 'life:new-transaction' },
		{ label: 'Invoice', icon: 'invoice', to: '/invoices', event: 'life:new-invoice' },
		{ label: 'Client', icon: 'project', to: '/invoices?tab=clients', event: 'life:new-client' },
		{ label: 'Project', icon: 'project', to: '/projects', event: 'life:new-project' },
	];
	return (
		<>
			<div className="popoverScrim" onClick={onClose} />
			<div className="popover quickAddMenu" role="menu" aria-label="Quick create">
				<div className="popoverHeader"><strong>Quick create</strong></div>
				<div className="popoverBody">
					{actions.map((action) => (
						<button
							key={action.label}
							className="popoverItem"
							type="button"
							role="menuitem"
							onClick={() => {
								navigate(action.to);
								window.dispatchEvent(new CustomEvent(action.event));
								onClose();
							}}
						>
							<AppIcon name={action.icon} size={16} /> {action.label}
						</button>
					))}
				</div>
			</div>
		</>
	);
}

function ProfileMenu({ theme, setTheme, onClose }) {
	const { user, auth, supabaseConfigured } = useApp();
	const navigate = useNavigate();
	const options = [
		{ id: 'light', label: 'Light', icon: 'sun' },
		{ id: 'dark', label: 'Dark', icon: 'moon' },
		{ id: 'system', label: 'System', icon: 'monitor' },
	];
	return (
		<>
			<div className="popoverScrim" onClick={onClose} />
			<div className="popover profileMenu" role="dialog" aria-label="Profile">
				<div className="popoverHeader profileHeader">
					<span className="profileAvatar">{(user?.email ?? 'L')[0].toUpperCase()}</span>
					<span className="stack" style={{ gap: 2 }}>
						<strong>{user?.email ? user.email.split('@')[0] : 'Local workspace'}</strong>
						<span className="subtle" style={{ fontSize: 11 }}>
							{user?.email ?? 'Data stored on this device'}
						</span>
					</span>
				</div>
				<div className="popoverBody">
					<div className="popoverLabel">Appearance</div>
					<div className="themeSegments">
						{options.map((option) => (
							<button
								key={option.id}
								className={`themeSegment ${theme === option.id ? 'isActive' : ''}`}
								type="button"
								onClick={() => setTheme(option.id)}
							>
								<AppIcon name={option.icon} size={14} /> {option.label}
							</button>
						))}
					</div>
					<button className="popoverItem" type="button" onClick={() => { navigate('/settings'); onClose(); }}>
						<AppIcon name="settings" size={16} /> Settings
					</button>
					{supabaseConfigured && user && (
						<button className="popoverItem danger" type="button" onClick={() => { auth.signOut().catch(console.error); onClose(); }}>
							<AppIcon name="logout" size={16} /> Sign out
						</button>
					)}
				</div>
			</div>
		</>
	);
}

export default function AppTopbar({ theme, setTheme }) {
	const location = useLocation();
	const [now, setNow] = useState(() => new Date());
	const [panel, setPanel] = useState(null);
	const { data } = useLifeData();
	const { spotify } = useStudio();
	const { user } = useApp();

	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(id);
	}, []);

	useEffect(() => {
		setPanel(null);
	}, [location.pathname]);

	const title = routeTitle(location.pathname);
	const trackName = spotify.spotifyState?.item?.name || 'Spotify idle';
	const isPlaying = Boolean(spotify.spotifyState?.is_playing || spotify.spotifyState?.paused === false);
	const unreadCount = data.tasks.filter((task) => isOverdue(task, isoToday())).length;

	return (
		<header className="topbar">
			<div className="topbarHeading">
				<div className="breadcrumb">
					<span>✨ LifeOS</span>
					<span className="breadcrumbSeparator">/</span>
					<span className="breadcrumb active">{title}</span>
				</div>
				<div className="topbarTitle">{title}</div>
			</div>
			<div className="topbarMeta">
				<button
					className="topbarSearch"
					type="button"
					onClick={() => window.dispatchEvent(new CustomEvent('habit:open-palette'))}
					aria-label="Search everything"
					title="Search habits, tasks, notes and more (⌘K)"
				>
					<AppIcon name="search" size={16} />
					<span className="topbarSearchLabel">Search anything</span>
					<kbd>⌘K</kbd>
				</button>
				<div className="topbarSpotify celebrateCard">
					<div className="topbarSpotifyInfo">
						<div className="topbarSpotifyLabel">{isPlaying ? '🎶 Now playing' : '🎧 Spotify'}</div>
						<div className="topbarSpotifyTrack" title={trackName}>{trackName}</div>
					</div>
					<div className="topbarSpotifyControls">
						<button className="btn ghost" type="button" onClick={spotify.previous} disabled={!spotify.spotifyAuthed} title="Previous track">⏮</button>
						<button
							className="btn ghost"
							type="button"
							onClick={() => { if (!spotify.spotifyAuthed) spotify.connect(); else spotify.playPause(); }}
							title={spotify.spotifyAuthed ? (isPlaying ? 'Pause' : 'Play') : 'Connect Spotify'}
						>
							{!spotify.spotifyAuthed ? '✨ Connect' : isPlaying ? '⏸' : '▶'}
						</button>
						<button className="btn ghost" type="button" onClick={spotify.next} disabled={!spotify.spotifyAuthed} title="Next track">⏭</button>
					</div>
				</div>
				<div className="topbarClock">
					<CircularClock now={now} compact />
					<div>
						<div className="topbarClockTime">
							{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
						</div>
						<div className="topbarClockDate">
							{now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {isoToday()}
						</div>
					</div>
				</div>
				<button
					className="iconBtn topbarAdd"
					type="button"
					aria-label="Quick create"
					title="Quick create"
					onClick={() => setPanel(panel === 'add' ? null : 'add')}
				>
					<AppIcon name="plus" />
				</button>
				<button
					className="iconBtn topbarBell"
					type="button"
					aria-label="Notifications"
					title="Notifications"
					onClick={() => setPanel(panel === 'notifications' ? null : 'notifications')}
				>
					<AppIcon name="bell" />
					{unreadCount > 0 && <span className="bellDot" />}
				</button>
				<button
					className="iconBtn topbarProfile"
					type="button"
					aria-label="Profile and theme"
					title="Profile and theme"
					onClick={() => setPanel(panel === 'profile' ? null : 'profile')}
				>
					<span className="profileAvatar small">{(user?.email ?? 'L')[0].toUpperCase()}</span>
				</button>
				{panel === 'add' && <QuickAddMenu onClose={() => setPanel(null)} />}
				{panel === 'notifications' && <NotificationsPanel onClose={() => setPanel(null)} />}
				{panel === 'profile' && <ProfileMenu theme={theme} setTheme={setTheme} onClose={() => setPanel(null)} />}
			</div>
		</header>
	);
}
