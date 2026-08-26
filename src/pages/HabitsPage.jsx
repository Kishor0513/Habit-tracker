import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { lastNDays } from '../lib/date.js';
import {
	habitGoalLabel,
	HabitType,
	normalizeSchedule,
	ScheduleKind,
	scheduleLabel,
	WEEKDAY_OPTIONS,
} from '../lib/habits.js';
import {
	completionRateLastNDays,
	currentStreak,
	weeklyGoalProgress,
} from '../lib/stats.js';
import { useApp } from '../state/AppState.jsx';
import { useToast } from '../state/ToastState.jsx';

const COLORS = [
	'#6366f1',
	'#818cf8',
	'#22c55e',
	'#06b6d4',
	'#f59e0b',
	'#f43f5e',
	'#a855f7',
	'#ec4899',
];

function errorMessage(error, fallback = 'Something went wrong.') {
	if (!error) return fallback;
	if (typeof error === 'string') return error;
	return error.message || error.details || error.hint || fallback;
}

function DayPicker({ days, onToggle }) {
	return (
		<div className="row gap-sm flex-wrap">
			{WEEKDAY_OPTIONS.map((day) => {
				const active = days.includes(day.value);
				return (
					<button
						key={day.value}
						type="button"
					className={active ? 'btn primary dayBtn' : 'btn ghost dayBtn'}
						onClick={() => onToggle(day.value)}
					>
						{day.short}
					</button>
				);
			})}
		</div>
	);
}

function ColorPicker({ value, onChange }) {
	return (
		<div>
			<div className="label mb-sm">Color</div>
			<div className="colorSwatches">
				{COLORS.map((c) => (
					<button
						key={c}
						type="button"
						className={`colorSwatch ${value === c ? 'selected' : ''}`}
						style={{ background: c }}
						aria-label={`Select color ${c}`}
						onClick={() => onChange(c)}
					/>
				))}
			</div>
		</div>
	);
}

