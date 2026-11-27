import { addDays, isoToday } from './date.js';
import { addMinor, subMinor } from './money.js';

export function accountBalance(account, transactions = []) {
	const opening = Number(account?.openingBalanceMinor) || 0;
	return transactions
		.filter((tx) => tx.accountId === account?.id)
		.reduce((balance, tx) => {
			if (tx.type === 'income') return addMinor(balance, tx.amountMinor);
			if (tx.type === 'expense') return subMinor(balance, tx.amountMinor);
			if (tx.type === 'transfer') {
				if (tx.toAccountId === account?.id) return addMinor(balance, tx.amountMinor);
				return subMinor(balance, tx.amountMinor);
			}
			return balance;
		}, opening);
}

export function totalBalance(accounts = [], transactions = []) {
	return accounts
		.filter((account) => !account.archivedAt)
		.reduce((sum, account) => addMinor(sum, accountBalance(account, transactions)), 0);
}

export function monthlyTotals(transactions = [], month = isoToday().slice(0, 7)) {
	let incomeMinor = 0;
	let expenseMinor = 0;
	for (const tx of transactions) {
		if (!String(tx.date ?? '').startsWith(month)) continue;
		if (tx.type === 'income') incomeMinor = addMinor(incomeMinor, tx.amountMinor);
		if (tx.type === 'expense') expenseMinor = addMinor(expenseMinor, tx.amountMinor);
	}
	return { incomeMinor, expenseMinor, netMinor: subMinor(incomeMinor, expenseMinor) };
}

export function categorySpend(transactions = [], month = isoToday().slice(0, 7)) {
	const totals = new Map();
	for (const tx of transactions) {
		if (tx.type !== 'expense' || !String(tx.date ?? '').startsWith(month)) continue;
		totals.set(tx.category || 'Other', addMinor(totals.get(tx.category || 'Other') ?? 0, tx.amountMinor));
	}
	return [...totals.entries()]
		.map(([category, amountMinor]) => ({ category, amountMinor }))
		.sort((a, b) => b.amountMinor - a.amountMinor);
}

export function budgetProgress(budgets = [], transactions = [], month = isoToday().slice(0, 7)) {
	return budgets.map((budget) => {
		const spent = transactions
			.filter((tx) => tx.type === 'expense' && tx.category === budget.category && String(tx.date ?? '').startsWith(month))
			.reduce((sum, tx) => addMinor(sum, tx.amountMinor), 0);
		const percent = budget.amountMinor > 0 ? Math.round((spent / budget.amountMinor) * 100) : 0;
		return { ...budget, spentMinor: spent, percent, remainingMinor: subMinor(budget.amountMinor, spent) };
	});
}

export function addInterval(iso, frequency, interval) {
	const step = Math.max(1, Number(interval) || 1);
	if (frequency === 'daily') return addDays(iso, step);
	if (frequency === 'weekly') return addDays(iso, step * 7);
	const [year, month, day] = iso.split('-').map(Number);
	if (frequency === 'yearly') {
		const y = year + step;
		const maxDay = new Date(y, month, 0).getDate();
		return `${y}-${String(month).padStart(2, '0')}-${String(Math.min(day, maxDay)).padStart(2, '0')}`;
	}
	// monthly (default)
	const total = year * 12 + (month - 1) + step;
	const y = Math.floor(total / 12);
	const m = (total % 12) + 1;
	const maxDay = new Date(y, m, 0).getDate();
	return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(day, maxDay)).padStart(2, '0')}`;
}

// Deterministic occurrence generator. Callers dedupe using recurringId + date.
export function recurringOccurrences(rule, fromIso, untilIso = isoToday()) {
	if (!rule?.active || !rule.startDate) return [];
	const occurrences = [];
	let cursor = rule.startDate;
	let guard = 0;
	while (cursor <= untilIso && guard < 500) {
		guard += 1;
		if (cursor >= fromIso) occurrences.push({ ...rule, date: cursor, recurringId: rule.id });
		if (rule.endDate && cursor >= rule.endDate) break;
		const next = addInterval(cursor, rule.frequency, rule.interval);
		if (next <= cursor) break;
		cursor = next;
	}
	return occurrences;
}

export function dedupeKey(ruleId, date) {
	return `${ruleId}__${date}`;
}

export function incomeByMonth(transactions = [], months = 6) {
	const result = [];
	const now = new Date();
	for (let i = months - 1; i >= 0; i -= 1) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		result.push({ month: key, ...monthlyTotals(transactions, key) });
	}
	return result;
}
