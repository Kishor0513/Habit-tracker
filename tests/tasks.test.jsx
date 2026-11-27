import { describe, it, expect, beforeEach } from 'vitest';

// Need jsdom Date for isoToday in some cases
// Tests run in isolation so we import from source

import {
	DEFAULT_STATUSES,
	DEFAULT_PRIORITIES,
	isTaskDone,
	isOverdue,
	isMyDayTask,
	toggleMyDay,
	subtaskProgress,
	filterTasks,
	sortTasks,
	taskCounts,
} from '../src/lib/tasks.js';

const FIXED_TODAY = '2025-01-15';

const mockIsoToday = () => FIXED_TODAY;

describe('tasks library', () => {
	describe('DEFAULT_STATUSES', () => {
		it('has all required status IDs', () => {
			const ids = DEFAULT_STATUSES.map((s) => s.id);
			expect(ids).toContain('todo');
			expect(ids).toContain('done');
			expect(ids).toContain('cancelled');
		});

		it('each status has color', () => {
			DEFAULT_STATUSES.forEach((s) => {
				expect(s).toHaveProperty('color');
				expect(typeof s.color).toBe('string');
			});
		});
	});

	describe('DEFAULT_PRIORITIES', () => {
		it('has all priority levels', () => {
			const ids = DEFAULT_PRIORITIES.map((p) => p.id);
			expect(ids).toContain('urgent');
			expect(ids).toContain('none');
		});

		it('each priority has color and rank', () => {
			DEFAULT_PRIORITIES.forEach((p) => {
				expect(p).toHaveProperty('color');
				expect(p).toHaveProperty('rank');
				expect(typeof p.rank).toBe('number');
			});
		});
	});

	describe('isTaskDone', () => {
		it('returns true for done status', () => {
			expect(isTaskDone({ status: 'done' })).toBe(true);
		});

		it('returns true for cancelled status', () => {
			expect(isTaskDone({ status: 'cancelled' })).toBe(true);
		});

		it('returns false for todo status', () => {
			expect(isTaskDone({ status: 'todo' })).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(isTaskDone(undefined)).toBe(false);
		});
	});

	describe('isOverdue', () => {
		it('returns true when dueDate is before today and not done', () => {
			expect(isOverdue({ dueDate: '2025-01-10', status: 'todo' }, FIXED_TODAY)).toBe(true);
		});

		it('returns false when dueDate is today', () => {
			expect(isOverdue({ dueDate: '2025-01-15', status: 'todo' }, FIXED_TODAY)).toBe(false);
		});

		it('returns false when dueDate is in future', () => {
			expect(isOverdue({ dueDate: '2025-01-20', status: 'todo' }, FIXED_TODAY)).toBe(false);
		});

		it('returns false when task is done', () => {
			expect(isOverdue({ dueDate: '2025-01-10', status: 'done' }, FIXED_TODAY)).toBe(false);
		});

		it('returns false when no dueDate', () => {
			expect(isOverdue({ status: 'todo' }, FIXED_TODAY)).toBe(false);
		});
	});

	describe('isMyDayTask', () => {
		it('returns true when dueDate is today', () => {
			expect(isMyDayTask({ dueDate: '2025-01-15' }, FIXED_TODAY)).toBe(true);
		});

		it('returns true when startDate is before today', () => {
			expect(isMyDayTask({ startDate: '2025-01-10' }, FIXED_TODAY)).toBe(true);
		});

		it('returns true when tags include my-day', () => {
			expect(isMyDayTask({ tags: ['my-day'] }, FIXED_TODAY)).toBe(true);
		});

		it('returns false when task is done', () => {
			expect(isMyDayTask({ status: 'done', dueDate: '2025-01-15' }, FIXED_TODAY)).toBe(false);
		});
	});

	describe('toggleMyDay', () => {
		it('adds my-day tag when task is not already in My Day', () => {
			const task = { tags: [], dueDate: '2025-01-20' };
			const result = toggleMyDay(task, FIXED_TODAY);
			expect(result).toContain('my-day');
		});

		it('removes my-day tag when task is already in My Day', () => {
			const task = { tags: ['my-day'], dueDate: '2025-01-20' };
			const result = toggleMyDay(task, FIXED_TODAY);
			expect(result).not.toContain('my-day');
		});
	});

	describe('subtaskProgress', () => {
		it('returns zero for no subtasks', () => {
			expect(subtaskProgress({})).toEqual({ done: 0, total: 0, percent: 0 });
		});

		it('calculates progress correctly', () => {
			expect(
				subtaskProgress({ subtasks: [{ done: true }, { done: false }, { done: true }] })
			).toEqual({ done: 2, total: 3, percent: 67 });
		});
	});

	describe('filterTasks', () => {
		const tasks = [
			{ id: '1', title: 'Task 1', status: 'todo', dueDate: '2025-01-10', tags: ['my-day'], archivedAt: null },
			{ id: '2', title: 'Task 2', status: 'done', dueDate: '2025-01-20', archivedAt: null },
			{ id: '3', title: 'Task 3', status: 'in-progress', dueDate: '2025-01-25', archivedAt: null },
			{ id: '4', title: 'Archived', status: 'todo', dueDate: '2025-01-10', archivedAt: '2025-01-12' },
		];

		it('filters by my-day view', () => {
			const result = filterTasks(tasks, 'my-day', { today: FIXED_TODAY });
			expect(result.length).toBeGreaterThan(0);
		});

		it('filters by upcoming view', () => {
			const result = filterTasks(tasks, 'upcoming', { today: FIXED_TODAY });
			expect(result.length).toBe(1); // only task 3 has future dueDate and not done
		});

		it('filters by completed view', () => {
			const result = filterTasks(tasks, 'completed', { today: FIXED_TODAY });
			expect(result.length).toBe(1);
			expect(result[0].id).toBe('2');
		});

		it('filters by calendar view', () => {
			const result = filterTasks(tasks, 'calendar', { today: FIXED_TODAY });
			expect(result.length).toBe(3); // tasks 1, 2, 3 have dueDate
		});

		it('returns all tasks for default view', () => {
			const result = filterTasks(tasks, undefined, { today: FIXED_TODAY });
			expect(result.length).toBe(3);
		});
	});

	describe('sortTasks', () => {
		const tasks = [
			{ id: '3', title: 'C Task', dueDate: '2025-01-05', priority: 'low' },
			{ id: '1', title: 'A Task', dueDate: '2025-01-10', priority: 'high' },
			{ id: '2', title: 'B Task', dueDate: '2025-01-08', priority: 'medium' },
		];

		it('sorts by due date ascending', () => {
			const result = sortTasks([...tasks], 'due');
			expect(result[0].id).toBe('3');
			expect(result[2].id).toBe('1');
		});

		it('sorts by priority', () => {
			const result = sortTasks([...tasks], 'priority');
			expect(result[0].priority).toBe('high');
			expect(result[2].priority).toBe('low');
		});

		it('sorts by title alphabetically', () => {
			const result = sortTasks([...tasks], 'title');
			expect(result[0].title).toBe('A Task');
			expect(result[2].title).toBe('C Task');
		});

		it('preserves manual order (default)', () => {
			const result = sortTasks([...tasks], 'manual');
			expect(result[0].id).toBe('3');
		});
	});

	describe('taskCounts', () => {
		const tasks = [
			{ id: '1', status: 'todo', dueDate: '2025-01-10', archivedAt: null },
			{ id: '2', status: 'done', dueDate: '2025-01-20', archivedAt: null },
			{ id: '3', status: 'in-progress', dueDate: '', archivedAt: null },
			{ id: '4', status: 'cancelled', dueDate: '2025-01-05', archivedAt: '2025-01-12' },
		];

		it('computes counts correctly', () => {
			const counts = taskCounts(tasks, FIXED_TODAY);
			expect(counts.total).toBe(3);
			expect(counts.myDay).toBe(0);
			expect(counts.overdue).toBe(1);
			expect(counts.completed).toBe(1);
		});
	});
});