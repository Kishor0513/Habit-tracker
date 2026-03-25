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
	spotifyTransferPlayback,
	startSpotifyLogin,
} from '../lib/spotify.js';
import { useApp } from '../state/AppState.jsx';
import { useToast } from '../state/ToastState.jsx';

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
	const toast = useToast();
	const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? '';
	const redirectUri = window.location.origin + window.location.pathname;
	const playerRef = useRef(null);
	const audioRef = useRef(null);
	const audioContextRef = useRef(null);

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

	// Playlist preview mode state
	const [spotifyMode, setSpotifyMode] = useState('device'); // 'device' or 'playlist'
	const [previewInput, setPreviewInput] = useState('');
	const [previewPlaylist, setPreviewPlaylist] = useState(null);
	const [previewTracks, setPreviewTracks] = useState([]);
	const [previewCurrentIndex, setPreviewCurrentIndex] = useState(0);
	const [previewPlaying, setPreviewPlaying] = useState(false);
	const [previewPosition, setPreviewPosition] = useState(0);
	const [previewDuration, setPreviewDuration] = useState(0);
	const [previewBusy, setPreviewBusy] = useState(false);

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
			.catch((e) => console.error(e));

		return () => {
			alive = false;
		};
	}, [api]);

	useEffect(() => {
		if (!spotifyClientId) return;
		completeSpotifyAuthFromUrl({ clientId: spotifyClientId, redirectUri })
			.then((completed) => {
				if (!completed) return;
				setSpotifyAuthed(true);
				toast.push('Spotify connected.');
			})
			.catch((e) => toast.push(e?.message ?? 'Spotify login failed.'));
	}, [spotifyClientId, redirectUri, toast]);

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
			} catch (e) {
				toast.push(e?.message ?? 'Could not load Spotify profile.');
			}
		};

		loadProfileAndState();
		return () => {
			alive = false;
		};
	}, [spotifyAuthed, spotifyClientId, toast]);

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

				player.addListener('ready', async ({ device_id }) => {
					setSpotifyDeviceId(device_id);
					try {
						await spotifyTransferPlayback(spotifyClientId, device_id);
					} catch (_e) {
						// Transfer may fail on free plans or when no active session exists.
					}
				});

				player.addListener('player_state_changed', (state) => {
					if (!state) return;
					setSpotifyState(state);
					setPositionMs(state.position ?? 0);
				});

				player.addListener('initialization_error', ({ message }) =>
					toast.push(message),
				);
				player.addListener('authentication_error', ({ message }) =>
					toast.push(message),
				);
				player.addListener('account_error', ({ message }) =>
					toast.push(message),
				);

				await player.connect();
				playerRef.current = player;
			} catch (e) {
				toast.push(e?.message ?? 'Spotify player could not start.');
			}
		};

		boot();
		return () => {
			cancelled = true;
			playerRef.current?.disconnect?.();
			playerRef.current = null;
		};
	}, [spotifyAuthed, spotifyClientId, toast, volumePercent]);

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
					toast.push('Focus session complete.');
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => window.clearInterval(id);
	}, [running, toast]);

	// Preview player audio management
	useEffect(() => {
		if (!audioRef.current) {
			audioRef.current = new Audio();
			audioRef.current.crossOrigin = 'anonymous';
		}

		const audio = audioRef.current;
		const handleTimeUpdate = () => setPreviewPosition(audio.currentTime * 1000);
		const handleLoadedMetadata = () =>
			setPreviewDuration(audio.duration * 1000);
		const handleEnded = () => {
			setPreviewPlaying(false);
			if (previewTracks.length > 0) {
				const nextIdx = (previewCurrentIndex + 1) % previewTracks.length;
				setPreviewCurrentIndex(nextIdx);
			}
		};
		const handleError = () => {
			toast.push('Could not play preview track.');
			setPreviewPlaying(false);
		};

		audio.addEventListener('timeupdate', handleTimeUpdate);
		audio.addEventListener('loadedmetadata', handleLoadedMetadata);
		audio.addEventListener('ended', handleEnded);
		audio.addEventListener('error', handleError);

		return () => {
			audio.removeEventListener('timeupdate', handleTimeUpdate);
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
			audio.removeEventListener('ended', handleEnded);
			audio.removeEventListener('error', handleError);
		};
	}, [previewCurrentIndex, previewTracks.length, toast]);

	// Preview track playback
	useEffect(() => {
		if (spotifyMode !== 'playlist' || !previewTracks.length) return;

		const track = previewTracks[previewCurrentIndex];
		if (!track?.preview_url) {
			setPreviewPlaying(false);
			return;
		}

		const audio = audioRef.current;
		if (!audio) return;

		if (audio.src !== track.preview_url) {
			audio.src = track.preview_url;
		}

		if (previewPlaying) {
			audio.play().catch((e) => {
				console.error('Preview play error:', e);
				setPreviewPlaying(false);
			});
		} else {
			audio.pause();
		}

		return () => {
			if (audio) audio.pause();
		};
	}, [spotifyMode, previewTracks, previewCurrentIndex, previewPlaying]);

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
						{/* Mode toggle */}
						<div
							className="row"
							style={{ gap: 8 }}
						>
							<button
								className={`btn ${spotifyMode === 'device' ? 'primary' : ''}`}
								type="button"
								onClick={() => setSpotifyMode('device')}
							>
								Your Device
							</button>
							<button
								className={`btn ${spotifyMode === 'playlist' ? 'primary' : ''}`}
								type="button"
								onClick={() => setSpotifyMode('playlist')}
							>
								Playlist Preview
							</button>
						</div>

						{spotifyMode === 'device' ? (
							// DEVICE MODE - Full Spotify Control
							<>
								<div className="spotifyPlayerCard">
									<div className="spotifyPlayerHead">
										<div className="subtle">
											Connected as{' '}
											{spotifyMe?.display_name ||
												spotifyMe?.id ||
												'Spotify user'}
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
												<div className="spotifyCover spotifyCoverFallback">
													♪
												</div>
											)}
										</div>
										<div className="spotifyTrackMeta">
											<div className="spotifyTrackTitle">
												{trackName || 'No active track yet.'}
											</div>
											<div className="subtle">
												{artists ||
													'Pick a track, playlist, or album to start.'}
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
											if (!payload) {
												toast.push(
													'Use a valid Spotify URL/URI for track, playlist, or album.',
												);
												return;
											}
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
												toast.push('Playback started.');
											} catch (e) {
												toast.push(e?.message ?? 'Could not start playback.');
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
												toast.push(e?.message ?? 'Previous failed.');
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
												else
													await spotifyPlay(spotifyClientId, spotifyDeviceId);
											} catch (e) {
												toast.push(e?.message ?? 'Play/pause failed.');
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
												toast.push(e?.message ?? 'Next failed.');
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
												toast.push(e?.message ?? 'Seek failed.');
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
													toast.push(e?.message ?? 'Volume change failed.');
												}
											}}
										/>
										<span className="subtle">{volumePercent}%</span>
									</div>
								</div>
							</>
						) : (
							// PLAYLIST PREVIEW MODE - 30 Second Previews
							<>
								<input
									className="input"
									type="text"
									placeholder="Paste Spotify playlist URL or URI"
									value={previewInput}
									onChange={(e) => setPreviewInput(e.target.value)}
								/>
								<button
									className="btn primary"
									type="button"
									disabled={previewBusy}
									onClick={async () => {
										const playlistId = extractPlaylistId(previewInput);
										if (!playlistId) {
											toast.push('Use a valid Spotify playlist URL or URI.');
											return;
										}
										try {
											setPreviewBusy(true);
											const info = await spotifyGetPlaylistInfo(
												spotifyClientId,
												playlistId,
											);
											const tracks = await spotifyFetchAllPlaylistTracks(
												spotifyClientId,
												playlistId,
											);
											if (tracks.length === 0) {
												toast.push('No preview tracks found in this playlist.');
												return;
											}
											setPreviewPlaylist(info);
											setPreviewTracks(tracks);
											setPreviewCurrentIndex(0);
											setPreviewPlaying(false);
											setPreviewPosition(0);
											toast.push(
												`Loaded ${tracks.length} tracks with previews.`,
											);
										} catch (e) {
											toast.push(e?.message ?? 'Could not load playlist.');
										} finally {
											setPreviewBusy(false);
										}
									}}
								>
									Load Playlist
								</button>

								{previewPlaylist && (
									<>
										<div className="spotifyPlayerCard">
											<div className="spotifyPlayerHead">
												<div className="subtle">
													{previewPlaylist.name || 'Playlist'}
												</div>
												<span
													className={`badge ${previewPlaying ? 'isPalClock' : ''}`}
												>
													{previewPlaying ? 'Playing' : 'Paused'} (30s previews)
												</span>
											</div>

											{previewTracks.length > 0 && (
												<>
													<div className="spotifyTrackRow">
														<div className="spotifyCoverWrap">
															{previewTracks[previewCurrentIndex]?.album
																?.images?.[1]?.url ? (
																<img
																	className="spotifyCover"
																	src={
																		previewTracks[previewCurrentIndex].album
																			.images[1].url
																	}
																	alt={
																		previewTracks[previewCurrentIndex].name ||
																		'Album art'
																	}
																/>
															) : (
																<div className="spotifyCover spotifyCoverFallback">
																	♪
																</div>
															)}
														</div>
														<div className="spotifyTrackMeta">
															<div className="spotifyTrackTitle">
																{previewTracks[previewCurrentIndex]?.name ||
																	'No track'}
															</div>
															<div className="subtle">
																{previewTracks[previewCurrentIndex]?.artists
																	?.map((a) => a.name)
																	.join(', ') || 'Unknown'}
															</div>
														</div>
													</div>

													<div className="stack spotifyNowPlaying">
														<input
															className="input"
															type="range"
															min={0}
															max={Math.max(1000, previewDuration)}
															value={Math.min(
																previewPosition,
																Math.max(1000, previewDuration),
															)}
															onChange={(e) => {
																const audio = audioRef.current;
																if (audio) {
																	audio.currentTime =
																		Number(e.target.value) / 1000;
																	setPreviewPosition(Number(e.target.value));
																}
															}}
														/>
														<div className="row between">
															<span className="subtle">Position</span>
															<span className="subtle">
																{formatMs(previewPosition)} /{' '}
																{formatMs(previewDuration)}
															</span>
														</div>
													</div>

													<div
														className="row"
														style={{ flexWrap: 'wrap', gap: 8 }}
													>
														<button
															className="btn"
															type="button"
															onClick={() => {
																if (previewCurrentIndex > 0) {
																	setPreviewCurrentIndex(
																		previewCurrentIndex - 1,
																	);
																	setPreviewPosition(0);
																}
															}}
														>
															Previous
														</button>
														<button
															className="btn primary"
															type="button"
															onClick={() => {
																setPreviewPlaying(!previewPlaying);
															}}
														>
															{previewPlaying ? 'Pause' : 'Play'}
														</button>
														<button
															className="btn"
															type="button"
															onClick={() => {
																if (
																	previewCurrentIndex <
																	previewTracks.length - 1
																) {
																	setPreviewCurrentIndex(
																		previewCurrentIndex + 1,
																	);
																	setPreviewPosition(0);
																}
															}}
														>
															Next
														</button>
													</div>

													<div
														className="stack"
														style={{ maxHeight: '300px', overflowY: 'auto' }}
													>
														<div className="subtle">
															Track {previewCurrentIndex + 1}/
															{previewTracks.length}
														</div>
														{previewTracks.map((track, idx) => (
															<div
																key={`${idx}-${track.id}`}
																className={`playlistTrackItem ${
																	idx === previewCurrentIndex ? 'isActive' : ''
																}`}
																onClick={() => {
																	setPreviewCurrentIndex(idx);
																	setPreviewPosition(0);
																	setPreviewPlaying(true);
																}}
																style={{ cursor: 'pointer' }}
															>
																<div className="playlistTrackNumber">
																	{idx + 1}
																</div>
																<div className="playlistTrackName">
																	{track.name}
																</div>
																<div className="subtle playlistTrackArtist">
																	{track.artists?.map((a) => a.name).join(', ')}
																</div>
															</div>
														))}
													</div>
												</>
											)}
										</div>
									</>
								)}
							</>
						)}
					</>
				)}
			</div>
		</div>
	);
}
