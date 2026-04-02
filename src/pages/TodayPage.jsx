import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
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

// ─── Check icon (SVG) ────────────────────────────────────────────────────────
function CheckIcon({ done }) {
	return (
		<svg
			width="18" height="18" viewBox="0 0 18 18"
			fill="none" xmlns="http://www.w3.org/2000/svg"
		>
			<circle
				cx="9" cy="9" r="8.25"
				stroke={done ? 'transparent' : 'currentColor'}
				strokeWidth="1.5"
				fill={done ? 'var(--success)' : 'transparent'}
			/>
			{done && (
				<path
					d="M5.5 9.25l2.5 2.5 4.5-5"
					stroke="#fff" strokeWidth="1.75"
					strokeLinecap="round" strokeLinejoin="round"
				/>
			)}
		</svg>
	);
}

// ─── KPI row with progress bar ────────────────────────────────────────────────
function Kpis({ today, dueCount, doneCount }) {
	const pct = dueCount > 0 ? Math.round((doneCount / dueCount) * 100) : 0;

	return (
		<div className="stack" style={{ gap: 12 }}>
			<div className="kpiGrid">
				<div className="kpi">
					<div className="label">Date</div>
					<div className="value" style={{ fontSize: '1.2rem' }}>{today}</div>
				</div>
				<div className="kpi" style={{ '--kpi-color': 'var(--warning)' }}>
					<div className="label">Due</div>
					<div className="value">{dueCount}</div>
				</div>
				<div className="kpi" style={{ '--kpi-color': 'var(--success)' }}>
					<div className="label">Done</div>
					<div className="value">{doneCount}</div>
				</div>
			</div>

			{dueCount > 0 && (
				<div>
					<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
						<span className="subtle" style={{ fontSize: '0.78rem' }}>Today's progress</span>
						<span className="subtle" style={{ fontSize: '0.78rem', color: 'var(--brand-light)' }}>{pct}%</span>
					</div>
					<div className="progressBar">
						<div className="progressFill" style={{ width: `${pct}%` }} />
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Habit Row ────────────────────────────────────────────────────────────────
function HabitRow({ habit, entry, streak, onToggle, onSetQuantity }) {
	const done = entryMeetsTarget(habit, entry);
	const [qty, setQty] = useState(entry?.value ?? '');

	useEffect(() => {
		setQty(entry?.value ?? '');
	}, [entry?.value]);

	const streakBadgeClass = streak >= 7 ? 'badge success' : streak >= 3 ? 'badge warning' : 'badge';

	return (
		<div className={`item ${done ? 'isDone' : ''}`}>
			<div className="row between" style={{ gap: 14 }}>
				<div className="stack" style={{ gap: 6, minWidth: 0, flex: 1 }}>
					<div className="row" style={{ gap: 10, minWidth: 0 }}>
						<div
							className="dot"
							style={{
								background: habit.color,
								boxShadow: `0 0 0 3px ${habit.color}30`,
								width: 12, height: 12,
							}}
						/>
						<div className="itemName">{habit.name}</div>
						<span className={streakBadgeClass}>
							{streak > 0 ? `🔥 ${streak}` : `— 0`}
						</span>
					</div>
					<div className="subtle">{targetLabel(habit)}</div>
				</div>

				{habit.type === HabitType.binary ? (
					<button
						type="button"
						className={`iconBtn ${done ? 'active' : ''}`}
						onClick={onToggle}
						aria-label={done ? 'Mark undone' : 'Mark done'}
						title={done ? 'Undo' : 'Mark done'}
					>
						<CheckIcon done={done} />
					</button>
				) : (
					<div className="row" style={{ gap: 8 }}>
						<input
							className="input"
							type="number"
							min={0}
							step={1}
							value={qty}
							onChange={(e) => setQty(e.target.value)}
							placeholder="0"
							aria-label={`${habit.name} value`}
							style={{ maxWidth: 90 }}
							onKeyDown={(e) => {
								if (e.key !== 'Enter') return;
								const raw = qty === '' ? 0 : Number(qty);
								onSetQuantity(raw);
							}}
						/>
						<button
							type="button"
							className={`btn ${done ? 'success' : 'ghost'}`}
							style={{ minWidth: 60 }}
							onClick={() => {
								const raw = qty === '' ? 0 : Number(qty);
								onSetQuantity(raw);
							}}
						>
							{done ? '✓ Saved' : 'Save'}
						</button>
					</div>
				)}
			</div>
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
		return () => { alive = false; };
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

	// Generate small heatmap data for the last 28 days
	const heatmapData = useMemo(() => {
		const cells = [];
		for (let i = 27; i >= 0; i--) {
			const d = new Date();
			d.setDate(d.getDate() - i);
			const iso = d.toISOString().split('T')[0];
			let count = 0;
			for (const h of habits) {
				if (entriesByKey.has(`${h.id}__${iso}`)) count++;
			}
			cells.push({ iso, count });
		}
		return cells;
	}, [habits, entriesByKey]);

	if (!isReady) return <div className="card"><p className="subtle">Loading…</p></div>;

	return (
		<div className="bento">
			{/* Row 1: Focus & Stats */}
			<div className="span-8 stack">
				<div className="card" style={{ background: 'var(--surface-bright)', border: 'none' }}>
					<div className="sectionHeader">
						<div className="stack" style={{ gap: 4 }}>
							<span className="greeting">Good morning</span>
							<h2>Your day at a glance</h2>
						</div>
						<div className="row" style={{ gap: 8 }}>
							<span className="badge brand" style={{ fontSize: '11px', padding: '6px 12px' }}>
								{summary.doneCount}/{summary.dueCount} Complete
							</span>
						</div>
					</div>
					<Kpis today={today} dueCount={summary.dueCount} doneCount={summary.doneCount} />
				</div>
			</div>

			<div className="span-4 stack">
				<div className="card">
					<div className="sectionHeader">
						<h2>Consistency</h2>
						<span className="subtle">Last 4 weeks</span>
					</div>
					<div className="heatmap" style={{ marginTop: 8 }}>
						{heatmapData.map((cell, idx) => {
							const level = cell.count === 0 ? '' : cell.count >= 3 ? 'level-4' : cell.count >= 2 ? 'level-2' : 'level-1';
							return <div key={idx} className={`heatCell ${level}`} title={`${cell.iso}: ${cell.count} habits`} />;
						})}
					</div>
					<div className="row" style={{ marginTop: 8, gap: 4 }}>
						<span className="subtle" style={{ fontSize: '0.7rem' }}>Keep the streak alive! 🔥</span>
					</div>
				</div>
			</div>

			{/* Row 2: Habits vs Player */}
			<div className="span-8">
				{due.length === 0 ? (
					<EmptyState
						title="Nothing due today"
						body="Add a habit to start tracking."
						action={<a className="btn primary" href="#/settings">Open Settings</a>}
					/>
				) : (
					<div className="card">
						<div className="sectionHeader">
							<h2>Daily Habits</h2>
							<span className="subtle">{due.length} to go</span>
						</div>
						<div className="list">
							{due.map((h) => {
								const entry = entriesByKey.get(`${h.id}__${today}`) ?? null;
								const streak = currentStreak(h, entriesByKey, today);
								return (
									<HabitRow
										key={h.id}
										habit={h}
										entry={entry}
										streak={streak}
										onToggle={async () => {
											const done = entryMeetsTarget(h, entry);
											if (done) await api.deleteEntry(h.id, today);
											else await api.setEntry({ habitId: h.id, date: today, value: 1, note: '' });
											refresh();
										}}
										onSetQuantity={async (value) => {
											if (!Number.isFinite(value) || value < 0)
												return toast.push('Please enter a valid number.');
											await api.setEntry({ habitId: h.id, date: today, value, note: '' });
											toast.push('Saved.');
											refresh();
										}}
									/>
								);
							})}
						</div>
					</div>
				)}
			</div>

			<div className="span-4 stack">
				<ProductivityHub />
			</div>

			{/* Floating Action Button */}
			<a href="#/habits" className="fab" title="New Habit">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
					<line x1="12" y1="5" x2="12" y2="19"></line>
					<line x1="5" y1="12" x2="19" y2="12"></line>
				</svg>
			</a>
		</div>
	);
}
