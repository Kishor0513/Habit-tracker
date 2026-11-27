import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppIcon from '../components/AppIcon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { useApp } from '../state/AppState.jsx';
import { useLifeData } from '../state/useLifeData.js';
import { addDays, isoToday } from '../lib/date.js';
import {
	DEFAULT_PRIORITIES,
	DEFAULT_STATUSES,
	filterTasks,
	isMyDayTask,
	isOverdue,
	isTaskDone,
	sortTasks,
	subtaskProgress,
	toggleMyDay,
} from '../lib/tasks.js';

const VIEWS = [
	{ id: 'kanban', label: 'Kanban', icon: 'grip' },
	{ id: 'list', label: 'List', icon: 'task' },
	{ id: 'table', label: 'Table', icon: 'chart' },
	{ id: 'calendar', label: 'Calendar', icon: 'calendar' },
	{ id: 'my-day', label: 'My Day', icon: 'sun' },
	{ id: 'upcoming', label: 'Upcoming', icon: 'clock' },
	{ id: 'completed', label: 'Completed', icon: 'check' },
];

function blankTask(projectId = '') {
	return {
		title: '',
		description: '',
		status: 'todo',
		priority: 'none',
		dueDate: '',
		startDate: '',
		projectId,
		tags: [],
		subtasks: [],
		orderIndex: Date.now(),
	};
}

function StatusPill({ status, statuses }) {
	const meta = statuses.find((item) => item.id === status);
	return (
		<span className="taskStatusPill" style={{ '--pill-color': meta?.color ?? '#8a84a3' }}>
			<span className="dot" style={{ background: meta?.color ?? '#8a84a3' }} />
			{meta?.label ?? status}
		</span>
	);
}

function PriorityPill({ priority }) {
	const meta = DEFAULT_PRIORITIES.find((item) => item.id === priority) ?? DEFAULT_PRIORITIES[4];
	return (
		<span className="priorityPill" style={{ color: meta.color }}>
			<AppIcon name="arrow" size={12} /> {meta.label}
		</span>
	);
}

