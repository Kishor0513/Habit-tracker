import { useMemo, useState } from 'react';
import {
	BestHabitsCard,
	InsightCard,
	MoodCorrelationCard,
	MostSkippedCard,
	PlaylistAnalyticsCard,
	StatCard,
	TimeOfDayChart,
	WeeklyPerformanceChart,
} from '../components/AnalyticsDashboard.jsx';
import { mostSkippedHabits } from '../lib/analytics.js';
import { useApp } from '../state/AppState.jsx';

/**
 * Enhanced Insights Page with Advanced Analytics
 */

export default function EnhancedInsightsPage() {
	const { api, isReady, habits, entries } = useApp();
	const [timeRange, setTimeRange] = useState(30); // days

	if (!isReady) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p className="text-neutral-600 dark:text-neutral-400">
						Loading Analytics...
					</p>
				</div>
			</div>
		);
	}

	// Get entries for the time range
	const timeRangeEntries = useMemo(() => {
		const targetDate = new Date();
		const startDate = new Date(
			targetDate.getTime() - timeRange * 24 * 60 * 60 * 1000,
		);
		return entries.filter((e) => {
			const entryDate = new Date(e.date);
			return entryDate >= startDate && entryDate <= targetDate;
		});
	}, [entries, timeRange]);

	// Organize entries by habit for analytics
	const entriesByHabit = useMemo(() => {
		const grouped = {};
		habits.forEach((h) => {
			grouped[h.id] = [];
		});
		timeRangeEntries.forEach((e) => {
			if (grouped[e.habitId]) {
				grouped[e.habitId].push(e);
			}
		});
		return grouped;
	}, [habits, timeRangeEntries]);

	// Compute overall metrics
	const overallMetrics = useMemo(() => {
		const completed = timeRangeEntries.filter(
			(e) => e.status === 'done',
		).length;
		const total = timeRangeEntries.length;
		const skipped = timeRangeEntries.filter(
			(e) => e.status === 'skipped',
		).length;

		return {
			completed,
			total,
			skipped,
			rate: total > 0 ? Math.round((completed / total) * 100) : 0,
		};
	}, [timeRangeEntries]);

	// Create mock sessions data (in real app, fetch from API)
	const mockSessions = [];

	// Get daily reviews (in real app, fetch from API)
	const reviews = [];

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
							📊 Analytics
						</h1>
						<p className="text-neutral-600 dark:text-neutral-400 mt-1">
							Deep dive into your habit performance
						</p>
					</div>

					{/* Time Range Selector */}
					<div className="flex gap-2">
						{[7, 30, 90, 365].map((days) => (
							<button
								key={days}
								onClick={() => setTimeRange(days)}
								className={`px-4 py-2 rounded-lg font-medium transition-all ${
									timeRange === days
										? 'bg-blue-500 text-white shadow-lg'
										: 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 hover:bg-neutral-300 dark:hover:bg-neutral-600'
								}`}
							>
								{days}d
							</button>
						))}
					</div>
				</div>

				{/* Top Metrics */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<StatCard
						label="Overall Completion"
						value={overallMetrics.rate}
						suffix="%"
						icon="✓"
						color="success"
					/>
					<StatCard
						label="Total Entries"
						value={overallMetrics.total}
						suffix="tracked"
						icon="📋"
						color="primary"
					/>
					<StatCard
						label="Completed"
						value={overallMetrics.completed}
						suffix="done"
						icon="🎯"
						color="success"
					/>
					<StatCard
						label="Skipped"
						value={overallMetrics.skipped}
						suffix="skipped"
						icon="⏭"
						color="warning"
					/>
				</div>

				{/* Main Analytics Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Weekly Performance */}
					<WeeklyPerformanceChart
						habits={habits}
						entriesByKey={
							new Map(
								timeRangeEntries.map((e) => [`${e.habitId}__${e.date}`, e]),
							)
						}
					/>

					{/* Time of Day Analysis */}
					<TimeOfDayChart entries={timeRangeEntries} />
				</div>

				{/* More Analytics */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Best Habits */}
					<BestHabitsCard
						habits={habits}
						entriesByKey={
							new Map(
								timeRangeEntries.map((e) => [`${e.habitId}__${e.date}`, e]),
							)
						}
					/>

					{/* Most Skipped */}
					<MostSkippedCard
						habits={habits}
						entriesByKey={
							new Map(
								timeRangeEntries.map((e) => [`${e.habitId}__${e.date}`, e]),
							)
						}
					/>

					{/* Playlist Analytics */}
					<PlaylistAnalyticsCard sessions={mockSessions} />
				</div>

				{/* Mood Correlation */}
				<MoodCorrelationCard
					reviews={reviews}
					entries={timeRangeEntries}
				/>

				{/* Insights & Suggestions */}
				<div>
					<h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-4">
						💡 Insights
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{overallMetrics.rate >= 80 && (
							<InsightCard
								type="success"
								title="Excellent Progress! 🎉"
								message={`You're maintaining a ${overallMetrics.rate}% completion rate. Keep up the momentum!`}
								action="View Streaks"
							/>
						)}

						{overallMetrics.rate < 50 && (
							<InsightCard
								type="warning"
								title="Low Completion Rate"
								message={`Your completion rate is ${overallMetrics.rate}%. Consider adjusting your habits or schedule.`}
								action="Review Habits"
							/>
						)}

						{mostSkippedHabits(
							habits,
							new Map(
								timeRangeEntries.map((e) => [`${e.habitId}__${e.date}`, e]),
							),
						).length > 0 && (
							<InsightCard
								type="warning"
								title="High Skip Rate"
								message={`${mostSkippedHabits(habits, new Map(timeRangeEntries.map((e) => [`${e.habitId}__${e.date}`, e])))[0].habit.name} has been skipped frequently.`}
								action="Adjust Goal"
							/>
						)}

						<InsightCard
							type="info"
							title="Consistency Tip"
							message="Complete habits at the same time each day to build stronger patterns."
							action="Set Reminders"
						/>
					</div>
				</div>

				{/* Export Data */}
				<div className="glassmorphic-card p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md">
					<h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
						📥 Export Data
					</h3>
					<div className="flex gap-4">
						<button className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all">
							📊 Export as CSV
						</button>
						<button className="px-4 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 font-medium transition-all hover:bg-neutral-300 dark:hover:bg-neutral-600">
							📄 Download PDF Report
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
