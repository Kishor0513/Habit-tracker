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
				setEntriesByKey(new Map(e.map((x) => [x.id, x])));
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

	if (!isReady) return <div className="card"><p className="subtle">Loading…</p></div>;

	return (
		<div className="grid two">
			<div className="stack">
				<div className="card">
					<div className="sectionHeader">
						<h2>Today</h2>
						<span className="badge brand">{summary.doneCount}/{summary.dueCount} done</span>
					</div>
					<Kpis today={today} dueCount={summary.dueCount} doneCount={summary.doneCount} />
				</div>

				{due.length === 0 ? (
					<EmptyState
						title="Nothing due today"
						body="Add a habit to start tracking."
						action={<a className="btn primary" href="#/settings">Open Settings</a>}
					/>
				) : (
					<div className="card">
						<div className="sectionHeader">
							<h2>Habits due</h2>
							<span className="subtle">{due.length} scheduled</span>
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

			<div className="stack">
				<ProductivityHub />
			</div>
		</div>
	);
}
