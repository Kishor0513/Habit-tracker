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
	HabitType,
	isDueOn,
	targetLabel,
} from '../lib/habits.js';
import { computeTodaySummary, currentStreak } from '../lib/stats.js';
import { useApp } from '../state/AppState.jsx';
import { useToast } from '../state/ToastState.jsx';

// ─── Task Row ────────────────────────────────────────────────────────────────
function HabitTaskRow({ habit, entry, streak, onToggle, onSetQuantity }) {
	const done = entryMeetsTarget(habit, entry);
	const [qty, setQty] = useState(entry?.value ?? '');

	useEffect(() => {
		setQty(entry?.value ?? '');
	}, [entry?.value]);

	return (
		<div
			className={`taskRow ${done ? 'isDone' : ''}`}
			onClick={(e) => {
				if (habit.type === HabitType.binary) {
					onToggle();
				}
			}}
		>
			<div className="taskCheckbox">
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
					paddingLeft: 4,
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span
						className="taskText"
						style={{ fontWeight: 500, fontSize: '14px' }}
					>
						{habit.name}
					</span>
					{streak >= 3 && <span className="badge warning">🔥 {streak}</span>}
				</div>
				<div
					className="taskText"
					style={{
						fontSize: '12px',
						color: 'var(--text-muted)',
						marginTop: '2px',
					}}
				>
					{targetLabel(habit)}
				</div>
			</div>

			{habit.type !== HabitType.binary && (
				<div
					className="taskInputWrap"
					onClick={(e) => e.stopPropagation()}
				>
					<input
						className="taskInput"
						type="number"
						min={0}
						step={1}
						value={qty}
						onChange={(e) => setQty(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								const raw = qty === '' ? 0 : Number(qty);
								onSetQuantity(raw);
							}
						}}
					/>
					<button
						className="btn btn-bordered"
						style={{ height: 28, fontSize: 12, padding: '0 8px' }}
						onClick={() => onSetQuantity(qty === '' ? 0 : Number(qty))}
					>
						Save
					</button>
				</div>
			)}
		</div>
	);
}

// ─── Today Page ───────────────────────────────────────────────────────────────
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
	const summary = useMemo(
		() => computeTodaySummary(habits, entriesByHabitToday, today),
		[habits, entriesByHabitToday, today],
	);

	const heatmapData = useMemo(() => {
		const cells = [];
		for (let i = 27; i >= 0; i--) {
			const d = new Date();
			d.setDate(d.getDate() - i);
			const iso = d.toISOString().split('T')[0];
			let count = 0;
			for (const h of habits) if (entriesByKey.has(`${h.id}__${iso}`)) count++;
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
			for (const habit of habits) {
				if (!isDueOn(habit, iso)) continue;
				dueCount += 1;
				const entry = entriesByKey.get(`${habit.id}__${iso}`) ?? null;
				if (entryMeetsTarget(habit, entry)) doneCount += 1;
			}
			data.push({
				name: date.toLocaleDateString([], { weekday: 'short' }),
				done: doneCount,
				due: dueCount,
				rate: dueCount === 0 ? 0 : Math.round((doneCount / dueCount) * 100),
			});
		}
		return data;
	}, [habits, entriesByKey]);

	const progressPercent =
		summary.dueCount === 0
			? 0
			: Math.round((summary.doneCount / summary.dueCount) * 100);

	if (!isReady)
		return (
			<div className="pageContent">
				<p style={{ color: 'var(--text-muted)' }}>Loading runtime...</p>
			</div>
		);

	return (
		<div className="pageContent">
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
												onToggle={async () => {
													if (entryMeetsTarget(h, entry))
														await api.deleteEntry(h.id, today);
													else
														await api.setEntry({
															habitId: h.id,
															date: today,
															value: 1,
															note: '',
														});
													refresh();
												}}
												onSetQuantity={async (value) => {
													if (!Number.isFinite(value) || value < 0)
														return toast.push('Please enter a valid number.');
													await api.setEntry({
														habitId: h.id,
														date: today,
														value,
														note: '',
													});
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
						<p className="subtle">Built with Recharts for daily completion and workload trends.</p>

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
												stroke="#ec4899"
												strokeWidth={3}
												fill="url(#completionFill)"
											/>
										</AreaChart>
									</ResponsiveContainer>
								</div>
							</div>

							<div className="chartPanel">
								<div className="chartPanelTitle">Done vs due</div>
								<div className="chartFrame">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={weeklyTrendData} barGap={8}>
											<CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
											<XAxis dataKey="name" tickLine={false} axisLine={false} />
											<YAxis tickLine={false} axisLine={false} width={28} />
											<Tooltip
												contentStyle={{
													background: 'var(--bg-panel-solid)',
													border: '1px solid var(--border-muted)',
													borderRadius: 16,
												}}
											/>
											<Bar dataKey="due" fill="rgba(168, 85, 247, 0.35)" radius={[10, 10, 0, 0]} />
											<Bar dataKey="done" fill="#8b5cf6" radius={[10, 10, 0, 0]} />
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
										cell.count === 0 ? '' : cell.count >= 3 ? 'level-4' : cell.count >= 2 ? 'level-2' : 'level-1';
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
		</div>
	);
}
