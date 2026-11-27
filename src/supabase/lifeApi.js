import { fromRow, toRow, normalizeRecord } from '../lib/lifeSchema.js';

const TABLES = {
	tasks: ['listTasks', 'upsertTask', 'deleteTask'],
	notes: ['listNotes', 'upsertNote', 'deleteNote'],
	note_folders: ['listNoteFolders', 'upsertNoteFolder', 'deleteNoteFolder'],
	accounts: ['listAccounts', 'upsertAccount', 'deleteAccount'],
	transactions: ['listTransactions', 'upsertTransaction', 'deleteTransaction'],
	budgets: ['listBudgets', 'upsertBudget', 'deleteBudget'],
	recurring_transactions: [
		'listRecurringTransactions',
		'upsertRecurringTransaction',
		'deleteRecurringTransaction',
	],
	savings_goals: ['listSavingsGoals', 'upsertSavingsGoal', 'deleteSavingsGoal'],
	clients: ['listClients', 'upsertClient', 'deleteClient'],
	invoices: ['listInvoices', 'upsertInvoice', 'deleteInvoice'],
	invoice_payments: ['listInvoicePayments', 'upsertInvoicePayment', 'deleteInvoicePayment'],
};

function must(result) {
	if (result.error) throw result.error;
	return result.data;
}

export class SupabaseLifeApi {
	constructor(supabase, userId) {
		this.supabase = supabase;
		this.userId = userId;
		for (const [table, [listName, upsertName, deleteName]] of Object.entries(TABLES)) {
			const type = table.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
			this[listName] = async () => {
				const data = must(
					await this.supabase.from(table).select('*').eq('user_id', this.userId),
				);
				return (data ?? []).map((row) => fromRow(type, row));
			};
			this[upsertName] = async (record) => {
				const full = normalizeRecord(type, record);
				const row = toRow(type, full, this.userId);
				if (record.id) row.id = record.id;
				const data = must(
					await this.supabase.from(table).upsert(row, { onConflict: 'id' }).select('*').single(),
				);
				return fromRow(type, data);
			};
			this[deleteName] = async (id) => {
				must(
					await this.supabase.from(table).delete().eq('id', id).eq('user_id', this.userId),
				);
			};
		}
	}

	async getLifeSetting(key) {
		const { data, error } = await this.supabase
			.from('life_settings')
			.select('*')
			.eq('user_id', this.userId)
			.eq('key', key)
			.maybeSingle();
		if (error) throw error;
		return fromRow('lifeSettings', data);
	}

	async setLifeSetting(key, value) {
		const row = toRow('lifeSettings', { key, value }, this.userId);
		const data = must(
			await this.supabase.from('life_settings').upsert(row, { onConflict: 'user_id,key' }).select('*').single(),
		);
		return fromRow('lifeSettings', data);
	}
}
