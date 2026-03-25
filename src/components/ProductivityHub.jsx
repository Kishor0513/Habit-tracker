import { useEffect, useMemo, useState } from 'react';
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

function normalizeSpotifyEmbedUrl(input) {
	const value = input.trim();
	if (!value) return '';

	// Accept raw Spotify URL and convert it into embed URL.
	const match = value.match(
		/spotify\.com\/(track|playlist|album|episode|show)\/([A-Za-z0-9]+)/,
	);
	if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;

	if (value.includes('open.spotify.com/embed/')) return value;
	return '';
}

function formatFocus(totalSeconds) {
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ProductivityHub() {
	const { api, refresh } = useApp();
	const toast = useToast();
	const [now, setNow] = useState(() => new Date());
	const [focusSeconds, setFocusSeconds] = useState(25 * 60);
	const [running, setRunning] = useState(false);
	const [spotifyUrl, setSpotifyUrl] = useState('');
	const [spotifyInput, setSpotifyInput] = useState('');

	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(id);
	}, []);

	useEffect(() => {
		if (!api) return;
		let alive = true;
		api
			.getSetting('spotify_embed_url')
			.then((saved) => {
				if (!alive || !saved?.value) return;
				const val = String(saved.value);
				setSpotifyUrl(val);
				setSpotifyInput(val);
			})
			.catch((e) => console.error(e));

		return () => {
			alive = false;
		};
	}, [api]);

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

	const calendarCells = useMemo(() => getCalendarCells(now), [now]);
	const todayDay = now.getDate();
	const palClock = isPalindromeClock(now);

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
				<input
					className="input"
					type="text"
					placeholder="Paste Spotify track/playlist URL"
					value={spotifyInput}
					onChange={(e) => setSpotifyInput(e.target.value)}
				/>
				<div
					className="row"
					style={{ flexWrap: 'wrap' }}
				>
					<button
						className="btn primary"
						type="button"
						onClick={async () => {
							const embed = normalizeSpotifyEmbedUrl(spotifyInput);
							if (!embed) {
								toast.push(
									'Use a valid Spotify track/playlist/album/show URL.',
								);
								return;
							}
							setSpotifyUrl(embed);
							if (api) {
								await api.setSetting('spotify_embed_url', embed);
								refresh();
							}
							toast.push('Spotify player saved.');
						}}
					>
						Save player
					</button>
				</div>

				{spotifyUrl ? (
					<iframe
						title="Spotify player"
						src={spotifyUrl}
						width="100%"
						height="152"
						frameBorder="0"
						allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
						loading="lazy"
					/>
				) : (
					<div className="subtle">
						Add a Spotify URL to embed your player here.
					</div>
				)}
			</div>
		</div>
	);
}
