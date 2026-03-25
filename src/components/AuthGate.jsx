import React, { useMemo, useState } from "react";
import { useApp } from "../state/AppState.jsx";
import { useToast } from "../state/ToastState.jsx";

export default function AuthGate({ children }) {
  const { supabaseConfigured, user, auth, authLoading } = useApp();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const canContinue = !supabaseConfigured || Boolean(user);

  const help = useMemo(() => {
    if (!supabaseConfigured) {
      return "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a .env file to enable cloud sync.";
    }
    return "Sign in to sync your habits/projects across devices.";
  }, [supabaseConfigured]);

  if (canContinue) return children;

  if (authLoading) {
    return (
      <div className="card">
        <h2>Loading…</h2>
        <p className="subtle">Checking your session.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Sign in</h2>
      <p className="subtle">{help}</p>
      <div className="stack">
        <input
          className="input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="btn primary"
          type="button"
          disabled={!email.trim() || busy}
          onClick={async () => {
            try {
              setBusy(true);
              await auth.signInWithOtp(email.trim());
              toast.push("Check your email for a sign-in link.");
            } catch (e) {
              toast.push(e?.message ?? "Sign-in failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Email me a sign-in link
        </button>
      </div>
    </div>
  );
}