function HabitEditor({ initial, onCancel, onSave }) {
	const scheduleState = normalizeSchedule(
		initial?.schedule,
		initial?.createdAt,
	);
	const [name, setName] = useState(initial?.name ?? '');
	const [category, setCategory] = useState(initial?.category ?? '');
	const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
	const [type, setType] = useState(initial?.type ?? HabitType.binary);
	const [target, setTarget] = useState(String(initial?.target ?? 10));
	const [unit, setUnit] = useState(initial?.unit ?? 'min');
	const [scheduleKind, setScheduleKind] = useState(scheduleState.kind);
	const [customDays, setCustomDays] = useState(scheduleState.days ?? [1, 3, 5]);
	const [intervalEvery, setIntervalEvery] = useState(
		String(scheduleState.every ?? 2),
	);
	const [goalFrequency, setGoalFrequency] = useState(
		String(initial?.goalFrequency ?? 0),
	);
	const [color, setColor] = useState(initial?.color ?? COLORS[0]);
	const [notes, setNotes] = useState(initial?.notes ?? '');
	const [skipRule, setSkipRule] = useState(initial?.skipRule ?? 'break');
	const [reminderEnabled, setReminderEnabled] = useState(
		Boolean(initial?.reminder?.enabled),
	);
	const [reminderTime, setReminderTime] = useState(
		initial?.reminder?.time ?? '08:00',
	);
	const [priority, setPriority] = useState(initial?.priority ?? 'medium');
	const [linkedPlaylistId, setLinkedPlaylistId] = useState(
		initial?.linkedPlaylistId ?? '',
	);

	function toggleDay(day) {
		setCustomDays((prev) => {
			const exists = prev.includes(day);
			if (exists) return prev.filter((value) => value !== day);
			return [...prev, day].sort((a, b) => a - b);
		});
	}

	return (
			<div className="stack">
				<div className="grid two">
					<div className="card">
						<h2>Basics</h2>
						<div className="stack">
							<input
								className="input"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g., Deep work"
								autoFocus
								maxLength={100}
							/>
							<div className="twoCols">
								<input
									className="input"
									value={category}
									onChange={(e) => setCategory(e.target.value)}
									placeholder="Category: Health, Learning..."
									maxLength={50}
								/>
								<input
									className="input"
									value={tags}
									onChange={(e) => setTags(e.target.value)}
									placeholder="Tags: focus, morning"
									maxLength={100}
								/>
							</div>
							<select
								className="select"
								value={type}
								onChange={(e) => setType(e.target.value)}
							>
								<option value={HabitType.binary}>Binary</option>
								<option value={HabitType.quantity}>Quantity</option>
							</select>
						</div>
					</div>

				<div className="card">
					<h2>Targeting</h2>
					<div className="stack">
						<div className="twoCols">
							<input
								className="input"
								type="number"
								min={1}
								step={1}
								value={target}
								onChange={(e) => setTarget(e.target.value)}
								disabled={type !== HabitType.quantity}
								placeholder="Target"
							/>
							<input
								className="input"
								value={unit}
								onChange={(e) => setUnit(e.target.value)}
								placeholder="min / pages / reps"
								disabled={type !== HabitType.quantity}
							/>
						</div>
						<input
							className="input"
							type="number"
							min={0}
							max={7}
							value={goalFrequency}
							onChange={(e) => setGoalFrequency(e.target.value)}
							placeholder="Weekly goal"
						/>
						<p className="subtle">
							Set a weekly goal like `3` for "3 times per week".
						</p>
					</div>
				</div>
			</div>

			<div className="grid two">
				<div className="card">
					<h2>Recurrence</h2>
					<div className="stack">
						<select
							className="select"
							value={scheduleKind}
							onChange={(e) => setScheduleKind(e.target.value)}
						>
							<option value={ScheduleKind.daily}>Every day</option>
							<option value={ScheduleKind.weekdays}>Weekdays</option>
							<option value={ScheduleKind.custom}>Custom weekdays</option>
							<option value={ScheduleKind.interval}>Every N days</option>
						</select>
						{scheduleKind === ScheduleKind.custom ? (
							<DayPicker
								days={customDays}
								onToggle={toggleDay}
							/>
						) : null}
						{scheduleKind === ScheduleKind.interval ? (
							<input
								className="input"
								type="number"
								min={1}
								step={1}
								value={intervalEvery}
								onChange={(e) => setIntervalEvery(e.target.value)}
								placeholder="Every 2 days"
							/>
						) : null}
					</div>
				</div>

				<div className="card">
					<h2>Reminder & Recovery</h2>
					<div className="stack">
						<select
							className="select"
							value={priority}
							onChange={(e) => setPriority(e.target.value)}
						>
							<option value="high">High priority</option>
							<option value="medium">Medium priority</option>
							<option value="low">Low priority</option>
						</select>
						<label className="row gap-sm">
							<input
								type="checkbox"
								checked={reminderEnabled}
								onChange={(e) => setReminderEnabled(e.target.checked)}
							/>
							<span>Enable reminder</span>
						</label>
						<input
							className="input"
							type="time"
							value={reminderTime}
							onChange={(e) => setReminderTime(e.target.value)}
							disabled={!reminderEnabled}
						/>
						<select
							className="select"
							value={skipRule}
							onChange={(e) => setSkipRule(e.target.value)}
						>
							<option value="break">Skipped day breaks streak</option>
							<option value="protect">Skipped day protects streak</option>
						</select>
						<ColorPicker
							value={color}
							onChange={setColor}
						/>
					</div>
				</div>
			</div>

			<div className="card">
				<h2>Spotify link</h2>
				<div className="stack">
					<input
						className="input"
						value={linkedPlaylistId}
						onChange={(e) => setLinkedPlaylistId(e.target.value)}
						placeholder="Spotify playlist URI or ID"
						maxLength={100}
					/>
					<p className="subtle">
						Used for focus sessions and playlist analytics.
					</p>
				</div>
			</div>

			<div className="card">
				<h2>Notes</h2>
				<textarea
					className="textarea"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					placeholder="Cues, friction reducers, fallback rules, what counts as success..."
					maxLength={500}
				/>
			</div>

			<div className="row justify-end gap-sm">
				<button
					className="btn ghost"
					type="button"
					onClick={onCancel}
				>
					Cancel
				</button>
				<button
					className="btn primary"
					type="button"
					onClick={() => {
						const cleanName = name.trim();
						if (!cleanName)
							return onSave({ ok: false, error: 'Name is required.' });
						const qtyTarget = Number.parseInt(target, 10);
						const goal = Number.parseInt(goalFrequency || '0', 10);
						if (
							type === HabitType.quantity &&
							(!Number.isFinite(qtyTarget) || qtyTarget <= 0)
						) {
							return onSave({
								ok: false,
								error: 'Quantity target must be a positive number.',
							});
						}
						if (!Number.isFinite(goal) || goal < 0 || goal > 7) {
							return onSave({
								ok: false,
								error: 'Weekly goal must be between 0 and 7.',
							});
						}

						let schedule = { kind: ScheduleKind.daily };
						if (scheduleKind === ScheduleKind.weekdays) {
							schedule = { kind: ScheduleKind.weekdays, days: [1, 2, 3, 4, 5] };
						} else if (scheduleKind === ScheduleKind.custom) {
							if (customDays.length === 0) {
								return onSave({
									ok: false,
									error: 'Select at least one weekday for a custom schedule.',
								});
							}
							schedule = { kind: ScheduleKind.custom, days: customDays };
						} else if (scheduleKind === ScheduleKind.interval) {
							const every = Number.parseInt(intervalEvery, 10);
							if (!Number.isFinite(every) || every <= 0) {
								return onSave({
									ok: false,
									error: 'Interval must be a positive number of days.',
								});
							}
							schedule = {
								kind: ScheduleKind.interval,
								every,
								startDate:
									scheduleState.startDate ??
									initial?.createdAt?.slice?.(0, 10) ??
									new Date().toISOString().slice(0, 10),
							};
						}

						onSave({
							ok: true,
							value: {
								...initial,
								name: cleanName,
								category: category.trim(),
								tags: tags
									.split(',')
									.map((tag) => tag.trim())
									.filter(Boolean),
								type,
								target: type === HabitType.quantity ? qtyTarget : 1,
								unit: type === HabitType.quantity ? unit.trim() : '',
								schedule,
								goalFrequency: goal,
								color,
								notes: notes.trim(),
								priority,
								linkedPlaylistId: linkedPlaylistId.trim(),
								reminder: {
									enabled: reminderEnabled,
									time: reminderTime || '08:00',
								},
								skipRule,
							},
						});
					}}
				>
					Save habit
				</button>
			</div>
		</div>
	);
}

