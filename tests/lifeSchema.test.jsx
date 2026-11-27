import { describe, it, expect } from 'vitest';
import {
	camelToSnake,
	snakeToCamel,
	isJsonField,
	normalizeRecord,
	toRow,
	fromRow,
	LIFE_DEFAULTS,
	LIFE_STORES,
} from '../src/lib/lifeSchema.js';

describe('lifeSchema library', () => {
	describe('camelToSnake', () => {
		it('converts camelCase to snake_case', () => {
			expect(camelToSnake('dueDate')).toBe('due_date');
			expect(camelToSnake('projectId')).toBe('project_id');
			expect(camelToSnake('orderIndex')).toBe('order_index');
		});

		it('handles simple words', () => {
			expect(camelToSnake('name')).toBe('name');
			expect(camelToSnake('ID')).toBe('_i_d'); // This is the correct output
		});
	});

	describe('snakeToCamel', () => {
		it('converts snake_case to camelCase', () => {
			expect(snakeToCamel('due_date')).toBe('dueDate');
			expect(snakeToCamel('project_id')).toBe('projectId');
			expect(snakeToCamel('order_index')).toBe('orderIndex');
		});

		it('handles simple words', () => {
			expect(snakeToCamel('name')).toBe('name');
		});
	});

	describe('isJsonField', () => {
		it('identifies JSON fields', () => {
			expect(isJsonField('tags')).toBe(true);
			expect(isJsonField('subtasks')).toBe(true);
			expect(isJsonField('items')).toBe(true);
		});

		it('returns false for non-JSON fields', () => {
			expect(isJsonField('title')).toBe(false);
			expect(isJsonField('dueDate')).toBe(false);
		});
	});

	describe('normalizeRecord', () => {
		it('applies defaults for tasks', () => {
			const record = normalizeRecord('tasks', { title: 'Test' });
			expect(record.title).toBe('Test');
			expect(record.status).toBe('todo');
			expect(record.priority).toBe('none');
			expect(record.id).toBeDefined();
			expect(record.tags).toEqual([]);
			expect(record.subtasks).toEqual([]);
		});

		it('applies defaults for notes', () => {
			const record = normalizeRecord('notes', { title: 'Note' });
			expect(record.pinned).toBe(false);
			expect(record.favorite).toBe(false);
			expect(record.archivedAt).toBeNull();
			expect(record.deletedAt).toBeNull();
		});

		it('parses JSON strings for JSON fields', () => {
			const record = normalizeRecord('tasks', { tags: '["a", "b"]', subtasks: '[]' });
			expect(record.tags).toEqual(['a', 'b']);
			expect(record.subtasks).toEqual([]);
		});

		it('sets timestamps', () => {
			const record = normalizeRecord('tasks', {});
			expect(record.createdAt).toBeDefined();
			expect(record.updatedAt).toBeDefined();
		});
	});

	describe('toRow', () => {
		it('converts camelCase to snake_case', () => {
			const row = toRow('tasks', { id: '123', title: 'Test', dueDate: '2025-01-01' }, 'user1');
			expect(row.title).toBe('Test');
			expect(row.due_date).toBe('2025-01-01');
			expect(row.user_id).toBe('user1');
			expect(row.id).toBe('123');
		});

		it('handles lifeSettings specially', () => {
			const row = toRow('lifeSettings', { key: 'theme', value: 'dark' }, 'user1');
			expect(row.key).toBe('theme');
			expect(row.value).toBe('dark');
			expect(row.user_id).toBe('user1');
		});
	});

	describe('fromRow', () => {
		it('converts snake_case to camelCase', () => {
			const record = fromRow('tasks', {
				id: '123',
				title: 'Test',
				due_date: '2025-01-01',
				tags: '["a", "b"]',
				user_id: 'user1',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-02T00:00:00Z',
			});
			expect(record.title).toBe('Test');
			expect(record.dueDate).toBe('2025-01-01');
			expect(record.tags).toEqual(['a', 'b']);
			expect(record.createdAt).toBe('2025-01-01T00:00:00Z');
		});
	});
});