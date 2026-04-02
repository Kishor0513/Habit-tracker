import { useEffect, useRef, useState } from 'react';
import {
	completeSpotifyAuthFromUrl,
	ensureSpotifyAccessToken,
	getStoredSpotifyAuth,
	spotifyGetMe,
	spotifyGetPlaybackState,
	spotifyNext,
	spotifyPause,
	spotifyPlay,
	spotifyPrevious,
	startSpotifyLogin,
} from '../lib/spotify.js';
import CircularClock from './CircularClock.jsx';

export default function ProductivityHub() {
	const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? '';
	const redirectUri = window.location.origin + window.location.pathname;
	const authCompletedRef = useRef(false);

	const FOCUS_DEFAULT = 25 * 60;
	const [now, setNow] = useState(() => new Date());
	const [focusSeconds, setFocusSeconds] = useState(FOCUS_DEFAULT);
	const [focusMax, setFocusMax] = useState(FOCUS_DEFAULT);
	const [running, setRunning] = useState(false);

	const [spotifyMe, setSpotifyMe] = useState(null);
	const [spotifyDeviceId, setSpotifyDeviceId] = useState('');
	const [spotifyState, setSpotifyState] = useState(null);
	const [spotifyAuthed, setSpotifyAuthed] = useState(
		Boolean(getStoredSpotifyAuth()),
	);

	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(id);
	}, []);

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

	useEffect(() => {
		if (!spotifyClientId || authCompletedRef.current) return;
		completeSpotifyAuthFromUrl({ clientId: spotifyClientId, redirectUri })
			.then((completed) => {
				if (completed) {
					authCompletedRef.current = true;
					setSpotifyAuthed(true);
				}
			})
			.catch(() => {});
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
				}
			} catch (e) {}
		})();
		return () => {
			alive = false;
		};
	}, [spotifyAuthed, spotifyClientId]);

	const trackName =
		spotifyState?.item?.name ||
		spotifyState?.track_window?.current_track?.name ||
		'Not Playing';
	const isPlaying = Boolean(
		spotifyState?.is_playing || spotifyState?.paused === false,
	);
	const albumImg = spotifyState?.item?.album?.images?.[0]?.url;
	const focusProgress = focusMax === 0 ? 0 : focusSeconds / focusMax;

	return (
		<div className="productivityHub">
			<div className="premiumPanel premiumPanelAccent">
				<div className="premiumPanelHeader">
					<div>
						<div className="panelEyebrow">Focus session</div>
						<h3 className="premiumPanelTitle">Focus cadence</h3>
					</div>
					<span className="badge">{running ? 'Active' : 'Paused'}</span>
				</div>

				<CircularClock
					now={now}
					title="Focus watch"
					subtitle={running ? 'Session in progress' : 'Ready for the next sprint'}
				/>
				<div className="focusMeta">
					<span>Mode: {running ? 'active sprint' : 'armed and ready'}</span>
					<span>{Math.ceil(focusSeconds / 60)} min remaining</span>
				</div>

				<div className="focusControls">
					<button
						className="btn btn-bordered"
						onClick={() => {
							setFocusSeconds(25 * 60);
							setFocusMax(25 * 60);
							setRunning(false);
						}}
					>
						Reset 25m
					</button>
					<button
						className={running ? 'btn btn-bordered' : 'btn btn-primary'}
						onClick={() => setRunning(!running)}
					>
						{running ? 'Pause session' : 'Start focus'}
					</button>
				</div>

				<div className="focusBar">
					<div
						className="focusBarFill"
						style={{ width: `${(focusSeconds / focusMax) * 100}%` }}
					/>
				</div>
			</div>

			<div className="premiumPanel glass-card">
				<div className="premiumPanelHeader">
					<div>
						<div className="panelEyebrow">Spotify player</div>
						<h3 className="premiumPanelTitle">Keep the room in sync</h3>
					</div>
					{isPlaying ? (
						<span className="badge success">Audio active</span>
					) : (
						<span className="badge">Standby</span>
					)}
				</div>

					{!spotifyAuthed ? (
						<div className="spotifyConnect">
							<button
								className="btn btn-bordered"
								style={{ width: '100%' }}
								onClick={() =>
									startSpotifyLogin({ clientId: spotifyClientId, redirectUri })
								}
							>
								Connect Spotify
							</button>
						</div>
					) : (
						<>
							<div
								style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
							>
								<div
									style={{
										width: '64px',
										height: '64px',
										borderRadius: '12px',
										flexShrink: 0,
										background: albumImg
											? `url(${albumImg}) center/cover`
											: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
										border: '1px solid rgba(255, 255, 255, 0.2)',
										boxShadow: '0 8px 24px rgba(168, 85, 247, 0.34)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										overflow: 'hidden',
									}}
								>
									{!albumImg && <span style={{ fontSize: '28px' }}>🎵</span>}
								</div>

								<div style={{ minWidth: 0, flex: 1 }}>
									<div
										style={{
											fontSize: '14px',
											fontWeight: 600,
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											color: 'var(--text-main)',
										}}
									>
										{trackName}
									</div>
									<div
										style={{
											fontSize: '12px',
											color: 'var(--text-muted)',
											marginTop: '4px',
										}}
									>
										{spotifyMe?.display_name || 'Spotify Connected'}
									</div>
								</div>
							</div>

							<div
								style={{
									backgroundColor: 'rgba(255, 255, 255, 0.08)',
									borderRadius: '8px',
									height: '6px',
									overflow: 'hidden',
									border: '1px solid rgba(255, 255, 255, 0.1)',
									cursor: 'pointer',
								}}
							>
								<div
									style={{
										height: '100%',
										width: '35%', // Placeholder progress
										background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
										boxShadow: '0 0 12px rgba(168, 85, 247, 0.42)',
										transition: 'width 0.1s ease-out',
									}}
								/>
							</div>

							<div
								style={{
									display: 'flex',
									justifyContent: 'center',
									gap: '12px',
									marginTop: '8px',
								}}
							>
								<button
									className="btn-rounded"
									onClick={() =>
										spotifyPrevious(spotifyClientId, spotifyDeviceId)
									}
									title="Previous"
									style={{
										width: '40px',
										height: '40px',
										borderRadius: '50%',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										background: 'rgba(168, 85, 247, 0.18)',
										border: '1px solid rgba(236, 72, 153, 0.32)',
										color: '#a855f7',
										cursor: 'pointer',
										transition: 'all 0.2s',
										fontSize: '16px',
									}}
								>
									⏮
								</button>

								<button
									className="btn-rounded playBtn"
									onClick={async () => {
										if (isPlaying)
											await spotifyPause(spotifyClientId, spotifyDeviceId);
										else await spotifyPlay(spotifyClientId, spotifyDeviceId);
									}}
									title={isPlaying ? 'Pause' : 'Play'}
									style={{
										width: '48px',
										height: '48px',
										borderRadius: '50%',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
										border: 'none',
										color: 'white',
										cursor: 'pointer',
										transition: 'all 0.2s, transform 0.1s',
										fontWeight: 600,
										boxShadow: '0 4px 16px rgba(168, 85, 247, 0.42)',
										fontSize: '18px',
									}}
								>
									{isPlaying ? '⏸' : '▶'}
								</button>

								<button
									className="btn-rounded"
									onClick={() => spotifyNext(spotifyClientId, spotifyDeviceId)}
									title="Next"
									style={{
										width: '40px',
										height: '40px',
										borderRadius: '50%',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										background: 'rgba(168, 85, 247, 0.18)',
										border: '1px solid rgba(236, 72, 153, 0.32)',
										color: '#a855f7',
										cursor: 'pointer',
										transition: 'all 0.2s',
										fontSize: '16px',
									}}
								>
									⏭
								</button>
							</div>
						</>
					)}
			</div>
		</div>
	);
}
