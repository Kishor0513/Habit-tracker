import { useEffect, useMemo, useRef, useState } from 'react';
import {
	clearSpotifyAuth,
	completeSpotifyAuthFromUrl,
	ensureSpotifyAccessToken,
	getStoredSpotifyAuth,
	loadSpotifyWebPlaybackSdk,
	parseSpotifyInputToPlaybackPayload,
	spotifyGetMe,
	spotifyGetPlaybackState,
	spotifyNext,
	spotifyPause,
	spotifyPlay,
	spotifyPrevious,
	spotifySeek,
	spotifySetVolume,
	startSpotifyLogin,
} from '../lib/spotify.js';
import { useApp } from '../state/AppState.jsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function monthName(monthIndex) {
	return new Intl.DateTimeFormat(undefined, { month: 'long' }).format(
		new Date(2026, monthIndex, 1),
	);
}

function getCalendarCells(referenceDate) {
	const year = referenceDate.getFullYear();
	const month = referenceDate.getMonth();
	const first = new Date(year, month, 1);
	const startOffset = (first.getDay() + 6) % 7;
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const cells = [];
	for (let i = 0; i < startOffset; i += 1) cells.push(null);
	for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
	while (cells.length % 7 !== 0) cells.push(null);
	return cells;
}

function formatFocus(totalSeconds) {
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Circular Timer Ring ──────────────────────────────────────────────────────
const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;

function TimerRing({ seconds, maxSeconds, label }) {
	const progress = maxSeconds > 0 ? 1 - seconds / maxSeconds : 0;
	const offset = RING_C * (1 - progress);

	return (
		<div className="timerRingWrap">
			<svg className="timerRingSvg" width="108" height="108" viewBox="0 0 108 108">
				<circle className="timerRingBg" cx="54" cy="54" r={RING_R} />
				<circle
					className="timerRingFill"
					cx="54" cy="54" r={RING_R}
					strokeDasharray={RING_C}
					strokeDashoffset={offset}
				/>
				<text x="54" y="50" textAnchor="middle" dominantBaseline="middle" fill="var(--brand-light)" fontSize="13" fontWeight="700">
					{label}
				</text>
				<text x="54" y="65" textAnchor="middle" dominantBaseline="middle" fill="var(--text-muted)" fontSize="8" textTransform="uppercase">
					FOCUS
				</text>
			</svg>
		</div>
	);
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function PlayIcon() {
	return <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2.5l8 4.5-8 4.5V2.5z" /></svg>;
}
function PauseIcon() {
	return <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2.5" y="2" width="3.5" height="10" rx="1" /><rect x="8" y="2" width="3.5" height="10" rx="1" /></svg>;
}

// ─── ProductivityHub ──────────────────────────────────────────────────────────
export default function ProductivityHub() {
	const { api, user, session, auth } = useApp();
	const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? '';
	const redirectUri = window.location.origin + window.location.pathname;
	const playerRef = useRef(null);
	const authCompletedRef = useRef(false);

	const FOCUS_DEFAULT = 25 * 60;

	// Timer & Clock State
	const [now, setNow] = useState(() => new Date());
	const [focusSeconds, setFocusSeconds] = useState(FOCUS_DEFAULT);
	const [focusMax, setFocusMax] = useState(FOCUS_DEFAULT);
	const [running, setRunning] = useState(false);

	// Spotify State
	const [spotifyMe, setSpotifyMe] = useState(null);
	const [spotifyDeviceId, setSpotifyDeviceId] = useState('');
	const [spotifyState, setSpotifyState] = useState(null);
	const [spotifyAuthed, setSpotifyAuthed] = useState(Boolean(getStoredSpotifyAuth()));
	const [spotifyStatus, setSpotifyStatus] = useState('Disconnected');
	const [volumePercent, setVolumePercent] = useState(75);

	// Calendar State
	const [events, setEvents] = useState([]);
	const [calendarBusy, setCalendarBusy] = useState(false);
	const [calendarError, setCalendarError] = useState(null);

	// Clock Tick
	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(id);
	}, []);

	// Focus Countdown
	useEffect(() => {
		if (!running) return;
		const id = window.setInterval(() => {
			setFocusSeconds((prev) => {
				if (prev <= 1) { window.clearInterval(id); setRunning(false); return 0; }
				return prev - 1;
			});
		}, 1000);
		return () => window.clearInterval(id);
	}, [running]);

	// REAL Google Calendar Fetch
	const fetchCalendar = async () => {
		const token = session?.provider_token;
		if (!token) {
			setCalendarError('No Google access token. Sign in with Google to sync calendar.');
			return;
		}

		try {
			setCalendarBusy(true);
			setCalendarError(null);
			const timeMin = new Date().toISOString();
			const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=5&orderBy=startTime&singleEvents=true`;
			
			const res = await fetch(url, {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (!res.ok) {
				const errBody = await res.json();
				throw new Error(errBody?.error?.message || 'Failed to fetch calendar');
			}

			const data = await res.json();
			const mapped = (data.items || []).map(item => ({
				id: item.id,
				title: item.summary,
				time: item.start.dateTime 
					? new Date(item.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
					: 'All Day',
			}));
			setEvents(mapped);
		} catch (e) {
			setCalendarError(e.message);
		} finally {
			setCalendarBusy(false);
		}
	};

	useEffect(() => {
		if (user && session?.provider_token) fetchCalendar();
	}, [user, session?.provider_token]);

	// Spotify Logic
	useEffect(() => {
		if (!spotifyClientId || authCompletedRef.current) return;
		completeSpotifyAuthFromUrl({ clientId: spotifyClientId, redirectUri })
			.then((completed) => {
				if (completed) {
					authCompletedRef.current = true;
					setSpotifyAuthed(true);
				}
			}).catch(() => {});
	}, [spotifyClientId, redirectUri]);

	useEffect(() => {
		if (!spotifyClientId || !spotifyAuthed) return;
		let alive = true;
		(async () => {
			try {
				await ensureSpotifyAccessToken(spotifyClientId);
				const [me, state] = await Promise.all([
					spotifyGetMe(spotifyClientId),
					spotifyGetPlaybackState(spotifyClientId).catch(() => null),
				]);
				if (alive) {
					setSpotifyMe(me);
					setSpotifyState(state);
					setSpotifyStatus('Auth Active');
				}
			} catch (e) {
				setSpotifyStatus('Auth Failed');
			}
		})();
		return () => { alive = false; };
	}, [spotifyAuthed, spotifyClientId]);

	const trackName = spotifyState?.item?.name || spotifyState?.track_window?.current_track?.name || '';
	const isPlaying = Boolean(spotifyState?.is_playing || spotifyState?.paused === false);

	return (
		<div className="stack" style={{ gap: 20 }}>
			{/* System Status / Clock */}
			<div className="card bento-item" style={{ background: 'var(--surface-container-low)' }}>
				<div className="row between" style={{ alignItems: 'flex-start' }}>
					<div className="stack" style={{ gap: 4 }}>
						<div className="hubClock" style={{ fontSize: '1.8rem' }}>
							{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
						</div>
						<div className="subtle" style={{ fontSize: '0.8rem' }}>
							{now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
						</div>
					</div>
					<div className="stack" style={{ alignItems: 'flex-end', gap: 6 }}>
						<span className="badge brand" style={{ fontSize: '10px' }}>{running ? 'Focused' : 'Ready'}</span>
						<div className="dot" style={{ width: 8, height: 8, background: running ? 'var(--warning)' : 'var(--success)' }} />
					</div>
				</div>
			</div>

			{/* Focus Timer */}
			<div className="card bento-item">
				<div className="sectionHeader">
					<h2>Focus</h2>
					<div className="row" style={{ gap: 6 }}>
						<button className="btn ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => { setFocusSeconds(25*60); setFocusMax(25*60); setRunning(false); }}>25m</button>
						<button className="btn ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => { setFocusSeconds(50*60); setFocusMax(50*60); setRunning(false); }}>50m</button>
					</div>
				</div>
				<div className="row" style={{ marginTop: 12, gap: 16, alignItems: 'center' }}>
					<TimerRing seconds={focusSeconds} maxSeconds={focusMax} label={formatFocus(focusSeconds)} />
					<button
						className={`btn ${running ? 'secondary' : 'primary'}`}
						style={{ flex: 1, height: 44, borderRadius: 22 }}
						onClick={() => setRunning(!running)}
					>
						{running ? 'Pause' : 'Start Session'}
					</button>
				</div>
			</div>

			{/* Google Calendar */}
			<div className="card bento-item">
				<div className="sectionHeader">
					<h2>Up Next</h2>
					<button className="btn ghost icon" onClick={fetchCalendar} disabled={calendarBusy}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
					</button>
				</div>
				<div className="stack" style={{ gap: 8, marginTop: 12 }}>
					{calendarError ? (
						<div className="stack" style={{ gap: 8 }}>
							<p className="subtle" style={{ fontSize: '0.75rem', color: 'var(--danger-mid)' }}>{calendarError}</p>
							<button className="btn ghost" style={{ fontSize: '11px' }} onClick={() => auth.signInWithGoogle()}>Link Google</button>
						</div>
					) : events.length === 0 ? (
						<p className="subtle" style={{ fontSize: '0.8rem' }}>No upcoming events synced.</p>
					) : (
						events.map(ev => (
							<div key={ev.id} className="row between" style={{ background: 'var(--surface-container)', padding: '10px 12px', borderRadius: 12 }}>
								<div className="stack" style={{ gap: 2 }}>
									<div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ev.title}</div>
									<div className="subtle" style={{ fontSize: '0.75rem' }}>{ev.time}</div>
								</div>
								<div className="dot" style={{ width: 6, height: 6, background: 'var(--brand)' }} />
							</div>
						))
					)}
				</div>
			</div>

			{/* Spotify Quick Control */}
			<div className="card bento-item" style={{ background: 'var(--surface-container-high)', border: 'none' }}>
				<div className="sectionHeader">
					<h2>Spotify</h2>
					<span className={`badge ${isPlaying ? 'success' : ''}`} style={{ fontSize: '9px' }}>
						{isPlaying ? 'Live' : 'Paused'}
					</span>
				</div>
				
				{!spotifyAuthed ? (
					<button className="btn primary" style={{ marginTop: 12, width: '100%' }} onClick={() => startSpotifyLogin({ clientId: spotifyClientId, redirectUri })}>
						Connect Spotify
					</button>
				) : (
					<div className="stack" style={{ gap: 12, marginTop: 12 }}>
						<div className="row" style={{ gap: 12 }}>
							<div className="spotifyCover" style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--surface-container-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
								♪
							</div>
							<div className="stack" style={{ gap: 2, minWidth: 0 }}>
								<div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trackName || 'Not Playing'}</div>
								<div className="subtle" style={{ fontSize: '0.75rem' }}>{spotifyMe?.display_name || 'Spotify'}</div>
							</div>
						</div>
						<div className="row" style={{ gap: 8 }}>
							<button className="btn secondary" style={{ flex: 1, height: 36 }} onClick={async () => {
								if (isPlaying) await spotifyPause(spotifyClientId, spotifyDeviceId);
								else await spotifyPlay(spotifyClientId, spotifyDeviceId);
							}}>
								{isPlaying ? <PauseIcon /> : <PlayIcon />}
							</button>
							<button className="btn ghost" style={{ height: 36 }} onClick={() => spotifyNext(spotifyClientId, spotifyDeviceId)}>⏭</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
