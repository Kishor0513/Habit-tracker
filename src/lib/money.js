// Money is always handled as integer minor units in application code.
// No floating-point arithmetic is used for totals, taxes or conversions.

export const CURRENCIES = {
	NPR: { symbol: 'रु.', locale: 'en-NP', decimals: 2, label: 'Nepalese Rupee' },
	INR: { symbol: '₹', locale: 'en-IN', decimals: 2, label: 'Indian Rupee' },
	USD: { symbol: '$', locale: 'en-US', decimals: 2, label: 'US Dollar' },
	EUR: { symbol: '€', locale: 'de-DE', decimals: 2, label: 'Euro' },
	GBP: { symbol: '£', locale: 'en-GB', decimals: 2, label: 'British Pound' },
	JPY: { symbol: '¥', locale: 'ja-JP', decimals: 0, label: 'Japanese Yen' },
};

export function currencyInfo(code = 'NPR') {
	return CURRENCIES[code] ?? { ...CURRENCIES.NPR, symbol: code, label: code };
}

export function currencyDecimals(code = 'NPR') {
	return currencyInfo(code).decimals;
}

// Parse a user-entered amount ("1,234.50", "रु. 500", "-20") into minor units.
export function parseMinor(input, code = 'NPR') {
	const decimals = currencyDecimals(code);
	let text = String(input ?? '').trim();
	const negative = text.includes('-');
	text = text.replace(/[^0-9.]/g, '');
	if (!text) return 0;

	const parts = text.split('.');
	let whole = '0';
	let fraction = '';
	if (parts.length === 1) {
		whole = parts[0];
	} else if (parts.length > 1) {
		fraction = parts.pop();
		whole = parts.join('');
	}

	const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
	const minor = Number.parseInt(whole || '0', 10) * 10 ** decimals + (decimals > 0 ? Number.parseInt(padded || '0', 10) : 0);
	if (!Number.isFinite(minor)) return 0;
	return negative ? -minor : minor;
}

export function minorToMajor(minor, code = 'NPR') {
	const decimals = currencyDecimals(code);
	const sign = minor < 0 ? '-' : '';
	const absolute = Math.abs(Math.trunc(Number(minor) || 0));
	const whole = Math.floor(absolute / 10 ** decimals);
	const fraction = absolute % 10 ** decimals;
	return { sign, whole, fraction, decimals };
}

export function formatMinor(minor, code = 'NPR', options = {}) {
	const { compact = false, showZeroFraction = true, symbol = true } = options;
	const info = currencyInfo(code);
	const { sign, whole, fraction, decimals } = minorToMajor(minor, code);
	const grouped = new Intl.NumberFormat('en-US').format(whole);
	let value = grouped;
	if (decimals > 0 && (fraction !== 0 || showZeroFraction)) {
		value += `.${String(fraction).padStart(decimals, '0')}`;
	}
	if (compact && Math.abs(Number(minor) || 0) >= 10000000) {
		const crore = Math.abs(Number(minor)) / (10 ** decimals * 10000000);
		value = `${crore.toFixed(1)} Cr`;
	}
	return `${sign}${symbol ? `${info.symbol} ` : ''}${value}`;
}

export function addMinor(...values) {
	return values.reduce((sum, value) => sum + Math.trunc(Number(value) || 0), 0);
}

export function subMinor(a, b) {
	return Math.trunc(Number(a) || 0) - Math.trunc(Number(b) || 0);
}

// Multiply an integer amount by a rational factor with deterministic rounding.
export function mulMinor(minor, numerator, denominator = 1) {
	const value = Math.trunc(Number(minor) || 0);
	const den = Math.trunc(Number(denominator) || 1) || 1;
	const num = Number(numerator) || 0;
	return Math.round((value * num) / den);
}

// Apply basis-point tax (100 bps = 1%) using integer math.
export function taxMinor(minor, rateBps) {
	return mulMinor(minor, Math.trunc(Number(rateBps) || 0), 10000);
}

// CSV export helper — produces a valid CSV string with quoted values.
export function toCsv(rows) {
	const escape = (value) => {
		const text = value == null ? '' : String(value);
		return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
	};
	return rows.map((row) => row.map(escape).join(',')).join('\r\n');
}

export function downloadCsv(filename, rows) {
	const blob = new Blob(['\ufeff', toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}
