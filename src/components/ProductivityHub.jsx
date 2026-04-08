import { useEffect, useMemo, useRef, useState } from 'react';
import {
	clearSpotifyAuth,
	completeSpotifyAuthFromUrl,
	ensureSpotifyAccessToken,
	getStoredSpotifyAuth,
	spotifyGetMe,
	spotifyGetPlaybackState,
	spotifyNext,
	spotifyPause,
	spotifyPlay,
	spotifyPrevious,
	spotifySeek,
	startSpotifyLogin,
} from '../lib/spotify.js';
import { useToast } from '../state/ToastState.jsx';

function formatTime(totalSeconds) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatMs(ms) {
	const totalSeconds = Math.max(0, Math.floor((ms ?? 0) / 1000));
	return formatTime(totalSeconds);
}

function SpotifyPanel({
	spotifyAuthed,
	spotifyClientId,
	redirectUri,
	spotifyState,
	spotifyMe,
	spotifyError,
	onPlayPause,
	onNext,
	onPrevious,
	onSeek,
	onReconnect,
	immersive = false,
}) {
	const albumImg = spotifyState?.item?.album?.images?.[0]?.url ?? null;
	const artistName =
		spotifyState?.item?.artists?.map((artist) => artist.name).join(', ') ||
		spotifyState?.track_window?.current_track?.artists?.map((artist) => artist.name).join(', ') ||
		(spotifyMe?.display_name ? `Logged in as ${spotifyMe.display_name}` : 'Connect Spotify to bring your session soundtrack into the workspace.');
	const trackName =
		spotifyState?.item?.name ||
		spotifyState?.track_window?.current_track?.name ||
		'No track selected';
	const isPlaying = Boolean(spotifyState?.is_playing || spotifyState?.paused === false);
	const progressMs = spotifyState?.progress_ms ?? 0;
	const durationMs = spotifyState?.item?.duration_ms ?? 0;
	const progressPct = durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0;

	return (
		<div className={`glassPlayer ${immersive ? 'immersive' : ''}`}>
			<div className="glassPlayerHeader">
				<div>
					<div className="panelEyebrow">Session soundtrack</div>
					<h3 className="premiumPanelTitle">Spotify</h3>
				</div>
				<span className={isPlaying ? 'badge success' : 'badge'}>
					{isPlaying ? 'Playing' : 'Ready'}
				</span>
			</div>

			{!spotifyAuthed ? (
				<div className="spotifyConnect">
					<button
						className="btn primary"
						style={{ width: '100%' }}
						onClick={() => startSpotifyLogin({ clientId: spotifyClientId, redirectUri })}
					>
						Connect Spotify
					</button>
				</div>
			) : (
				<>
					<div className={`spotifyShowcase ${immersive ? 'immersive' : ''}`}>
						<div className="spotifyShowcaseArtwork">
							{albumImg ? <img src={albumImg} alt={trackName} /> : <span>♪</span>}
						</div>
						<div className="spotifyShowcaseCopy">
							<div className="spotifyTrackName">{trackName}</div>
							<div className="spotifyArtistName">{artistName}</div>
							{spotifyError ? <div className="subtle" style={{ color: 'var(--warning)' }}>{spotifyError}</div> : null}
						</div>
					</div>

					<div
						className="spotifyTimelineBar"
						onClick={(event) => {
							if (!durationMs) return;
							const rect = event.currentTarget.getBoundingClientRect();
							const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
							onSeek(durationMs * ratio);
						}}
					>
						<div className="spotifyTimelineFill" style={{ width: `${progressPct}%` }} />
					</div>
					<div className="spotifyTimelineMeta">
						<span>{formatMs(progressMs)}</span>
						<span>{formatMs(durationMs)}</span>
					</div>

					<div className="spotifySessionControls">
						<button className="btn ghost" type="button" onClick={onPrevious}>Previous</button>
						<button className="btn primary" type="button" onClick={onPlayPause}>
							{isPlaying ? 'Pause' : 'Play'}
						</button>
						<button className="btn ghost" type="button" onClick={onNext}>Next</button>
					</div>

					<div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
						<button className="btn ghost" type="button" onClick={onReconnect}>Refresh Spotify</button>
						<button
							className="btn ghost"
							type="button"
							onClick={() => {
								clearSpotifyAuth();
								window.location.reload();
							}}
						>
							Disconnect
						</button>
					</div>
				</>
			)}
		</div>
	);
}

