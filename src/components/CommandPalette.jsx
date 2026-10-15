import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStudio } from '../state/StudioState.jsx';

const ACTIONS = [
	{ id: 'add-habit', title: '✨ Add habit', keywords: 'new create habit habits', group: 'Create' },
	{ id: 'complete-habit', title: '✅ Complete next habit', keywords: 'mark done complete today', group: 'Execute' },
	{ id: 'start-focus', title: '🎯 Start focus', keywords: 'focus timer session deep work', group: 'Execute' },
	{ id: 'open-analytics', title: '📊 Open analytics', keywords: 'analytics insights charts', group: 'Go to' },
	{ id: 'open-review', title: '💭 Open daily review', keywords: 'review reflect journal mood', group: 'Go to' },
	{ id: 'search-habits', title: '🔍 Search habits', keywords: 'search habits filter', group: 'Find' },
	{ id: 'open-settings', title: '⚙️ Open settings', keywords: 'settings preferences timezone', group: 'Go to' },
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
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');

	useEffect(() => {
		function onKeyDown(event) {
			if (event.defaultPrevented) return;
			if (isEditableTarget(event.target)) return;
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				setOpen((value) => !value);
			}
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	useEffect(() => {
		setQuery('');
	}, [location.pathname, open]);

	const items = useMemo(() => {
		const value = query.trim().toLowerCase();
		if (!value) return ACTIONS;
		return ACTIONS.filter((action) => `${action.title} ${action.keywords}`.toLowerCase().includes(value));
	}, [query]);

	function trigger(actionId) {
		setOpen(false);
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
		if (actionId === 'open-analytics') navigate('/insights');
		if (actionId === 'open-review') navigate('/review');
		if (actionId === 'search-habits') {
			navigate('/habits');
			window.dispatchEvent(new CustomEvent('command:search-habits'));
		}
		if (actionId === 'open-settings') navigate('/settings');
	}

	function onPaletteKeyDown(event) {
		if (event.key !== 'Escape') return;
		event.preventDefault();
		setOpen(false);
	}

	if (!open) return null;

	return (
		<div className="modalBackdrop" onMouseDown={() => setOpen(false)}>
			<div
				className="commandPalette"
				onKeyDown={onPaletteKeyDown}
				onMouseDown={(event) => event.stopPropagation()}
			>
				<input
					className="input commandPaletteInput"
					autoFocus
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="✨ Type a command — try 'focus', 'habit', 'review'…"
				/>
				<div className="subtle" style={{ marginTop: 8, fontSize: 11 }}>⌘K anywhere · Enter to run · Esc to close</div>
				<div className="commandPaletteList">
					{items.length === 0 ? (
						<div className="subtle" style={{ padding: 12, textAlign: 'center' }}>No matches — try “habit” or “focus” 🌱</div>
					) : items.map((action) => (
						<button
							key={action.id}
							className="commandPaletteItem"
							type="button"
							onClick={() => trigger(action.id)}
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
