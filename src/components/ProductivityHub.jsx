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

function isPalindromeClock(date) {
	const hh = String(date.getHours()).padStart(2, '0');
	const mm = String(date.getMinutes()).padStart(2, '0');
	return `${hh}${mm}` === `${mm}${hh}`;
}

function formatFocus(totalSeconds) {
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatMs(ms) {
	const totalSeconds = Math.max(0, Math.floor((ms || 0) / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// ─── Circular Timer Ring ──────────────────────────────────────────────────────
const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R; // circumference

function TimerRing({ seconds, maxSeconds, label }) {
	const progress = maxSeconds > 0 ? 1 - seconds / maxSeconds : 0;
	const offset = RING_C * (1 - progress);

	return (
		<div className="timerRingWrap">
			<svg
				className="timerRingSvg"
				width="108"
				height="108"
				viewBox="0 0 108 108"
				aria-label={`Focus timer: ${label}`}
			>
				{/* Track */}
				<circle className="timerRingBg" cx="54" cy="54" r={RING_R} />
				{/* Fill */}
				<circle
					className="timerRingFill"
					cx="54"
					cy="54"
					r={RING_R}
					strokeDasharray={RING_C}
					strokeDashoffset={offset}
				/>
				{/* Center text */}
				<text
					x="54"
					y="50"
					textAnchor="middle"
					dominantBaseline="middle"
					fill="var(--brand-light)"
					fontSize="13"
					fontFamily="ui-monospace, monospace"
					fontWeight="700"
					letterSpacing="-0.5"
				>
					{label}
				</text>
				<text
					x="54"
					y="65"
					textAnchor="middle"
					dominantBaseline="middle"
					fill="var(--text-muted)"
					fontSize="8"
					fontFamily="ui-monospace, monospace"
					letterSpacing="1"
					textTransform="uppercase"
				>
					FOCUS
				</text>
			</svg>
		</div>
	);
}

// ─── Play/Pause Icon ──────────────────────────────────────────────────────────
function PlayIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
			<path d="M3 2.5l8 4.5-8 4.5V2.5z" />
		</svg>
	);
}
function PauseIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
			<rect x="2.5" y="2" width="3.5" height="10" rx="1" />
			<rect x="8" y="2" width="3.5" height="10" rx="1" />
		</svg>
	);
}

