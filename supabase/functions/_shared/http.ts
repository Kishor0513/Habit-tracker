function getAllowedOrigin(): string {
	const envOrigin = Deno.env.get('ALLOWED_ORIGIN');
	if (envOrigin) return envOrigin;
	const supabaseUrl = Deno.env.get('SUPABASE_URL');
	if (supabaseUrl) {
		try {
			return new URL(supabaseUrl).origin;
		} catch {
			// fall through
		}
	}
	return '*';
}

export function getCorsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': getAllowedOrigin(),
		'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
		'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
	};
}

export const corsHeaders = getCorsHeaders();

export function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			...getCorsHeaders(),
			'Content-Type': 'application/json',
		},
	});
}
