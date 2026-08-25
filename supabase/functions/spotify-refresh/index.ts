import { corsHeaders, json } from '../_shared/http.ts';

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

Deno.serve(async (request) => {
	if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

	try {
		if (request.method !== 'POST') {
			return json({ error: 'Method not allowed.' }, 405);
		}

		const body = await request.json().catch(() => ({}));
		const { refresh_token, client_id } = body;

		if (!refresh_token || !client_id) {
			return json({ error: 'Missing refresh_token or client_id.' }, 400);
		}

		const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
		if (!clientSecret) {
			return json({ error: 'Server configuration error: SPOTIFY_CLIENT_SECRET not set.' }, 500);
		}

		const tokenRes = await fetch(TOKEN_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': `Basic ${btoa(`${client_id}:${clientSecret}`)}`,
			},
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token,
			}),
		});

		const tokenData = await tokenRes.json();

		if (!tokenRes.ok) {
			return json({
				error: tokenData?.error_description || tokenData?.error || 'Token refresh failed.',
			}, 401);
		}

		return json({
			access_token: tokenData.access_token,
			expires_in: tokenData.expires_in,
			refresh_token: tokenData.refresh_token || refresh_token,
		});
	} catch (error) {
		return json({
			error: error instanceof Error ? error.message : 'Unexpected error.',
		}, 500);
	}
});
