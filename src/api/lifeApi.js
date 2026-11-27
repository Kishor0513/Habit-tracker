import { del, get, getAll, openDb, put, tx } from '../db.js';
import { normalizeRecord } from '../lib/lifeSchema.js';
import { notifyDataChanged } from '../lib/dataSync.js';

const METHODS = {
	tasks: ['listTasks', 'upsertTask', 'deleteTask'],
	notes: ['listNotes', 'upsertNote', 'deleteNote'],
	noteFolders: ['listNoteFolders', 'upsertNoteFolder', 'deleteNoteFolder'],
	accounts: ['listAccounts', 'upsertAccount', 'deleteAccount'],
	transactions: ['listTransactions', 'upsertTransaction', 'deleteTransaction'],
	budgets: ['listBudgets', 'upsertBudget', 'deleteBudget'],
	recurringTransactions: [
		'listRecurringTransactions',
		'upsertRecurringTransaction',
		'deleteRecurringTransaction',
	],
	savingsGoals: ['listSavingsGoals', 'upsertSavingsGoal', 'deleteSavingsGoal'],
	clients: ['listClients', 'upsertClient', 'deleteClient'],
	invoices: ['listInvoices', 'upsertInvoice', 'deleteInvoice'],
	invoicePayments: ['listInvoicePayments', 'upsertInvoicePayment', 'deleteInvoicePayment'],
};

export class LocalLifeApi {
	constructor(db) {
		this.db = db;
		for (const [store, [listName, upsertName, deleteName]] of Object.entries(METHODS)) {
			this[listName] = async () =>
				tx(this.db, store, 'readonly', async ({ [store]: source }) => getAll(source));
			this[upsertName] = async (record) => {
				const full = normalizeRecord(store, record);
				await tx(this.db, store, 'readwrite', async ({ [store]: target }) => put(target, full));
				notifyDataChanged();
				return full;
			};
			this[deleteName] = async (id) => {
				await tx(this.db, store, 'readwrite', async ({ [store]: target }) => del(target, id));
				notifyDataChanged();
			};
		}
	}

	static async create() {
		return new LocalLifeApi(await openDb());
	}

	async getLifeSetting(key) {
		return tx(this.db, 'lifeSettings', 'readonly', async ({ lifeSettings }) =>
			get(lifeSettings, key),
		);
	}

	async setLifeSetting(key, value) {
		await tx(this.db, 'lifeSettings', 'readwrite', async ({ lifeSettings }) =>
			put(lifeSettings, { key, value, updatedAt: new Date().toISOString() }),
		);
		notifyDataChanged();
		return { key, value };
	}
}
