import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "spotify_auth_v1";

const AUTHORIZE_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

const DEFAULT_SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state"
];

function getNowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function getSpotifyClientId() {
  return process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID?.trim() || "";
}

export async function spotifyLoadAuth() {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function spotifySaveAuth(auth) {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(auth));
}

export async function spotifyClearAuth() {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

async function spotifyTokenRequest(body) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString()
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error_description || json?.error || "Spotify token request failed.";
    throw new Error(message);
  }
  return json;
}

function isExpired(auth) {
  if (!auth?.accessToken || !auth?.expiresAt) return true;
  // refresh a bit early
  return getNowSeconds() >= auth.expiresAt - 30;
}

export async function spotifyGetAccessToken({ clientId }) {
  const auth = await spotifyLoadAuth();
  if (!auth) return null;
  if (!isExpired(auth)) return auth.accessToken;
  if (!auth.refreshToken) return null;

  const refreshed = await spotifyTokenRequest({
    grant_type: "refresh_token",
    refresh_token: auth.refreshToken,
    client_id: clientId
  });

  const next = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || auth.refreshToken,
    expiresAt: getNowSeconds() + (refreshed.expires_in || 3600)
  };
  await spotifySaveAuth(next);
  return next.accessToken;
}

export async function spotifySignIn({ clientId, scheme }) {
  if (!clientId) throw new Error("Missing EXPO_PUBLIC_SPOTIFY_CLIENT_ID.");

  const redirectUri = AuthSession.makeRedirectUri({
    scheme,
    path: "spotify-auth"
  });

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: DEFAULT_SCOPES,
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code
  });

  const authUrl = await request.makeAuthUrlAsync({
    authorizationEndpoint: AUTHORIZE_ENDPOINT
  });

  const result = await AuthSession.startAsync({ authUrl, returnUrl: redirectUri });
  if (result.type !== "success") {
    if (result.type === "dismiss") return null;
    throw new Error("Spotify sign-in cancelled.");
  }

  const code = result.params?.code;
  if (!code) throw new Error("Spotify sign-in failed (missing code).");

  const token = await spotifyTokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: request.codeVerifier
  });

  const auth = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: getNowSeconds() + (token.expires_in || 3600)
  };
  await spotifySaveAuth(auth);
  return auth;
}

async function spotifyApiRequest({ clientId, method, endpoint, body }) {
  const accessToken = await spotifyGetAccessToken({ clientId });
  if (!accessToken) throw new Error("Spotify is not connected.");
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : null)
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error?.message || json?.error_description || "Spotify API request failed.";
    throw new Error(message);
  }
  return json;
}

export async function spotifyGetMe({ clientId }) {
  return spotifyApiRequest({ clientId, method: "GET", endpoint: "/me" });
}

