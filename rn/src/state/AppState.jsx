import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { createSupabase, getSupabaseEnv } from "../supabase/client";
import { SupabaseHabitApi } from "../supabase/habitApi";
import { LocalHabitApi } from "../api/localHabitApi";

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
        const local = await LocalHabitApi.create();
        if (!alive) return;
        setApi(local);
        setUser(null);
        setAuthLoading(false);
        return;
      }

      const { data, error } = await client.auth.getUser();
      if (!alive) return;
      if (error) console.warn(error);
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
          const emailRedirectTo =
            Platform.OS === "web"
              ? window.location.origin + window.location.pathname
              : Linking.createURL("/");
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo }
          });
          if (error) throw error;
        },
        signInWithPassword: async (email, password) => {
          if (!supabase) throw new Error("Supabase is not configured.");
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        },
        signUpWithPassword: async (email, password) => {
          if (!supabase) throw new Error("Supabase is not configured.");
          const emailRedirectTo =
            Platform.OS === "web"
              ? window.location.origin + window.location.pathname
              : Linking.createURL("/");
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo }
          });
          if (error) throw error;
        },
        signOut: async () => {
          if (!supabase) return;
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        }
      }
    }),
    [api, dataVersion, supabaseConfigured, user, authLoading, supabase]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}

