import { useEffect, useMemo, useState } from 'react';
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import Modal from '../components/Modal.jsx';
import ProductivityHub from '../components/ProductivityHub.jsx';
import { isoToday } from '../lib/date.js';
import {
	entryMeetsTarget,
	EntryStatus,
	habitEntryStatus,
	habitGoalLabel,
	HabitType,
	isDueOn,
	scheduleLabel,
	targetLabel,
} from '../lib/habits.js';
import {
	computeTodaySummary,
	currentStreak,
	weeklyGoalProgress,
} from '../lib/stats.js';
import { useApp } from '../state/AppState.jsx';
import { useStudio } from '../state/StudioState.jsx';
import { useToast } from '../state/ToastState.jsx';

function HabitTaskRow({
	habit,
	entry,
	streak,
	weeklyGoal,
	onToggle,
	onSkip,
	onClear,
	onSaveQuantity,
	onSaveNote,
}) {
	const status = habitEntryStatus(habit, entry);
	const done = status === EntryStatus.done;
	const skipped = status === EntryStatus.skipped;
	const [qty, setQty] = useState(entry?.value ?? '');
	const [note, setNote] = useState(entry?.note ?? '');

	useEffect(() => {
		setQty(entry?.value ?? '');
		setNote(entry?.note ?? '');
	}, [entry?.value, entry?.note, entry?.status]);

	return (
		<div
			className={`taskRow ${done ? 'isDone' : ''}`}
			style={{ opacity: skipped ? 0.8 : 1 }}
		>
			<div
				className="taskCheckbox"
				onClick={() => {
					if (habit.type === HabitType.binary) onToggle();
				}}
				style={{
					cursor: habit.type === HabitType.binary ? 'pointer' : 'default',
				}}
			>
				<svg
					className="taskCheckboxSvg"
					viewBox="0 0 10 10"
					fill="none"
				>
					<path
						d="M2 5L4.5 7.5L8 2"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</div>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					flex: 1,
					minWidth: 0,
					gap: 8,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						flexWrap: 'wrap',
					}}
				>
					<span
						className="taskText"
						style={{ fontWeight: 600, fontSize: '14px' }}
					>
						{habit.name}
					</span>
					{streak >= 3 ? (
						<span className="badge warning">🔥 {streak}</span>
					) : null}
					{weeklyGoal.target > 0 ? (
						<span className={weeklyGoal.met ? 'badge success' : 'badge'}>
							{weeklyGoal.completions}/{weeklyGoal.target} week
						</span>
					) : null}
					{skipped ? <span className="badge danger">Skipped</span> : null}
				</div>

				<div
					className="row"
					style={{ gap: 8, flexWrap: 'wrap' }}
				>
					<span className="badge">{targetLabel(habit)}</span>
					<span className="badge">{scheduleLabel(habit)}</span>
					{habitGoalLabel(habit) ? (
						<span className="badge accent">{habitGoalLabel(habit)}</span>
					) : null}
					{habit.category ? (
						<span className="badge">{habit.category}</span>
					) : null}
				</div>

				{habit.type !== HabitType.binary ? (
					<div className="taskInputWrap">
						<input
							className="taskInput"
							type="number"
							min={0}
							step={1}
							value={qty}
							onChange={(e) => setQty(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									onSaveQuantity(qty === '' ? 0 : Number(qty), note);
								}
							}}
						/>
						<button
							className="btn btn-bordered"
							style={{ height: 28, fontSize: 12, padding: '0 8px' }}
							onClick={() => onSaveQuantity(qty === '' ? 0 : Number(qty), note)}
						>
							Save quantity
						</button>
					</div>
				) : null}

				<div
					className="row"
					style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
				>
					<input
						className="input"
						style={{ maxWidth: 320 }}
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="Entry note"
					/>
					<button
						className="btn ghost"
						type="button"
						onClick={() => onSaveNote(note)}
					>
						Save note
					</button>
					<button
						className={done ? 'btn ghost' : 'btn primary'}
						type="button"
						onClick={() => onToggle(note)}
					>
						{done ? 'Undo' : 'Mark done'}
					</button>
					<button
						className="btn ghost"
						type="button"
						onClick={() => onSkip(note)}
					>
						Skip today
					</button>
					{entry ? (
						<button
							className="btn danger"
							type="button"
							onClick={onClear}
						>
							Clear
						</button>
					) : null}
				</div>
			</div>
		</div>
	);
}

