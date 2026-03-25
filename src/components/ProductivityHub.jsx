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

export default function ProductivityHub() {
	const { api } = useApp();
	const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? '';
	const redirectUri = window.location.origin + window.location.pathname;
	const playerRef = useRef(null);
	const authCompletedRef = useRef(false);

	const [now, setNow] = useState(() => new Date());
	const [focusSeconds, setFocusSeconds] = useState(25 * 60);
	const [running, setRunning] = useState(false);
	const [spotifyInput, setSpotifyInput] = useState('');
	const [spotifyMe, setSpotifyMe] = useState(null);
	const [spotifyDeviceId, setSpotifyDeviceId] = useState('');
	const [spotifyState, setSpotifyState] = useState(null);
	const [spotifyAuthed, setSpotifyAuthed] = useState(
		Boolean(getStoredSpotifyAuth()),
	);
	const [spotifyBusy, setSpotifyBusy] = useState(false);
	const [volumePercent, setVolumePercent] = useState(75);
	const [positionMs, setPositionMs] = useState(0);

	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(id);
	}, []);

	useEffect(() => {
		if (!api) return;
		let alive = true;
		api
			.getSetting('spotify_last_input')
			.then((saved) => {
				if (!alive || !saved?.value) return;
				setSpotifyInput(String(saved.value));
			})
			.catch(() => {});

		return () => {
			alive = false;
		};
	}, [api]);

	useEffect(() => {
		if (!spotifyClientId || authCompletedRef.current) return;
		let mounted = true;
		completeSpotifyAuthFromUrl({ clientId: spotifyClientId, redirectUri })
			.then((completed) => {
				if (!mounted || !completed) return;
				authCompletedRef.current = true;
				setSpotifyAuthed(true);
			})
			.catch(() => {});

		return () => {
			mounted = false;
		};
	}, [spotifyClientId, redirectUri]);

	useEffect(() => {
		if (!spotifyClientId || !spotifyAuthed) return;
		let alive = true;

		const loadProfileAndState = async () => {
			try {
				await ensureSpotifyAccessToken(spotifyClientId);
				const [me, state] = await Promise.all([
					spotifyGetMe(spotifyClientId),
					spotifyGetPlaybackState(spotifyClientId).catch(() => null),
				]);
				if (!alive) return;
				setSpotifyMe(me);
				setSpotifyState(state);
				setPositionMs(state?.progress_ms ?? 0);
			} catch (_e) {
				// silent
			}
		};

		loadProfileAndState();
		return () => {
			alive = false;
		};
	}, [spotifyAuthed, spotifyClientId]);

	useEffect(() => {
		if (!spotifyClientId || !spotifyAuthed) return;
		let cancelled = false;

		const boot = async () => {
			try {
				await loadSpotifyWebPlaybackSdk();
				if (cancelled || !window.Spotify?.Player) return;

				const player = new window.Spotify.Player({
					name: 'Habit Tracker Player',
					getOAuthToken: async (cb) => {
						const token = await ensureSpotifyAccessToken(spotifyClientId);
						cb(token || '');
					},
					volume: volumePercent / 100,
				});

				player.addListener('ready', ({ device_id }) => {
					setSpotifyDeviceId(device_id);
				});

				player.addListener('player_state_changed', (state) => {
					if (!state) return;
					setSpotifyState(state);
					setPositionMs(state.position ?? 0);
				});

				await player.connect();
				playerRef.current = player;
			} catch (_e) {
				// silent
			}
		};

		boot();
		return () => {
			cancelled = true;
			playerRef.current?.disconnect?.();
			playerRef.current = null;
		};
	}, [spotifyAuthed, spotifyClientId, volumePercent]);

	useEffect(() => {
		if (!spotifyClientId || !spotifyAuthed) return;
		const id = window.setInterval(() => {
			spotifyGetPlaybackState(spotifyClientId)
				.then((state) => {
					setSpotifyState(state);
					setPositionMs((prev) => {
						if (typeof state?.progress_ms !== 'number') return prev;
						return state.progress_ms;
					});
				})
				.catch(() => {});
		}, 8000);
		return () => window.clearInterval(id);
	}, [spotifyAuthed, spotifyClientId]);

	useEffect(() => {
		if (!running) return;
		const id = window.setInterval(() => {
			setFocusSeconds((prev) => {
				if (prev <= 1) {
					window.clearInterval(id);
					setRunning(false);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => window.clearInterval(id);
	}, [running]);

	const calendarCells = useMemo(() => getCalendarCells(now), [now]);
	const todayDay = now.getDate();
	const palClock = isPalindromeClock(now);
	const trackName =
		spotifyState?.item?.name ||
		spotifyState?.track_window?.current_track?.name ||
		'';
	const artists =
		spotifyState?.item?.artists?.map((x) => x.name).join(', ') ||
		spotifyState?.track_window?.current_track?.artists
			?.map((x) => x.name)
			.join(', ') ||
		'';
	const durationMs =
		spotifyState?.item?.duration_ms || spotifyState?.duration || 0;
	const albumArt =
		spotifyState?.item?.album?.images?.[1]?.url ||
		spotifyState?.track_window?.current_track?.album?.images?.[1]?.url ||
		spotifyState?.item?.album?.images?.[0]?.url ||
		spotifyState?.track_window?.current_track?.album?.images?.[0]?.url ||
		'';
	const isPlaying = Boolean(
		spotifyState?.is_playing || spotifyState?.paused === false,
	);

	return (
		<div className="card productivityHub">
			<h2>Focus Hub</h2>
			<div className="hubTopRow">
				<div>
					<div className="hubClock">
						{now.toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit',
							second: '2-digit',
						})}
					</div>
					<div className="subtle">
						{now.toLocaleDateString([], {
							weekday: 'long',
							day: 'numeric',
							month: 'long',
							year: 'numeric',
						})}
					</div>
				</div>
				<span className={`badge ${palClock ? 'isPalClock' : ''}`}>
					{palClock ? 'Palindrome minute' : 'Standard minute'}
				</span>
			</div>

			<div className="calendarCard">
				<div className="calendarTitle">{monthName(now.getMonth())}</div>
				<div className="calendarWeekdays">
					<span>M</span>
					<span>T</span>
					<span>W</span>
					<span>T</span>
					<span>F</span>
					<span>S</span>
					<span>S</span>
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

			<div className="focusTimerRow">
				<div className="timerLabel">Focus timer</div>
				<div className="timerValue">{formatFocus(focusSeconds)}</div>
				<div
					className="row"
					style={{ flexWrap: 'wrap' }}
				>
					<button
						className="btn"
						type="button"
						onClick={() => setFocusSeconds(25 * 60)}
					>
						25m
					</button>
					<button
						className="btn"
						type="button"
						onClick={() => setFocusSeconds(50 * 60)}
					>
						50m
					</button>
					<button
						className="btn primary"
						type="button"
						onClick={() => setRunning((v) => !v)}
					>
						{running ? 'Pause' : 'Start'}
					</button>
					<button
						className="btn"
						type="button"
						onClick={() => {
							setRunning(false);
							setFocusSeconds(25 * 60);
						}}
					>
						Reset
					</button>
				</div>
			</div>

			<div className="stack">
				<div
					className="row between"
					style={{ gap: 8 }}
				>
					<div className="timerLabel">Spotify</div>
					<a
						className="subtle"
						href="https://open.spotify.com"
						target="_blank"
						rel="noreferrer"
					>
						Open Spotify
					</a>
				</div>

				{!spotifyClientId ? (
					<div className="subtle">
						Add VITE_SPOTIFY_CLIENT_ID to your env to enable full Spotify
						controls.
					</div>
				) : !spotifyAuthed ? (
					<div
						className="row"
						style={{ flexWrap: 'wrap' }}
					>
						<button
							className="btn primary"
							type="button"
							onClick={() =>
								startSpotifyLogin({ clientId: spotifyClientId, redirectUri })
							}
						>
							Connect Spotify
						</button>
						<div className="subtle">
							Full playback control requires Spotify Premium.
						</div>
					</div>
				) : (
					<>
						<div className="subtle">Playback mode: Your Device</div>

						<div className="spotifyPlayerCard">
							<div className="spotifyPlayerHead">
								<div className="subtle">
									Connected as{' '}
									{spotifyMe?.display_name || spotifyMe?.id || 'Spotify user'}
								</div>
								<span className={`badge ${isPlaying ? 'isPalClock' : ''}`}>
									{isPlaying ? 'Playing' : 'Paused'}
								</span>
							</div>

							<div className="spotifyTrackRow">
								<div className="spotifyCoverWrap">
									{albumArt ? (
										<img
											className="spotifyCover"
											src={albumArt}
											alt={trackName || 'Album art'}
										/>
									) : (
										<div className="spotifyCover spotifyCoverFallback">♪</div>
									)}
								</div>
								<div className="spotifyTrackMeta">
									<div className="spotifyTrackTitle">
										{trackName || 'No active track yet.'}
									</div>
									<div className="subtle">
										{artists || 'Pick a track, playlist, or album to start.'}
									</div>
								</div>
							</div>
						</div>

						<input
							className="input"
							type="text"
							placeholder="Paste Spotify track/playlist/album URL or URI"
							value={spotifyInput}
							onChange={(e) => setSpotifyInput(e.target.value)}
						/>
						<div
							className="row"
							style={{ flexWrap: 'wrap' }}
						>
							<button
								className="btn"
								type="button"
								disabled={spotifyBusy}
								onClick={async () => {
									const payload =
										parseSpotifyInputToPlaybackPayload(spotifyInput);
									if (!payload) return;
									try {
										setSpotifyBusy(true);
										await spotifyPlay(
											spotifyClientId,
											spotifyDeviceId,
											payload,
										);
										if (api)
											await api.setSetting(
												'spotify_last_input',
												spotifyInput.trim(),
											);
									} catch (e) {
										console.error(e?.message ?? 'Could not start playback.');
									} finally {
										setSpotifyBusy(false);
									}
								}}
							>
								Play selection
							</button>
							<button
								className="btn"
								type="button"
								onClick={async () => {
									try {
										await spotifyPrevious(spotifyClientId, spotifyDeviceId);
									} catch (e) {
										console.error(e?.message ?? 'Previous failed.');
									}
								}}
							>
								Prev
							</button>
							<button
								className="btn primary"
								type="button"
								onClick={async () => {
									try {
										if (isPlaying)
											await spotifyPause(spotifyClientId, spotifyDeviceId);
										else await spotifyPlay(spotifyClientId, spotifyDeviceId);
									} catch (e) {
										console.error(e?.message ?? 'Play/pause failed.');
									}
								}}
							>
								{isPlaying ? 'Pause' : 'Play'}
							</button>
							<button
								className="btn"
								type="button"
								onClick={async () => {
									try {
										await spotifyNext(spotifyClientId, spotifyDeviceId);
									} catch (e) {
										console.error(e?.message ?? 'Next failed.');
									}
								}}
							>
								Next
							</button>
							<button
								className="btn danger"
								type="button"
								onClick={() => {
									clearSpotifyAuth();
									playerRef.current?.disconnect?.();
									playerRef.current = null;
									setSpotifyAuthed(false);
									setSpotifyMe(null);
									setSpotifyState(null);
									setSpotifyDeviceId('');
								}}
							>
								Disconnect
							</button>
						</div>

						<div className="stack spotifyNowPlaying">
							<input
								className="input"
								type="range"
								min={0}
								max={Math.max(1000, durationMs)}
								value={Math.min(positionMs, Math.max(1000, durationMs))}
								onChange={(e) => setPositionMs(Number(e.target.value))}
								onMouseUp={async () => {
									try {
										await spotifySeek(
											spotifyClientId,
											positionMs,
											spotifyDeviceId,
										);
									} catch (e) {
										console.error(e?.message ?? 'Seek failed.');
									}
								}}
							/>
							<div className="row between">
								<span className="subtle">Position</span>
								<span className="subtle">
									{formatMs(positionMs)} / {formatMs(durationMs)}
								</span>
							</div>
							<div
								className="row"
								style={{ gap: 10 }}
							>
								<span className="subtle">Volume</span>
								<input
									className="input"
									type="range"
									min={0}
									max={100}
									value={volumePercent}
									onChange={(e) => setVolumePercent(Number(e.target.value))}
									onMouseUp={async () => {
										try {
											await spotifySetVolume(
												spotifyClientId,
												volumePercent,
												spotifyDeviceId,
											);
										} catch (e) {
											console.error(e?.message ?? 'Volume change failed.');
										}
									}}
								/>
								<span className="subtle">{volumePercent}%</span>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
