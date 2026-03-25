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

function Kpis({ today, dueCount, doneCount }) {
	return (
		<div className="kpiGrid">
			<div className="kpi">
				<div className="label">Today</div>
				<div className="value">{today}</div>
			</div>
			<div className="kpi">
				<div className="label">Due habits</div>
				<div className="value">{dueCount}</div>
			</div>
			<div className="kpi">
				<div className="label">Completed</div>
				<div className="value">{doneCount}</div>
			</div>
		</div>
	);
}

function HabitRow({ habit, entry, streak, onToggle, onSetQuantity }) {
	const done = entryMeetsTarget(habit, entry);
	const [qty, setQty] = useState(entry?.value ?? '');

	useEffect(() => {
		setQty(entry?.value ?? '');
	}, [entry?.value]);

	return (
		<div className="item">
			<div
				className="row between"
				style={{ gap: 14 }}
			>
				<div
					className="stack"
					style={{ gap: 4, minWidth: 0 }}
				>
					<div
						className="row"
						style={{ gap: 10, minWidth: 0 }}
					>
						<div
							className="dot"
							style={{
								background: habit.color,
								boxShadow: `0 0 0 4px ${habit.color}22`,
							}}
						/>
						<div className="itemName">{habit.name}</div>
						<span className="badge">Streak {streak}</span>
					</div>
					<div className="subtle">{targetLabel(habit)}</div>
				</div>

				{habit.type === HabitType.binary ? (
					<button
						type="button"
						className={`btn ${done ? 'primary' : ''}`}
						onClick={onToggle}
					>
						{done ? 'Done' : 'Mark done'}
					</button>
				) : (
					<div
						className="row"
						style={{ gap: 10 }}
					>
						<input
							className="input"
							type="number"
							min={0}
							step={1}
							value={qty}
							onChange={(e) => setQty(e.target.value)}
							placeholder="0"
							aria-label={`${habit.name} value`}
							style={{ maxWidth: 140 }}
							onKeyDown={(e) => {
								if (e.key !== 'Enter') return;
								const raw = qty === '' ? 0 : Number(qty);
								onSetQuantity(raw);
							}}
						/>
						<button
							type="button"
							className={`btn ${done ? 'primary' : ''}`}
							onClick={() => {
								const raw = qty === '' ? 0 : Number(qty);
								onSetQuantity(raw);
							}}
						>
							{done ? 'Saved' : 'Save'}
						</button>
					</div>
				)}
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
	const [projectsCount, setProjectsCount] = useState(0);

	useEffect(() => {
		if (!api) return;
		let alive = true;
		Promise.all([api.listHabits(), api.listEntries(), api.listProjects()])
			.then(([h, e, p]) => {
				if (!alive) return;
				const activeHabits = h.filter((x) => !x.archivedAt);
				const activeProjects = p.filter((x) => !x.archivedAt);
				setHabits(activeHabits);
				setEntriesByKey(new Map(e.map((x) => [x.id, x])));
				setProjectsCount(activeProjects.length);
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

	if (!isReady) return <div className="card">Loading…</div>;

	return (
		<div className="grid two">
			<div className="stack">
				<div className="card">
					<h2>Today</h2>
					<Kpis
						today={today}
						dueCount={summary.dueCount}
						doneCount={summary.doneCount}
					/>
				</div>

				{due.length === 0 ? (
					<EmptyState
						title="Nothing due today"
						body="Add a habit to start tracking."
						action={
							<a
								className="btn primary"
								href="#/settings"
							>
								Open Settings
							</a>
						}
					/>
				) : (
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
										toast.push('Saved.');
										refresh();
									}}
								/>
							);
						})}
					</div>
				)}
			</div>

			<div className="stack">
				<ProductivityHub />
				<div className="card">
					<h2>How to make it real</h2>
					<p className="subtle">
						Attach each habit to a project. Example: “Deep work” → “Learn React
						by shipping a mini app”.
					</p>
					<div
						className="stack"
						style={{ gap: 6 }}
					>
						<div className="subtle">
							• Start tiny; scale targets after 2 consistent weeks.
						</div>
						<div className="subtle">
							• Reduce friction: prep, cues, time blocks.
						</div>
						<div className="subtle">
							• Review weekly: keep what works, delete what doesn’t.
						</div>
					</div>
				</div>
				<div className="card">
					<h2>Projects check</h2>
					<p className="subtle">Active projects: {projectsCount}</p>
					<a
						className="btn"
						href="#/projects"
					>
						Open Projects
					</a>
				</div>
			</div>
		</div>
	);
}
