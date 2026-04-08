import { useMemo, useState } from 'react';

/**
 * Advanced Search & Filter Components
 */

export function SearchAndFilter({ habits, onFilter }) {
	const [searchTerm, setSearchTerm] = useState('');
	const [filters, setFilters] = useState({
		category: [],
		streakMin: 0,
		completionMin: 0,
		priority: [],
	});
	const [sortBy, setSortBy] = useState('priority'); // priority, newest, consistency, streak

	// Get unique categories
	const categories = useMemo(() => {
		return [
			...new Set(habits.filter((h) => h.category).map((h) => h.category)),
		];
	}, [habits]);

	// Apply filters and search
	const filtered = useMemo(() => {
		let results = habits;

		// Text search
		if (searchTerm) {
			const term = searchTerm.toLowerCase();
			results = results.filter(
				(h) =>
					h.name.toLowerCase().includes(term) ||
					h.category?.toLowerCase().includes(term) ||
					(h.tags || []).some((t) => t.toLowerCase().includes(term)),
			);
		}

		// Category filter
		if (filters.category.length > 0) {
			results = results.filter((h) =>
				filters.category.includes(h.category || 'uncategorized'),
			);
		}

		// Priority filter
		if (filters.priority.length > 0) {
			results = results.filter((h) =>
				filters.priority.includes(h.priority || 'medium'),
			);
		}

		// Sort
		switch (sortBy) {
			case 'newest':
				results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
				break;
			case 'priority':
				const priorityOrder = { high: 0, medium: 1, low: 2 };
				results.sort(
					(a, b) =>
						(priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1),
				);
				break;
			case 'name':
				results.sort((a, b) => a.name.localeCompare(b.name));
				break;
			default:
				break;
		}

		if (onFilter) {
			onFilter(results);
		}

		return results;
	}, [searchTerm, filters, sortBy, habits, onFilter]);

	const toggleFilter = (filterType, value) => {
		setFilters((prev) => ({
			...prev,
			[filterType]: prev[filterType].includes(value)
				? prev[filterType].filter((v) => v !== value)
				: [...prev[filterType], value],
		}));
	};

	return (
		<div className="space-y-4 p-4 bg-neutral-50/50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50">
			{/* Search Input */}
			<div className="relative">
				<input
					type="text"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					placeholder="Search habits, categories, tags..."
					className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
					🔍
				</span>
			</div>

			{/* Sort Dropdown */}
			<div>
				<label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2 block">
					Sort By
				</label>
				<select
					value={sortBy}
					onChange={(e) => setSortBy(e.target.value)}
					className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="priority">Priority</option>
					<option value="newest">Newest</option>
					<option value="name">Name</option>
				</select>
			</div>

			{/* Category Filter */}
			{categories.length > 0 && (
				<div>
					<label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2 block">
						Categories
					</label>
					<div className="flex flex-wrap gap-2">
						{categories.map((cat) => (
							<button
								key={cat}
								onClick={() => toggleFilter('category', cat)}
								className={`px-3 py-1 text-xs rounded-full border transition-all ${
									filters.category.includes(cat)
										? 'bg-blue-500 text-white border-blue-600'
										: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 border-neutral-200 dark:border-neutral-600 hover:border-blue-400'
								}`}
							>
								{cat}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Priority Filter */}
			<div>
				<label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2 block">
					Priority
				</label>
				<div className="flex flex-wrap gap-2">
					{['high', 'medium', 'low'].map((p) => (
						<button
							key={p}
							onClick={() => toggleFilter('priority', p)}
							className={`px-3 py-1 text-xs rounded-full border capitalize transition-all ${
								filters.priority.includes(p)
									? 'bg-blue-500 text-white border-blue-600'
									: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 border-neutral-200 dark:border-neutral-600 hover:border-blue-400'
							}`}
						>
							{p}
						</button>
					))}
				</div>
			</div>

			{/* Active Filters Summary */}
			{(searchTerm ||
				Object.values(filters).some((f) =>
					Array.isArray(f) ? f.length > 0 : f > 0,
				)) && (
				<div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
					<p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
						Found {filtered.length} result{filtered.length !== 1 ? 's' : ''}
					</p>
					<button
						onClick={() => {
							setSearchTerm('');
							setFilters({
								category: [],
								streakMin: 0,
								completionMin: 0,
								priority: [],
							});
						}}
						className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
					>
						Clear all filters
					</button>
				</div>
			)}
		</div>
	);
}

// Filter helper functions for lib
export function filterHabits(habits, searchTerm = '', filters = {}) {
	let results = habits;

	// Search
	if (searchTerm) {
		const term = searchTerm.toLowerCase();
		results = results.filter(
			(h) =>
				h.name.toLowerCase().includes(term) ||
				h.category?.toLowerCase().includes(term) ||
				(h.tags || []).some((t) => t.toLowerCase().includes(term)),
		);
	}

	// Category filter
	if (filters.categories && filters.categories.length > 0) {
		results = results.filter((h) =>
			filters.categories.includes(h.category || 'uncategorized'),
		);
	}

	// Priority filter
	if (filters.priorities && filters.priorities.length > 0) {
		results = results.filter((h) =>
			filters.priorities.includes(h.priority || 'medium'),
		);
	}

	// Streak filter
	if (filters.minStreak) {
		// This would need streak data to be passed
	}

	// Completion rate filter
	if (filters.minCompletion) {
		// This would need completion data to be passed
	}

	return results;
}

export function sortHabits(habits, sortBy = 'priority') {
	const sorted = [...habits];

	switch (sortBy) {
		case 'newest':
			sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
			break;
		case 'oldest':
			sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
			break;
		case 'name':
			sorted.sort((a, b) => a.name.localeCompare(b.name));
			break;
		case 'priority':
			const priorityOrder = { high: 0, medium: 1, low: 2 };
			sorted.sort(
				(a, b) =>
					(priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1),
			);
			break;
		case 'color':
			sorted.sort((a, b) => (a.color ?? '').localeCompare(b.color ?? ''));
			break;
		default:
			break;
	}

	return sorted;
}