export default function TasksPage() {
	const { life, refresh } = useApp();
	const { data, loading } = useLifeData();
	const [searchParams, setSearchParams] = useSearchParams();
	const view = VIEWS.some((item) => item.id === searchParams.get('view'))
		? searchParams.get('view')
		: 'kanban';
	const projectFilter = searchParams.get('project') ?? '';
	const today = isoToday();
	const [query, setQuery] = useState('');
	const [editing, setEditing] = useState(null);
	const [form, setForm] = useState(blankTask());
	const [statuses, setStatuses] = useState(DEFAULT_STATUSES);
	const [statusEditor, setStatusEditor] = useState(false);
	const [monthOffset, setMonthOffset] = useState(0);

	useEffect(() => {
		if (!life) return;
		life.getLifeSetting('taskStatuses')
			.then((setting) => {
				if (Array.isArray(setting?.value) && setting.value.length) setStatuses(setting.value);
			})
			.catch(() => {});
	}, [life]);

	const openNew = (prefill = {}) => {
		setForm({ ...blankTask(projectFilter), ...prefill });
		setEditing('new');
	};

	useEffect(() => {
		const handler = (event) => {
			const date = event.detail?.date;
			openNew(date ? { dueDate: date } : {});
		};
		window.addEventListener('life:new-task', handler);
		return () => window.removeEventListener('life:new-task', handler);
	}, [projectFilter]);

	const tasks = useMemo(() => {
		const filtered = filterTasks(data.tasks, view, { today }).filter((task) => {
			if (projectFilter && task.projectId !== projectFilter) return false;
			if (!query.trim()) return true;
			const needle = query.trim().toLowerCase();
			return `${task.title} ${task.description ?? ''} ${(task.tags ?? []).join(' ')}`
				.toLowerCase()
				.includes(needle);
		});
		return sortTasks(filtered, view === 'kanban' ? 'manual' : 'due');
	}, [data.tasks, view, projectFilter, query, today]);

	const save = async () => {
		if (!form.title.trim()) return;
		await life.upsertTask({
			...form,
			title: form.title.trim(),
			id: editing === 'new' ? undefined : editing,
			completedAt: form.status === 'done' ? form.completedAt ?? new Date().toISOString() : null,
			orderIndex: Number(form.orderIndex ?? Date.now()),
		});
		setEditing(null);
		refresh();
	};

	const patchTask = async (task, patch) => {
		await life.upsertTask({ ...task, ...patch });
		refresh();
	};

	const removeTask = async (task) => {
		if (!window.confirm(`Delete “${task.title}”?`)) return;
		await life.deleteTask(task.id);
		refresh();
	};

	const openEdit = (task) => {
		setForm({ ...task });
		setEditing(task.id);
	};

	const saveStatuses = async (next) => {
		setStatuses(next);
		await life.setLifeSetting('taskStatuses', next);
		refresh();
	};

	const TaskCard = ({ task }) => (
		<article className={`taskCard ${isTaskDone(task) ? 'isDone' : ''}`}>
			<div className="taskCardTop">
				<button
					className="taskCheckbox"
					type="button"
					aria-label={task.status === 'done' ? 'Mark as to do' : 'Mark as done'}
					onClick={() => patchTask(task, { status: task.status === 'done' ? 'todo' : 'done' })}
				>
					<AppIcon name="check" size={11} />
				</button>
				<button className="taskCardTitle" type="button" onClick={() => openEdit(task)}>{task.title}</button>
				<button
					className={`iconBtn ghostIcon ${isMyDayTask(task, today) ? 'isPinned' : ''}`}
					type="button"
					title="Toggle My Day"
					onClick={() => patchTask(task, { tags: toggleMyDay(task, today) })}
				>
					<AppIcon name="sun" size={14} />
				</button>
			</div>
			{task.description && <p className="subtle taskCardDescription">{task.description}</p>}
			<div className="taskCardMeta">
				{isOverdue(task, today) && <span className="badge danger">Overdue</span>}
				{task.dueDate && <span className="metaChip"><AppIcon name="calendar" size={12} /> {task.dueDate}</span>}
				<PriorityPill priority={task.priority} />
				{task.subtasks?.length > 0 && (
					<span className="metaChip">{subtaskProgress(task).done}/{subtaskProgress(task).total} steps</span>
				)}
			</div>
			<div className="taskCardActions">
				<button className="btn btn-sm ghost" type="button" onClick={() => openEdit(task)}>Edit</button>
				<button className="btn btn-sm ghost dangerText" type="button" onClick={() => removeTask(task)}>Delete</button>
			</div>
		</article>
	);

	const renderKanban = () => (
		<div className="kanbanBoard">
			{statuses.map((status) => {
				const column = tasks.filter((task) => task.status === status.id);
				return (
					<section
						className="kanbanColumn"
						key={status.id}
						onDragOver={(event) => event.preventDefault()}
						onDrop={(event) => {
							event.preventDefault();
							const id = event.dataTransfer.getData('text/plain');
							const task = data.tasks.find((item) => item.id === id);
							if (task && task.status !== status.id) patchTask(task, { status: status.id });
						}}
					>
						<header className="kanbanHeader">
							<span className="dot" style={{ background: status.color }} />
							<strong>{status.label}</strong>
							<span className="badge">{column.length}</span>
						</header>
						<div className="kanbanBody">
							{column.map((task) => (
								<div key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', task.id)}>
									<TaskCard task={task} />
								</div>
							))}
							{column.length === 0 && <div className="kanbanEmpty">Drop a task here</div>}
						</div>
						<button className="btn btn-sm ghost kanbanAdd" type="button" onClick={() => openNew({ status: status.id })}>
							<AppIcon name="plus" size={13} /> Add task
						</button>
					</section>
				);
			})}
		</div>
	);

	const renderTable = () => (
		<div className="tableWrap">
			<table className="dataTable">
				<thead>
					<tr><th>Task</th><th>Status</th><th>Priority</th><th>Due</th><th>Project</th><th /></tr>
				</thead>
				<tbody>
					{tasks.map((task) => (
						<tr key={task.id}>
							<td>
								<button className="tableTitle" type="button" onClick={() => openEdit(task)}>{task.title}</button>
							</td>
							<td><StatusPill status={task.status} statuses={statuses} /></td>
							<td><PriorityPill priority={task.priority} /></td>
							<td className={isOverdue(task, today) ? 'dangerText' : ''}>{task.dueDate || '—'}</td>
							<td>{data.projects.find((project) => project.id === task.projectId)?.name ?? '—'}</td>
							<td>
								<div className="row gap-xs">
									<button className="iconBtn ghostIcon" type="button" title="Edit" onClick={() => openEdit(task)}><AppIcon name="edit" size={14} /></button>
									<button className="iconBtn ghostIcon dangerText" type="button" title="Delete" onClick={() => removeTask(task)}><AppIcon name="trash" size={14} /></button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);

	const renderList = () => (
		<div className="taskList">
			{tasks.map((task) => (
				<div className={`taskRow ${task.status === 'done' ? 'isDone' : ''}`} key={task.id}>
					<button
						className="taskCheckbox"
						type="button"
						onClick={() => patchTask(task, { status: task.status === 'done' ? 'todo' : 'done' })}
						aria-label="Toggle done"
					>
						<AppIcon name="check" size={11} />
					</button>
					<div className="taskContent">
						<div className="taskNameRow">
							<button className="taskTextBtn" type="button" onClick={() => openEdit(task)}>{task.title}</button>
							<StatusPill status={task.status} statuses={statuses} />
							<PriorityPill priority={task.priority} />
						</div>
						{task.dueDate && <span className="subtle" style={{ fontSize: 11 }}>Due {task.dueDate}</span>}
					</div>
					<button className="iconBtn ghostIcon" type="button" title="Delete" onClick={() => removeTask(task)}><AppIcon name="trash" size={14} /></button>
				</div>
			))}
		</div>
	);

	const renderCalendar = () => {
		const base = new Date();
		base.setDate(1);
		base.setMonth(base.getMonth() + monthOffset);
		const year = base.getFullYear();
		const month = base.getMonth();
		const first = new Date(year, month, 1);
		const start = addDays(
			`${year}-${String(month + 1).padStart(2, '0')}-01`,
			-((first.getDay() + 6) % 7),
		);
		const days = Array.from({ length: 42 }, (_, index) => addDays(start, index));
		return (
			<div className="calendarWrap">
				<div className="calendarToolbar">
					<button className="btn btn-sm" type="button" onClick={() => setMonthOffset((value) => value - 1)}>←</button>
					<strong>{base.toLocaleDateString([], { month: 'long', year: 'numeric' })}</strong>
					<button className="btn btn-sm" type="button" onClick={() => setMonthOffset((value) => value + 1)}>→</button>
					<button className="btn btn-sm ghost" type="button" onClick={() => setMonthOffset(0)}>Today</button>
				</div>
				<div className="calendarGrid">
					{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
						<div className="calendarWeekday" key={day}>{day}</div>
					))}
					{days.map((day) => {
						const dayTasks = tasks.filter((task) => task.dueDate === day);
						return (
							<div
								className={`calendarCell ${day.slice(0, 7) !== `${year}-${String(month + 1).padStart(2, '0')}` ? 'isOutside' : ''} ${day === today ? 'isToday' : ''}`}
								key={day}
								onDoubleClick={() => openNew({ dueDate: day })}
							>
								<span className="calendarDayNumber">{Number(day.slice(-2))}</span>
								{dayTasks.slice(0, 3).map((task) => (
									<button className="calendarTask" key={task.id} type="button" onClick={() => openEdit(task)} title={task.title}>
										{task.title}
									</button>
								))}
								{dayTasks.length > 3 && <span className="subtle">+{dayTasks.length - 3} more</span>}
							</div>
						);
					})}
				</div>
			</div>
		);
	};

	return (
		<div className="pageContent">
			<div className="sectionHeader">
				<div>
					<div className="panelEyebrow">Organize</div>
					<h1 className="pageTitle">Tasks</h1>
					<p className="subtle">From backlog to done, without the noise.</p>
				</div>
				<div className="row gap-sm flex-wrap">
					<button className="btn" type="button" onClick={() => setStatusEditor(true)}><AppIcon name="settings" size={15} /> Statuses</button>
					<button className="btn primary" type="button" onClick={() => openNew()}><AppIcon name="plus" size={15} /> New task</button>
				</div>
			</div>

			<div className="filterBar">
				<div className="viewTabs">
					{VIEWS.map((item) => (
						<button
							key={item.id}
							className={`viewTab ${view === item.id ? 'isActive' : ''}`}
							type="button"
							onClick={() => setSearchParams((params) => {
								const next = new URLSearchParams(params);
								next.set('view', item.id);
								return next;
							})}
						>
							<AppIcon name={item.icon} size={14} /> {item.label}
						</button>
					))}
				</div>
				<input
					className="input filterSearch"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Filter tasks…"
				/>
			</div>

			{projectFilter && (
				<div className="filterNote">
					Showing one project ·
					<button className="btn btn-sm ghost" type="button" onClick={() => setSearchParams({})}>Clear filter</button>
				</div>
			)}

			{loading ? (
				<div className="emptyPanelState">Loading tasks…</div>
			) : tasks.length === 0 ? (
				<EmptyState
					emoji="✅"
					title="Nothing here yet"
					body="Create a task to turn this space into your execution queue."
					action={<button className="btn primary" type="button" onClick={() => openNew()}>Create task</button>}
				/>
			) : view === 'kanban' ? renderKanban() : view === 'table' ? renderTable() : view === 'calendar' ? renderCalendar() : renderList()}

			{editing && (
				<Modal
					title={editing === 'new' ? 'New task' : 'Edit task'}
					onClose={() => setEditing(null)}
					actions={
						<>
							<button className="btn ghost" type="button" onClick={() => setEditing(null)}>Cancel</button>
							<button className="btn primary" type="button" onClick={save} disabled={!form.title.trim()}>Save task</button>
						</>
					}
				>
					<div className="stack">
						<input className="input" autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What needs to get done?" />
						<textarea className="textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Notes (optional)" />
						<div className="formGrid">
							<label className="field"><span className="label">Status</span>
								<select className="select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
									{statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
								</select>
							</label>
							<label className="field"><span className="label">Priority</span>
								<select className="select" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
									{DEFAULT_PRIORITIES.map((priority) => <option key={priority.id} value={priority.id}>{priority.label}</option>)}
								</select>
							</label>
							<label className="field"><span className="label">Start date</span>
								<input className="input" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
							</label>
							<label className="field"><span className="label">Due date</span>
								<input className="input" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
							</label>
							<label className="field"><span className="label">Project</span>
								<select className="select" value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>
									<option value="">No project</option>
									{data.projects.filter((project) => !project.archivedAt).map((project) => (
										<option key={project.id} value={project.id}>{project.name}</option>
									))}
								</select>
							</label>
							<label className="field"><span className="label">Tags (comma separated)</span>
								<input className="input" value={(form.tags ?? []).join(', ')} onChange={(event) => setForm({ ...form, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} placeholder="work, urgent" />
							</label>
						</div>
						<div className="subtaskEditor">
							<div className="row between"><span className="label">Checklist</span>
								<button className="btn btn-sm ghost" type="button" onClick={() => setForm({ ...form, subtasks: [...(form.subtasks ?? []), { id: crypto.randomUUID(), title: '', done: false }] })}>
									<AppIcon name="plus" size={13} /> Add step
								</button>
							</div>
							{(form.subtasks ?? []).map((item, index) => (
								<div className="row gap-sm" key={item.id}>
									<input type="checkbox" checked={item.done} onChange={(event) => {
										const next = [...form.subtasks];
										next[index] = { ...item, done: event.target.checked };
										setForm({ ...form, subtasks: next });
									}} />
									<input className="input" value={item.title} placeholder="Step description" onChange={(event) => {
										const next = [...form.subtasks];
										next[index] = { ...item, title: event.target.value };
										setForm({ ...form, subtasks: next });
									}} />
									<button className="iconBtn ghostIcon" type="button" onClick={() => setForm({ ...form, subtasks: form.subtasks.filter((_, i) => i !== index) })}><AppIcon name="trash" size={14} /></button>
								</div>
							))}
						</div>
					</div>
				</Modal>
			)}

			{statusEditor && (
				<StatusEditor
					statuses={statuses}
					onSave={saveStatuses}
					onClose={() => setStatusEditor(false)}
				/>
			)}
		</div>
	);
}

function StatusEditor({ statuses, onSave, onClose }) {
	const [draft, setDraft] = useState(statuses);
	const update = (index, patch) => {
		const next = [...draft];
		next[index] = { ...next[index], ...patch };
		setDraft(next);
	};
	return (
		<Modal
			title="Customize statuses"
			onClose={onClose}
			actions={<>
				<button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
				<button className="btn primary" type="button" onClick={() => { onSave(draft); onClose(); }}>Save statuses</button>
			</>}
		>
			<div className="stack">
				<p className="subtle">Rename, recolor, or add your own workflow stages.</p>
				{draft.map((status, index) => (
					<div className="row gap-sm" key={status.id}>
						<input type="color" value={status.color} onChange={(event) => update(index, { color: event.target.value })} />
						<input className="input" value={status.label} onChange={(event) => update(index, { label: event.target.value })} />
						{status.id !== 'todo' && (
							<button className="iconBtn ghostIcon" type="button" onClick={() => setDraft(draft.filter((_, i) => i !== index))}><AppIcon name="trash" size={14} /></button>
						)}
					</div>
				))}
				<button className="btn" type="button" onClick={() => setDraft([...draft, { id: `custom-${Date.now()}`, label: 'New stage', color: '#0ea5e9' }])}>
					<AppIcon name="plus" size={14} /> Add status
				</button>
			</div>
		</Modal>
	);
}
