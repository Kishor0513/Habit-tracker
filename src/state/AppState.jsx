import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { HabitApi } from "../api.js";
import { createSupabase, getSupabaseEnv } from "../supabase/client.js";
import { SupabaseHabitApi } from "../supabase/habitApi.js";

const AppStateContext = createContext(null);

export function AppProvider({ children }) {
  const [api, setApi] = useState(null);
  const [supabase, setSupabase] = useState(null);
  const [user, setUser] = useState(null);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const env = getSupabaseEnv();
    const client = createSupabase();
    setSupabaseConfigured(Boolean(env));
    setSupabase(client);

    let alive = true;
    async function boot() {
      if (!client) {
        const local = await HabitApi.create();
        if (!alive) return;
        setApi(local);
        setUser(null);
        setAuthLoading(false);
        return;
      }

      const { data, error } = await client.auth.getUser();
      if (!alive) return;
      if (error) {
        console.warn(error);
      }
      const nextUser = data?.user ?? null;
      setUser(nextUser);
      if (nextUser) setApi(new SupabaseHabitApi(client, nextUser.id));
      else setApi(null);
      setAuthLoading(false);
    }

    boot().catch((e) => console.error(e));

    const { data: sub } = client
      ? client.auth.onAuthStateChange((_event, session) => {
          const nextUser = session?.user ?? null;
          setUser(nextUser);
          if (nextUser) setApi(new SupabaseHabitApi(client, nextUser.id));
          else setApi(null);
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
      isReady: Boolean(api),
      refresh: () => setDataVersion((v) => v + 1),
      dataVersion,
      supabaseConfigured,
      user,
      authLoading,
      auth: {
        signInWithOtp: async (email) => {
          if (!supabase) throw new Error("Supabase is not configured.");
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin + window.location.pathname },
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
    [api, dataVersion, supabaseConfigured, user, authLoading, supabase],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
