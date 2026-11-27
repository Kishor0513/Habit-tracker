import { describe, it, expect } from 'vitest';
import { isoToday } from '../src/lib/date.js';
import {
	lineTotal,
	invoiceSubtotal,
	invoiceTotals,
	invoiceBalance,
	effectiveInvoiceStatus,
	invoiceDashboard,
	nextInvoiceNumber,
} from '../src/lib/invoices.js';

describe('invoices library', () => {
	describe('lineTotal', () => {
		it('calculates quantity * rate', () => {
			expect(lineTotal({ quantity: 3, rateMinor: 100 })).toBe(300);
		});

		it('handles zero quantity', () => {
			expect(lineTotal({ quantity: 0, rateMinor: 100 })).toBe(0);
		});

		it('handles missing values', () => {
			expect(lineTotal({})).toBe(0);
		});
	});

	describe('invoiceSubtotal', () => {
		it('sums line item totals', () => {
			const invoice = {
				items: [
					{ description: 'Widget', quantity: 2, rateMinor: 50 },
					{ description: 'Gadget', quantity: 3, rateMinor: 100 },
				],
			};
			expect(invoiceSubtotal(invoice)).toBe(400);
		});
	});

	describe('invoiceTotals', () => {
		it('calculates subtotal, tax, and total', () => {
			const invoice = {
				items: [{ description: 'Item', quantity: 2, rateMinor: 100 }],
				taxRateBps: 500, // 5%
				discountMinor: 50,
			};
			const result = invoiceTotals(invoice);
			expect(result.subtotalMinor).toBe(200);
			expect(result.taxMinor).toBe(10); // 5% of 200
			expect(result.totalMinor).toBe(160); // 200 + 10 - 50
		});
	});

	describe('invoiceBalance', () => {
		it('calculates due amount', () => {
			const invoice = { id: 'inv1', items: [] };
			const payments = [{ invoiceId: 'inv1', amountMinor: 50 }];
			const result = invoiceBalance(invoice, payments);
			expect(result.totalMinor).toBe(0);
			expect(result.paidMinor).toBe(50);
			expect(result.dueMinor).toBe(-50); // overpaid
		});
	});

	describe('effectiveInvoiceStatus', () => {
		it('returns paid when fully paid (today is after due date)', () => {
			const invoice = {
				id: 'inv1',
				status: 'sent',
				dueDate: '2025-01-10',
				items: [{ rateMinor: 100, quantity: 1 }],
			};
			const payments = [{ invoiceId: 'inv1', amountMinor: 100 }];
			expect(effectiveInvoiceStatus(invoice, payments, '2025-01-15')).toBe('paid');
		});

		it('returns draft for unpaid unpaid invoices', () => {
			const invoice = { id: 'inv1', status: 'draft', dueDate: '2025-01-20' };
			expect(effectiveInvoiceStatus(invoice, [], '2025-01-15')).toBe('draft');
		});
	});

	describe('invoiceDashboard', () => {
		it('aggregates invoice totals', () => {
			const invoices = [
				{ id: 'i1', items: [{ rateMinor: 100, quantity: 1 }], status: 'paid', dueDate: '2025-01-01' },
				{ id: 'i2', items: [{ rateMinor: 200, quantity: 1 }], status: 'draft', dueDate: '2025-01-15' },
				{ id: 'i3', items: [{ rateMinor: 300, quantity: 1 }], status: 'sent', dueDate: '2025-01-10' },
			];
			const result = invoiceDashboard(invoices, [], '2025-01-15');
			expect(result.all).toBe(600);
			expect(result.paid).toBe(100);
		});
	});

	describe('nextInvoiceNumber', () => {
		it('generates sequential numbers', () => {
			const today = '2025-03-15';
			expect(nextInvoiceNumber([], today)).toBe('INV-2025-0001');
		});

		it('continues from existing numbers', () => {
			const today = '2025-03-15';
			const invoices = [{ number: 'INV-2025-0005' }];
			expect(nextInvoiceNumber(invoices, today)).toBe('INV-2025-0006');
		});
	});
});