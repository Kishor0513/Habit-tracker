import { del, get, getAll, openDb, put, tx } from '../db.js';
import { normalizeRecord } from '../lib/lifeSchema.js';

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
				tx(this.db, store, 'readwrite', async ({ [store]: source }) => {
					const records = await getAll(source);
					const seenIds = new Set();
					const repaired = records.map((record) => {
						const id = record?.id && !seenIds.has(record.id) ? record.id : crypto.randomUUID();
						seenIds.add(id);
						return record?.id === id ? record : { ...record, id };
					});
					for (const [index, record] of repaired.entries()) {
						if (record !== records[index]) await put(source, record);
					}
					return repaired;
				});
			this[upsertName] = async (record) => {
				const full = normalizeRecord(store, record);
				await tx(this.db, store, 'readwrite', async ({ [store]: target }) => put(target, full));
				return full;
			};
			this[deleteName] = async (id) =>
				tx(this.db, store, 'readwrite', async ({ [store]: target }) => del(target, id));
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
		return { key, value };
	}
}
