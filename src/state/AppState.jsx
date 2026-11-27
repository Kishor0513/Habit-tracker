import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { HabitApi } from '../api.js';
import { LocalLifeApi } from '../api/lifeApi.js';
import { createSupabase, getSupabaseEnv } from '../supabase/client.js';
import { SupabaseHabitApi } from '../supabase/habitApi.js';
import { SupabaseLifeApi } from '../supabase/lifeApi.js';

const AppStateContext = createContext(null);

export function AppProvider({ children }) {
	const [api, setApi] = useState(null);
	const [life, setLife] = useState(null);
	const [supabase, setSupabase] = useState(null);
	const [user, setUser] = useState(null);
	const [supabaseConfigured, setSupabaseConfigured] = useState(false);
	const [authLoading, setAuthLoading] = useState(true);
	const [dataVersion, setDataVersion] = useState(0);
	const [session, setSession] = useState(null);

	useEffect(() => {
		const env = getSupabaseEnv();
		const client = createSupabase();
		setSupabaseConfigured(Boolean(env));
		setSupabase(client);

		let alive = true;
		let localApiPromise = null;

		async function boot() {
			if (!client) {
				const [local, localLife] = await Promise.all([
					HabitApi.create(),
					LocalLifeApi.create(),
				]);
				if (!alive) return;
				setApi(local);
				setLife(localLife);
				setUser(null);
				setAuthLoading(false);
				return;
			}

			// Start local API initialization immediately for fallback
			localApiPromise = Promise.all([
				HabitApi.create(),
				LocalLifeApi.create(),
			]).then(([local, localLife]) => {
				if (!alive) return;
				// Only set if we don't already have a user signed in
				if (!user && !session) {
					setApi(local);
					setLife(localLife);
				}
			});

			const {
				data: { session: initialSession },
			} = await client.auth.getSession();
			if (!alive) return;
			setSession(initialSession);
			const nextUser = initialSession?.user ?? null;
			setUser(nextUser);
			if (nextUser) {
				setApi(new SupabaseHabitApi(client, nextUser.id));
				setLife(new SupabaseLifeApi(client, nextUser.id));
			} else {
				// Wait for local API to be ready if no user
				const local = await localApiPromise;
				if (local && !alive) return;
				// local API already set in promise callback
			}
			setAuthLoading(false);
		}

		boot().catch((e) => console.error(e));

		const { data: sub } = client
			? client.auth.onAuthStateChange(async (_event, session) => {
					setSession(session);
					const nextUser = session?.user ?? null;
					setUser(nextUser);
					if (nextUser) {
						setApi(new SupabaseHabitApi(client, nextUser.id));
						setLife(new SupabaseLifeApi(client, nextUser.id));
					} else {
						// User signed out - fall back to local mode
						const [local, localLife] = await Promise.all([
							HabitApi.create(),
							LocalLifeApi.create(),
						]);
						if (!alive) return;
						setApi(local);
						setLife(localLife);
					}
					setDataVersion((v) => v + 1);
				})
			: { data: { subscription: { unsubscribe: () => {} } } };

		return () => {
			alive = false;
			sub?.subscription?.unsubscribe?.();
		};
	}, []);

	const value = useMemo(
		() => ({
			api,
			life,
			isReady: Boolean(api && life),
			refresh: () => setDataVersion((v) => v + 1),
			dataVersion,
			supabaseConfigured,
			user,
			session,
			authLoading,
			auth: {
				signInWithOtp: async (email) => {
					if (!supabase) throw new Error('Supabase is not configured.');
					const { error } = await supabase.auth.signInWithOtp({
						email,
						options: {
							emailRedirectTo:
								window.location.origin + window.location.pathname,
						},
					});
					if (error) throw error;
				},
				signInWithPassword: async (email, password) => {
					if (!supabase) throw new Error('Supabase is not configured.');
					const { error } = await supabase.auth.signInWithPassword({
						email,
						password,
					});
					if (error) throw error;
				},
				signUpWithPassword: async (email, password) => {
					if (!supabase) throw new Error('Supabase is not configured.');
					const { error } = await supabase.auth.signUp({
						email,
						password,
						options: {
							emailRedirectTo:
								window.location.origin + window.location.pathname,
						},
					});
					if (error) throw error;
				},
				resetPassword: async (email) => {
					if (!supabase) throw new Error('Supabase is not configured.');
					const { error } = await supabase.auth.resetPasswordForEmail(email, {
						redirectTo: window.location.origin + window.location.pathname,
					});
					if (error) throw error;
				},
				signOut: async () => {
					if (!supabase) return;
					const { error } = await supabase.auth.signOut();
					if (error) throw error;
				},
			},
		}),
		[
			api,
			life,
			dataVersion,
			supabaseConfigured,
			user,
			session,
			authLoading,
			supabase,
		],
	);

	return (
		<AppStateContext.Provider value={value}>
			{children}
		</AppStateContext.Provider>
	);
}

export function useApp() {
	const ctx = useContext(AppStateContext);
	if (!ctx) throw new Error('useApp must be used within <AppProvider>');
	return ctx;
}