import { useEffect, useMemo, useState } from 'react';
import { StatCard } from '../components/AnalyticsDashboard.jsx';
import {
	FocusModeModal,
	SessionSummaryCard,
} from '../components/FocusMode.jsx';
import { DailyReviewModal } from '../components/ReviewModals.jsx';
import {
	MoodSelector,
	PlaylistLinkModal,
	QuickNotesPanel,
	SpotifyCurrentTrack,
	SpotifyMiniPlayer,
} from '../components/SpotifyIntegration.jsx';
import { isoToday } from '../lib/date.js';
import {
	EntryStatus,
	habitEntryStatus,
	isDueOn,
	scheduleLabel,
	targetLabel,
} from '../lib/habits.js';
import { computeTodaySummary, currentStreak } from '../lib/stats.js';
import { useApp } from '../state/AppState.jsx';
import { useStudio } from '../state/StudioState.jsx';
import { useToast } from '../state/ToastState.jsx';

/**
 * Premium Today Page with Dashboard Features
 * - Top stats section
 * - Today's habits with enhanced UI
 * - Right sidebar with Spotify + Mood + Notes
 * - Review system
 * - Focus mode
 */

export default function EnhancedTodayPage() {
	const { api, isReady, dataVersion, refresh, habits, entries, entriesByKey } =
		useApp();
	const { focus, spotify } = useStudio();
	const toast = useToast();
	const today = isoToday();

	// State
	const [todayHabits, setTodayHabits] = useState([]);
	const [isDarkMode, setIsDarkMode] = useState(true);
	const [showFocusMode, setShowFocusMode] = useState(false);
	const [focusHabit, setFocusHabit] = useState(null);
	const [showDailyReview, setShowDailyReview] = useState(false);
	const [currentMood, setCurrentMood] = useState('');
	const [quickNotes, setQuickNotes] = useState('');
	const [showPlaylistLink, setShowPlaylistLink] = useState(false);
	const [lastSession, setLastSession] = useState(null);

	// Compute today's habits and stats
	useEffect(() => {
		if (!isReady) return;

		const dueTodayHabits = habits.filter(
			(h) => isDueOn(h, today) && !h.archivedAt,
		);
		setTodayHabits(dueTodayHabits);
	}, [habits, isReady, today]);

	// Compute summary stats
	const todaySummary = useMemo(() => {
		return computeTodaySummary(todayHabits, entriesByKey, today);
	}, [todayHabits, entriesByKey, today]);

	// Compute streaks
	const streaks = useMemo(() => {
		return todayHabits.map((h) => ({
			habitId: h.id,
			streak: currentStreak(h, entriesByKey),
		}));
	}, [todayHabits, entriesByKey]);

	const totalStreak = useMemo(() => {
		return Math.min(...streaks.map((s) => s.streak || 0));
	}, [streaks]);

	// Handlers
	const handleToggleHabit = async (habit, note = '') => {
		try {
			const entry = entriesByKey.get(`${habit.id}__${today}`);
			const newStatus =
				habitEntryStatus(habit, entry) === EntryStatus.done
					? EntryStatus.pending
					: EntryStatus.done;

			await api.upsertEntry({
				habitId: habit.id,
				date: today,
				value: entry?.value ?? 0,
				note: note || entry?.note || '',
				status: newStatus,
			});

			await refresh();
			toast.success(
				`${habit.name} ${newStatus === EntryStatus.done ? 'completed!' : 'unchecked'}`,
			);
		} catch (error) {
			toast.error('Failed to update habit');
		}
	};

	const handleStartFocus = (habit) => {
		setFocusHabit(habit);
		setShowFocusMode(true);
	};

	const handleCompleteFocus = async (sessionData) => {
		try {
			// Save habit entry
			await handleToggleHabit(focusHabit);

			// Save session data (if API supports it)
			if (api.createHabitSession) {
				await api.createHabitSession({
					habitId: focusHabit.id,
					startTime: new Date(),
					endTime: sessionData.endTime,
					playlistId: sessionData.playlistId,
					success: sessionData.success,
					durationSeconds: sessionData.duration,
				});
			}

			setLastSession(sessionData);
			setShowFocusMode(false);
			toast.success('🎉 Focus session completed!');
			await refresh();
		} catch (error) {
			toast.error('Failed to save session');
		}
	};

	const handleSaveDailyReview = async (review) => {
		try {
			if (api.upsertDailyReview) {
				await api.upsertDailyReview(review);
				toast.success('Daily review saved!');
				await refresh();
			}
		} catch (error) {
			toast.error('Failed to save review');
		}
	};

	const handleMoodSelect = (mood) => {
		setCurrentMood(mood);
	};

	const handleSaveNotes = async () => {
		try {
			if (api.upsertDailyReview) {
				await api.upsertDailyReview({
					date: today,
					notes: quickNotes,
				});
				toast.success('Notes saved!');
			}
		} catch (error) {
			toast.error('Failed to save notes');
		}
	};

	if (!isReady) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p className="text-neutral-600 dark:text-neutral-400">
						Loading your day...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
			{/* Main Content Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto">
				{/* Main Content (Left 2 columns) */}
				<div className="lg:col-span-2 space-y-6">
					{/* Header with Greeting */}
					<div className="space-y-2">
						<p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
							{new Date().toLocaleDateString('en-US', {
								weekday: 'long',
								month: 'short',
								day: 'numeric',
							})}
						</p>
						<h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50">
							👋 Good{' '}
							{new Date().getHours() < 12
								? 'Morning'
								: new Date().getHours() < 18
									? 'Afternoon'
									: 'Evening'}
						</h1>
					</div>

					{/* Top Stats */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<StatCard
							label="Completion"
							value={todaySummary.rate}
							suffix="%"
							icon="✓"
							color="success"
						/>
						<StatCard
							label="Current Streak"
							value={totalStreak}
							suffix="days"
							icon="🔥"
							color="warning"
						/>
						<StatCard
							label="Today's Tasks"
							value={todayHabits.length}
							suffix="habits"
							icon="📋"
							color="primary"
						/>
					</div>

					{/* Today's Habits */}
					<div className="glassmorphic-card p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md">
						<h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-4">
							📋 Today's Habits
						</h2>

						{todayHabits.length === 0 ? (
							<div className="text-center py-8">
								<p className="text-neutral-500 dark:text-neutral-400">
									No habits scheduled for today
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{todayHabits.map((habit) => {
									const entry = entriesByKey.get(`${habit.id}__${today}`);
									const status = habitEntryStatus(habit, entry);
									const isDone = status === EntryStatus.done;
									const isSkipped = status === EntryStatus.skipped;
									const streak =
										streaks.find((s) => s.habitId === habit.id)?.streak || 0;

									return (
										<div
											key={habit.id}
											className={`p-4 rounded-xl border-2 transition-all ${
												isDone
													? 'border-green-300/50 dark:border-green-600/50 bg-green-50/30 dark:bg-green-900/20'
													: 'border-neutral-200/50 dark:border-neutral-700/50 hover:border-neutral-300/50 dark:hover:border-neutral-600/50'
											}`}
										>
											<div className="flex items-start gap-4">
												{/* Checkbox */}
												<button
													onClick={() => handleToggleHabit(habit)}
													className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center mt-1 ${
														isDone
															? 'border-green-500 bg-green-500'
															: 'border-neutral-300 dark:border-neutral-600 hover:border-blue-500'
													}`}
												>
													{isDone && (
														<span className="text-white text-sm">✓</span>
													)}
												</button>

												{/* Content */}
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2 mb-2">
														<span
															className="inline-block w-3 h-3 rounded-full flex-shrink-0"
															style={{ backgroundColor: habit.color }}
														/>
														<h3
															className={`font-semibold ${isDone ? 'line-through opacity-60' : ''}`}
														>
															{habit.name}
														</h3>
														{streak >= 3 && (
															<span className="text-sm font-bold">
																🔥 {streak}
															</span>
														)}
														{isSkipped && (
															<span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded">
																Skipped
															</span>
														)}
													</div>

													<div className="text-xs text-neutral-600 dark:text-neutral-400 mb-3 space-y-1">
														<div>
															{targetLabel(habit)} • {scheduleLabel(habit)}
														</div>
														{habit.category && <div>📂 {habit.category}</div>}
													</div>
												</div>

												{/* Actions */}
												<div className="flex-shrink-0 flex gap-2">
													<button
														onClick={() => handleStartFocus(habit)}
														className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 text-xs rounded-lg transition-all font-medium"
														title="Start focus session"
													>
														⏱ Focus
													</button>
													<button
														onClick={() => handleToggleHabit(habit)}
														className={`px-3 py-1 text-xs rounded-lg transition-all font-medium ${
															isDone
																? 'bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30'
																: 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'
														}`}
													>
														{isDone ? '✓ Done' : 'Mark Done'}
													</button>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* End of Day Actions */}
					<div className="flex gap-3">
						<button
							onClick={() => setShowDailyReview(true)}
							className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold transition-all hover:shadow-lg"
						>
							📝 End-of-Day Review
						</button>
						<button
							onClick={() => setShowFocusMode(false)}
							className="flex-1 px-4 py-3 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 font-semibold transition-all hover:bg-neutral-300 dark:hover:bg-neutral-600"
						>
							📊 View Analytics
						</button>
					</div>
				</div>

				{/* Right Sidebar */}
				<div className="lg:col-span-1 space-y-4">
					{/* Spotify Current Track */}
					<SpotifyCurrentTrack
						currentTrack={spotify?.currentTrack}
						isPlaying={spotify?.isPlaying}
					/>

					{/* Spotify Mini Player */}
					<SpotifyMiniPlayer
						currentTrack={spotify?.currentTrack}
						isPlaying={spotify?.isPlaying}
					/>

					{/* Mood Selector */}
					<MoodSelector
						currentMood={currentMood}
						onMoodSelect={handleMoodSelect}
					/>

					{/* Quick Notes */}
					<QuickNotesPanel
						notes={quickNotes}
						onNotesChange={setQuickNotes}
						onSave={handleSaveNotes}
					/>

					{/* Last Session */}
					{lastSession && (
						<SessionSummaryCard
							session={lastSession}
							habit={focusHabit}
						/>
					)}
				</div>
			</div>

			{/* Modals */}
			<FocusModeModal
				isOpen={showFocusMode}
				habit={focusHabit}
				onClose={() => setShowFocusMode(false)}
				onComplete={handleCompleteFocus}
				onSkip={() => setShowFocusMode(false)}
				linkedSpotifyPlaylist={focusHabit?.linkedPlaylistId}
			/>

			<DailyReviewModal
				isOpen={showDailyReview}
				onClose={() => setShowDailyReview(false)}
				onSave={handleSaveDailyReview}
				stats={todaySummary}
			/>

			<PlaylistLinkModal
				isOpen={showPlaylistLink}
				onClose={() => setShowPlaylistLink(false)}
				habit={focusHabit}
				currentPlaylist={focusHabit?.linkedPlaylistId}
				onSelect={(playlistId) => {
					// Save playlist linking
					if (api.upsertHabit) {
						api.upsertHabit({
							...focusHabit,
							linkedPlaylistId: playlistId,
						});
					}
				}}
			/>
		</div>
	);
}
