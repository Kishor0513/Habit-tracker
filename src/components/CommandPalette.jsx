import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStudio } from '../state/StudioState.jsx';

const ACTIONS = [
	{ id: 'add-habit', title: 'Add habit', keywords: 'new create habit habits' },
	{ id: 'complete-habit', title: 'Complete next habit', keywords: 'mark done complete today' },
	{ id: 'start-focus', title: 'Start focus', keywords: 'focus timer session' },
	{ id: 'open-analytics', title: 'Open analytics', keywords: 'analytics insights charts' },
	{ id: 'search-habits', title: 'Search habits', keywords: 'search habits filter' },
	{ id: 'open-settings', title: 'Open settings', keywords: 'settings preferences timezone' },
];

export default function CommandPalette() {
	const navigate = useNavigate();
	const location = useLocation();
	const { focus } = useStudio();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');

	useEffect(() => {
		function onKeyDown(event) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				setOpen((value) => !value);
			}
			if (!open) return;
			if (event.key === 'Escape') setOpen(false);
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [open]);

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
		if (actionId === 'search-habits') {
			navigate('/habits');
			window.dispatchEvent(new CustomEvent('command:search-habits'));
		}
		if (actionId === 'open-settings') navigate('/settings');
	}

	if (!open) return null;

	return (
		<div className="modalBackdrop" onMouseDown={() => setOpen(false)}>
			<div className="commandPalette" onMouseDown={(event) => event.stopPropagation()}>
				<input
					className="input commandPaletteInput"
					autoFocus
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search actions..."
				/>
				<div className="commandPaletteList">
					{items.map((action) => (
						<button
							key={action.id}
							className="commandPaletteItem"
							type="button"
							onClick={() => trigger(action.id)}
						>
							<span>{action.title}</span>
							<span className="badge">{action.id}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
