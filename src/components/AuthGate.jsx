import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState.jsx';
import { useToast } from '../state/ToastState.jsx';

export default function AuthGate({ children }) {
	const { supabaseConfigured, user, auth, authLoading } = useApp();
	const toast = useToast();
	const [mode, setMode] = useState('password');
	const [isSignup, setIsSignup] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [busy, setBusy] = useState(false);

	const canContinue = !supabaseConfigured || Boolean(user);

	const help = useMemo(() => {
		if (!supabaseConfigured) {
			return 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a .env file to enable cloud sync.';
		}
		return 'Sign in to sync your habits/projects across devices.';
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
		<div className="card authCard">
			<h2>{isSignup ? 'Create account' : 'Sign in'}</h2>
			<p className="subtle">{help}</p>
			<div
				className="row"
				style={{ gap: 8, flexWrap: 'wrap', marginBottom: 8 }}
			>
				<button
					className={`btn ${mode === 'password' ? 'primary' : ''}`}
					type="button"
					onClick={() => setMode('password')}
				>
					Email + password
				</button>
				<button
					className={`btn ${mode === 'magic' ? 'primary' : ''}`}
					type="button"
					onClick={() => setMode('magic')}
				>
					Magic link
				</button>
			</div>
			<div className="stack">
				<input
					className="input"
					type="email"
					placeholder="you@example.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				{mode === 'password' ? (
					<input
						className="input"
						type="password"
						placeholder="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
				) : null}
				<button
					className="btn primary"
					type="button"
					disabled={
						!email.trim() ||
						(mode === 'password' && password.length < 6) ||
						busy
					}
					onClick={async () => {
						try {
							setBusy(true);
							if (mode === 'magic') {
								await auth.signInWithOtp(email.trim());
								toast.push('Check your email for a sign-in link.');
								return;
							}

							if (isSignup) {
								await auth.signUpWithPassword(email.trim(), password);
								toast.push('Account created. Verify email if prompted.');
							} else {
								await auth.signInWithPassword(email.trim(), password);
								toast.push('Signed in.');
							}
						} catch (e) {
							toast.push(e?.message ?? 'Sign-in failed.');
						} finally {
							setBusy(false);
						}
					}}
				>
					{mode === 'magic'
						? 'Email me a sign-in link'
						: isSignup
							? 'Create account'
							: 'Sign in'}
				</button>
				{mode === 'password' ? (
					<button
						className="btn ghost"
						type="button"
						onClick={() => setIsSignup((v) => !v)}
					>
						{isSignup
							? 'Already have an account? Sign in'
							: 'Need an account? Sign up'}
					</button>
				) : null}
			</div>
		</div>
	);
}
