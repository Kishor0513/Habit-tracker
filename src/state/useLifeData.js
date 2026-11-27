import { useEffect, useState } from 'react';
import { useApp } from './AppState.jsx';

const LIFE_METHODS = [
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
];

const EMPTY = {
	habits: [],
	projects: [],
	entries: [],
	...Object.fromEntries(LIFE_METHODS.map((key) => [key, []])),
};

// One shared snapshot per data version avoids each page re-reading every store.
let cache = null;

async function loadAll(api, life) {
	const jobs = {
		habits: api?.listHabits?.() ?? Promise.resolve([]),
		projects: api?.listProjects?.() ?? Promise.resolve([]),
		entries: api?.listEntries?.() ?? Promise.resolve([]),
	};
	for (const key of LIFE_METHODS) {
		const method = life?.[`list${key[0].toUpperCase()}${key.slice(1)}`];
		jobs[key] = typeof method === 'function' ? method.call(life) : Promise.resolve([]);
	}
	const entries = await Promise.allSettled(Object.entries(jobs));
	const data = { ...EMPTY };
	const errors = [];
	entries.forEach((result, index) => {
		const key = Object.keys(jobs)[index];
		if (result.status === 'fulfilled') data[key] = result.value ?? [];
		else errors.push(`${key}: ${result.reason?.message ?? 'failed to load'}`);
	});
	return { data, errors };
}

export function useLifeData() {
	const { api, life, dataVersion, refresh } = useApp();
	const [state, setState] = useState({
		data: EMPTY,
		errors: [],
		loading: Boolean(life),
	});

	useEffect(() => {
		if (!life) {
			setState({ data: EMPTY, errors: [], loading: false });
			return undefined;
		}
		if (!cache || cache.life !== life || cache.version !== dataVersion) {
			cache = { life, version: dataVersion, promise: loadAll(api, life) };
		}
		let alive = true;
		cache.promise
			.then(({ data, errors }) => {
				if (alive) setState({ data, errors, loading: false });
			})
			.catch((error) => {
				if (alive) setState({ data: EMPTY, errors: [error.message], loading: false });
			});
		return () => {
			alive = false;
		};
	}, [api, life, dataVersion]);

	return { ...state, refresh };
}
