import { useEffect, useMemo, useState } from 'react';
import { startOfISOWeek, isoToday } from '../lib/date.js';
import { entryMeetsTarget, isDueOn } from '../lib/habits.js';
import { completionRateLastNDays, currentStreak } from '../lib/stats.js';
import { useApp } from '../state/AppState.jsx';
import { useToast } from '../state/ToastState.jsx';
import Modal from '../components/Modal.jsx';

export default function WeeklyReviewPage() {
	const { api, isReady, refresh, dataVersion } = useApp();
	const toast = useToast();
	const today = isoToday();
	const weekStart = startOfISOWeek(today);
	const [habits, setHabits] = useState([]);
	const [entriesByKey, setEntriesByKey] = useState(new Map());
	const [weeklyReviews, setWeeklyReviews] = useState([]);
	const [editingReview, setEditingReview] = useState(null);
	const [reviewForm, setReviewForm] = useState({ summary: '', suggestions: [] });
	const [newSuggestion, setNewSuggestion] = useState('');

	useEffect(() => {
		if (!api) return;
		let alive = true;
		Promise.all([
			api.listHabits(),
			api.listEntries(),
			api.listWeeklyReviews?.() ?? Promise.resolve([]),
		])
			.then(([h, e, reviews]) => {
				if (!alive) return;
				setHabits(h.filter((x) => !x.archivedAt));
				setEntriesByKey(new Map(e.map((x) => [`${x.habitId}__${x.date}`, x])));
				setWeeklyReviews(reviews ?? []);
			})
			.catch((err) => {
				console.error(err);
				toast.push('Failed to load weekly data. Please refresh.');
			});
		return () => { alive = false; };
	}, [api, dataVersion]);

	const weekDays = useMemo(() => {
		const days = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(weekStart + 'T12:00:00Z');
			date.setUTCDate(date.getUTCDate() + i);
			const iso = date.toISOString().slice(0, 10);
			let due = 0;
			let done = 0;
			for (const habit of habits) {
				if (!isDueOn(habit, iso)) continue;
				due += 1;
				const entry = entriesByKey.get(`${habit.id}__${iso}`);
				if (entryMeetsTarget(habit, entry)) done += 1;
			}
			days.push({
				iso,
				name: date.toLocaleDateString([], { weekday: 'short' }),
				due,
				done,
				rate: due === 0 ? 0 : Math.round((done / due) * 100),
			});
		}
		return days;
	}, [habits, entriesByKey, weekStart]);

	const weekStats = useMemo(() => {
		const totalDue = weekDays.reduce((sum, d) => sum + d.due, 0);
		const totalDone = weekDays.reduce((sum, d) => sum + d.done, 0);
		return {
			totalDue,
			totalDone,
			rate: totalDue === 0 ? 0 : Math.round((totalDone / totalDue) * 100),
		};
	}, [weekDays]);

	const habitPerformance = useMemo(() => {
		return habits.map((habit) => {
			const streak = currentStreak(habit, entriesByKey, today);
			const stats = completionRateLastNDays([habit], entriesByKey, 7);
			return {
				habit,
				streak,
				weekRate: Math.round(stats.rate * 100),
			};
		});
	}, [habits, entriesByKey, today]);

	const existingReview = weeklyReviews.find((r) => r.weekStart === weekStart);

	function handleAddSuggestion() {
		if (newSuggestion.trim()) {
			setReviewForm((prev) => ({
				...prev,
				suggestions: [...prev.suggestions, newSuggestion.trim()],
			}));
			setNewSuggestion('');
		}
	}

	function handleRemoveSuggestion(index) {
		setReviewForm((prev) => ({
			...prev,
			suggestions: prev.suggestions.filter((_, i) => i !== index),
		}));
	}

	async function handleSaveReview() {
		try {
			if (api?.upsertWeeklyReview) {
				await api.upsertWeeklyReview({
					weekStart,
					summary: reviewForm.summary,
					suggestions: reviewForm.suggestions,
					completionRate: weekStats.rate / 100,
				});
				toast.push('Weekly review saved.');
				refresh();
			} else {
				toast.push('Weekly reviews are not available with this data source.');
			}
			setEditingReview(null);
		} catch (err) {
			toast.push(err?.message ?? 'Could not save weekly review.');
		}
	}

	if (!isReady) {
		return (
			<div className="pageContent">
				<p style={{ color: 'var(--text-muted)' }}>Loading weekly review...</p>
			</div>
		);
	}

	return (
		<div className="pageContent">
			<div className="heroCard todayHeroCard">
				<div className="todayHeroContent">
					<div className="greeting">Weekly Review</div>
					<h2 className="todayHeroTitle">Week of {weekStart}</h2>
					<div className="todayHeroSubtle">
						Review your week: {weekStats.totalDone} habits completed out of {weekStats.totalDue} due ({weekStats.rate}%).
					</div>
				</div>
				<div className="todayHeroPills">
					<span className="badge brand">{weekStart}</span>
					<span className="badge success">{weekStats.rate}% completion</span>
				</div>
			</div>

			<div className="todayKpiStrip">
				<div className="card todayKpiCard">
					<div className="label">Due this week</div>
					<div className="value todayKpiValue">{weekStats.totalDue}</div>
				</div>
				<div className="card todayKpiCard">
					<div className="label">Completed</div>
					<div className="value todayKpiValue">{weekStats.totalDone}</div>
				</div>
				<div className="card todayKpiCard">
					<div className="label">Completion rate</div>
					<div className="value todayKpiValue">{weekStats.rate}%</div>
				</div>
				<div className="card todayKpiCard">
					<div className="label">Active habits</div>
					<div className="value todayKpiValue">{habits.length}</div>
				</div>
			</div>

			<div className="todayLayout">
				<section>
					<div className="premiumPanel">
						<div className="premiumPanelHeader">
							<div>
								<div className="panelEyebrow">Daily breakdown</div>
								<h3 className="premiumPanelTitle">This week's performance</h3>
							</div>
						</div>
						<div className="list">
							{weekDays.map((day) => (
								<div key={day.iso} className="item">
									<div className="row between" style={{ gap: 8 }}>
										<div className="itemName">{day.name} - {day.iso}</div>
										<span className={day.rate >= 80 ? 'badge success' : day.rate >= 50 ? 'badge warning' : 'badge'}>
											{day.rate}%
										</span>
									</div>
									<div className="subtle" style={{ marginTop: 6 }}>
										{day.done} of {day.due} habits completed
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="card todayReviewCard" style={{ marginTop: '1rem' }}>
						<div className="sectionHeader">
							<div>
								<h2>Weekly Review</h2>
								<div className="subtle">
									Reflect on your week and plan improvements.
								</div>
							</div>
							<button
								className="btn primary"
								type="button"
								onClick={() => {
									setReviewForm({
										summary: existingReview?.summary ?? '',
										suggestions: existingReview?.suggestions ?? [],
									});
									setEditingReview(true);
								}}
							>
								Write review
							</button>
						</div>
						{existingReview ? (
							<div style={{ marginTop: 16 }}>
								<div className="card">
									<h2>Summary</h2>
									<p className="subtle" style={{ marginTop: 8 }}>
										{existingReview.summary || 'No summary written.'}
									</p>
								</div>
								{existingReview.suggestions?.length > 0 && (
									<div className="card" style={{ marginTop: 12 }}>
										<h2>Suggestions</h2>
										<div className="list" style={{ marginTop: 8 }}>
											{existingReview.suggestions.map((s, i) => (
												<div key={i} className="item">
													<div className="itemName">{s}</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						) : (
							<p className="subtle" style={{ marginTop: 16 }}>
								No review written for this week yet.
							</p>
						)}
					</div>
				</section>

				<section>
					<div className="premiumPanel">
						<div className="premiumPanelHeader">
							<div>
								<div className="panelEyebrow">Habit performance</div>
								<h3 className="premiumPanelTitle">Individual tracking</h3>
							</div>
						</div>
						<div className="list">
							{habitPerformance.map(({ habit, streak, weekRate }) => (
								<div key={habit.id} className="item">
									<div className="row between" style={{ gap: 10 }}>
										<div className="stack" style={{ gap: 6, minWidth: 0 }}>
											<div className="row" style={{ gap: 10, minWidth: 0 }}>
												<div className="dot" style={{ background: habit.color, width: 10, height: 10 }} />
												<div className="itemName">{habit.name}</div>
											</div>
											{habit.category ? <span className="badge">{habit.category}</span> : null}
										</div>
										<div className="row" style={{ gap: 8 }}>
											<span className={weekRate >= 80 ? 'badge success' : weekRate >= 50 ? 'badge warning' : 'badge'}>
												{weekRate}% (7d)
											</span>
											<span className={streak >= 7 ? 'badge success' : streak >= 3 ? 'badge warning' : 'badge'}>
												{streak > 0 ? `🔥 ${streak}` : '—'}
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>
			</div>

			{editingReview && (
				<Modal title="Weekly Review" onClose={() => setEditingReview(null)}>
					<div className="stack">
						<div className="card">
							<h2>Week Summary</h2>
							<textarea
								className="textarea"
								value={reviewForm.summary}
								onChange={(e) => setReviewForm((prev) => ({ ...prev, summary: e.target.value }))}
								placeholder="How was your week? What patterns did you notice?"
								rows={4}
							/>
						</div>
						<div className="card">
							<h2>Suggestions for Next Week</h2>
							<div className="list" style={{ marginBottom: 12 }}>
								{reviewForm.suggestions.map((s, i) => (
									<div key={i} className="item">
										<div className="row between">
											<div className="itemName">{s}</div>
											<button
												className="btn ghost"
												type="button"
												onClick={() => handleRemoveSuggestion(i)}
											>
												×
											</button>
										</div>
									</div>
								))}
							</div>
							<div className="row" style={{ gap: 8 }}>
								<input
									className="input"
									value={newSuggestion}
									onChange={(e) => setNewSuggestion(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && handleAddSuggestion()}
									placeholder="Add a suggestion..."
								/>
								<button
									className="btn primary"
									type="button"
									onClick={handleAddSuggestion}
								>
									Add
								</button>
							</div>
						</div>
						<div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
							<button
								className="btn ghost"
								type="button"
								onClick={() => setEditingReview(null)}
							>
								Cancel
							</button>
							<button
								className="btn primary"
								type="button"
								onClick={handleSaveReview}
							>
								Save review
							</button>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
}
