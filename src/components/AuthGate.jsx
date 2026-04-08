import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState.jsx';
import { useToast } from '../state/ToastState.jsx';

function getAuthErrorMessage(error, fallback) {
	const message = String(error?.message ?? '').toLowerCase();

	if (
		message.includes('redirect_uri') ||
		message.includes('redirect url') ||
		message.includes('invalid redirect')
	) {
		return 'The redirect URL is not allowed in Supabase. Add your local and production app URLs in Authentication > URL Configuration.';
	}

	if (message.includes('email not confirmed')) {
		return 'Account created, but email confirmation is required before sign-in. Check your inbox or disable confirmation for local testing.';
	}

	if (message.includes('invalid login credentials')) {
		return 'The email or password is incorrect, or the account has not been confirmed yet.';
	}

	if (message.includes('user already registered')) {
		return 'That email is already registered. Try signing in or using the password reset link.';
	}

	if (message.includes('supabase is not configured')) {
		return 'Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.';
	}

	return error?.message ?? fallback;
}

export default function AuthGate({ children }) {
	const { supabaseConfigured, user, auth, authLoading } = useApp();
	const toast = useToast();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [busy, setBusy] = useState(false);

	const canContinue = !supabaseConfigured || Boolean(user);

	const help = useMemo(() => {
		if (!supabaseConfigured) return 'Supabase is not configured.';
		return 'Sign in with Google, email link, or email and password to access your workspace.';
	}, [supabaseConfigured]);

	if (canContinue) return children;

	if (authLoading) {
		return (
			<div
				className="app"
				style={{ alignItems: 'center', justifyContent: 'center' }}
			>
				<p style={{ color: 'var(--text-muted)' }}>Loading workspace...</p>
			</div>
		);
	}

	return (
		<div
			className="app"
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: 'var(--bg)',
			}}
		>
			<div
				className="authCard"
				style={{ padding: '40px', borderRadius: 'var(--radius-lg)' }}
			>
				<div style={{ textAlign: 'center', marginBottom: '32px' }}>
					<div
						style={{
							fontSize: '11px',
							letterSpacing: '0.16em',
							textTransform: 'uppercase',
							color: 'var(--text-faint)',
							fontWeight: 700,
							marginBottom: '12px',
						}}
					>
						Workspace access
					</div>
					<h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Log In</h2>
					<p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{help}</p>
				</div>

				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						margin: '20px 0',
						color: 'var(--border)',
					}}
				>
					<div
						style={{ flex: 1, height: '1px', background: 'var(--border)' }}
					/>
					<span
						style={{
							padding: '0 10px',
							fontSize: '12px',
							color: 'var(--text-faint)',
						}}
					>
						OR
					</span>
					<div
						style={{ flex: 1, height: '1px', background: 'var(--border)' }}
					/>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
					<input
						className="input"
						type="email"
						placeholder="Email address..."
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
					<input
						className="input"
						type="password"
						placeholder="Password..."
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '10px',
						}}
					>
						<button
							className="btn btn-primary"
							style={{ width: '100%', height: '36px' }}
							disabled={!email.trim() || !password || busy}
							onClick={async () => {
								try {
									setBusy(true);
									await auth.signInWithPassword(email.trim(), password);
								} catch (e) {
									toast.push(
										getAuthErrorMessage(e, 'Password sign-in failed.'),
									);
								} finally {
									setBusy(false);
								}
							}}
						>
							Sign in
						</button>
						<button
							className="btn ghost"
							style={{ width: '100%', height: '36px' }}
							disabled={!email.trim() || !password || busy}
							onClick={async () => {
								try {
									setBusy(true);
									await auth.signUpWithPassword(email.trim(), password);
									toast.push(
										'Account created. Check your email if confirmation is required.',
									);
								} catch (e) {
									toast.push(getAuthErrorMessage(e, 'Sign-up failed.'));
								} finally {
									setBusy(false);
								}
							}}
						>
							Create account
						</button>
					</div>
					<button
						className="btn btn-primary"
						style={{ width: '100%', height: '32px' }}
						disabled={!email.trim() || busy}
						onClick={async () => {
							try {
								setBusy(true);
								await auth.signInWithOtp(email.trim());
								toast.push('Check your email for a sign-in link.');
							} catch (e) {
								toast.push(getAuthErrorMessage(e, 'Magic link failed.'));
							} finally {
								setBusy(false);
							}
						}}
					>
						Email Login
					</button>
					<button
						className="btn ghost"
						style={{ width: '100%', height: '32px' }}
						disabled={!email.trim() || busy}
						onClick={async () => {
							try {
								setBusy(true);
								await auth.resetPassword(email.trim());
								toast.push('Password reset email sent.');
							} catch (e) {
								toast.push(getAuthErrorMessage(e, 'Password reset failed.'));
							} finally {
								setBusy(false);
							}
						}}
					>
						Forgot password?
					</button>
				</div>
			</div>
		</div>
	);
}
