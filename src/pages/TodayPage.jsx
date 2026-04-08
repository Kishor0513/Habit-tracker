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
import ProductivityHub from '../components/ProductivityHub.jsx';
import { isoToday } from '../lib/date.js';
import {
	entryMeetsTarget,
	EntryStatus,
	habitGoalLabel,
	habitEntryStatus,
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
import { useToast } from '../state/ToastState.jsx';

function HabitTaskRow({ habit, entry, streak, weeklyGoal, onToggle, onSkip, onClear, onSaveQuantity, onSaveNote }) {
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
		<div className={`taskRow ${done ? 'isDone' : ''}`} style={{ opacity: skipped ? 0.8 : 1 }}>
			<div
				className="taskCheckbox"
				onClick={() => {
					if (habit.type === HabitType.binary) onToggle();
				}}
				style={{ cursor: habit.type === HabitType.binary ? 'pointer' : 'default' }}
			>
				<svg className="taskCheckboxSvg" viewBox="0 0 10 10" fill="none">
					<path d="M2 5L4.5 7.5L8 2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: 8 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
					<span className="taskText" style={{ fontWeight: 600, fontSize: '14px' }}>{habit.name}</span>
					{streak >= 3 ? <span className="badge warning">🔥 {streak}</span> : null}
					{weeklyGoal.target > 0 ? (
						<span className={weeklyGoal.met ? 'badge success' : 'badge'}>
							{weeklyGoal.completions}/{weeklyGoal.target} week
						</span>
					) : null}
					{skipped ? <span className="badge danger">Skipped</span> : null}
				</div>

				<div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
					<span className="badge">{targetLabel(habit)}</span>
					<span className="badge">{scheduleLabel(habit)}</span>
					{habitGoalLabel(habit) ? <span className="badge accent">{habitGoalLabel(habit)}</span> : null}
					{habit.category ? <span className="badge">{habit.category}</span> : null}
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

				<div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
					<input
						className="input"
						style={{ maxWidth: 320 }}
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="Entry note"
					/>
					<button className="btn ghost" type="button" onClick={() => onSaveNote(note)}>
						Save note
					</button>
					<button className={done ? 'btn ghost' : 'btn primary'} type="button" onClick={() => onToggle(note)}>
						{done ? 'Undo' : 'Mark done'}
					</button>
					<button className="btn ghost" type="button" onClick={() => onSkip(note)}>
						Skip today
					</button>
					{entry ? (
						<button className="btn danger" type="button" onClick={onClear}>
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
	const toast = useToast();
	const today = isoToday();
	const [habits, setHabits] = useState([]);
	const [entriesByKey, setEntriesByKey] = useState(new Map());
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

	useEffect(() => {
		const handleResize = () => setIsMobile(window.innerWidth < 768);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	useEffect(() => {
		if (!api) return;
		let alive = true;
		Promise.all([api.listHabits(), api.listEntries()])
			.then(([h, e]) => {
				if (!alive) return;
				const activeHabits = h.filter((x) => !x.archivedAt);
				setHabits(activeHabits);
				setEntriesByKey(new Map(e.map((x) => [`${x.habitId}__${x.date}`, x])));
			})
			.catch((err) => console.error(err));
		return () => {
			alive = false;
		};
	}, [api, dataVersion]);

	const due = useMemo(() => habits.filter((h) => isDueOn(h, today)), [habits, today]);
	const entriesByHabitToday = useMemo(() => {
		const map = new Map();
		for (const h of habits) map.set(h.id, entriesByKey.get(`${h.id}__${today}`) ?? null);
		return map;
	}, [habits, entriesByKey, today]);

	const summary = useMemo(() => computeTodaySummary(habits, entriesByHabitToday, today), [habits, entriesByHabitToday, today]);
	const skippedCount = useMemo(() => {
		return due.filter((habit) => habitEntryStatus(habit, entriesByHabitToday.get(habit.id)) === EntryStatus.skipped).length;
	}, [due, entriesByHabitToday]);

	const heatmapData = useMemo(() => {
		const cells = [];
		for (let i = 27; i >= 0; i--) {
			const d = new Date();
			d.setDate(d.getDate() - i);
			const iso = d.toISOString().split('T')[0];
			let count = 0;
			for (const h of habits) if (entryMeetsTarget(h, entriesByKey.get(`${h.id}__${iso}`))) count++;
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
				if (habitEntryStatus(habit, entry) === EntryStatus.skipped) skipCount += 1;
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

	const progressPercent = summary.dueCount === 0 ? 0 : Math.round((summary.doneCount / summary.dueCount) * 100);

	if (!isReady) {
		return (
			<div className="pageContent">
				<p style={{ color: 'var(--text-muted)' }}>Loading runtime...</p>
			</div>
		);
	}

	return (
		<div className="pageContent">
			<div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
				<div className="card" style={{ minWidth: 160, flex: 1 }}>
					<div className="label">Due today</div>
					<div className="value" style={{ fontSize: '1.6rem', marginTop: 6 }}>{summary.dueCount}</div>
				</div>
				<div className="card" style={{ minWidth: 160, flex: 1 }}>
					<div className="label">Completed</div>
					<div className="value" style={{ fontSize: '1.6rem', marginTop: 6 }}>{summary.doneCount}</div>
				</div>
				<div className="card" style={{ minWidth: 160, flex: 1 }}>
					<div className="label">Skipped</div>
					<div className="value" style={{ fontSize: '1.6rem', marginTop: 6 }}>{skippedCount}</div>
				</div>
				<div className="card" style={{ minWidth: 160, flex: 1 }}>
					<div className="label">Completion rate</div>
					<div className="value" style={{ fontSize: '1.6rem', marginTop: 6 }}>{progressPercent}%</div>
				</div>
			</div>

			<div className="todayLayout" style={{ gridTemplateColumns: isMobile ? '1fr' : '1.2fr .8fr' }}>
				<section>
					<div className="premiumPanel taskPanel">
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
							<div className="sectionProgressFill" style={{ width: `${progressPercent}%` }} />
						</div>

						<div className="taskPanelBody">
							{due.length === 0 ? (
								<div className="emptyPanelState">System idle. Nothing scheduled for today.</div>
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
															value: h.type === HabitType.binary ? 1 : Number(entry?.value ?? h.target ?? 0),
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
														status: value >= Number(h.target ?? 1) ? EntryStatus.done : EntryStatus.pending,
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

					<div style={{ marginTop: '24px' }}>
						<ProductivityHub />
					</div>
				</section>

				<section>
					<div className="premiumPanel">
						<div className="premiumPanelHeader">
							<div>
								<div className="panelEyebrow">React graphs</div>
								<h3 className="premiumPanelTitle">Consistency in motion</h3>
							</div>
							<span className="badge brand">Last 7 days</span>
						</div>
						<p className="subtle">Daily completions, skip volume, and workload trends.</p>

						<div className="chartStack">
							<div className="chartPanel">
								<div className="chartPanelTitle">Completion rate</div>
								<div className="chartFrame">
									<ResponsiveContainer width="100%" height="100%">
										<AreaChart data={weeklyTrendData}>
											<defs>
												<linearGradient id="completionFill" x1="0" y1="0" x2="0" y2="1">
													<stop offset="0%" stopColor="#ec4899" stopOpacity={0.45} />
													<stop offset="100%" stopColor="#ec4899" stopOpacity={0.05} />
												</linearGradient>
											</defs>
											<CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
											<XAxis dataKey="name" tickLine={false} axisLine={false} />
											<YAxis tickLine={false} axisLine={false} width={28} />
											<Tooltip contentStyle={{ background: 'var(--bg-panel-solid)', border: '1px solid var(--border-muted)', borderRadius: 16 }} />
											<Area type="monotone" dataKey="rate" stroke="#ec4899" strokeWidth={3} fill="url(#completionFill)" />
										</AreaChart>
									</ResponsiveContainer>
								</div>
							</div>

							<div className="chartPanel">
								<div className="chartPanelTitle">Done vs due vs skipped</div>
								<div className="chartFrame">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={weeklyTrendData} barGap={8}>
											<CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
											<XAxis dataKey="name" tickLine={false} axisLine={false} />
											<YAxis tickLine={false} axisLine={false} width={28} />
											<Tooltip contentStyle={{ background: 'var(--bg-panel-solid)', border: '1px solid var(--border-muted)', borderRadius: 16 }} />
											<Bar dataKey="due" fill="rgba(168, 85, 247, 0.25)" radius={[10, 10, 0, 0]} />
											<Bar dataKey="done" fill="#8b5cf6" radius={[10, 10, 0, 0]} />
											<Bar dataKey="skipped" fill="#f97316" radius={[10, 10, 0, 0]} />
										</BarChart>
									</ResponsiveContainer>
								</div>
							</div>
						</div>

						<div className="heatmapLegend">
							<span>28-day spark</span>
							<div className="heatmapLegendScale">
								{heatmapData.slice(-8).map((cell) => {
									const level = cell.count === 0 ? '' : cell.count >= 3 ? 'level-4' : cell.count >= 2 ? 'level-2' : 'level-1';
									return <div key={cell.iso} className={`heatCell ${level}`} style={{ width: '12px', height: '12px' }} />;
								})}
							</div>
							<span>recent activity</span>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