export default function ProductivityHub() {
	const toast = useToast();
	const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? '';
	const redirectUri = window.location.origin + window.location.pathname;
	const authCompletedRef = useRef(false);
	const fullscreenRef = useRef(null);

	const [customMinutes, setCustomMinutes] = useState('45');
	const [focusSeconds, setFocusSeconds] = useState(45 * 60);
	const [focusMax, setFocusMax] = useState(45 * 60);
	const [running, setRunning] = useState(false);
	const [autoFullscreen, setAutoFullscreen] = useState(true);
	const [isFullscreen, setIsFullscreen] = useState(false);

	const [spotifyMe, setSpotifyMe] = useState(null);
	const [spotifyState, setSpotifyState] = useState(null);
	const [spotifyAuthed, setSpotifyAuthed] = useState(Boolean(getStoredSpotifyAuth()));
	const [spotifyError, setSpotifyError] = useState('');

	const progressPct = focusMax === 0 ? 0 : Math.max(0, (focusSeconds / focusMax) * 100);

	useEffect(() => {
		const onFullscreenChange = () => {
			setIsFullscreen(Boolean(document.fullscreenElement));
		};
		document.addEventListener('fullscreenchange', onFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
	}, []);

	useEffect(() => {
		if (!running) return;
		const id = window.setInterval(() => {
			setFocusSeconds((prev) => {
				if (prev <= 1) {
					window.clearInterval(id);
					setRunning(false);
					if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
						new Notification('Focus session complete', {
							body: 'Your countdown reached zero.',
						});
					}
					toast.push('Focus session complete.');
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => window.clearInterval(id);
	}, [running, toast]);

	useEffect(() => {
		if (!spotifyClientId || authCompletedRef.current) return;
		completeSpotifyAuthFromUrl({ clientId: spotifyClientId, redirectUri })
			.then((completed) => {
				if (completed) {
					authCompletedRef.current = true;
					setSpotifyAuthed(true);
					toast.push('Spotify connected.');
				}
			})
			.catch((error) => {
				setSpotifyError(error?.message ?? 'Spotify auth failed.');
			});
	}, [spotifyClientId, redirectUri, toast]);

	useEffect(() => {
		if (!spotifyClientId || !spotifyAuthed) return;
		let active = true;

		async function refreshSpotify() {
			try {
				await ensureSpotifyAccessToken(spotifyClientId);
				const [me, state] = await Promise.all([
					spotifyGetMe(spotifyClientId),
					spotifyGetPlaybackState(spotifyClientId).catch(() => null),
				]);
				if (!active) return;
				setSpotifyMe(me);
				setSpotifyState(state);
				setSpotifyError('');
			} catch (error) {
				if (!active) return;
				setSpotifyError(error?.message ?? 'Spotify sync failed.');
			}
		}

		refreshSpotify();
		const id = window.setInterval(refreshSpotify, 5000);
		return () => {
			active = false;
			window.clearInterval(id);
		};
	}, [spotifyAuthed, spotifyClientId]);

	const sessionLabel = useMemo(() => {
		if (focusSeconds === 0) return 'Finished';
		return running ? 'Running' : 'Paused';
	}, [focusSeconds, running]);

	async function enterFullscreen() {
		try {
			if (!fullscreenRef.current?.requestFullscreen) return;
			await fullscreenRef.current.requestFullscreen();
		} catch (error) {
			toast.push(error?.message ?? 'Fullscreen request failed.');
		}
	}

	async function exitFullscreen() {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
		} catch (error) {
			toast.push(error?.message ?? 'Could not exit fullscreen.');
		}
	}

	async function startSession() {
		if (focusSeconds <= 0) {
			const next = Math.max(1, Number.parseInt(customMinutes, 10) || 45) * 60;
			setFocusSeconds(next);
			setFocusMax(next);
		}
		setRunning(true);
		if (autoFullscreen) await enterFullscreen();
	}

	function applyCustomDuration(minutesValue) {
		const parsed = Number.parseInt(minutesValue, 10);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			toast.push('Enter a valid session length.');
			return;
		}
		const nextSeconds = parsed * 60;
		setFocusSeconds(nextSeconds);
		setFocusMax(nextSeconds);
		setRunning(false);
	}

	async function refreshSpotifyState() {
		try {
			const state = await spotifyGetPlaybackState(spotifyClientId);
			setSpotifyState(state);
			setSpotifyError('');
		} catch (error) {
			setSpotifyError(error?.message ?? 'Spotify sync failed.');
		}
	}

	async function withSpotify(action) {
		try {
			await action();
			await refreshSpotifyState();
		} catch (error) {
			toast.push(error?.message ?? 'Spotify action failed.');
			setSpotifyError(error?.message ?? 'Spotify action failed.');
		}
	}

	return (
		<>
			<div className="focusStudio glass-card" ref={fullscreenRef}>
				<div className="focusStudioGrid">
					<div className="focusCountdownCard">
						<div className="premiumPanelHeader">
							<div>
								<div className="panelEyebrow">Focus session</div>
								<h3 className="premiumPanelTitle">Remaining time</h3>
							</div>
							<span className={running ? 'badge success' : 'badge'}>{sessionLabel}</span>
						</div>

						<div className="countdownMachine">
							<div className="countdownMachineLabel">Countdown machine</div>
							<div className="countdownMachineValue">{formatTime(focusSeconds)}</div>
							<div className="countdownMachineSubtle">
								{Math.round(progressPct)}% left of {Math.round(focusMax / 60)} minutes
							</div>
						</div>

						<div className="focusBar">
							<div className="focusBarFill" style={{ width: `${progressPct}%` }} />
						</div>

						<div className="focusPresetRow">
							{[15, 25, 45, 60].map((minutes) => (
								<button
									key={minutes}
									className="btn ghost"
									type="button"
									onClick={() => {
										setCustomMinutes(String(minutes));
										applyCustomDuration(String(minutes));
									}}
								>
									{minutes}m
								</button>
							))}
						</div>

						<div className="focusCustomRow">
							<input
								className="input"
								type="number"
								min={1}
								step={1}
								value={customMinutes}
								onChange={(event) => setCustomMinutes(event.target.value)}
								placeholder="Custom minutes"
							/>
							<button className="btn ghost" type="button" onClick={() => applyCustomDuration(customMinutes)}>
								Set duration
							</button>
						</div>

						<div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
							<label className="sessionToggle">
								<input
									type="checkbox"
									checked={autoFullscreen}
									onChange={(event) => setAutoFullscreen(event.target.checked)}
								/>
								<span>Open in fullscreen on start</span>
							</label>
						</div>

						<div className="focusControls">
							<button className={running ? 'btn ghost' : 'btn primary'} type="button" onClick={() => (running ? setRunning(false) : startSession())}>
								{running ? 'Pause session' : 'Start session'}
							</button>
							<button
								className="btn ghost"
								type="button"
								onClick={() => {
									applyCustomDuration(customMinutes);
									setRunning(false);
								}}
							>
								Reset
							</button>
							<button className="btn ghost" type="button" onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen())}>
								{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
							</button>
						</div>
					</div>

					<SpotifyPanel
						spotifyAuthed={spotifyAuthed}
						spotifyClientId={spotifyClientId}
						redirectUri={redirectUri}
						spotifyState={spotifyState}
						spotifyMe={spotifyMe}
						spotifyError={spotifyError}
						onPlayPause={() =>
							withSpotify(async () => {
								const isPlaying = Boolean(spotifyState?.is_playing || spotifyState?.paused === false);
								if (isPlaying) await spotifyPause(spotifyClientId);
								else await spotifyPlay(spotifyClientId);
							})
						}
						onNext={() => withSpotify(() => spotifyNext(spotifyClientId))}
						onPrevious={() => withSpotify(() => spotifyPrevious(spotifyClientId))}
						onSeek={(positionMs) => withSpotify(() => spotifySeek(spotifyClientId, positionMs))}
						onReconnect={refreshSpotifyState}
					/>
				</div>
			</div>

			{isFullscreen ? (
				<div className="focusFullscreenOverlay">
					<div className="focusFullscreenBackdrop" />
					<div className="focusFullscreenShell">
						<div className="focusFullscreenTimer">
							<div className="panelEyebrow">Focus mode</div>
							<div className="focusFullscreenValue">{formatTime(focusSeconds)}</div>
							<div className="focusFullscreenMeta">
								<span>{running ? 'Session running' : 'Paused session'}</span>
								<span>{Math.round(focusMax / 60)} minute session</span>
							</div>
							<div className="focusBar">
								<div className="focusBarFill" style={{ width: `${progressPct}%` }} />
							</div>
						</div>

						<SpotifyPanel
							spotifyAuthed={spotifyAuthed}
							spotifyClientId={spotifyClientId}
							redirectUri={redirectUri}
							spotifyState={spotifyState}
							spotifyMe={spotifyMe}
							spotifyError={spotifyError}
							onPlayPause={() =>
								withSpotify(async () => {
									const isPlaying = Boolean(spotifyState?.is_playing || spotifyState?.paused === false);
									if (isPlaying) await spotifyPause(spotifyClientId);
									else await spotifyPlay(spotifyClientId);
								})
							}
							onNext={() => withSpotify(() => spotifyNext(spotifyClientId))}
							onPrevious={() => withSpotify(() => spotifyPrevious(spotifyClientId))}
							onSeek={(positionMs) => withSpotify(() => spotifySeek(spotifyClientId, positionMs))}
							onReconnect={refreshSpotifyState}
							immersive
						/>
					</div>
				</div>
			) : null}
		</>
	);
}
