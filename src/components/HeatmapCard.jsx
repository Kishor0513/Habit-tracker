import { useMemo } from 'react';

/**
 * GitHub-style Heatmap Component
 * Shows completion rates over time in a grid format
 */

export default function HeatmapCard({ entries, weeks = 52 }) {
	// Generate heatmap data
	const heatmapData = useMemo(() => {
		const data = [];
		const today = new Date();
		const startDate = new Date(today);
		startDate.setDate(startDate.getDate() - weeks * 7);

		// Initialize grid (7 days × weeks columns)
		const grid = [[], [], [], [], [], [], []]; // Sunday to Saturday

		for (let i = 0; i < weeks * 7; i++) {
			const date = new Date(startDate);
			date.setDate(date.getDate() + i);
			const dateStr = date.toISOString().split('T')[0];

			// Get all entries for this day
			const dayEntries = entries.filter((e) => e.date === dateStr);
			const completed = dayEntries.filter((e) => e.status === 'done').length;
			const total = dayEntries.length;

			// Calculate intensity (0-4 scale)
			let intensity = 0;
			if (total > 0) {
				const rate = completed / total;
				intensity = Math.ceil(rate * 4);
			}

			const dayOfWeek = date.getDay();
			const weekNumber = Math.floor(i / 7);

			grid[dayOfWeek].push({
				week: weekNumber,
				date: dateStr,
				intensity: total === 0 ? 0 : intensity,
				completed,
				total,
				label: date.toLocaleDateString(),
			});
		}

		return grid;
	}, [entries, weeks]);

	const getColor = (intensity) => {
		switch (intensity) {
			case 0:
				return 'bg-neutral-200 dark:bg-neutral-700';
			case 1:
				return 'bg-blue-200 dark:bg-blue-900';
			case 2:
				return 'bg-blue-400 dark:bg-blue-700';
			case 3:
				return 'bg-blue-500 dark:bg-blue-600';
			case 4:
				return 'bg-blue-600 dark:bg-blue-500';
			default:
				return 'bg-neutral-200 dark:bg-neutral-700';
		}
	};

	const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	return (
		<div className="glassmorphic-card p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md overflow-x-auto">
			<h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
				📅 Contribution Heatmap
			</h3>

			<div className="inline-block">
				<div className="flex gap-4">
					{/* Day Labels */}
					<div className="flex flex-col justify-start pt-8">
						{dayLabels.map((day) => (
							<div
								key={day}
								className="text-xs text-neutral-600 dark:text-neutral-400 font-medium h-6 flex items-center"
								style={{ minHeight: '24px' }}
							>
								{day}
							</div>
						))}
					</div>

					{/* Heatmap Grid */}
					<div className="flex gap-1">
						{heatmapData[0]?.map((_, weekIndex) => (
							<div
								key={weekIndex}
								className="flex flex-col gap-1"
							>
								{heatmapData.map((dayColumn, dayIndex) => {
									const cell = dayColumn[weekIndex];
									if (!cell)
										return (
											<div
												key={`${weekIndex}-${dayIndex}`}
												className="w-6 h-6"
											/>
										);

									return (
										<div
											key={`${weekIndex}-${dayIndex}`}
											className={`w-6 h-6 rounded ${getColor(cell.intensity)} cursor-pointer transition-all hover:ring-2 hover:ring-offset-2 hover:ring-blue-500 dark:hover:ring-offset-neutral-900 relative group`}
											title={`${cell.label}: ${cell.completed}/${cell.total}`}
										>
											{/* Tooltip */}
											<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
												{cell.completed}/{cell.total} - {cell.label}
											</div>
										</div>
									);
								})}
							</div>
						))}
					</div>
				</div>

				{/* Legend */}
				<div className="mt-6 flex items-center gap-4 text-xs">
					<span className="text-neutral-600 dark:text-neutral-400">Less</span>
					<div className="flex gap-1">
						{[0, 1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className={`w-4 h-4 rounded ${getColor(i)}`}
							/>
						))}
					</div>
					<span className="text-neutral-600 dark:text-neutral-400">More</span>
				</div>
			</div>
		</div>
	);
}
