import { useEffect, useRef, useState } from 'react';

/**
 * Enhanced Command Palette (macOS-style)
 * ⌘ + K keyboard shortcut
 * Support for actions and navigation
 */

export function EnhancedCommandPalette({
	isOpen,
	onClose,
	habits = [],
	onSelectHabit,
	onNavigate,
}) {
	const [search, setSearch] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef(null);

	const commands = [
		{
			id: 'add-habit',
			label: 'Add Habit',
			description: 'Create a new habit',
			icon: '➕',
			action: () => onNavigate?.('add-habit'),
		},
		{
			id: 'view-analytics',
			label: 'View Analytics',
			description: 'Open the analytics dashboard',
			icon: '📊',
			action: () => onNavigate?.('analytics'),
		},
		{
			id: 'start-focus',
			label: 'Start Focus Session',
			description: 'Begin a focused work session',
			icon: '⏱',
			action: () => onNavigate?.('focus'),
		},
		{
			id: 'daily-review',
			label: 'Daily Review',
			description: 'End your day with a review',
			icon: '📝',
			action: () => onNavigate?.('review'),
		},
		{
			id: 'settings',
			label: 'Settings',
			description: 'Open app settings',
			icon: '⚙️',
			action: () => onNavigate?.('settings'),
		},
		{
			id: 'export-data',
			label: 'Export Data',
			description: 'Export your habits and data',
			icon: '📥',
			action: () => onNavigate?.('export'),
		},
	];

	const habitCommands = habits.map((h) => ({
		id: `habit-${h.id}`,
		label: `Complete: ${h.name}`,
		description: h.category ? `Category: ${h.category}` : 'Mark as done',
		icon: '✓',
		action: () => onSelectHabit?.(h),
	}));

	// Combine and filter commands
	const filteredCommands = [...commands, ...habitCommands].filter((cmd) => {
		const searchLower = search.toLowerCase();
		return (
			cmd.label.toLowerCase().includes(searchLower) ||
			cmd.description.toLowerCase().includes(searchLower)
		);
	});

	// Keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (!isOpen) return;

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
					break;
				case 'ArrowUp':
					e.preventDefault();
					setSelectedIndex(
						(prev) =>
							(prev - 1 + filteredCommands.length) % filteredCommands.length,
					);
					break;
				case 'Enter':
					e.preventDefault();
					if (filteredCommands[selectedIndex]) {
						filteredCommands[selectedIndex].action?.();
						onClose();
					}
					break;
				case 'Escape':
					e.preventDefault();
					onClose();
					break;
				default:
					break;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, filteredCommands, selectedIndex, onClose]);

	// Focus input when opened
	useEffect(() => {
		if (isOpen && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isOpen]);

	// Reset state when opened/closed
	useEffect(() => {
		if (isOpen) {
			setSearch('');
			setSelectedIndex(0);
		}
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 flex items-start justify-center pt-20">
			{/* Command Palette Modal */}
			<div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-2xl overflow-hidden">
				{/* Search Input */}
				<div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
					<div className="relative flex items-center gap-3">
						<span className="text-xl opacity-60">⌘</span>
						<input
							ref={inputRef}
							type="text"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setSelectedIndex(0);
							}}
							placeholder="Type a command, action, or habit..."
							className="flex-1 bg-transparent text-lg text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none"
						/>
						<button
							onClick={onClose}
							className="px-3 py-1 rounded text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
						>
							ESC
						</button>
					</div>
				</div>

				{/* Results */}
				<div className="max-h-96 overflow-y-auto">
					{filteredCommands.length === 0 ? (
						<div className="p-6 text-center text-neutral-600 dark:text-neutral-400">
							<p className="text-sm">No commands found</p>
						</div>
					) : (
						filteredCommands.map((cmd, index) => (
							<button
								key={cmd.id}
								onClick={() => {
									cmd.action?.();
									onClose();
								}}
								className={`w-full px-4 py-3 text-left border-b border-neutral-100 dark:border-neutral-800 transition-all ${
									index === selectedIndex
										? 'bg-blue-50 dark:bg-blue-900/20'
										: 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
								}`}
								onMouseEnter={() => setSelectedIndex(index)}
							>
								<div className="flex items-center gap-3">
									<span className="text-xl">{cmd.icon}</span>
									<div className="flex-1 min-w-0">
										<div
											className={`font-medium text-sm ${
												index === selectedIndex
													? 'text-blue-600 dark:text-blue-400'
													: 'text-neutral-900 dark:text-neutral-50'
											}`}
										>
											{cmd.label}
										</div>
										<div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
											{cmd.description}
										</div>
									</div>
									<span className="text-xs text-neutral-400 dark:text-neutral-600">
										↵
									</span>
								</div>
							</button>
						))
					)}
				</div>

				{/* Footer */}
				<div className="p-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 text-xs text-neutral-500 dark:text-neutral-400 flex gap-4 justify-center">
					<div>↑ ↓ to navigate</div>
					<div>enter to select</div>
					<div>esc to close</div>
				</div>
			</div>
		</div>
	);
}
