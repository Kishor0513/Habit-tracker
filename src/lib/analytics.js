import { dayOfWeek, lastNDays } from './date.js';
import { entryMeetsTarget, habitEntryStatus, EntryStatus, isDueOn } from './habits.js';
import { currentStreak } from './stats.js';

export function bestStreak(habit, entriesByKey, endIso, lookback = 365) {
	let best = 0;
	let current = 0;
	for (const day of lastNDays(lookback, endIso)) {
		if (!isDueOn(habit, day)) continue;
		if (entryMeetsTarget(habit, entriesByKey.get(`${habit.id}__${day}`))) {
			current += 1;
			best = Math.max(best, current);
		} else {
			current = 0;
		}
	}
	return best;
}

export function completionByWeekday(habits, entriesByKey, days = lastNDays(90)) {
	const buckets = new Map();
	for (let weekday = 1; weekday <= 7; weekday += 1) {
		buckets.set(weekday, { weekday, due: 0, done: 0 });
	}
	for (const day of days) {
		const bucket = buckets.get(dayOfWeek(day));
		for (const habit of habits) {
			if (!isDueOn(habit, day)) continue;
			bucket.due += 1;
			if (entryMeetsTarget(habit, entriesByKey.get(`${habit.id}__${day}`))) bucket.done += 1;
		}
	}
	return [...buckets.values()].map((item) => ({
		...item,
		rate: item.due === 0 ? 0 : item.done / item.due,
	}));
}

export function mostSkippedHabits(habits, entriesByKey, days = lastNDays(60)) {
	return habits
		.map((habit) => ({
			habit,
			skips: days.reduce((count, day) => {
				const status = habitEntryStatus(habit, entriesByKey.get(`${habit.id}__${day}`));
				return count + (status === EntryStatus.skipped ? 1 : 0);
			}, 0),
		}))
		.sort((a, b) => b.skips - a.skips);
}

export function bestPerformingHabits(habits, entriesByKey, days = lastNDays(30)) {
	return habits
		.map((habit) => {
			let due = 0;
			let done = 0;
			for (const day of days) {
				if (!isDueOn(habit, day)) continue;
				due += 1;
				if (entryMeetsTarget(habit, entriesByKey.get(`${habit.id}__${day}`))) done += 1;
			}
			return {
				habit,
				rate: due === 0 ? 0 : done / due,
				currentStreak: currentStreak(habit, entriesByKey),
			};
		})
		.sort((a, b) => b.rate - a.rate);
}

export function timeOfDaySuccessRate(entries = []) {
	const buckets = {
		morning: { key: 'morning', total: 0, done: 0 },
		afternoon: { key: 'afternoon', total: 0, done: 0 },
		evening: { key: 'evening', total: 0, done: 0 },
	};
	for (const entry of entries) {
		if (!entry.completedAt) continue;
		const hour = new Date(entry.completedAt).getHours();
		const key = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
		buckets[key].total += 1;
		if (entry.status === EntryStatus.done) buckets[key].done += 1;
	}
	return Object.values(buckets).map((bucket) => ({
		...bucket,
		rate: bucket.total === 0 ? 0 : bucket.done / bucket.total,
	}));
}

export function moodCompletionCorrelation(reviews = [], entries = []) {
	const grouped = new Map();
	for (const review of reviews) {
		if (!review.mood) continue;
		grouped.set(review.date, review.mood);
	}
	const result = new Map();
	for (const entry of entries) {
		const mood = grouped.get(entry.date);
		if (!mood) continue;
		const bucket = result.get(mood) ?? { mood, total: 0, done: 0 };
		bucket.total += 1;
		if (entry.status === EntryStatus.done) bucket.done += 1;
		result.set(mood, bucket);
	}
	return [...result.values()].map((bucket) => ({
		...bucket,
		rate: bucket.total === 0 ? 0 : bucket.done / bucket.total,
	}));
}

export function playlistUsageAndCompletion(sessions = []) {
	const buckets = new Map();
	for (const session of sessions) {
		const key = session.playlistId || 'Unlinked';
		const bucket = buckets.get(key) ?? { playlistId: key, sessions: 0, success: 0 };
		bucket.sessions += 1;
		if (session.success) bucket.success += 1;
		buckets.set(key, bucket);
	}
	return [...buckets.values()].map((bucket) => ({
		...bucket,
		successRate: bucket.sessions === 0 ? 0 : bucket.success / bucket.sessions,
	})).sort((a, b) => b.sessions - a.sessions);
}
