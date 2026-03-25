const STORAGE_KEY = 'spotify_auth_v1';
const PKCE_VERIFIER_KEY = 'spotify_pkce_verifier';
const PKCE_STATE_KEY = 'spotify_pkce_state';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const AUTHORIZE_ENDPOINT = 'https://accounts.spotify.com/authorize';

function randomString(length) {
	const chars =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = new Uint8Array(length);
	window.crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

async function sha256(input) {
	const data = new TextEncoder().encode(input);
	const digest = await window.crypto.subtle.digest('SHA-256', data);
	return btoa(String.fromCharCode(...new Uint8Array(digest)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function saveAuth(auth) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

function readAuth() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch (_e) {
		return null;
	}
}

export function clearSpotifyAuth() {
	localStorage.removeItem(STORAGE_KEY);
	localStorage.removeItem(PKCE_VERIFIER_KEY);
	localStorage.removeItem(PKCE_STATE_KEY);
}

export function getStoredSpotifyAuth() {
	return readAuth();
}

export async function startSpotifyLogin({ clientId, redirectUri }) {
	const verifier = randomString(96);
	const state = randomString(20);
	const challenge = await sha256(verifier);
	localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
	localStorage.setItem(PKCE_STATE_KEY, state);

	const params = new URLSearchParams({
		client_id: clientId,
		response_type: 'code',
		redirect_uri: redirectUri,
		code_challenge_method: 'S256',
		code_challenge: challenge,
		state,
		scope: [
			'streaming',
			'user-read-email',
			'user-read-private',
			'user-modify-playback-state',
			'user-read-playback-state',
		].join(' '),
	});

	window.location.assign(`${AUTHORIZE_ENDPOINT}?${params.toString()}`);
}

async function tokenRequest(body) {
	const res = await fetch(TOKEN_ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams(body),
	});

	const json = await res.json();
	if (!res.ok) {
		const message =
			json?.error_description || json?.error || 'Spotify token request failed.';
		throw new Error(message);
	}
	return json;
}

export async function completeSpotifyAuthFromUrl({ clientId, redirectUri }) {
	const url = new URL(window.location.href);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');

	if (error) throw new Error(`Spotify auth error: ${error}`);
	if (!code) return false;

	const savedState = localStorage.getItem(PKCE_STATE_KEY);
	const verifier = localStorage.getItem(PKCE_VERIFIER_KEY);
	if (!savedState || !verifier || state !== savedState) {
		throw new Error('Spotify login state mismatch. Try connecting again.');
	}

	const token = await tokenRequest({
		client_id: clientId,
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri,
		code_verifier: verifier,
	});

	saveAuth({
		accessToken: token.access_token,
		refreshToken: token.refresh_token,
		expiresAt: Date.now() + token.expires_in * 1000,
	});

	localStorage.removeItem(PKCE_VERIFIER_KEY);
	localStorage.removeItem(PKCE_STATE_KEY);

	url.searchParams.delete('code');
	url.searchParams.delete('state');
	window.history.replaceState({}, document.title, url.pathname + url.hash);
	return true;
}

export async function ensureSpotifyAccessToken(clientId) {
	const auth = readAuth();
	if (!auth?.accessToken) return null;

	const stillValid = auth.expiresAt && auth.expiresAt > Date.now() + 30_000;
	if (stillValid) return auth.accessToken;

	if (!auth.refreshToken) return null;

	const token = await tokenRequest({
		client_id: clientId,
		grant_type: 'refresh_token',
		refresh_token: auth.refreshToken,
	});

	const next = {
		accessToken: token.access_token,
		refreshToken: token.refresh_token || auth.refreshToken,
		expiresAt: Date.now() + token.expires_in * 1000,
	};
	saveAuth(next);
	return next.accessToken;
}

async function spotifyApiRequest(clientId, method, endpoint, body) {
	const token = await ensureSpotifyAccessToken(clientId);
	if (!token) throw new Error('Spotify not connected.');

	const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			...(body ? { 'Content-Type': 'application/json' } : {}),
		},
		...(body ? { body: JSON.stringify(body) } : {}),
	});

	if (!res.ok && res.status !== 204) {
		let message = 'Spotify API request failed.';
		try {
			const json = await res.json();
			message = json?.error?.message || message;
		} catch (_e) {
			// no-op
		}
		throw new Error(message);
	}

	if (res.status === 204) return null;
	return res.json();
}