export default function HabitsPage() {
	const { api, isReady, dataVersion, refresh } = useApp();
	const toast = useToast();
	const [habits, setHabits] = useState([]);
	const [entriesByKey, setEntriesByKey] = useState(new Map());
	const [editing, setEditing] = useState(null);
	const [showEditor, setShowEditor] = useState(false);
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState('all');

	useEffect(() => {
		if (!api) return;
		let alive = true;
		Promise.all([api.listHabits(), api.listEntries()])
			.then(([h, e]) => {
				if (!alive) return;
				setHabits(h.filter((x) => !x.archivedAt));
				setEntriesByKey(new Map(e.map((x) => [x.id, x])));
			})
			.catch((err) => {
				console.error(err);
				toast.push('Failed to load habits. Please refresh.');
			});
		return () => {
			alive = false;
		};
	}, [api, dataVersion]);

	async function moveHabit(habitId, direction) {
		const sorted = [...habits].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
		const idx = sorted.findIndex((h) => h.id === habitId);
		if (idx < 0) return;
		const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
		if (swapIdx < 0 || swapIdx >= sorted.length) return;
		const a = sorted[idx];
		const b = sorted[swapIdx];
		const aOrder = a.orderIndex ?? idx;
		const bOrder = b.orderIndex ?? swapIdx;
		try {
			await api.upsertHabit({ ...a, orderIndex: bOrder });
			await api.upsertHabit({ ...b, orderIndex: aOrder });
			refresh();
		} catch (err) {
			toast.push(err?.message ?? 'Could not reorder habits.');
		}
	}

	useEffect(() => {
		function openNewHabit() {
			setEditing(null);
			setShowEditor(true);
		}
		function openSearch() {
			setCategory('all');
			window.setTimeout(() => {
				const input = document.querySelector(
					'input[placeholder="Search habits, categories, tags"]',
				);
				input?.focus?.();
			}, 0);
		}
		window.addEventListener('command:add-habit', openNewHabit);
		window.addEventListener('command:search-habits', openSearch);
		return () => {
			window.removeEventListener('command:add-habit', openNewHabit);
			window.removeEventListener('command:search-habits', openSearch);
		};
	}, []);

	const categories = useMemo(() => {
		return [...new Set(habits.map((habit) => habit.category).filter(Boolean))];
	}, [habits]);

	const filteredHabits = useMemo(() => {
		return habits.filter((habit) => {
			const haystack = [habit.name, habit.category, ...(habit.tags ?? [])]
				.join(' ')
				.toLowerCase();
			const matchesQuery =
				!query.trim() || haystack.includes(query.trim().toLowerCase());
			const matchesCategory = category === 'all' || habit.category === category;
			return matchesQuery && matchesCategory;
		});
	}, [habits, query, category]);

	const cards = useMemo(() => {
		const week = lastNDays(7);
		const sorted = [...filteredHabits].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
		return sorted.map((habit) => {
			const stats = completionRateLastNDays([habit], entriesByKey, 14);
			const streak = currentStreak(habit, entriesByKey);
			const weeklyGoal = weeklyGoalProgress(habit, entriesByKey, week);
			return { habit, stats, streak, weeklyGoal };
		});
	}, [filteredHabits, entriesByKey]);

	if (!isReady)
		return (
			<div className="card">
				<p className="subtle">Loading…</p>
			</div>
		);

	return (
		<div className="stack">
			<div className="card">
				<div className="sectionHeader">
					<div>
						<h2>Habits</h2>
						<div className="subtle">
							Custom recurrence, tags, reminders, and recovery rules in one
							place.
						</div>
					</div>
					<button
						className="btn primary"
						type="button"
						onClick={() => {
							setEditing(null);
							setShowEditor(true);
						}}
					>
						+ New habit
					</button>
				</div>
				<div className="row gap-sm mt-md flex-wrap">
					<input
						className="input max-w-sm"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search habits, categories, tags"
					/>
				<select
					className="select selectMaxW"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
					>
						<option value="all">All categories</option>
						{categories.map((item) => (
							<option
								key={item}
								value={item}
							>
								{item}
							</option>
						))}
					</select>
				</div>
			</div>

			{habits.length === 0 ? (
				<EmptyState
					title="No habits yet"
					body="Load example packs in Settings, or create your first habit here."
					action={
						<a
							className="btn"
							href="#/settings"
						>
							Load examples
						</a>
					}
				/>
			) : cards.length === 0 ? (
				<div className="card">
					<p className="subtle">No habits match the current filters.</p>
				</div>
			) : (
				<div className="list">
					{cards.map(({ habit, stats, streak, weeklyGoal }, cardIndex) => {
						const pct = Math.round(stats.rate * 100);
						const streakClass =
							streak >= 7
								? 'badge success'
								: streak >= 3
									? 'badge warning'
									: 'badge';
						const rateClass =
							pct >= 80
								? 'badge success'
								: pct >= 50
									? 'badge warning'
									: 'badge danger';
						const goalLabel = habitGoalLabel(habit);

						return (
							<div
								key={habit.id}
								className="item interactiveSurface"
								onClick={() => {
									setEditing(habit);
									setShowEditor(true);
								}}
							>
								<div className="row between gap-md items-center">
									<div className="stack gap-sm min-w-0 flex-1">
										<div className="row gap-sm min-w-0 flex-wrap">
									<div
										className="dot habitDot"
										style={{
											background: habit.color,
											boxShadow: `0 0 0 3px ${habit.color}30`,
										}}
									/>
											<div className="itemName">{habit.name}</div>
											<span
												className={
													habit.type === HabitType.binary
														? 'badge'
														: 'badge accent'
												}
											>
												{habit.type === HabitType.binary ? 'binary' : 'qty'}
											</span>
											{habit.category ? (
												<span className="badge">{habit.category}</span>
											) : null}
										</div>

										<div className="badgeRow">
											<span className={rateClass}>{pct}% (14d)</span>
											<span className={streakClass}>
												{streak > 0 ? `🔥 ${streak}` : 'no streak'}
											</span>
											<span className="badge">{scheduleLabel(habit)}</span>
											{goalLabel ? (
												<span
													className={
														weeklyGoal.met ? 'badge success' : 'badge warning'
													}
												>
													{weeklyGoal.completions}/{weeklyGoal.target} this week
												</span>
											) : null}
											{habit.reminder?.enabled ? (
												<span className="badge accent">
													Reminds at {habit.reminder.time}
												</span>
											) : null}
											<span
												className={
													habit.priority === 'high'
														? 'badge danger'
														: habit.priority === 'medium'
															? 'badge warning'
															: 'badge'
												}
											>
												{habit.priority} priority
											</span>
											<span
												className={
													habit.skipRule === 'protect'
														? 'badge success'
														: 'badge'
												}
											>
												{habit.skipRule === 'protect'
													? 'skip protects streak'
													: 'skip breaks streak'}
											</span>
											{habit.linkedPlaylistId ? (
												<span className="badge accent">playlist linked</span>
											) : null}
										</div>

										{(habit.tags ?? []).length ? (
											<div className="badgeRow">
												{habit.tags.map((tag) => (
													<span
														key={tag}
														className="badge"
													>
														#{tag}
													</span>
												))}
											</div>
										) : null}

										{habit.notes ? (
											<div className="subtle notePre">
												{habit.notes}
											</div>
										) : null}
									</div>

									<div className="row gap-sm">
										<button
											className="btn ghost"
											type="button"
											onClick={(event) => {
												event.stopPropagation();
												moveHabit(habit.id, 'up');
											}}
											disabled={cardIndex === 0}
											title="Move up"
										>
											↑
										</button>
										<button
											className="btn ghost"
											type="button"
											onClick={(event) => {
												event.stopPropagation();
												moveHabit(habit.id, 'down');
											}}
											disabled={cardIndex === cards.length - 1}
											title="Move down"
										>
											↓
										</button>
										<button
											className="btn ghost"
											type="button"
											onClick={(event) => {
												event.stopPropagation();
												setEditing(habit);
												setShowEditor(true);
											}}
										>
											Edit
										</button>
										<button
											className="btn danger"
											type="button"
											onClick={async (event) => {
												event.stopPropagation();
												try {
													await api.archiveHabit(habit.id);
													toast.push('Archived.');
													refresh();
												} catch (err) {
													toast.push(err?.message ?? 'Could not archive habit.');
												}
											}}
										>
											Archive
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{showEditor ? (
				<Modal
					title={editing ? 'Edit habit' : 'New habit'}
					onClose={() => setShowEditor(false)}
				>
					<HabitEditor
						initial={editing}
						onCancel={() => setShowEditor(false)}
						onSave={async (result) => {
							if (!result.ok) return toast.push(result.error);
							try {
								await api.upsertHabit(result.value);
								toast.push('Saved.');
								setShowEditor(false);
								refresh();
							} catch (error) {
								toast.push(errorMessage(error, 'Could not save habit.'));
							}
						}}
					/>
				</Modal>
			) : null}
		</div>
	);
}
