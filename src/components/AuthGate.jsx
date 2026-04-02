import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState.jsx';
import { useToast } from '../state/ToastState.jsx';

export default function AuthGate({ children }) {
	const { supabaseConfigured, user, auth, authLoading } = useApp();
	const toast = useToast();
	const [email, setEmail] = useState('');
	const [busy, setBusy] = useState(false);

	const canContinue = !supabaseConfigured || Boolean(user);

	const help = useMemo(() => {
		if (!supabaseConfigured) return 'Supabase is not configured.';
		return 'Enter your email or continue with Google to access your workspace.';
	}, [supabaseConfigured]);

	if (canContinue) return children;

	if (authLoading) {
		return (
			<div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
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
						Premium workspace
					</div>
					<h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Log In</h2>
					<p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{help}</p>
				</div>
				
				<button 
					className="btn" 
					style={{ 
						width: '100%', height: '36px', 
						background: 'var(--bg-panel-solid)', color: 'var(--text-main)', 
						border: '1px solid var(--border-muted)', 
						display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
						fontWeight: 500
					}}
					onClick={async () => {
						try {
							setBusy(true);
							await auth.signInWithGoogle();
						} catch (e) { toast.push(e?.message ?? 'Google Sign-in failed.'); }
						finally { setBusy(false); }
					}}
				>
					<svg width="16" height="16" viewBox="0 0 18 18">
						<path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
						<path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
						<path d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
						<path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.443 2.048.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
					</svg>
					Continue with Google
				</button>
				
				<div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--border)' }}>
					<div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
					<span style={{ padding: '0 10px', fontSize: '12px', color: 'var(--text-faint)' }}>OR</span>
					<div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
					<input
						className="input"
						type="email"
						placeholder="Email address..."
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
					<button
						className="btn btn-primary"
						style={{ width: '100%', height: '32px' }}
						disabled={!email.trim() || busy}
						onClick={async () => {
							try {
								setBusy(true);
								await auth.signInWithOtp(email.trim());
								toast.push('Check your email for a sign-in link.');
							} catch (e) { toast.push(e?.message ?? 'Magic link failed.'); }
							finally { setBusy(false); }
						}}
					>
						Email Login
					</button>
				</div>
			</div>
		</div>
	);
}