export default function TodayPage() {
	const { api, isReady, dataVersion, refresh } = useApp();
	const { focus, spotify } = useStudio();
	const toast = useToast();
	const today = isoToday();
	const canSaveDailyReview = typeof api?.upsertDailyReview === 'function';
	const [habits, setHabits] = useState([]);
	const [entriesByKey, setEntriesByKey] = useState(new Map());
	const [activeModal, setActiveModal] = useState(null);
	const [dailyReview, setDailyReview] = useState({
		mood: '',
		notes: '',
		wins: '',
		misses: '',
	});

	useEffect(() => {
		if (!api) return;
		let alive = true;
		Promise.all([
			api.listHabits(),
			api.listEntries(),
			api.listDailyReviews?.() ?? Promise.resolve([]),
		])
			.then(([h, e, reviews]) => {
				if (!alive) return;
				const activeHabits = h.filter((x) => !x.archivedAt);
				setHabits(activeHabits);
				setEntriesByKey(new Map(e.map((x) => [`${x.habitId}__${x.date}`, x])));
				const review = (reviews ?? []).find((item) => item.date === today);
				if (review) {
					setDailyReview({
						mood: review.mood ?? '',
						notes: review.notes ?? '',
						wins: review.wins ?? '',
						misses: review.misses ?? '',
					});
				}
			})
			.catch((err) => console.error(err));
		return () => {
			alive = false;
		};
	}, [api, dataVersion, today]);

	const due = useMemo(
		() => habits.filter((h) => isDueOn(h, today)),
		[habits, today],
	);
	const entriesByHabitToday = useMemo(() => {
		const map = new Map();
		for (const h of habits)
			map.set(h.id, entriesByKey.get(`${h.id}__${today}`) ?? null);
		return map;
	}, [habits, entriesByKey, today]);

	useEffect(() => {
		async function completeNextHabit() {
			const targetHabit = due.find((habit) => {
				const entry = entriesByHabitToday.get(habit.id);
				return !entryMeetsTarget(habit, entry);
			});
			if (!targetHabit) return;
			const entry = entriesByHabitToday.get(targetHabit.id);
			await api.setEntry({
				habitId: targetHabit.id,
				date: today,
				value:
					targetHabit.type === HabitType.binary
						? 1
						: Number(entry?.value ?? targetHabit.target ?? 0),
				note: entry?.note ?? '',
				status: EntryStatus.done,
			});
			refresh();
		}
		function handler() {
			completeNextHabit().catch((error) =>
				toast.push(error?.message ?? 'Could not complete habit.'),
			);
		}
		window.addEventListener('command:complete-next-habit', handler);
		return () =>
			window.removeEventListener('command:complete-next-habit', handler);
	}, [api, due, entriesByHabitToday, refresh, today, toast]);

	const summary = useMemo(
		() => computeTodaySummary(habits, entriesByHabitToday, today),
		[habits, entriesByHabitToday, today],
	);
	const skippedCount = useMemo(() => {
		return due.filter(
			(habit) =>
				habitEntryStatus(habit, entriesByHabitToday.get(habit.id)) ===
				EntryStatus.skipped,
		).length;
	}, [due, entriesByHabitToday]);

	const heatmapData = useMemo(() => {
		const cells = [];
		for (let i = 27; i >= 0; i--) {
			const d = new Date();
			d.setDate(d.getDate() - i);
			const iso = d.toISOString().split('T')[0];
			let count = 0;
			for (const h of habits)
				if (entryMeetsTarget(h, entriesByKey.get(`${h.id}__${iso}`))) count++;
			cells.push({ iso, count });
		}
		return cells;
	}, [habits, entriesByKey]);

	const weeklyTrendData = useMemo(() => {
		const data = [];
		for (let i = 6; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			const iso = date.toISOString().split('T')[0];
			let dueCount = 0;
			let doneCount = 0;
			let skipCount = 0;
			for (const habit of habits) {
				if (!isDueOn(habit, iso)) continue;
				dueCount += 1;
				const entry = entriesByKey.get(`${habit.id}__${iso}`) ?? null;
				if (entryMeetsTarget(habit, entry)) doneCount += 1;
				if (habitEntryStatus(habit, entry) === EntryStatus.skipped)
					skipCount += 1;
			}
			data.push({
				name: date.toLocaleDateString([], { weekday: 'short' }),
				done: doneCount,
				due: dueCount,
				skipped: skipCount,
				rate: dueCount === 0 ? 0 : Math.round((doneCount / dueCount) * 100),
			});
		}
		return data;
	}, [habits, entriesByKey]);

	const progressPercent =
		summary.dueCount === 0
			? 0
			: Math.round((summary.doneCount / summary.dueCount) * 100);
	const bestTodayStreak = due.reduce(
		(best, habit) => Math.max(best, currentStreak(habit, entriesByKey, today)),
		0,
	);
	const greeting = (() => {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good morning';
		if (hour < 18) return 'Good afternoon';
		return 'Good evening';
	})();

	useEffect(() => {
		if (!due.length || focus.selectedHabitId) return;
		focus.setSelectedHabitId(due[0].id);
		focus.setSelectedHabitName(due[0].name);
	}, [due, focus]);
	const completedHabits = due.filter((habit) =>
		entryMeetsTarget(habit, entriesByHabitToday.get(habit.id)),
	);
	const skippedHabits = due.filter(
		(habit) =>
			habitEntryStatus(habit, entriesByHabitToday.get(habit.id)) ===
			EntryStatus.skipped,
	);

	const modalTitle =
		activeModal === 'due'
			? 'Due today'
			: activeModal === 'completed'
				? 'Completed today'
				: activeModal === 'skipped'
					? 'Skipped today'
					: activeModal === 'rate'
						? 'Completion summary'
						: activeModal === 'queue'
							? 'Execution queue details'
							: activeModal === 'graphs'
								? '7-day trend details'
								: '';

	if (!isReady) {
		return (
			<div className="pageContent">
				<p style={{ color: 'var(--text-muted)' }}>Loading runtime...</p>
			</div>
		);
	}

	return (
		<div className="pageContent">
			<div className="heroCard todayHeroCard">
				<div className="todayHeroContent">
					<div className="greeting">{greeting}</div>
					<h2 className="todayHeroTitle">Daily operating system</h2>
					<div className="todayHeroSubtle">
						{spotify.spotifyState?.item?.name
							? `Now playing: ${spotify.spotifyState.item.name}`
							: 'Use today as the central execution, focus, and reflection view.'}
					</div>
				</div>
				<div className="todayHeroPills">
					<span className="badge brand">{today}</span>
					<span className="badge success">{progressPercent}% complete</span>
					<span className="badge warning">{bestTodayStreak} streak</span>
				</div>
			</div>

			<div className="todayKpiStrip">
				<div
					className="card interactiveSurface todayKpiCard"
					onClick={() => setActiveModal('due')}
				>
					<div className="label">Due today</div>
					<div className="value todayKpiValue">{summary.dueCount}</div>
				</div>
				<div
					className="card interactiveSurface todayKpiCard"
					onClick={() => setActiveModal('completed')}
				>
					<div className="label">Completed</div>
					<div className="value todayKpiValue">{summary.doneCount}</div>
				</div>
				<div
					className="card interactiveSurface todayKpiCard"
					onClick={() => setActiveModal('skipped')}
				>
					<div className="label">Skipped</div>
					<div className="value todayKpiValue">{skippedCount}</div>
				</div>
				<div
					className="card interactiveSurface todayKpiCard"
					onClick={() => setActiveModal('rate')}
				>
					<div className="label">Completion rate</div>
					<div className="value todayKpiValue">{progressPercent}%</div>
				</div>
			</div>

			<div className="todayLayout">
				<section>
					<div
						className="premiumPanel taskPanel interactiveSurface"
						onClick={() => setActiveModal('queue')}
					>
						<div className="premiumPanelHeader taskPanelHeader">
							<div>
								<div className="panelEyebrow">Habits</div>
								<h3 className="premiumPanelTitle">Execution queue</h3>
							</div>
							<span className="badge brand">
								{summary.doneCount} / {summary.dueCount}
							</span>
						</div>
						<div className="sectionProgress">
							<div
								className="sectionProgressFill"
								style={{ width: `${progressPercent}%` }}
							/>
						</div>

						<div
							className="taskPanelBody"
							onClick={(event) => event.stopPropagation()}
						>
							{due.length === 0 ? (
								<div className="emptyPanelState">
									System idle. Nothing scheduled for today.
								</div>
							) : (
								<div className="taskList">
									{due.map((h) => {
										const entry = entriesByKey.get(`${h.id}__${today}`) ?? null;
										return (
											<HabitTaskRow
												key={h.id}
												habit={h}
												entry={entry}
												streak={currentStreak(h, entriesByKey, today)}
												weeklyGoal={weeklyGoalProgress(h, entriesByKey)}
												onToggle={async (note = entry?.note ?? '') => {
													if (entryMeetsTarget(h, entry)) {
														await api.deleteEntry(h.id, today);
													} else {
														await api.setEntry({
															habitId: h.id,
															date: today,
															value:
																h.type === HabitType.binary
																	? 1
																	: Number(entry?.value ?? h.target ?? 0),
															note,
															status: EntryStatus.done,
														});
													}
													refresh();
												}}
												onSkip={async (note = entry?.note ?? '') => {
													await api.setEntry({
														habitId: h.id,
														date: today,
														value: 0,
														note,
														status: EntryStatus.skipped,
													});
													refresh();
												}}
												onClear={async () => {
													await api.deleteEntry(h.id, today);
													refresh();
												}}
												onSaveQuantity={async (value, note) => {
													if (!Number.isFinite(value) || value < 0) {
														return toast.push('Please enter a valid number.');
													}
													await api.setEntry({
														habitId: h.id,
														date: today,
														value,
														note,
														status:
															value >= Number(h.target ?? 1)
																? EntryStatus.done
																: EntryStatus.pending,
													});
													refresh();
												}}
												onSaveNote={async (note) => {
													await api.setEntry({
														habitId: h.id,
														date: today,
														value: Number(entry?.value ?? 0),
														note,
														status: entry?.status ?? EntryStatus.pending,
													});
													toast.push('Note saved.');
													refresh();
												}}
											/>
										);
									})}
								</div>
							)}
						</div>
					</div>

					<div className="todaySectionBlock">
						<ProductivityHub />
					</div>

					<div className="card todayReviewCard">
						<div className="sectionHeader">
							<div>
								<h2>Daily review</h2>
								<div className="subtle">
									Capture reflection, mood, and what to improve before the day
									closes.
								</div>
							</div>
							<button
								className="btn primary"
								type="button"
								disabled={!canSaveDailyReview}
								title={
									canSaveDailyReview
										? undefined
										: 'Daily reviews are not available with this data source.'
								}
								onClick={async () => {
									if (!canSaveDailyReview) return;
									await api.upsertDailyReview({
										date: today,
										...dailyReview,
									});
									toast.push('Daily review saved.');
									refresh();
								}}
							>
								Save review
							</button>
						</div>
						<div
							className="grid two"
							style={{ marginTop: 16 }}
						>
							<div className="card">
								<h2>Mood</h2>
								<div
									className="row"
									style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}
								>
									{['happy', 'neutral', 'tired', 'focused', 'stressed'].map(
										(mood) => (
											<button
												key={mood}
												className={
													dailyReview.mood === mood
														? 'btn primary'
														: 'btn ghost'
												}
												type="button"
												onClick={() =>
													setDailyReview((current) => ({ ...current, mood }))
												}
											>
												{mood}
											</button>
										),
									)}
								</div>
								<textarea
									className="textarea"
									style={{ marginTop: 12 }}
									value={dailyReview.notes}
									onChange={(event) =>
										setDailyReview((current) => ({
											...current,
											notes: event.target.value,
										}))
									}
									placeholder="Quick journal entry"
								/>
							</div>
							<div className="card">
								<h2>Reflection</h2>
								<textarea
									className="textarea"
									value={dailyReview.wins}
									onChange={(event) =>
										setDailyReview((current) => ({
											...current,
											wins: event.target.value,
										}))
									}
									placeholder="What went well?"
								/>
								<textarea
									className="textarea"
									style={{ marginTop: 12 }}
									value={dailyReview.misses}
									onChange={(event) =>
										setDailyReview((current) => ({
											...current,
											misses: event.target.value,
										}))
									}
									placeholder="What failed or created friction?"
								/>
							</div>
						</div>
					</div>
				</section>

				<section>
					<div
						className="premiumPanel interactiveSurface"
						onClick={() => setActiveModal('graphs')}
					>
						<div className="premiumPanelHeader">
							<div>
								<div className="panelEyebrow">Trend graphs</div>
								<h3 className="premiumPanelTitle">Consistency in motion</h3>
							</div>
							<span className="badge brand">Last 7 days</span>
						</div>
						<p className="subtle">
							Daily completions, skip volume, and workload trends.
						</p>

						<div className="chartStack">
							<div className="chartPanel">
								<div className="chartPanelTitle">Completion rate</div>
								<div className="chartFrame">
									<ResponsiveContainer
										width="100%"
										height="100%"
									>
										<AreaChart data={weeklyTrendData}>
											<defs>
												<linearGradient
													id="completionFill"
													x1="0"
													y1="0"
													x2="0"
													y2="1"
												>
													<stop
														offset="0%"
														stopColor="#39aba0"
														stopOpacity={0.45}
													/>
													<stop
														offset="100%"
														stopColor="#39aba0"
														stopOpacity={0.05}
													/>
												</linearGradient>
											</defs>
											<CartesianGrid
												stroke="rgba(255,255,255,0.08)"
												vertical={false}
											/>
											<XAxis
												dataKey="name"
												tickLine={false}
												axisLine={false}
											/>
											<YAxis
												tickLine={false}
												axisLine={false}
												width={28}
											/>
											<Tooltip
												contentStyle={{
													background: 'var(--bg-panel-solid)',
													border: '1px solid var(--border-muted)',
													borderRadius: 16,
												}}
											/>
											<Area
												type="monotone"
												dataKey="rate"
												stroke="#1f8a83"
												strokeWidth={3}
												fill="url(#completionFill)"
											/>
										</AreaChart>
									</ResponsiveContainer>
								</div>
							</div>

							<div className="chartPanel">
								<div className="chartPanelTitle">Done vs due vs skipped</div>
								<div className="chartFrame">
									<ResponsiveContainer
										width="100%"
										height="100%"
									>
										<BarChart
											data={weeklyTrendData}
											barGap={8}
										>
											<CartesianGrid
												stroke="rgba(255,255,255,0.08)"
												vertical={false}
											/>
											<XAxis
												dataKey="name"
												tickLine={false}
												axisLine={false}
											/>
											<YAxis
												tickLine={false}
												axisLine={false}
												width={28}
											/>
											<Tooltip
												contentStyle={{
													background: 'var(--bg-panel-solid)',
													border: '1px solid var(--border-muted)',
													borderRadius: 16,
												}}
											/>
											<Bar
												dataKey="due"
												fill="rgba(57, 171, 160, 0.25)"
												radius={[10, 10, 0, 0]}
											/>
											<Bar
												dataKey="done"
												fill="#1f8a83"
												radius={[10, 10, 0, 0]}
											/>
											<Bar
												dataKey="skipped"
												fill="#f38954"
												radius={[10, 10, 0, 0]}
											/>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</div>
						</div>

						<div className="heatmapLegend">
							<span>28-day spark</span>
							<div className="heatmapLegendScale">
								{heatmapData.slice(-8).map((cell) => {
									const level =
										cell.count === 0
											? ''
											: cell.count >= 3
												? 'level-4'
												: cell.count >= 2
													? 'level-2'
													: 'level-1';
									return (
										<div
											key={cell.iso}
											className={`heatCell ${level}`}
											style={{ width: '12px', height: '12px' }}
										/>
									);
								})}
							</div>
							<span>recent activity</span>
						</div>
					</div>
				</section>
			</div>

			{activeModal ? (
				<Modal
					title={modalTitle}
					onClose={() => setActiveModal(null)}
				>
					{activeModal === 'due' ? (
						<div className="list">
							{due.length === 0 ? (
								<div className="subtle">No habits are due today.</div>
							) : (
								due.map((habit) => (
									<div
										key={habit.id}
										className="item"
									>
										<div className="itemName">{habit.name}</div>
										<div
											className="subtle"
											style={{ marginTop: 6 }}
										>
											{scheduleLabel(habit)}
										</div>
									</div>
								))
							)}
						</div>
					) : null}
					{activeModal === 'completed' ? (
						<div className="list">
							{completedHabits.length === 0 ? (
								<div className="subtle">Nothing completed yet today.</div>
							) : (
								completedHabits.map((habit) => (
									<div
										key={habit.id}
										className="item"
									>
										<div className="itemName">{habit.name}</div>
										<div
											className="subtle"
											style={{ marginTop: 6 }}
										>
											Completed against {targetLabel(habit)}
										</div>
									</div>
								))
							)}
						</div>
					) : null}
					{activeModal === 'skipped' ? (
						<div className="list">
							{skippedHabits.length === 0 ? (
								<div className="subtle">No habits skipped today.</div>
							) : (
								skippedHabits.map((habit) => (
									<div
										key={habit.id}
										className="item"
									>
										<div className="itemName">{habit.name}</div>
										<div
											className="subtle"
											style={{ marginTop: 6 }}
										>
											{habit.skipRule === 'protect'
												? 'Skip protects streak'
												: 'Skip breaks streak'}
										</div>
									</div>
								))
							)}
						</div>
					) : null}
					{activeModal === 'rate' ? (
						<div className="stack">
							<div className="card">
								<div className="label">Completion rate</div>
								<div
									className="value"
									style={{ fontSize: '2rem', marginTop: 6 }}
								>
									{progressPercent}%
								</div>
							</div>
							<div className="subtle">
								Based on {summary.doneCount} completed habits out of{' '}
								{summary.dueCount} due today.
							</div>
						</div>
					) : null}
					{activeModal === 'queue' ? (
						<div className="list">
							{due.map((habit) => {
								const entry = entriesByHabitToday.get(habit.id);
								return (
									<div
										key={habit.id}
										className="item"
									>
										<div
											className="row between"
											style={{ gap: 8 }}
										>
											<div className="itemName">{habit.name}</div>
											<span className="badge">
												{habitEntryStatus(habit, entry)}
											</span>
										</div>
										<div
											className="subtle"
											style={{ marginTop: 6 }}
										>
											{targetLabel(habit)} · {scheduleLabel(habit)}
										</div>
									</div>
								);
							})}
						</div>
					) : null}
					{activeModal === 'graphs' ? (
						<div className="list">
							{weeklyTrendData.map((day) => (
								<div
									key={day.name}
									className="item"
								>
									<div
										className="row between"
										style={{ gap: 8 }}
									>
										<div className="itemName">{day.name}</div>
										<span className="badge">{day.rate}%</span>
									</div>
									<div
										className="subtle"
										style={{ marginTop: 6 }}
									>
										Done {day.done} of {day.due}, skipped {day.skipped}
									</div>
								</div>
							))}
						</div>
					) : null}
				</Modal>
			) : null}
		</div>
	);
}
