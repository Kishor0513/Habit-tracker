// Shared schema contract for the LifeOS modules.
// Records are always stored/normalized in camelCase on the client.
// Supabase rows use snake_case; conversion is centralized here.

export const LIFE_STORES = [
	'tasks',
	'notes',
	'noteFolders',
	'accounts',
	'transactions',
	'budgets',
	'recurringTransactions',
	'savingsGoals',
	'clients',
	'invoices',
	'invoicePayments',
	'lifeSettings',
];

export const LIFE_DEFAULTS = {
	tasks: {
		title: 'Untitled task',
		description: '',
		status: 'todo',
		priority: 'none',
		dueDate: '',
		startDate: '',
		projectId: '',
		tags: [],
		subtasks: [],
		orderIndex: 0,
		completedAt: null,
		archivedAt: null,
	},
	notes: {
		title: 'Untitled note',
		content: '',
		plainText: '',
		folderId: '',
		tags: [],
		pinned: false,
		favorite: false,
		archivedAt: null,
		deletedAt: null,
	},
	noteFolders: { name: 'Notes', color: '#7c3aed', orderIndex: 0 },
	accounts: {
		name: 'Account',
		type: 'checking',
		currency: 'NPR',
		openingBalanceMinor: 0,
		color: '#7c3aed',
		note: '',
		archivedAt: null,
	},
	transactions: {
		accountId: '',
		type: 'expense',
		amountMinor: 0,
		currency: 'NPR',
		category: 'Other',
		date: '',
		description: '',
		toAccountId: '',
		transferGroupId: '',
		recurringId: '',
		tags: [],
	},
	budgets: {
		category: 'Other',
		amountMinor: 0,
		period: 'monthly',
		startDate: '',
		endDate: '',
		currency: 'NPR',
	},
	recurringTransactions: {
		accountId: '',
		type: 'expense',
		amountMinor: 0,
		currency: 'NPR',
		category: 'Other',
		description: '',
		frequency: 'monthly',
		interval: 1,
		startDate: '',
		endDate: '',
		nextDate: '',
		toAccountId: '',
		active: true,
	},
	savingsGoals: {
		name: 'Savings goal',
		targetMinor: 0,
		currentMinor: 0,
		currency: 'NPR',
		deadline: '',
		color: '#7c3aed',
		note: '',
	},
	clients: {
		name: 'Client',
		email: '',
		phone: '',
		address: '',
		taxId: '',
		note: '',
	},
	invoices: {
		number: '',
		clientId: '',
		issueDate: '',
		dueDate: '',
		status: 'draft',
		currency: 'NPR',
		taxRateBps: 0,
		discountMinor: 0,
		notes: '',
		items: [],
	},
	invoicePayments: {
		invoiceId: '',
		amountMinor: 0,
		currency: 'NPR',
		date: '',
		method: '',
		note: '',
	},
};

const JSON_FIELDS = new Set([
	'tags',
	'subtasks',
	'items',
	'reminder',
	'schedule',
	'milestones',
]);

export function camelToSnake(key) {
	return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function snakeToCamel(key) {
	return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function isJsonField(key) {
	return JSON_FIELDS.has(key);
}

export function normalizeRecord(type, input = {}) {
	const defaults = LIFE_DEFAULTS[type] ?? {};
	const now = new Date().toISOString();
	const record = { ...input };
	const output = { ...defaults };
	for (const [key, value] of Object.entries(record)) {
		if (key === 'userId') continue;
		output[key] = value;
	}
	if (!output.id) output.id = crypto.randomUUID();
	for (const key of JSON_FIELDS) {
		if (key in output && !Array.isArray(output[key]) && typeof output[key] !== 'object') {
			try {
				output[key] = JSON.parse(output[key]);
			} catch {
				output[key] = [];
			}
		}
		if (key in output && output[key] == null) output[key] = [];
	}
	if (type !== 'lifeSettings') {
		output.createdAt = output.createdAt ?? now;
		output.updatedAt = now;
	}
	return output;
}

export function toRow(type, record, userId) {
	const row = {};
	if (type === 'lifeSettings') {
		return { user_id: userId, key: record.key, value: record.value ?? null, updated_at: new Date().toISOString() };
	}
	for (const [key, value] of Object.entries(record)) {
		if (key === 'userId') continue;
		row[camelToSnake(key)] = value ?? null;
	}
	if (userId) row.user_id = userId;
	return row;
}

export function fromRow(type, row) {
	if (!row) return null;
	if (type === 'lifeSettings') {
		return { key: row.key, value: row.value ?? null, updatedAt: row.updated_at ?? null };
	}
	const record = {};
	for (const [key, value] of Object.entries(row)) {
		if (key === 'user_id') continue;
		const camel = snakeToCamel(key);
		if (isJsonField(camel) && typeof value === 'string') {
			try {
				record[camel] = JSON.parse(value);
			} catch {
				record[camel] = [];
			}
		} else {
			record[camel] = value;
		}
	}
	const normalized = normalizeRecord(type, record);
	// Preserve original timestamps coming from the database.
	if (row.created_at) normalized.createdAt = row.created_at;
	if (row.updated_at) normalized.updatedAt = row.updated_at;
	return normalized;
}
