import { createClient } from '@supabase/supabase-js';

export function getSupabaseEnv() {
	const url = import.meta.env.VITE_SUPABASE_URL?.trim();
	const anonKey =
		import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
		import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();
	if (!url || !anonKey) return null;
	return { url, anonKey };
}

export function createSupabase() {
	const env = getSupabaseEnv();
	if (!env) return null;
	return createClient(env.url, env.anonKey, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true,
		},
	});
}
