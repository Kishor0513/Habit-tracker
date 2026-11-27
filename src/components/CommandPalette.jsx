import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStudio } from '../state/StudioState.jsx';
import { useLifeData } from '../state/useLifeData.js';

const ACTIONS = [
	{ id: 'add-habit', title: '✨ Add habit', keywords: 'new create habit habits', group: 'Create' },
	{ id: 'new-task', title: '✅ New task', keywords: 'new create task todo', group: 'Create', to: '/tasks', event: 'life:new-task' },
	{ id: 'new-note', title: '📝 New note', keywords: 'new create note write', group: 'Create', to: '/notes', event: 'life:new-note' },
	{ id: 'new-transaction', title: '💸 New transaction', keywords: 'new expense income money', group: 'Create', to: '/finance', event: 'life:new-transaction' },
	{ id: 'new-invoice', title: '🧾 New invoice', keywords: 'new invoice bill client', group: 'Create', to: '/invoices', event: 'life:new-invoice' },
	{ id: 'complete-habit', title: '✅ Complete next habit', keywords: 'mark done complete today', group: 'Execute' },
	{ id: 'start-focus', title: '🎯 Start focus', keywords: 'focus timer session deep work', group: 'Execute' },
	{ id: 'open-analytics', title: '📊 Open analytics', keywords: 'analytics insights charts', group: 'Go to', to: '/analytics' },
	{ id: 'open-review', title: '💭 Open daily review', keywords: 'review reflect journal mood', group: 'Go to', to: '/review' },
	{ id: 'search-habits', title: '🔍 Search habits', keywords: 'search habits filter', group: 'Find' },
	{ id: 'open-settings', title: '⚙️ Open settings', keywords: 'settings preferences timezone', group: 'Go to', to: '/settings' },
];

const EDITABLE_TARGET_SELECTOR =
	'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

function isEditableTarget(target) {
	if (!(target instanceof HTMLElement)) return false;
	return target.isContentEditable || Boolean(target.closest(EDITABLE_TARGET_SELECTOR));
}

export default function CommandPalette() {
	const navigate = useNavigate();
	const location = useLocation();
	const { focus } = useStudio();
	const { data } = useLifeData();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);

	useEffect(() => {
		function onKeyDown(event) {
			if (event.defaultPrevented) return;
			if (isEditableTarget(event.target)) return;
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				setOpen((value) => !value);
			}
		}
		function openPalette() {
			setOpen(true);
		}
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('habit:open-palette', openPalette);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('habit:open-palette', openPalette);
		};
	}, []);

	useEffect(() => {
		setQuery('');
	}, [location.pathname, open]);

	useEffect(() => {
		setActiveIndex(0);
	}, [query, open, location.pathname]);

	const items = useMemo(() => {
		const records = [
			...data.tasks.map((task) => ({
				id: `task-${task.id}`,
				title: `📌 ${task.title}`,
				keywords: `task ${task.status} ${task.tags?.join(' ') ?? ''}`,
				group: 'Tasks',
				to: '/tasks',
			})),
			...data.notes.map((note) => ({
				id: `note-${note.id}`,
				title: `📝 ${note.title}`,
				keywords: `note ${note.tags?.join(' ') ?? ''} ${String(note.plainText ?? '').slice(0, 120)}`,
				group: 'Notes',
				to: '/notes',
			})),
			...data.habits.map((habit) => ({
				id: `habit-${habit.id}`,
				title: `🌱 ${habit.name}`,
				keywords: `habit ${habit.category ?? ''}`,
				group: 'Habits',
				to: '/habits',
			})),
			...data.projects.map((project) => ({
				id: `project-${project.id}`,
				title: `🎯 ${project.name}`,
				keywords: `project ${project.goal ?? ''}`,
				group: 'Projects',
				to: '/projects',
			})),
			...data.clients.map((client) => ({
				id: `client-${client.id}`,
				title: `👤 ${client.name}`,
				keywords: `client ${client.email ?? ''}`,
				group: 'Clients',
				to: '/invoices?tab=clients',
			})),
			...data.invoices.map((invoice) => ({
				id: `invoice-${invoice.id}`,
				title: `🧾 ${invoice.number || 'Invoice'}`,
				keywords: `invoice ${invoice.status}`,
				group: 'Invoices',
				to: '/invoices',
			})),
		];
		const value = query.trim().toLowerCase();
		if (!value) return ACTIONS;
		return [...ACTIONS, ...records]
			.filter((item) => `${item.title} ${item.keywords ?? ''}`.toLowerCase().includes(value))
			.slice(0, 40);
	}, [query, data]);

	function trigger(action) {
		const actionId = typeof action === 'string' ? action : action.id;
		setOpen(false);
		if (typeof action !== 'string' && action.to) navigate(action.to);
		if (typeof action !== 'string' && action.event) window.dispatchEvent(new CustomEvent(action.event));
		if (actionId === 'add-habit') {
			navigate('/habits');
			window.dispatchEvent(new CustomEvent('command:add-habit'));
		}
		if (actionId === 'complete-habit') {
			navigate('/');
			window.dispatchEvent(new CustomEvent('command:complete-next-habit'));
		}
		if (actionId === 'start-focus') {
			navigate('/');
			focus.startSession();
		}
		if (actionId === 'search-habits') {
			navigate('/habits');
			window.dispatchEvent(new CustomEvent('command:search-habits'));
		}
	}

	function onPaletteKeyDown(event) {
		if (event.key === 'Escape') {
			event.preventDefault();
			setOpen(false);
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setActiveIndex((index) => (items.length === 0 ? 0 : (index + 1) % items.length));
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveIndex((index) =>
				items.length === 0 ? 0 : (index - 1 + items.length) % items.length,
			);
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			const action = items[Math.min(activeIndex, items.length - 1)];
			if (action) trigger(action);
		}
	}

	if (!open) return null;

	return (
		<div
			className="modalBackdrop commandBackdrop"
			onMouseDown={() => setOpen(false)}
		>
			<div
				className="commandPalette"
				onKeyDown={onPaletteKeyDown}
				onMouseDown={(event) => event.stopPropagation()}
			>
				<input
					className="input commandPaletteInput"
					autoFocus
					autoComplete="off"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search tasks, notes, habits, invoices — or type a command…"
				/>
				<div className="subtle" style={{ marginTop: 8, fontSize: 11 }}>⌘K anywhere · ↑↓ navigate · Enter to run · Esc to close</div>
				<div
					className="commandPaletteList"
					role="listbox"
					aria-label="Workspace commands and records"
				>
					{items.length === 0 ? (
						<div className="subtle" style={{ padding: 12, textAlign: 'center' }}>No matches — try “task” or “habit” 🌱</div>
					) : items.map((action, index) => (
						<button
							key={action.id}
							className={`commandPaletteItem ${index === activeIndex ? 'isActive' : ''}`}
							type="button"
							role="option"
							aria-selected={index === activeIndex}
							onMouseEnter={() => setActiveIndex(index)}
							onClick={() => trigger(action)}
						>
							<span>{action.title}</span>
							<span className="badge playful">{action.group ?? action.id}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