// ─── ProductivityHub ──────────────────────────────────────────────────────────
export default function ProductivityHub() {
	const { api } = useApp();
	const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? '';
	const redirectUri = window.location.origin + window.location.pathname;
	const playerRef = useRef(null);
	const authCompletedRef = useRef(false);

	const FOCUS_DEFAULT = 25 * 60;

	const [now, setNow] = useState(() => new Date());
	const [focusSeconds, setFocusSeconds] = useState(FOCUS_DEFAULT);
	const [focusMax, setFocusMax] = useState(FOCUS_DEFAULT);
	const [running, setRunning] = useState(false);
	const [spotifyInput, setSpotifyInput] = useState('');
	const [spotifyMe, setSpotifyMe] = useState(null);
	const [spotifyDeviceId, setSpotifyDeviceId] = useState('');
	const [spotifyState, setSpotifyState] = useState(null);
	const [spotifyAuthed, setSpotifyAuthed] = useState(Boolean(getStoredSpotifyAuth()));
	const [spotifyBusy, setSpotifyBusy] = useState(false);
	const [spotifyError, setSpotifyError] = useState(null);
	const [spotifyStatus, setSpotifyStatus] = useState('Disconnected');
	const [volumePercent, setVolumePercent] = useState(75);
	const [positionMs, setPositionMs] = useState(0);

	// Clock tick
	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(id);
	}, []);

	// Focus countdown
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

	// Spotify: load saved input
	useEffect(() => {
		if (!api) return;
		let alive = true;
		api.getSetting('spotify_last_input').then((saved) => {
			if (!alive || !saved?.value) return;
			setSpotifyInput(String(saved.value));
		}).catch(() => {});
		return () => { alive = false; };
	}, [api]);

	// Spotify: complete auth from URL
	useEffect(() => {
		if (!spotifyClientId || authCompletedRef.current) return;
		let mounted = true;
		completeSpotifyAuthFromUrl({ clientId: spotifyClientId, redirectUri })
			.then((completed) => {
				if (!mounted || !completed) return;
				authCompletedRef.current = true;
				setSpotifyAuthed(true);
			}).catch(() => {});
		return () => { mounted = false; };
	}, [spotifyClientId, redirectUri]);

	// Spotify: load profile & state
	useEffect(() => {
		if (!spotifyClientId || !spotifyAuthed) return;
		let alive = true;
		(async () => {
			try {
				setSpotifyStatus('Connecting…');
				await ensureSpotifyAccessToken(spotifyClientId);
				const [me, state] = await Promise.all([
					spotifyGetMe(spotifyClientId),
					spotifyGetPlaybackState(spotifyClientId).catch(() => null),
				]);
				if (!alive) return;
				setSpotifyMe(me);
				setSpotifyState(state);
				setPositionMs(state?.progress_ms ?? 0);
				setSpotifyStatus('Auth Active');
			} catch (e) {
				console.error('[Spotify] Profile load error:', e.message);
				setSpotifyError(e.message);
				setSpotifyStatus('Auth Failed');
			}
		})();
		return () => { alive = false; };
	}, [spotifyAuthed, spotifyClientId]);

	// Spotify: Web Playback SDK
	useEffect(() => {
		if (!spotifyClientId || !spotifyAuthed) return;
		let cancelled = false;
		(async () => {
			try {
				setSpotifyStatus('Loading SDK…');
				await loadSpotifyWebPlaybackSdk();
				if (cancelled || !window.Spotify?.Player) return;
				
				const player = new window.Spotify.Player({
					name: 'Habit Tracker Web Player',
					getOAuthToken: async (cb) => {
						const token = await ensureSpotifyAccessToken(spotifyClientId);
						cb(token || '');
					},
					volume: volumePercent / 100,
				});

				player.addListener('ready', ({ device_id }) => {
					console.info('[Spotify] Device Ready:', device_id);
					setSpotifyDeviceId(device_id);
					setSpotifyStatus('Ready');
					setSpotifyError(null);
				});

				player.addListener('not_ready', ({ device_id }) => {
					console.warn('[Spotify] Device has gone offline:', device_id);
					setSpotifyStatus('Device Offline');
				});

				player.addListener('initialization_error', ({ message }) => {
					console.error('[Spotify] Initialization Error:', message);
					setSpotifyError(`Initialization Error: ${message}. This usually requires Spotify Premium.`);
					setSpotifyStatus('Error');
				});

				player.addListener('authentication_error', ({ message }) => {
					console.error('[Spotify] Authentication Error:', message);
					setSpotifyError(`Authentication Error: ${message}. Redirect URI might not be whitelisted.`);
					setSpotifyStatus('Error');
				});

				player.addListener('account_error', ({ message }) => {
					console.error('[Spotify] Account Error:', message);
					setSpotifyError(`Account Error: ${message}. Spotify Premium is required for the Web Player.`);
					setSpotifyStatus('Error');
				});

				player.addListener('playback_error', ({ message }) => {
					console.error('[Spotify] Playback Error:', message);
					// Don't show critical error block, just log it
				});

				player.addListener('player_state_changed', (state) => {
					if (!state) return;
					setSpotifyState(state);
					setPositionMs(state.position ?? 0);
				});

				await player.connect();
				playerRef.current = player;
			} catch (e) {
				console.error('[Spotify] SDK setup error:', e.message);
				setSpotifyError(e.message);
				setSpotifyStatus('SDK Error');
			}
		})();
		return () => {
			cancelled = true;
			playerRef.current?.disconnect?.();
			playerRef.current = null;
		};
	}, [spotifyAuthed, spotifyClientId, volumePercent]);

	// Spotify: polling
	useEffect(() => {
		if (!spotifyClientId || !spotifyAuthed) return;
		const id = window.setInterval(() => {
			spotifyGetPlaybackState(spotifyClientId).then((state) => {
				setSpotifyState(state);
				setPositionMs((prev) => {
					if (typeof state?.progress_ms !== 'number') return prev;
					return state.progress_ms;
				});
				setSpotifyError(null); // Clear error if successful API response
			}).catch((e) => {
				// Silently handle polling errors, but could be informative
				// console.warn('[Spotify] Polling error:', e.message);
			});
		}, 8000);
		return () => window.clearInterval(id);
	}, [spotifyAuthed, spotifyClientId]);

	// Derived Spotify values
	const calendarCells = useMemo(() => getCalendarCells(now), [now]);
	const todayDay = now.getDate();
	const palClock = isPalindromeClock(now);
	const trackName =
		spotifyState?.item?.name ||
		spotifyState?.track_window?.current_track?.name || '';
	const artists =
		spotifyState?.item?.artists?.map((x) => x.name).join(', ') ||
		spotifyState?.track_window?.current_track?.artists?.map((x) => x.name).join(', ') || '';
	const durationMs = spotifyState?.item?.duration_ms || spotifyState?.duration || 0;
	const albumArt =
		spotifyState?.item?.album?.images?.[1]?.url ||
		spotifyState?.track_window?.current_track?.album?.images?.[1]?.url ||
		spotifyState?.item?.album?.images?.[0]?.url ||
		spotifyState?.track_window?.current_track?.album?.images?.[0]?.url || '';
	const isPlaying = Boolean(spotifyState?.is_playing || spotifyState?.paused === false);

	function setTimer(mins) {
		const s = mins * 60;
		setFocusSeconds(s);
		setFocusMax(s);
		setRunning(false);
	}

	return (
		<div className="card productivityHub">
			<h2>Focus Hub</h2>
			<div className="stack">

				{/* ─── Clock ─── */}
				<div className="hubTopRow">
					<div>
						<div className="hubClock">
							{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
						</div>
						<div className="subtle" style={{ marginTop: 2 }}>
							{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
						</div>
					</div>
					<span className={`badge ${palClock ? 'isPalClock' : ''}`}>
						{palClock ? '🔄 Palindrome' : 'Standard time'}
					</span>
				</div>

				{/* ─── Focus Timer ─── */}
				<div className="focusTimerRow">
					<div className="timerLabel">Pomodoro timer</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
						<TimerRing
							seconds={focusSeconds}
							maxSeconds={focusMax}
							label={formatFocus(focusSeconds)}
						/>
						<div className="stack" style={{ gap: 8, flex: 1 }}>
							<div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
								<button className="btn ghost" type="button" style={{ minWidth: 52 }} onClick={() => setTimer(15)}>15m</button>
								<button className="btn ghost" type="button" style={{ minWidth: 52 }} onClick={() => setTimer(25)}>25m</button>
								<button className="btn ghost" type="button" style={{ minWidth: 52 }} onClick={() => setTimer(50)}>50m</button>
							</div>
							<div className="row" style={{ gap: 6 }}>
								<button
									className={`btn ${running ? 'danger' : 'primary'}`}
									type="button"
									onClick={() => setRunning((v) => !v)}
									style={{ flex: 1 }}
								>
									{running ? <><PauseIcon /> Pause</> : <><PlayIcon /> Start</>}
								</button>
								<button
									className="btn ghost"
									type="button"
									onClick={() => { setRunning(false); setFocusSeconds(focusMax); }}
								>
									↺
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* ─── Calendar ─── */}
				<div className="calendarCard">
					<div className="calendarTitle">{monthName(now.getMonth())} {now.getFullYear()}</div>
					<div className="calendarWeekdays">
						{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
							<span key={i}>{d}</span>
						))}
					</div>
					<div className="calendarGrid">
						{calendarCells.map((cell, idx) => (
							<div
								key={`${idx}-${cell ?? 'x'}`}
								className={`calendarCell ${cell === todayDay ? 'isToday' : ''}`}
							>
								{cell ?? ''}
							</div>
						))}
					</div>
				</div>

				{/* ─── Spotify ─── */}
				<div>
					<div className="row between" style={{ marginBottom: 10 }}>
						<div className="timerLabel">Spotify</div>
						<a className="subtle" style={{ fontSize: '0.8rem' }} href="https://open.spotify.com" target="_blank" rel="noreferrer">
							Open ↗
						</a>
					</div>

					{!spotifyClientId ? (
						<p className="subtle" style={{ fontSize: '0.82rem' }}>
							Add <code style={{ color: 'var(--brand-mid)', fontFamily: 'monospace' }}>VITE_SPOTIFY_CLIENT_ID</code> to your .env to enable Spotify controls.
						</p>
					) : !spotifyAuthed ? (
						<div className="stack" style={{ gap: 8 }}>
							<button
								className="btn primary"
								type="button"
								onClick={() => startSpotifyLogin({ clientId: spotifyClientId, redirectUri })}
							>
								Connect Spotify
							</button>
							<p className="subtle" style={{ margin: 0, fontSize: '0.8rem' }}>Requires Spotify Premium for full playback control.</p>
						</div>
					) : (
						<div className="stack" style={{ gap: 10 }}>
							<div className="row between" style={{ alignItems: 'center' }}>
								<div className="subtle" style={{ fontSize: '0.8rem' }}>Status: {spotifyStatus}</div>
								<span className={`badge ${spotifyStatus === 'Ready' ? 'success' : spotifyStatus.includes('Error') ? 'danger' : ''}`}>
									{spotifyStatus === 'Ready' ? '● Active' : spotifyStatus}
								</span>
							</div>

							{spotifyError && (
								<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px' }}>
									<div className="subtle" style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: 6 }}>Diagnostic Error:</div>
									<div style={{ fontSize: '0.85rem', color: '#fecaca' }}>{spotifyError}</div>
								</div>
							)}

							<div className="spotifyPlayerCard">
								<div className="spotifyPlayerHead">
									<div className="subtle" style={{ fontSize: '0.8rem' }}>
										{spotifyMe?.display_name || spotifyMe?.id || 'Spotify'}
									</div>
									<span className={`badge ${isPlaying ? 'success' : ''}`}>
										{isPlaying ? '▶ Playing' : '⏸ Paused'}
									</span>
								</div>

								<div className="spotifyTrackRow">
									<div className="spotifyCoverWrap">
										{albumArt ? (
											<img className="spotifyCover" src={albumArt} alt={trackName || 'Album art'} />
										) : (
											<div className="spotifyCover spotifyCoverFallback">♪</div>
										)}
									</div>
									<div className="spotifyTrackMeta">
										<div className="spotifyTrackTitle">{trackName || 'No active track'}</div>
										<div className="subtle" style={{ fontSize: '0.8rem' }}>
											{artists || 'Pick a playlist or album to start'}
										</div>
									</div>
								</div>
							</div>

							<input
								className="input"
								type="text"
								placeholder="Paste Spotify URL…"
								value={spotifyInput}
								onChange={(e) => setSpotifyInput(e.target.value)}
							/>

							<div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
								<button
									className="btn ghost"
									type="button"
									disabled={spotifyBusy}
									onClick={async () => {
										const payload = parseSpotifyInputToPlaybackPayload(spotifyInput);
										if (!payload) return;
										try {
											setSpotifyBusy(true);
											await spotifyPlay(spotifyClientId, spotifyDeviceId, payload);
											if (api) await api.setSetting('spotify_last_input', spotifyInput.trim());
										} catch (e) {
											console.error(e?.message ?? 'Could not start playback.');
										} finally { setSpotifyBusy(false); }
									}}
								>
									▶ Play
								</button>
								<button className="btn ghost" type="button" onClick={async () => {
									try { setSpotifyError(null); await spotifyPrevious(spotifyClientId, spotifyDeviceId); } catch (e) { setSpotifyError(e.message); }
								}}>⏮</button>
								<button className="btn primary" type="button" onClick={async () => {
									try {
										setSpotifyError(null);
										if (isPlaying) await spotifyPause(spotifyClientId, spotifyDeviceId);
										else await spotifyPlay(spotifyClientId, spotifyDeviceId);
									} catch (e) { setSpotifyError(e.message); }
								}}>
									{isPlaying ? <PauseIcon /> : <PlayIcon />}
								</button>
								<button className="btn ghost" type="button" onClick={async () => {
									try { setSpotifyError(null); await spotifyNext(spotifyClientId, spotifyDeviceId); } catch (e) { setSpotifyError(e.message); }
								}}>⏭</button>
								<button className="btn danger" type="button" onClick={() => {
									clearSpotifyAuth();
									playerRef.current?.disconnect?.();
									playerRef.current = null;
									setSpotifyAuthed(false);
									setSpotifyMe(null);
									setSpotifyState(null);
									setSpotifyDeviceId('');
								}}>Disconnect</button>
							</div>

							<div className="spotifyNowPlaying">
								<input
									className="input"
									type="range"
									min={0}
									max={Math.max(1000, durationMs)}
									value={Math.min(positionMs, Math.max(1000, durationMs))}
									onChange={(e) => setPositionMs(Number(e.target.value))}
									onMouseUp={async () => {
										try { await spotifySeek(spotifyClientId, positionMs, spotifyDeviceId); }
										catch (e) { console.error(e?.message); }
									}}
								/>
								<div className="row between">
									<span className="subtle" style={{ fontSize: '0.78rem' }}>{formatMs(positionMs)}</span>
									<span className="subtle" style={{ fontSize: '0.78rem' }}>{formatMs(durationMs)}</span>
								</div>
								<div className="row" style={{ gap: 8 }}>
									<span className="subtle" style={{ fontSize: '0.78rem' }}>Vol</span>
									<input
										className="input"
										type="range"
										min={0}
										max={100}
										value={volumePercent}
										onChange={(e) => setVolumePercent(Number(e.target.value))}
										onMouseUp={async () => {
											try { await spotifySetVolume(spotifyClientId, volumePercent, spotifyDeviceId); }
											catch (e) { console.error(e?.message); }
										}}
									/>
									<span className="subtle" style={{ fontSize: '0.78rem' }}>{volumePercent}%</span>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
