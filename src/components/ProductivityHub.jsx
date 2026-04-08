import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../state/ToastState.jsx';
import { useStudio } from '../state/StudioState.jsx';

function formatTime(totalSeconds) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatMs(ms) {
	const totalSeconds = Math.max(0, Math.floor((ms ?? 0) / 1000));
	return formatTime(totalSeconds);
}

function formatStamp(value) {
	return new Date(value).toLocaleString([], {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function SpotifyPanel({ immersive = false }) {
	const { spotify } = useStudio();
	const albumImg = spotify.spotifyState?.item?.album?.images?.[0]?.url ?? null;
	const artistName =
		spotify.spotifyState?.item?.artists?.map((artist) => artist.name).join(', ') ||
		spotify.spotifyMe?.display_name ||
		'Connect Spotify to bring your session soundtrack into the workspace.';
	const trackName = spotify.spotifyState?.item?.name || 'No track selected';
	const isPlaying = Boolean(spotify.spotifyState?.is_playing || spotify.spotifyState?.paused === false);
	const progressMs = spotify.spotifyState?.progress_ms ?? 0;
	const durationMs = spotify.spotifyState?.item?.duration_ms ?? 0;
	const progressPct = durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0;

	return (
		<div className={`glassPlayer ${immersive ? 'immersive' : ''}`}>
			<div className="glassPlayerHeader">
				<div>
					<div className="panelEyebrow">Session soundtrack</div>
					<h3 className="premiumPanelTitle">Spotify</h3>
				</div>
				<span className={isPlaying ? 'badge success' : 'badge'}>{isPlaying ? 'Playing' : 'Ready'}</span>
			</div>

			{!spotify.spotifyAuthed ? (
				<div className="spotifyConnect">
					<button className="btn primary" style={{ width: '100%' }} onClick={spotify.connect}>
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
							{spotify.spotifyError ? <div className="subtle" style={{ color: 'var(--warning)' }}>{spotify.spotifyError}</div> : null}
						</div>
					</div>

					<div
						className="spotifyTimelineBar"
						onClick={(event) => {
							if (!durationMs) return;
							const rect = event.currentTarget.getBoundingClientRect();
							const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
							spotify.seek(durationMs * ratio);
						}}
					>
						<div className="spotifyTimelineFill" style={{ width: `${progressPct}%` }} />
					</div>
					<div className="spotifyTimelineMeta">
						<span>{formatMs(progressMs)}</span>
						<span>{formatMs(durationMs)}</span>
					</div>

					<div className="spotifySessionControls">
						<button className="btn ghost" type="button" onClick={spotify.previous}>Previous</button>
						<button className="btn primary" type="button" onClick={spotify.playPause}>{isPlaying ? 'Pause' : 'Play'}</button>
						<button className="btn ghost" type="button" onClick={spotify.next}>Next</button>
					</div>

					<div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
						<button className="btn ghost" type="button" onClick={spotify.refresh}>Refresh Spotify</button>
						<button className="btn ghost" type="button" onClick={spotify.disconnect}>Disconnect</button>
					</div>
				</>
			)}
		</div>
	);
}

export default function ProductivityHub() {
	const toast = useToast();
	const { focus, spotify } = useStudio();
	const fullscreenRef = useRef(null);
	const [isFullscreen, setIsFullscreen] = useState(false);

	const progressPct = focus.focusMax === 0 ? 0 : Math.max(0, (focus.focusSeconds / focus.focusMax) * 100);
	const sessionLabel = useMemo(() => {
		if (focus.focusSeconds === 0) return 'Finished';
		return focus.running ? 'Running' : 'Paused';
	}, [focus.focusSeconds, focus.running]);

	useEffect(() => {
		const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
		document.addEventListener('fullscreenchange', onFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
	}, []);

	async function enterFullscreen() {
		try {
			if (!fullscreenRef.current?.requestFullscreen) return;
			await fullscreenRef.current.requestFullscreen();
			setIsFullscreen(true);
		} catch (error) {
			toast.push(error?.message ?? 'Fullscreen request failed.');
		}
	}

	async function exitFullscreen() {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			setIsFullscreen(false);
		} catch (error) {
			toast.push(error?.message ?? 'Could not exit fullscreen.');
		}
	}

	return (
		<div className="focusStudio glass-card" ref={fullscreenRef}>
			<div className={`focusStudioGrid ${focus.running ? 'isActive' : ''}`}>
				<div className="focusCountdownCard">
					<div className="premiumPanelHeader">
						<div>
							<div className="panelEyebrow">Focus session</div>
							<h3 className="premiumPanelTitle">Remaining time</h3>
							{focus.selectedHabitName ? (
								<div className="subtle" style={{ marginTop: 6 }}>
									Linked habit: {focus.selectedHabitName}
								</div>
							) : null}
						</div>
						<span className={focus.running ? 'badge success' : 'badge'}>{sessionLabel}</span>
					</div>

					<div className="countdownMachine">
						<div className="countdownMachineLabel">Countdown machine</div>
						<div className="countdownMachineValue">{formatTime(focus.focusSeconds)}</div>
						<div className="countdownMachineSubtle">
							{Math.round(progressPct)}% left of {Math.round(focus.focusMax / 60)} minutes
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
									focus.setCustomMinutes(String(minutes));
									focus.applyCustomDuration(String(minutes));
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
							value={focus.customMinutes}
							onChange={(event) => focus.setCustomMinutes(event.target.value)}
							placeholder="Custom minutes"
						/>
						<button className="btn ghost" type="button" onClick={() => focus.applyCustomDuration(focus.customMinutes)}>
							Set duration
						</button>
					</div>

					<div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
						<label className="sessionToggle">
							<input
								type="checkbox"
								checked={focus.autoFullscreen}
								onChange={(event) => focus.setAutoFullscreen(event.target.checked)}
							/>
							<span>Open in fullscreen on start</span>
						</label>
					</div>

					<div className="focusControls">
						<button
							className={focus.running ? 'btn ghost' : 'btn primary'}
							type="button"
							onClick={async () => {
								if (focus.running) {
									focus.pauseSession();
									return;
								}
								const started = focus.startSession();
								if (started && focus.autoFullscreen) await enterFullscreen();
							}}
						>
							{focus.running ? 'Pause session' : 'Start session'}
						</button>
						<button className="btn ghost" type="button" onClick={focus.resetSession}>Reset</button>
						<button className="btn ghost" type="button" onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen())}>
							{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
						</button>
					</div>

					<div className="focusHistoryGrid">
						<div className="focusHistoryCard">
							<div className="panelEyebrow">Session history</div>
							<div className="list" style={{ marginTop: 12 }}>
								{focus.focusHistory.length === 0 ? (
									<div className="subtle">No focus history yet.</div>
								) : (
									focus.focusHistory.slice(0, 5).map((item) => (
										<div key={item.id} className="item">
											<div className="row between" style={{ gap: 10 }}>
												<div className="subtle">{formatStamp(item.finishedAt)}</div>
												<span className={item.status === 'completed' ? 'badge success' : 'badge warning'}>
													{item.status}
												</span>
											</div>
											<div className="itemName" style={{ marginTop: 6 }}>{item.minutes} minute session</div>
										</div>
									))
								)}
							</div>
						</div>

						<div className="focusHistoryCard">
							<div className="panelEyebrow">Track history</div>
							<div className="list" style={{ marginTop: 12 }}>
								{spotify.spotifyHistory.length === 0 ? (
									<div className="subtle">No Spotify history yet.</div>
								) : (
									spotify.spotifyHistory.slice(0, 5).map((item) => (
										<div key={`${item.id}-${item.playedAt}`} className="item">
											<div className="itemName">{item.name}</div>
											<div className="subtle" style={{ marginTop: 4 }}>{item.artist}</div>
											<div className="subtle" style={{ marginTop: 6 }}>{formatStamp(item.playedAt)}</div>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				</div>

				{focus.running ? <SpotifyPanel /> : null}
			</div>

			{isFullscreen ? (
				<div className="focusFullscreenOverlay">
					<div className="focusFullscreenBackdrop" />
					<div className="focusFullscreenShell">
						<div className="focusFullscreenTimer">
							<div className="panelEyebrow">Focus mode</div>
							<div className="focusFullscreenValue">{formatTime(focus.focusSeconds)}</div>
							<div className="focusFullscreenMeta">
								<span>{focus.running ? 'Session running' : 'Paused session'}</span>
								<span>{Math.round(focus.focusMax / 60)} minute session</span>
							</div>
							<div className="focusBar">
								<div className="focusBarFill" style={{ width: `${progressPct}%` }} />
							</div>
						</div>
						<SpotifyPanel immersive />
					</div>
				</div>
			) : null}
		</div>
	);
}
