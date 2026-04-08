import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import {
	bestPerformingHabits,
	completionByWeekday,
	moodCompletionCorrelation,
	mostSkippedHabits,
	playlistUsageAndCompletion,
	timeOfDaySuccessRate,
} from '../lib/analytics.js';
import { lastNDays } from '../lib/date.js';

/**
 * Premium Analytics Dashboard Components
 */

// Stat card component for top metrics
export function StatCard({
	label,
	value,
	suffix = '',
	trend = null,
	icon = null,
	color = 'primary',
}) {
	const colorClass = {
		primary:
			'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-400/30',
		success:
			'bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-400/30',
		warning:
			'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-400/30',
		danger: 'bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-400/30',
	}[color];

	return (
		<div
			className={`glassmorphism-card ${colorClass} p-6 rounded-2xl border backdrop-blur-md transition-all hover:shadow-lg`}
		>
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
						{label}
					</p>
					<div className="flex items-baseline gap-2">
						<span className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
							{value}
						</span>
						{suffix && (
							<span className="text-sm text-neutral-600 dark:text-neutral-400">
								{suffix}
							</span>
						)}
					</div>
					{trend && (
						<div
							className={`text-xs mt-2 ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
						>
							{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
						</div>
					)}
				</div>
				{icon && <div className="text-3xl">{icon}</div>}
			</div>
		</div>
	);
}

// Weekly performance chart
export function WeeklyPerformanceChart({ habits, entriesByKey }) {
	const data = completionByWeekday(habits, entriesByKey, lastNDays(7));

	const chartData = data.map((item) => ({
		name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][item.weekday],
		rate: Math.round(item.rate * 100),
		due: item.due,
		done: item.done,
	}));

	return (
		<div className="glassmorphism-card p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 backdrop-blur-md">
			<h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-50">
				Weekly Performance
			</h3>
			<ResponsiveContainer
				width="100%"
				height={300}
			>
				<BarChart data={chartData}>
					<CartesianGrid
						strokeDasharray="3 3"
						stroke="rgba(0,0,0,0.1)"
					/>
					<XAxis
						dataKey="name"
						stroke="currentColor"
					/>
					<YAxis stroke="currentColor" />
					<Tooltip
						contentStyle={{
							backgroundColor: 'rgba(0,0,0,0.8)',
							border: '1px solid rgba(255,255,255,0.1)',
							borderRadius: '8px',
						}}
					/>
					<Bar
						dataKey="rate"
						fill="#3b82f6"
						radius={[8, 8, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

// Best performing habits
export function BestHabitsCard({ habits, entriesByKey }) {
	const best = bestPerformingHabits(habits, entriesByKey, lastNDays(30)).slice(
		0,
		5,
	);

	return (
		<div className="glassmorphism-card p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 backdrop-blur-md">
			<h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-50">
				🏆 Best Habits
			</h3>
			<div className="space-y-3">
				{best.map(({ habit, rate, currentStreak: streak }) => (
					<div
						key={habit.id}
						className="flex items-center gap-3 p-3 bg-neutral-50/50 dark:bg-neutral-800/50 rounded-lg"
					>
						<div
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: habit.color }}
						/>
						<div className="flex-1 min-w-0">
							<p className="font-medium text-sm text-neutral-900 dark:text-neutral-50 truncate">
								{habit.name}
							</p>
							<p className="text-xs text-neutral-500 dark:text-neutral-400">
								{Math.round(rate * 100)}% • 🔥 {streak}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// Most skipped habits
export function MostSkippedCard({ habits, entriesByKey }) {
	const skipped = mostSkippedHabits(habits, entriesByKey, lastNDays(30)).slice(
		0,
		5,
	);

	return (
		<div className="glassmorphism-card p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 backdrop-blur-md">
			<h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-50">
				⚠️ Most Skipped
			</h3>
			<div className="space-y-3">
				{skipped.map(({ habit, skips }) => (
					<div
						key={habit.id}
						className="flex items-center gap-3 p-3 bg-red-50/50 dark:bg-red-900/20 rounded-lg"
					>
						<div
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: habit.color }}
						/>
						<div className="flex-1 min-w-0">
							<p className="font-medium text-sm text-neutral-900 dark:text-neutral-50 truncate">
								{habit.name}
							</p>
							<p className="text-xs text-red-600 dark:text-red-400">
								{skips} skipped
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// Time of day success rate
export function TimeOfDayChart({ entries }) {
	const data = timeOfDaySuccessRate(entries);

	const chartData = data.map((item) => ({
		name: item.key.charAt(0).toUpperCase() + item.key.slice(1),
		rate: Math.round(item.rate * 100),
	}));

	return (
		<div className="glassmorphism-card p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 backdrop-blur-md">
			<h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-50">
				⏰ Best Time to Complete
			</h3>
			<ResponsiveContainer
				width="100%"
				height={250}
			>
				<PieChart>
					<Pie
						data={chartData}
						cx="50%"
						cy="50%"
						innerRadius={60}
						outerRadius={90}
						fill="#8884d8"
						dataKey="rate"
						label={({ name, rate }) => `${name}: ${rate}%`}
					>
						{chartData.map((entry, index) => (
							<Cell
								key={`cell-${index}`}
								fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]}
							/>
						))}
					</Pie>
					<Tooltip formatter={(value) => `${value}%`} />
				</PieChart>
			</ResponsiveContainer>
		</div>
	);
}

// Mood correlation
export function MoodCorrelationCard({ reviews, entries }) {
	const correlations = moodCompletionCorrelation(reviews, entries);

	const moodEmojis = {
		happy: '😊',
		neutral: '😐',
		tired: '😴',
		stressed: '😰',
		energetic: '⚡',
	};

	return (
		<div className="glassmorphism-card p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 backdrop-blur-md">
			<h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-50">
				😊 Mood vs Completion
			</h3>
			<div className="space-y-3">
				{correlations.map((item) => (
					<div
						key={item.mood}
						className="flex items-center gap-3"
					>
						<span className="text-2xl">{moodEmojis[item.mood] || '😐'}</span>
						<div className="flex-1">
							<div className="flex justify-between items-center mb-1">
								<span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
									{item.mood}
								</span>
								<span className="text-xs text-neutral-500 dark:text-neutral-400">
									{Math.round(item.rate * 100)}%
								</span>
							</div>
							<div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
								<div
									className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
									style={{ width: `${Math.round(item.rate * 100)}%` }}
								/>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// Playlist usage analytics
export function PlaylistAnalyticsCard({ sessions }) {
	const data = playlistUsageAndCompletion(sessions).slice(0, 5);

	return (
		<div className="glassmorphism-card p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 backdrop-blur-md">
			<h3 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-50">
				🎵 Top Playlists
			</h3>
			<div className="space-y-3">
				{data.map((item) => (
					<div
						key={item.playlistId}
						className="flex items-center gap-3 p-3 bg-purple-50/50 dark:bg-purple-900/20 rounded-lg"
					>
						<span className="text-lg">🎵</span>
						<div className="flex-1 min-w-0">
							<p className="font-medium text-sm text-neutral-900 dark:text-neutral-50 truncate">
								{item.playlistId === 'Unlinked'
									? 'No Playlist'
									: item.playlistId}
							</p>
							<p className="text-xs text-neutral-500 dark:text-neutral-400">
								{item.sessions} sessions • {Math.round(item.successRate * 100)}%
								success
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// Insight cards with suggestions
export function InsightCard({ type = 'info', title, message, action = null }) {
	const bgClass = {
		success:
			'bg-green-50/50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
		warning:
			'bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700',
		info: 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
		error: 'bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
	}[type];

	const textClass = {
		success: 'text-green-900 dark:text-green-100',
		warning: 'text-amber-900 dark:text-amber-100',
		info: 'text-blue-900 dark:text-blue-100',
		error: 'text-red-900 dark:text-red-100',
	}[type];

	return (
		<div
			className={`glassmorphism-card ${bgClass} border rounded-xl p-4 transition-all hover:shadow-md`}
		>
			<h4 className={`font-semibold text-sm mb-1 ${textClass}`}>{title}</h4>
			<p className={`text-sm ${textClass} opacity-90 mb-3`}>{message}</p>
			{action && (
				<button
					className={`text-sm font-medium ${textClass} hover:opacity-70 transition-opacity`}
				>
					{action}
				</button>
			)}
		</div>
	);
}
