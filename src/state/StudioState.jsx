import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
const SPOTIFY_HISTORY_KEY = 'habit_tracker_spotify_history_v1';

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

export function StudioProvider({ children }) {
	const { api, user, refresh } = useApp();
	const toast = useToast();
	const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? '';
	const redirectUri = window.location.origin + window.location.pathname;
	const authCompletedRef = useRef(false);
	const focusStartRef = useRef(null);
	const lastTrackIdRef = useRef(null);

	const [customMinutes, setCustomMinutes] = useState('45');
	const [focusSeconds, setFocusSeconds] = useState(45 * 60);
	const [focusMax, setFocusMax] = useState(45 * 60);
	const [running, setRunning] = useState(false);
	const [autoFullscreen, setAutoFullscreen] = useState(true);
	const [focusHistory, setFocusHistory] = useState(() => readJson(FOCUS_HISTORY_KEY, []));
	const [selectedHabitId, setSelectedHabitId] = useState('');
	const [selectedHabitName, setSelectedHabitName] = useState('');

	const [spotifyMe, setSpotifyMe] = useState(null);
	const [spotifyState, setSpotifyState] = useState(null);
	const [spotifyAuthed, setSpotifyAuthed] = useState(Boolean(getStoredSpotifyAuth()));
	const [spotifyError, setSpotifyError] = useState('');
	const [spotifyHistory, setSpotifyHistory] = useState(() => readJson(SPOTIFY_HISTORY_KEY, []));

	useEffect(() => {
		writeJson(FOCUS_HISTORY_KEY, focusHistory);
	}, [focusHistory]);

	useEffect(() => {
		writeJson(SPOTIFY_HISTORY_KEY, spotifyHistory);
	}, [spotifyHistory]);

	useEffect(() => {
		if (!running) return;
		const id = window.setInterval(() => {
			setFocusSeconds((prev) => {
				if (prev <= 1) {
					window.clearInterval(id);
					setRunning(false);
					setFocusHistory((current) => [
						{
							id: crypto.randomUUID(),
							startedAt: focusStartRef.current ?? new Date().toISOString(),
							finishedAt: new Date().toISOString(),
							minutes: Math.round(focusMax / 60),
							status: 'completed',
						},
						...current,
					].slice(0, 12));
					if (api && selectedHabitId) {
						api.upsertHabitSession({
							habitId: selectedHabitId,
							userId: user?.id ?? 'local',
							startTime: focusStartRef.current ?? new Date().toISOString(),
							endTime: new Date().toISOString(),
							playlistId: spotifyState?.context?.uri ?? spotifyState?.item?.album?.id ?? '',
							success: true,
							durationSeconds: focusMax,
						}).then(() => refresh()).catch(() => {});
					}
					focusStartRef.current = null;
					if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
						new Notification('Focus session complete', { body: 'Your countdown reached zero.' });
					}
					toast.push('Focus session complete.');
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => window.clearInterval(id);
	}, [api, focusMax, refresh, running, selectedHabitId, spotifyState, toast, user?.id]);

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

	useEffect(() => {
		const currentTrack = spotifyState?.item;
		if (!currentTrack?.id || currentTrack.id === lastTrackIdRef.current) return;
		lastTrackIdRef.current = currentTrack.id;
		setSpotifyHistory((current) => [
			{
				id: currentTrack.id,
				name: currentTrack.name,
				artist: currentTrack.artists?.map((artist) => artist.name).join(', ') ?? '',
				playedAt: new Date().toISOString(),
				artwork: currentTrack.album?.images?.[0]?.url ?? '',
			},
			...current.filter((item) => item.id !== currentTrack.id),
		].slice(0, 12));
	}, [spotifyState]);

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
		if (!focusStartRef.current) focusStartRef.current = new Date().toISOString();
		setRunning(true);
		return true;
	}

	function pauseSession() {
		setRunning(false);
	}

	function resetSession() {
		if (focusStartRef.current && focusSeconds > 0 && focusSeconds < focusMax) {
			setFocusHistory((current) => [
				{
					id: crypto.randomUUID(),
					startedAt: focusStartRef.current,
					finishedAt: new Date().toISOString(),
					minutes: Math.round(focusMax / 60),
					status: 'stopped',
				},
				...current,
			].slice(0, 12));
			if (api && selectedHabitId) {
				api.upsertHabitSession({
					habitId: selectedHabitId,
					userId: user?.id ?? 'local',
					startTime: focusStartRef.current,
					endTime: new Date().toISOString(),
					playlistId: spotifyState?.context?.uri ?? spotifyState?.item?.album?.id ?? '',
					success: false,
					durationSeconds: focusMax - focusSeconds,
				}).then(() => refresh()).catch(() => {});
			}
		}
		applyCustomDuration(customMinutes);
		focusStartRef.current = null;
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

	const value = useMemo(() => ({
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
			spotifyHistory,
			connect: () => startSpotifyLogin({ clientId: spotifyClientId, redirectUri }),
			refresh: refreshSpotifyState,
			playPause: () =>
				withSpotify(async () => {
					const isPlaying = Boolean(spotifyState?.is_playing || spotifyState?.paused === false);
					if (isPlaying) await spotifyPause(spotifyClientId);
					else await spotifyPlay(spotifyClientId);
				}),
			next: () => withSpotify(() => spotifyNext(spotifyClientId)),
			previous: () => withSpotify(() => spotifyPrevious(spotifyClientId)),
			seek: (positionMs) => withSpotify(() => spotifySeek(spotifyClientId, positionMs)),
			disconnect: () => {
				clearSpotifyAuth();
				window.location.reload();
			},
		},
	}), [
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
		spotifyHistory,
		spotifyMe,
		spotifyState,
	]);

	return <StudioStateContext.Provider value={value}>{children}</StudioStateContext.Provider>;
}

export function useStudio() {
	const ctx = useContext(StudioStateContext);
	if (!ctx) throw new Error('useStudio must be used within <StudioProvider>');
	return ctx;
}
