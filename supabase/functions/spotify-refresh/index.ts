import { corsHeaders, json } from '../_shared/http.ts';

Deno.serve(async (request) => {
	if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
	return json({
		ok: true,
		message:
			'Spotify refresh is handled client-side in this repo today. Use this function as the production hook for server-side token rotation if you move refresh tokens off the client.',
	});
});
