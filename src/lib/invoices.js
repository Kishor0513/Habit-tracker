import { isoToday } from './date.js';
import { addMinor, mulMinor, subMinor, taxMinor } from './money.js';

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

export function lineTotal(item) {
	const quantity = Math.max(0, Number(item?.quantity) || 0);
	return mulMinor(Number(item?.rateMinor) || 0, quantity);
}

export function invoiceSubtotal(invoice) {
	return (invoice?.items ?? []).reduce((sum, item) => addMinor(sum, lineTotal(item)), 0);
}

export function invoiceTotals(invoice) {
	const subtotalMinor = invoiceSubtotal(invoice);
	const taxMinorValue = taxMinor(subtotalMinor, Number(invoice?.taxRateBps) || 0);
	const discountMinorValue = Math.min(Math.abs(Number(invoice?.discountMinor) || 0), subtotalMinor);
	const totalMinor = addMinor(subtotalMinor, taxMinorValue) - discountMinorValue;
	return { subtotalMinor, taxMinor: taxMinorValue, discountMinor: discountMinorValue, totalMinor };
}

export function invoiceBalance(invoice, payments = []) {
	const { totalMinor } = invoiceTotals(invoice);
	const paidMinor = payments
		.filter((payment) => payment.invoiceId === invoice?.id)
		.reduce((sum, payment) => addMinor(sum, payment.amountMinor), 0);
	return { totalMinor, paidMinor, dueMinor: subMinor(totalMinor, paidMinor) };
}

export function effectiveInvoiceStatus(invoice, payments = [], today = isoToday()) {
	if (invoice?.status === 'cancelled') return 'cancelled';
	const { dueMinor } = invoiceBalance(invoice, payments);
	if (dueMinor <= 0 && (invoice?.status === 'paid' || invoice?.items?.length)) return 'paid';
	if (invoice?.status === 'sent' && invoice.dueDate && invoice.dueDate < today) return 'overdue';
	return invoice?.status ?? 'draft';
}

export function invoiceDashboard(invoices = [], payments = []) {
	const totals = { draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0, due: 0, all: 0 };
	for (const invoice of invoices) {
		const status = effectiveInvoiceStatus(invoice, payments);
		const { totalMinor, dueMinor } = invoiceBalance(invoice, payments);
		totals[status] = addMinor(totals[status] ?? 0, totalMinor);
		totals.all = addMinor(totals.all, totalMinor);
		totals.due = addMinor(totals.due, dueMinor);
	}
	return totals;
}

const numberPattern = /^INV-(\d{4})-(\d+)$/;

export function nextInvoiceNumber(invoices = [], today = isoToday()) {
	const year = today.slice(0, 4);
	let max = 0;
	for (const invoice of invoices) {
		const match = numberPattern.exec(invoice.number ?? '');
		if (match && match[1] === year) max = Math.max(max, Number.parseInt(match[2], 10));
	}
	return `INV-${year}-${String(max + 1).padStart(4, '0')}`;
}
