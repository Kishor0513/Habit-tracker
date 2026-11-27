import { describe, it, expect } from 'vitest';
import {
	accountBalance,
	totalBalance,
	monthlyTotals,
	categorySpend,
	budgetProgress,
	addInterval,
} from '../src/lib/finance.js';
import { isoToday } from '../src/lib/date.js';

describe('finance library', () => {
	const transactions = [
		{ id: '1', accountId: 'acc1', type: 'income', amountMinor: 1000, date: '2025-01-01', category: 'Salary' },
		{ id: '2', accountId: 'acc1', type: 'expense', amountMinor: 200, date: '2025-01-05', category: 'Food' },
	];

	describe('accountBalance', () => {
		it('calculates balance for a simple account', () => {
			const account = { id: 'acc1', openingBalanceMinor: 500 };
			// 500 + 1000 - 200 = 1300
			expect(accountBalance(account, transactions)).toBe(1300);
		});

		it('returns opening balance for account with no transactions', () => {
			const account = { id: 'acc2', openingBalanceMinor: 500 };
			expect(accountBalance(account, transactions)).toBe(500);
		});
	});

	describe('totalBalance', () => {
		it('calculates sum of all account balances', () => {
			const accounts = [
				{ id: 'acc1', openingBalanceMinor: 500, archivedAt: null },
				{ id: 'acc2', openingBalanceMinor: 300, archivedAt: null },
			];
			// 1300 + 300 = 1600
			expect(totalBalance(accounts, transactions)).toBe(1600);
		});

		it('excludes archived accounts', () => {
			const accounts = [
				{ id: 'acc1', openingBalanceMinor: 500, archivedAt: null },
				{ id: 'acc2', openingBalanceMinor: 300, archivedAt: '2025-01-20' },
			];
			expect(totalBalance(accounts, transactions)).toBe(1300);
		});
	});

	describe('monthlyTotals', () => {
		it('sums income and expenses for specific month', () => {
			const result = monthlyTotals(transactions, '2025-01');
			expect(result.incomeMinor).toBe(1000);
			expect(result.expenseMinor).toBe(200);
			expect(result.netMinor).toBe(800);
		});
	});

	describe('categorySpend', () => {
		it('aggregates expenses by category', () => {
			const txs = [
				...transactions,
				{ type: 'expense', amountMinor: 150, date: '2025-01-12', category: 'Food' },
		];
			const result = categorySpend(txs, '2025-01');
			expect(result[0]).toEqual({ category: 'Food', amountMinor: 350 });
		});
	});

	describe('addInterval', () => {
		it('adds days', () => {
			expect(addInterval('2025-01-01', 'daily', 1)).toBe('2025-01-02');
			expect(addInterval('2025-01-31', 'daily', 1)).toBe('2025-02-01');
		});

		it('adds weeks', () => {
			expect(addInterval('2025-01-01', 'weekly', 1)).toBe('2025-01-08');
		});

		it('adds months', () => {
			expect(addInterval('2025-01-31', 'monthly', 1)).toBe('2025-02-28');
		});

		it('adds years', () => {
			expect(addInterval('2024-02-29', 'yearly', 1)).toBe('2025-02-28');
		});
	});
});