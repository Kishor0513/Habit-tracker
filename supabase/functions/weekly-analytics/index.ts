import { json } from '../_shared/http.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

function createAdminClient() {
	const url = Deno.env.get('SUPABASE_URL');
	const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
	if (!url || !key) throw new Error('Missing Supabase admin env vars.');
	return createClient(url, key);
}

function startOfWeek(date = new Date()) {
	const value = new Date(date);
	const day = value.getUTCDay() || 7;
	value.setUTCDate(value.getUTCDate() - day + 1);
	value.setUTCHours(0, 0, 0, 0);
	return value.toISOString().slice(0, 10);
}

function endOfWeek(weekStart: string) {
	const start = new Date(weekStart + 'T00:00:00Z');
	start.setUTCDate(start.getUTCDate() + 6);
	return start.toISOString().slice(0, 10);
}

function generateSuggestions(habits: any[], entries: any[], completionRate: number): string[] {
	const suggestions: string[] = [];

	if (completionRate < 0.5) {
		suggestions.push('Your completion rate is below 50%. Consider reducing the number of active habits.');
	} else if (completionRate >= 0.9) {
		suggestions.push('Excellent week! Consider adding a new challenge habit.');
	}

	const habitCompletion = new Map<string, { done: number; total: number }>();
	for (const entry of entries) {
		const key = entry.habit_id;
		const current = habitCompletion.get(key) ?? { done: 0, total: 0 };
		current.total += 1;
		if (entry.status === 'done') current.done += 1;
		habitCompletion.set(key, current);
	}

	let worstHabit = null;
	let worstRate = 1;
	for (const [habitId, stats] of habitCompletion.entries()) {
		const rate = stats.total === 0 ? 0 : stats.done / stats.total;
		if (rate < worstRate) {
			worstRate = rate;
			worstHabit = habits.find((h) => h.id === habitId);
		}
	}

	if (worstHabit && worstRate < 0.5) {
		suggestions.push(`"${worstHabit.name}" has a ${Math.round(worstRate * 100)}% completion rate. Consider adjusting its schedule or reminders.`);
	}

	const weekdayEntries = new Map<number, { done: number; total: number }>();
	for (const entry of entries) {
		const date = new Date(entry.date + 'T00:00:00Z');
		const day = date.getUTCDay();
		const current = weekdayEntries.get(day) ?? { done: 0, total: 0 };
		current.total += 1;
		if (entry.status === 'done') current.done += 1;
		weekdayEntries.set(day, current);
	}

	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	let worstDay = -1;
	let worstDayRate = 1;
	for (const [day, stats] of weekdayEntries.entries()) {
		const rate = stats.total === 0 ? 0 : stats.done / stats.total;
		if (rate < worstDayRate) {
			worstDayRate = rate;
			worstDay = day;
		}
	}

	if (worstDay >= 0 && worstDayRate < 0.4) {
		suggestions.push(`You struggle on ${dayNames[worstDay]}s (${Math.round(worstDayRate * 100)}% completion). Consider lighter schedules on that day.`);
	}

	if (suggestions.length === 0) {
		suggestions.push('Keep up the consistent work! Your habits are building momentum.');
	}

	return suggestions;
}

Deno.serve(async () => {
	try {
		const admin = createAdminClient();
		const weekStart = startOfWeek();
		const weekEnd = endOfWeek(weekStart);

		const { data: habits, error: habitsError } = await admin
			.from('habits')
			.select('id, user_id, name, archived_at')
			.is('archived_at', null);
		if (habitsError) return json({ error: habitsError.message }, 500);

		const { data: entries, error: entriesError } = await admin
			.from('entries')
			.select('user_id, habit_id, status, date')
			.gte('date', weekStart)
			.lte('date', weekEnd);
		if (entriesError) return json({ error: entriesError.message }, 500);

		const userGroups = new Map<string, { habits: any[]; entries: any[] }>();
		for (const habit of habits ?? []) {
			const group = userGroups.get(habit.user_id) ?? { habits: [], entries: [] };
			group.habits.push(habit);
			userGroups.set(habit.user_id, group);
		}
		for (const entry of entries ?? []) {
			const group = userGroups.get(entry.user_id);
			if (group) group.entries.push(entry);
		}

		let usersProcessed = 0;
		for (const [userId, data] of userGroups.entries()) {
			const { habits: userHabits, entries: userEntries } = data;
			const totalEntries = userEntries.length;
			const doneEntries = userEntries.filter((e) => e.status === 'done').length;
			const completionRate = totalEntries === 0 ? 0 : doneEntries / totalEntries;
			const suggestions = generateSuggestions(userHabits, userEntries, completionRate);

			let bestHabitId = null;
			let worstHabitId = null;
			let bestRate = -1;
			let worstRate = 2;

			const habitStats = new Map<string, { done: number; total: number }>();
			for (const entry of userEntries) {
				const current = habitStats.get(entry.habit_id) ?? { done: 0, total: 0 };
				current.total += 1;
				if (entry.status === 'done') current.done += 1;
				habitStats.set(entry.habit_id, current);
			}

			for (const [habitId, stats] of habitStats.entries()) {
				const rate = stats.total === 0 ? 0 : stats.done / stats.total;
				if (rate > bestRate) {
					bestRate = rate;
					bestHabitId = habitId;
				}
				if (rate < worstRate) {
					worstRate = rate;
					worstHabitId = habitId;
				}
			}

			const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
			const summary = `Week of ${weekStart}: ${Math.round(completionRate * 100)}% completion (${doneEntries}/${totalEntries}). ` +
				`Best day: ${dayNames.reduce((best, day, i) => {
					const dayEntries = userEntries.filter((e) => new Date(e.date + 'T00:00:00Z').getUTCDay() === i);
					const dayDone = dayEntries.filter((e) => e.status === 'done').length;
					const dayRate = dayEntries.length === 0 ? 0 : dayDone / dayEntries.length;
					return dayRate > (best.rate || 0) ? { day, rate: dayRate } : best;
				}, { day: '', rate: 0 }).day}.`;

			await admin.from('weekly_reviews').upsert({
				user_id: userId,
				week_start: weekStart,
				completion_rate: completionRate,
				summary,
				best_habit_id: bestHabitId,
				worst_habit_id: worstHabitId,
				suggestions,
				updated_at: new Date().toISOString(),
			}, { onConflict: 'user_id,week_start' });

			usersProcessed += 1;
		}

		return json({ ok: true, weekStart, usersProcessed });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unexpected error.' }, 500);
	}
});
