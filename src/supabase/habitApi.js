import { EntryStatus, normalizeSchedule } from '../lib/habits.js';

function must(ok, error) {
	if (ok) return;
	throw error ?? new Error('Supabase error');
}

function nowIso() {
	return new Date().toISOString();
}

function normalizeHabit(row) {
	return {
		...row,
		category: row.category ?? '',
		tags: row.tags ?? [],
		goalFrequency: row.goal_frequency ?? 0,
		reminder: row.reminder ?? { enabled: false, time: '08:00' },
		skipRule: row.skip_rule ?? 'break',
		schedule: normalizeSchedule(row.schedule, row.created_at ?? row.createdAt),
		archivedAt: row.archived_at ?? null,
		createdAt: row.created_at ?? null,
		updatedAt: row.updated_at ?? null,
	};
}

function entryCompatId(habitId, date) {
	return `${habitId}__${date}`;
}

function normalizeEntry(row) {
	const habitId = row.habit_id ?? row.habitId;
	const date = row.date;
	return {
		...row,
		id: entryCompatId(habitId, date),
		habitId,
		status: row.status ?? EntryStatus.pending,
	};
}

function normalizeProject(row) {
	return {
		...row,
		habitIds: row.habit_ids ?? [],
		startDate: row.start_date ?? '',
		targetDate: row.target_date ?? '',
		archivedAt: row.archived_at ?? null,
		milestones: row.milestones ?? [],
		createdAt: row.created_at ?? null,
		updatedAt: row.updated_at ?? null,
	};
}

function normalizeSetting(row) {
	if (!row) return null;
	return {
		key: row.key,
		value: row.value,
		updatedAt: row.updated_at ?? null,
	};
}

export class SupabaseHabitApi {
	constructor(supabase, userId) {
		this.supabase = supabase;
		this.userId = userId;
	}

	async listHabits() {
		const { data, error } = await this.supabase
			.from('habits')
			.select('*')
			.eq('user_id', this.userId)
			.order('created_at', { ascending: true });
		must(!error, error);
		return (data ?? []).map(normalizeHabit);
	}

	async upsertHabit(habit) {
		const payload = {
			...(habit.id ? { id: habit.id } : {}),
			user_id: this.userId,
			name: habit.name?.trim() ?? 'Untitled habit',
			type: habit.type ?? 'binary',
			color: habit.color ?? '#7c5cff',
			unit: habit.unit ?? '',
			target: habit.target ?? 1,
			schedule: normalizeSchedule(habit.schedule, habit.createdAt ?? nowIso()),
			notes: habit.notes ?? '',
			category: habit.category?.trim() ?? '',
			tags: Array.isArray(habit.tags) ? habit.tags.filter(Boolean) : [],
			goal_frequency: Math.max(0, Number(habit.goalFrequency ?? 0)),
			reminder: habit.reminder ?? { enabled: false, time: '08:00' },
			skip_rule: habit.skipRule ?? 'break',
			archived_at: habit.archivedAt ?? habit.archived_at ?? null,
			updated_at: nowIso(),
		};

		const { data, error } = await this.supabase
			.from('habits')
			.upsert(payload)
			.select('*')
			.single();
		must(!error, error);
		return normalizeHabit(data);
	}

	async archiveHabit(habitId) {
		const { error } = await this.supabase
			.from('habits')
			.update({ archived_at: nowIso(), updated_at: nowIso() })
			.eq('id', habitId)
			.eq('user_id', this.userId);
		must(!error, error);
	}

	async unarchiveHabit(habitId) {
		const { error } = await this.supabase
			.from('habits')
			.update({ archived_at: null, updated_at: nowIso() })
			.eq('id', habitId)
			.eq('user_id', this.userId);
		must(!error, error);
	}

	entryId(_habitId, _isoDate) {
		return null;
	}

	async getEntry(habitId, isoDate) {
		const { data, error } = await this.supabase
			.from('entries')
			.select('*')
			.eq('user_id', this.userId)
			.eq('habit_id', habitId)
			.eq('date', isoDate)
			.maybeSingle();
		must(!error, error);
		if (!data) return null;
		return normalizeEntry(data);
	}

	async setEntry({ habitId, date, value, note, status }) {
		const payload = {
			user_id: this.userId,
			habit_id: habitId,
			date,
			value,
			note: note ?? '',
			status: status ?? (Number(value ?? 0) > 0 ? EntryStatus.done : EntryStatus.pending),
			updated_at: nowIso(),
		};
		const { data, error } = await this.supabase
			.from('entries')
			.upsert(payload, { onConflict: 'user_id,habit_id,date' })
			.select('*')
			.single();
		must(!error, error);
		return normalizeEntry(data);
	}

	async deleteEntry(habitId, isoDate) {
		const { error } = await this.supabase
			.from('entries')
			.delete()
			.eq('user_id', this.userId)
			.eq('habit_id', habitId)
			.eq('date', isoDate);
		must(!error, error);
	}

	async listEntries() {
		const { data, error } = await this.supabase
			.from('entries')
			.select('*')
			.eq('user_id', this.userId)
			.order('date', { ascending: true });
		must(!error, error);
		return (data ?? []).map(normalizeEntry);
	}

	async listProjects() {
		const { data, error } = await this.supabase
			.from('projects')
			.select('*')
			.eq('user_id', this.userId)
			.order('created_at', { ascending: true });
		must(!error, error);
		return (data ?? []).map(normalizeProject);
	}

	async upsertProject(project) {
		const payload = {
			...(project.id ? { id: project.id } : {}),
			user_id: this.userId,
			name: project.name?.trim() ?? 'Untitled project',
			goal: project.goal?.trim() ?? '',
			why: project.why?.trim() ?? '',
			start_date: project.startDate ?? project.start_date ?? null,
			target_date: project.targetDate ?? project.target_date ?? null,
			milestones: project.milestones ?? [],
			habit_ids: project.habitIds ?? project.habit_ids ?? [],
			archived_at: project.archivedAt ?? project.archived_at ?? null,
			updated_at: nowIso(),
		};

		const { data, error } = await this.supabase
			.from('projects')
			.upsert(payload)
			.select('*')
			.single();
		must(!error, error);
		return normalizeProject(data);
	}

	async deleteProject(projectId) {
		const { error } = await this.supabase
			.from('projects')
			.delete()
			.eq('id', projectId)
			.eq('user_id', this.userId);
		must(!error, error);
	}

	async getSetting(key) {
		const { data, error } = await this.supabase
			.from('settings')
			.select('*')
			.eq('user_id', this.userId)
			.eq('key', key)
			.maybeSingle();
		must(!error, error);
		return normalizeSetting(data);
	}

	async setSetting(key, value) {
		const payload = {
			user_id: this.userId,
			key,
			value,
			updated_at: nowIso(),
		};
		const { error } = await this.supabase
			.from('settings')
			.upsert(payload, { onConflict: 'user_id,key' });
		must(!error, error);
	}
}
