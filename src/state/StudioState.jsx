import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
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
import { useApp } from './AppState.jsx';
import { useToast } from './ToastState.jsx';

const StudioStateContext = createContext(null);
const FOCUS_HISTORY_KEY = 'habit_tracker_focus_history_v1';

function readJson(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch (_error) {
		return fallback;
	}
}

function writeJson(key, value) {
	localStorage.setItem(key, JSON.stringify(value));
}

function mapSessionToHistoryItem(session) {
	const durationSeconds = Number(session?.durationSeconds ?? 0);
	const fallbackStart = session?.startTime ?? new Date().toISOString();
	const fallbackEnd = session?.endTime ?? fallbackStart;
	return {
		id: session?.id ?? crypto.randomUUID(),
		startedAt: fallbackStart,
		finishedAt: fallbackEnd,
		minutes: Math.max(1, Math.round(durationSeconds / 60)),
		status: session?.success ? 'completed' : 'stopped',
	};
}

export function StudioProvider({ children }) {
	const { api, user, refresh } = useApp();
	const toast = useToast();
	const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? '';
	const redirectUri = window.location.origin + window.location.pathname;
	const authCompletedRef = useRef(false);
	const focusStartRef = useRef(null);
	const spotifyRefreshInFlightRef = useRef(null);
	const spotifyRateLimitUntilRef = useRef(0);

	const [customMinutes, setCustomMinutes] = useState('45');
	const [focusSeconds, setFocusSeconds] = useState(45 * 60);
	const [focusMax, setFocusMax] = useState(45 * 60);
	const [running, setRunning] = useState(false);
	const [autoFullscreen, setAutoFullscreen] = useState(true);
	const [focusHistory, setFocusHistory] = useState(() =>
		readJson(FOCUS_HISTORY_KEY, []),
	);
	const [selectedHabitId, setSelectedHabitId] = useState('');
	const [selectedHabitName, setSelectedHabitName] = useState('');

	const [spotifyMe, setSpotifyMe] = useState(null);
	const [spotifyState, setSpotifyState] = useState(null);
	const [spotifyAuthed, setSpotifyAuthed] = useState(
		Boolean(getStoredSpotifyAuth()),
	);
	const [spotifyError, setSpotifyError] = useState('');

	useEffect(() => {
		writeJson(FOCUS_HISTORY_KEY, focusHistory);
	}, [focusHistory]);

	useEffect(() => {
		localStorage.removeItem('habit_tracker_spotify_history_v1');
	}, []);

	useEffect(() => {
		if (!api?.listHabitSessions) return;
		let alive = true;
		api
			.listHabitSessions()
			.then((sessions) => {
				if (!alive || !Array.isArray(sessions) || sessions.length === 0) return;
				setFocusHistory(
					sessions
						.map(mapSessionToHistoryItem)
						.sort(
							(a, b) =>
								new Date(b.finishedAt).getTime() -
								new Date(a.finishedAt).getTime(),
						)
						.slice(0, 12),
				);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [api, user?.id]);

	useEffect(() => {
		if (!running) return;
		const id = window.setInterval(() => {
			setFocusSeconds((prev) => {
				if (prev <= 1) {
					window.clearInterval(id);
					setRunning(false);
					setFocusHistory((current) =>
						[
							{
								id: crypto.randomUUID(),
								startedAt: focusStartRef.current ?? new Date().toISOString(),
								finishedAt: new Date().toISOString(),
								minutes: Math.round(focusMax / 60),
								status: 'completed',
							},
							...current,
						].slice(0, 12),
					);
					if (api && selectedHabitId) {
						api
							.upsertHabitSession({
								habitId: selectedHabitId,
								userId: user?.id ?? 'local',
								startTime: focusStartRef.current ?? new Date().toISOString(),
								endTime: new Date().toISOString(),
								playlistId:
									spotifyState?.context?.uri ??
									spotifyState?.item?.album?.id ??
									'',
								success: true,
								durationSeconds: focusMax,
							})
							.then(() => refresh())
							.catch(() => {});
					}
					focusStartRef.current = null;
					if (
						typeof Notification !== 'undefined' &&
						Notification.permission === 'granted'
					) {
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
	}, [
		api,
		focusMax,
		refresh,
		running,
		selectedHabitId,
		spotifyState,
		toast,
		user?.id,
	]);

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
		let pollTimer = null;
		let hasFetchedProfile = false;
		let cachedMe = null;
		const BASE_DELAY_MS = 12000;

		function scheduleNext(delayMs = BASE_DELAY_MS) {
			if (!active) return;
			if (pollTimer) window.clearTimeout(pollTimer);
			pollTimer = window.setTimeout(refreshSpotify, delayMs);
		}

		async function refreshSpotify() {
			try {
				await ensureSpotifyAccessToken(spotifyClientId);
				const state = await refreshSpotifyState().catch(() => null);
				let me = cachedMe;
				if (!hasFetchedProfile || !cachedMe) {
					me = await spotifyGetMe(spotifyClientId);
					cachedMe = me;
					hasFetchedProfile = true;
				}
				if (!active) return;
				setSpotifyMe(me);
				if (state) setSpotifyState(state);
				scheduleNext(BASE_DELAY_MS);
			} catch (error) {
				if (!active) return;
				setSpotifyError(error?.message ?? 'Spotify sync failed.');
				const retryDelay =
					error?.status === 429
						? Math.max(15000, Number(error?.retryAfterMs) || 30000)
						: BASE_DELAY_MS;
				scheduleNext(retryDelay);
			}
		}

		refreshSpotify();
		return () => {
			active = false;
			if (pollTimer) window.clearTimeout(pollTimer);
		};
	}, [spotifyAuthed, spotifyClientId]);

	function applyCustomDuration(minutesValue) {
		const parsed = Number.parseInt(minutesValue, 10);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			toast.push('Enter a valid session length.');
			return false;
		}
		const nextSeconds = parsed * 60;
		setFocusSeconds(nextSeconds);
		setFocusMax(nextSeconds);
		setRunning(false);
		focusStartRef.current = null;
		return true;
	}

	function startSession() {
		if (focusSeconds <= 0) {
			const ok = applyCustomDuration(customMinutes);
			if (!ok) return false;
		}
		if (!focusStartRef.current)
			focusStartRef.current = new Date().toISOString();
		setRunning(true);
		return true;
	}

	function pauseSession() {
		setRunning(false);
	}

	function resetSession() {
		const elapsedSeconds = Math.max(0, focusMax - focusSeconds);
		if (focusStartRef.current && elapsedSeconds >= 60) {
			setFocusHistory((current) =>
				[
					{
						id: crypto.randomUUID(),
						startedAt: focusStartRef.current,
						finishedAt: new Date().toISOString(),
						minutes: Math.max(1, Math.round(elapsedSeconds / 60)),
						status: 'stopped',
					},
					...current,
				].slice(0, 12),
			);
			if (api && selectedHabitId) {
				api
					.upsertHabitSession({
						habitId: selectedHabitId,
						userId: user?.id ?? 'local',
						startTime: focusStartRef.current,
						endTime: new Date().toISOString(),
						playlistId:
							spotifyState?.context?.uri ?? spotifyState?.item?.album?.id ?? '',
						success: false,
						durationSeconds: elapsedSeconds,
					})
					.then(() => refresh())
					.catch(() => {});
			}
		}
		applyCustomDuration(customMinutes);
		focusStartRef.current = null;
	}

	async function refreshSpotifyState() {
		const now = Date.now();
		if (spotifyRateLimitUntilRef.current > now) {
			const waitMs = spotifyRateLimitUntilRef.current - now;
			const waitSec = Math.max(1, Math.ceil(waitMs / 1000));
			const error = new Error(
				`Spotify is temporarily rate-limited. Retry after ${waitSec}s.`,
			);
			error.status = 429;
			error.retryAfterMs = waitMs;
			setSpotifyError(error.message);
			throw error;
		}

		if (spotifyRefreshInFlightRef.current) return spotifyRefreshInFlightRef.current;

		spotifyRefreshInFlightRef.current = (async () => {
			try {
				const state = await spotifyGetPlaybackState(spotifyClientId);
				setSpotifyState(state);
				setSpotifyError('');
				return state;
			} catch (error) {
				if (error?.status === 429) {
					const waitMs = Math.max(15000, Number(error?.retryAfterMs) || 30000);
					spotifyRateLimitUntilRef.current = Date.now() + waitMs;
				}
				setSpotifyError(error?.message ?? 'Spotify sync failed.');
				throw error;
			} finally {
				spotifyRefreshInFlightRef.current = null;
			}
		})();

		return spotifyRefreshInFlightRef.current;
	}

	async function withSpotify(action) {
		try {
			await action();
			await new Promise((resolve) => window.setTimeout(resolve, 350));
			await refreshSpotifyState();
		} catch (error) {
			toast.push(error?.message ?? 'Spotify action failed.');
			setSpotifyError(error?.message ?? 'Spotify action failed.');
		}
	}

	const value = useMemo(
		() => ({
			focus: {
				customMinutes,
				setCustomMinutes,
				focusSeconds,
				focusMax,
				running,
				selectedHabitId,
				setSelectedHabitId,
				selectedHabitName,
				setSelectedHabitName,
				autoFullscreen,
				setAutoFullscreen,
				focusHistory,
				applyCustomDuration,
				startSession,
				pauseSession,
				resetSession,
			},
			spotify: {
				clientId: spotifyClientId,
				redirectUri,
				spotifyMe,
				spotifyState,
				spotifyAuthed,
				spotifyError,
				connect: () =>
					startSpotifyLogin({ clientId: spotifyClientId, redirectUri }),
				refresh: () =>
					refreshSpotifyState().catch((error) => {
						toast.push(error?.message ?? 'Spotify sync failed.');
					}),
				playPause: () =>
					withSpotify(async () => {
						const isPlaying = Boolean(
							spotifyState?.is_playing || spotifyState?.paused === false,
						);
						if (isPlaying) await spotifyPause(spotifyClientId);
						else await spotifyPlay(spotifyClientId);
					}),
				next: () => withSpotify(() => spotifyNext(spotifyClientId)),
				previous: () => withSpotify(() => spotifyPrevious(spotifyClientId)),
				seek: (positionMs) =>
					withSpotify(() => spotifySeek(spotifyClientId, positionMs)),
				disconnect: () => {
					clearSpotifyAuth();
					window.location.reload();
				},
			},
		}),
		[
			autoFullscreen,
			customMinutes,
			focusHistory,
			focusMax,
			focusSeconds,
			selectedHabitId,
			selectedHabitName,
			redirectUri,
			running,
			spotifyAuthed,
			spotifyClientId,
			spotifyError,
			spotifyMe,
			spotifyState,
			toast,
		],
	);

	return (
		<StudioStateContext.Provider value={value}>
			{children}
		</StudioStateContext.Provider>
	);
}

export function useStudio() {
	const ctx = useContext(StudioStateContext);
	if (!ctx) throw new Error('useStudio must be used within <StudioProvider>');
	return ctx;
}