export async function spotifyGetMe(clientId) {
	return spotifyApiRequest(clientId, 'GET', '/me');
}

export async function spotifyGetPlaybackState(clientId) {
	return spotifyApiRequest(clientId, 'GET', '/me/player');
}

export async function spotifyTransferPlayback(clientId, deviceId) {
	return spotifyApiRequest(clientId, 'PUT', '/me/player', {
		device_ids: [deviceId],
		play: false,
	});
}

export async function spotifyPlay(clientId, deviceId, payload) {
	const endpoint = deviceId
		? `/me/player/play?device_id=${encodeURIComponent(deviceId)}`
		: '/me/player/play';
	return spotifyApiRequest(clientId, 'PUT', endpoint, payload || {});
}

export async function spotifyPause(clientId, deviceId) {
	const endpoint = deviceId
		? `/me/player/pause?device_id=${encodeURIComponent(deviceId)}`
		: '/me/player/pause';
	return spotifyApiRequest(clientId, 'PUT', endpoint);
}

export async function spotifyNext(clientId, deviceId) {
	const endpoint = deviceId
		? `/me/player/next?device_id=${encodeURIComponent(deviceId)}`
		: '/me/player/next';
	return spotifyApiRequest(clientId, 'POST', endpoint);
}

export async function spotifyPrevious(clientId, deviceId) {
	const endpoint = deviceId
		? `/me/player/previous?device_id=${encodeURIComponent(deviceId)}`
		: '/me/player/previous';
	return spotifyApiRequest(clientId, 'POST', endpoint);
}

export async function spotifySeek(clientId, positionMs, deviceId) {
	const base = `/me/player/seek?position_ms=${Math.max(0, Math.floor(positionMs))}`;
	const endpoint = deviceId
		? `${base}&device_id=${encodeURIComponent(deviceId)}`
		: base;
	return spotifyApiRequest(clientId, 'PUT', endpoint);
}

export async function spotifySetVolume(clientId, volumePercent, deviceId) {
	const value = Math.max(0, Math.min(100, Math.floor(volumePercent)));
	const base = `/me/player/volume?volume_percent=${value}`;
	const endpoint = deviceId
		? `${base}&device_id=${encodeURIComponent(deviceId)}`
		: base;
	return spotifyApiRequest(clientId, 'PUT', endpoint);
}

export function loadSpotifyWebPlaybackSdk() {
	return new Promise((resolve, reject) => {
		if (window.Spotify?.Player) {
			resolve();
			return;
		}

		const existing = document.getElementById('spotify-web-playback-sdk');
		if (existing) {
			existing.addEventListener('load', () => resolve(), { once: true });
			existing.addEventListener(
				'error',
				() => reject(new Error('Spotify SDK failed to load.')),
				{ once: true },
			);
			return;
		}

		const script = document.createElement('script');
		script.id = 'spotify-web-playback-sdk';
		script.src = 'https://sdk.scdn.co/spotify-player.js';
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('Spotify SDK failed to load.'));
		document.body.appendChild(script);
	});
}

export function parseSpotifyInputToPlaybackPayload(input) {
	const value = input.trim();
	if (!value) return null;

	const uriMatch = value.match(
		/^spotify:(track|playlist|album):([A-Za-z0-9]+)$/,
	);
	if (uriMatch) {
		if (uriMatch[1] === 'track')
			return { uris: [`spotify:track:${uriMatch[2]}`] };
		return { context_uri: `spotify:${uriMatch[1]}:${uriMatch[2]}` };
	}

	const urlMatch = value.match(
		/spotify\.com\/(track|playlist|album)\/([A-Za-z0-9]+)/,
	);
	if (!urlMatch) return null;

	if (urlMatch[1] === 'track')
		return { uris: [`spotify:track:${urlMatch[2]}`] };
	return { context_uri: `spotify:${urlMatch[1]}:${urlMatch[2]}` };
}
