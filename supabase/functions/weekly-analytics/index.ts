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

Deno.serve(async () => {
	try {
		const admin = createAdminClient();
		const weekStart = startOfWeek();
		const { data: entries, error } = await admin
			.from('entries')
			.select('user_id, status')
			.gte('date', weekStart);
		if (error) return json({ error: error.message }, 500);

		const grouped = new Map<string, { due: number; done: number }>();
		for (const entry of entries ?? []) {
			const bucket = grouped.get(entry.user_id) ?? { due: 0, done: 0 };
			bucket.due += 1;
			if (entry.status === 'done') bucket.done += 1;
			grouped.set(entry.user_id, bucket);
		}

		for (const [userId, metrics] of grouped.entries()) {
			await admin.from('weekly_reviews').upsert({
				user_id: userId,
				week_start: weekStart,
				completion_rate: metrics.due === 0 ? 0 : metrics.done / metrics.due,
				summary: `Auto-generated weekly summary for ${weekStart}.`,
				suggestions: [],
				updated_at: new Date().toISOString(),
			}, { onConflict: 'user_id,week_start' });
		}

		return json({ ok: true, weekStart, usersProcessed: grouped.size });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unexpected error.' }, 500);
	}
});
