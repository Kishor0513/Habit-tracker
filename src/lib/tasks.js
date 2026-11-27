import { isoToday } from './date.js';

export const DEFAULT_STATUSES = [
	{ id: 'backlog', label: 'Backlog', color: '#8a84a3' },
	{ id: 'todo', label: 'To Do', color: '#7c3aed' },
	{ id: 'in-progress', label: 'In Progress', color: '#0ea5e9' },
	{ id: 'in-review', label: 'In Review', color: '#f59e0b' },
	{ id: 'done', label: 'Done', color: '#16a34a' },
	{ id: 'cancelled', label: 'Cancelled', color: '#dc2626' },
];

export const DEFAULT_PRIORITIES = [
	{ id: 'urgent', label: 'Urgent', color: '#dc2626', rank: 0 },
	{ id: 'high', label: 'High', color: '#f59e0b', rank: 1 },
	{ id: 'medium', label: 'Medium', color: '#0ea5e9', rank: 2 },
	{ id: 'low', label: 'Low', color: '#7c3aed', rank: 3 },
	{ id: 'none', label: 'None', color: '#8a84a3', rank: 4 },
];

export function isTaskDone(task) {
	return task?.status === 'done' || task?.status === 'cancelled';
}

export function isOverdue(task, today = isoToday()) {
	return Boolean(task?.dueDate && task.dueDate < today && !isTaskDone(task));
}

export function isMyDayTask(task, today = isoToday()) {
	if (isTaskDone(task)) return false;
	if (task.dueDate === today) return true;
	if (task.startDate && task.startDate <= today) return true;
	return Boolean(task.tags?.includes('my-day'));
}

export function toggleMyDay(task, today = isoToday()) {
	const tags = new Set(task.tags ?? []);
	if (isMyDayTask(task, today)) {
		tags.delete('my-day');
		return [...tags];
	}
	tags.add('my-day');
	return [...tags];
}

export function subtaskProgress(task) {
	const items = task?.subtasks ?? [];
	if (items.length === 0) return { done: 0, total: 0, percent: 0 };
	const done = items.filter((item) => item.done).length;
	return { done, total: items.length, percent: Math.round((done / items.length) * 100) };
}

export function filterTasks(tasks, view, options = {}) {
	const today = options.today ?? isoToday();
	const list = (tasks ?? []).filter((task) => !task.archivedAt);
	switch (view) {
		case 'my-day':
			return list.filter((task) => isMyDayTask(task, today));
		case 'upcoming':
			return list.filter((task) => task.dueDate && task.dueDate >= today && !isTaskDone(task));
		case 'completed':
			return list.filter((task) => task.status === 'done');
		case 'calendar':
			return list.filter((task) => Boolean(task.dueDate || task.startDate));
		default:
			return list;
	}
}

export function sortTasks(tasks, sort = 'manual') {
	const priorities = Object.fromEntries(DEFAULT_PRIORITIES.map((p) => [p.id, p.rank]));
	const copy = [...(tasks ?? [])];
	switch (sort) {
		case 'due':
			return copy.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
		case 'priority':
			return copy.sort((a, b) => (priorities[a.priority] ?? 9) - (priorities[b.priority] ?? 9));
		case 'title':
			return copy.sort((a, b) => a.title.localeCompare(b.title));
		default:
			return copy.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
	}
}

export function taskCounts(tasks, today = isoToday()) {
	return {
		total: tasks.filter((task) => !task.archivedAt).length,
		myDay: tasks.filter((task) => isMyDayTask(task, today)).length,
		overdue: tasks.filter((task) => isOverdue(task, today)).length,
		completed: tasks.filter((task) => task.status === 'done').length,
	};
}
