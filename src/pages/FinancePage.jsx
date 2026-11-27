import { useEffect, useMemo, useState } from 'react';
import { useLifeData } from '../state/useLifeData.js';
import { useApp } from '../state/AppState.jsx';
import AppIcon from '../components/AppIcon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { addDays, isoToday } from '../lib/date.js';
import { categorySpend, monthlyTotals, totalBalance, budgetProgress } from '../lib/finance.js';
import { invoiceDashboard } from '../lib/invoices.js';
import { currencyInfo, formatMinor, parseMinor, subMinor, addMinor } from '../lib/money.js';
import { toCsv, downloadCsv } from '../lib/money.js';
import { addInterval, recurringOccurrences } from '../lib/finance.js';

const TABS = [
	{ id: 'overview', label: 'Overview', icon: 'finance' },
	{ id: 'transactions', label: 'Transactions', icon: 'arrow' },
	{ id: 'accounts', label: 'Accounts', icon: 'wallet' },
	{ id: 'budgets', label: 'Budgets', icon: 'filter' },
	{ id: 'recurring', label: 'Recurring', icon: 'refresh' },
	{ id: 'savings', label: 'Savings', icon: 'pin' },
	{ id: 'reports', label: 'Reports', icon: 'chart' },
];

function blankTransaction() {
	return {
		accountId: '',
		type: 'expense',
		amountMinor: 50000,
		currency: 'NPR',
		category: 'Other',
		date: isoToday(),
		description: '',
		toAccountId: '',
		transferGroupId: '',
		recurringId: '',
		tags: [],
	};
}

export default function FinancePage() {
	const { life, refresh } = useApp();
	const { data, loading } = useLifeData();
	const [tab, setTab] = useState('overview');
	const [editing, setEditing] = useState(null);
	const [form, setForm] = useState(blankTransaction());
	const [saving, setSaving] = useState(false);

	const currency = data.accounts.find((account) => true)?.currency ?? data.transactions[0]?.currency ?? 'NPR';
	const month = isoToday().slice(0, 7);
	const totals = monthlyTotals(data.transactions, month);
	const balances = data.accounts.filter((account) => !account.archivedAt).map((account) => ({
		account,
		balance: accountBalanceLocal(account, data.transactions),
	}));
	const spend = categorySpend(data.transactions, month);
	const budgets = budgetProgress(data.budgets, data.transactions, month);

	useEffect(() => {
		const handler = () => {
			setForm(blankTransaction());
			setEditing('new');
		};
		window.addEventListener('life:new-transaction', handler);
		return () => window.removeEventListener('life:new-transaction', handler);
	}, []);

	const switchTab = (next) => {
		setTab(next);
		setSearchParamsSafe(next);
	};

	function setSearchParamsSafe(next) {
		if (typeof window === 'undefined') return;
		window.dispatchEvent(new CustomEvent('finance:navigate-tab', { detail: { tab: next } }));
	}

	const saveTransaction = async () => {
		if (!form.amountMinor && !form.description) return;
		const saved = await life.upsertTransaction({
			...form,
			id: editing === 'new' ? undefined : editing,
		});
		setEditing(null);
		refresh();
		return saved;
	};

	const removeTransaction = async (transaction) => {
		await life.deleteTransaction(transaction.id);
		refresh();
	};

	const generateRecurring = async (rule) => {
		const occurrences = recurringOccurrences(rule, rule.startDate, isoToday()).filter(
			(occurrence) => !data.transactions.some((tx) => tx.recurringId === rule.id && tx.date === occurrence.date),
		);
		if (occurrences.length === 0) return;
		for (const occurrence of occurrences) {
			await life.upsertTransaction({
				accountId: occurrence.accountId,
				type: occurrence.type,
				amountMinor: occurrence.amountMinor,
				currency: occurrence.currency,
				category: occurrence.category,
				date: occurrence.date,
				description: occurrence.description,
				toAccountId: occurrence.toAccountId ?? '',
				transferGroupId: occurrence.transferGroupId ?? '',
				recurringId: occurrence.recurringId,
			});
		}
		await life.upsertRecurringTransaction({ ...rule, nextDate: addInterval(rule.startDate, rule.frequency, rule.interval) });
		refresh();
	};

	if (loading) return <div className="pageContent"><div className="emptyPanelState">Loading finances…</div></div>;

	return (
		<div className="pageContent">
			<div className="sectionHeader">
				<div>
					<div className="panelEyebrow">Money</div>
					<h1 className="pageTitle">Finance</h1>
					<p className="subtle">Accounts, cashflow and budgets — all in नेपाली रु. by default.</p>
				</div>
				<button className="btn primary" type="button" onClick={() => { setForm(blankTransaction()); setEditing('new'); }}>
					<AppIcon name="plus" size={15} /> New transaction
				</button>
			</div>

			<div className="viewTabs tabsWrap">
				{TABS.map((item) => (
					<button key={item.id} className={`viewTab ${tab === item.id ? 'isActive' : ''}`} type="button" onClick={() => switchTab(item.id)}>
						<AppIcon name={item.icon} size={14} /> {item.label}
					</button>
				))}
			</div>

			{tab === 'overview' && (
				<div className="stack">
					<div className="kpiGrid">
						<div className="kpi card">
							<span className="label">Total balance</span>
							<span className="value">{formatMinor(totalBalance(data.accounts, data.transactions), currency)}</span>
						</div>
						<div className="kpi card">
							<span className="label">Income · {month}</span>
							<span className="value successText">{formatMinor(totals.incomeMinor, currency)}</span>
						</div>
						<div className="kpi card">
							<span className="label">Expenses · {month}</span>
							<span className="value dangerText">{formatMinor(totals.expenseMinor, currency)}</span>
						</div>
						<div className="kpi card">
							<span className="label">Net · {month}</span>
							<span className={`value ${totals.netMinor >= 0 ? 'successText' : 'dangerText'}`}>{formatMinor(totals.netMinor, currency)}</span>
						</div>
				 </div>

					<div className="grid two">
						<div className="card premiumPanel">
							<div className="premiumPanelHeader">
								<h3 className="premiumPanelTitle">Spending by category</h3>
								<span className="badge">{currencyInfo(currency).label}</span>
							</div>
							<div className="list">
								{spend.slice(0, 6).map((row) => {
									const percent = totals.expenseMinor > 0 ? Math.round((row.amountMinor / totals.expenseMinor) * 100) : 0;
									return (
										<div className="spendRow" key={row.category}>
											<div className="row between">
												<span className="label">{row.category}</span>
												<span className="value">{formatMinor(row.amountMinor, currency)}</span>
											</div>
											<div className="sectionProgress"><div className="sectionProgressFill" style={{ width: `${Math.min(100, percent)}%` }} /></div>
										</div>
									);
								})}
								{spend.length === 0 && <div className="emptyPanelState">No spending recorded this month.</div>}
							</div>
						</div>

						<div className="card premiumPanel">
							<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">Budgets this month</h3></div>
							<div className="list">
								{budgets.map((budget) => (
									<div className="spendRow" key={budget.id}>
										<div className="row between">
											<span className="label">{budget.category}</span>
											<span className="value">{formatMinor(budget.spentMinor, currency)} / {formatMinor(budget.amountMinor, currency)}</span>
										</div>
										<div className="sectionProgress"><div className="sectionProgressFill" style={{ width: `${Math.min(100, budget.percent)}%` }} /></div>
									</div>
								))}
								{budgets.length === 0 && <div className="emptyPanelState">No budgets yet — create one to keep spending visible.</div>}
							</div>
						</div>
					</div>
				</div>
			)}

			{tab === 'transactions' && (
				<div className="stack">
					<div className="card">
						<div className="premiumPanelHeader">
							<h3 className="premiumPanelTitle">Transactions · {month}</h3>
							<button className="btn btn-sm" type="button" onClick={() => downloadCsv(`transactions-${month}.csv`, [
							['Date', 'Type', 'Category', 'Description', 'Amount (minor)', 'Currency'],
							...data.transactions
								.filter((tx) => String(tx.date ?? '').startsWith(month))
								.map((tx) => [tx.date, tx.type, tx.category, tx.description, String(tx.amountMinor), tx.currency]),
						])}>CSV export</button>
						</div>
						<div className="list">
							{[...data.transactions].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 30).map((tx) => (
								<div className="transactionRow" key={tx.id}>
									<span className={`transactionIcon ${tx.type}`}><AppIcon name={tx.type === 'income' ? 'finance' : 'arrow'} size={15} /></span>
									<div className="flex-1 min-w-0">
										<div className="itemName">{tx.description || tx.category}</div>
										<div className="subtle" style={{ fontSize: 11 }}>{tx.category} · {tx.date}</div>
									</div>
									<span className={`value ${tx.type === 'income' ? 'successText' : 'dangerText'}`}>
									{tx.type === 'income' ? '+' : '−'}{formatMinor(tx.amountMinor, tx.currency)}
									</span>
									<button className="iconBtn ghostIcon" type="button" title="Delete transaction" onClick={() => removeTransaction(tx)}><AppIcon name="trash" size={14} /></button>
								</div>
							))}
							{data.transactions.length === 0 && <div className="emptyPanelState">No transactions yet.</div>}
						</div>
					</div>
				</div>
			)}

			{tab === 'accounts' && (
				<div className="grid two">
					{data.accounts.map((account) => (
						<div className="card premiumPanel" key={account.id}>
							<div className="premiumPanelHeader">
								<h3 className="premiumPanelTitle">{account.name}</h3>
								<span className="badge">{account.type}</span>
							</div>
							<div className="value" style={{ fontSize: '1.6rem' }}>{formatMinor(accountBalanceLocal(account, data.transactions), account.currency)}</div>
							<p className="subtle">{currencyInfo(account.currency).label} · opened with {formatMinor(account.openingBalanceMinor, account.currency)}</p>
						</div>
					))}
				</div>
			)}

			{tab === 'budgets' && (
				<div className="list">
					{data.budgets.map((budget) => (
						<div className="card premiumPanel" key={budget.id}>
							<div className="premiumPanelHeader">
								<h3 className="premiumPanelTitle">{budget.category}</h3>
								<span className="badge">{budget.period}</span>
							</div>
							<div className="row between">
								<span>{formatMinor(budgets.find((item) => item.id === budget.id)?.spentMinor ?? 0, currency)} spent</span>
								<span className="value">of {formatMinor(budget.amountMinor, budget.currency)}</span>
							</div>
							<div className="sectionProgress"><div className="sectionProgressFill" style={{ width: `${Math.min(100, budgets.find((item) => item.id === budget.id)?.percent ?? 0)}%` }} /></div>
						</div>
					))}
				</div>
			)}

			{tab === 'recurring' && (
				<div className="list">
					{data.recurringTransactions.map((rule) => (
						<div className="card premiumPanel" key={rule.id}>
							<div className="premiumPanelHeader">
								<h3 className="premiumPanelTitle">{rule.description || `${rule.category} (recurring)`}</h3>
								<span className="badge">{rule.frequency}</span>
							</div>
							<div className="row gap-sm flex-wrap">
								<button className="btn btn-sm" type="button" onClick={() => generateRecurring(rule)} disabled={!rule.active}>
									<AppIcon name="refresh" size={13} /> Generate due
								</button>
								<button className="btn btn-sm ghost" type="button" onClick={() => {
									setForm({ accountId: rule.accountId, type: rule.type, amountMinor: rule.amountMinor, currency: rule.currency, category: rule.category, date: isoToday(), description: rule.description, toAccountId: rule.toAccountId ?? '', transferGroupId: rule.transferGroupId ?? '', recurringId: rule.id });
									setEditing('new');
								}}>Edit</button>
							</div>
						</div>
					))}
				 </div>
			)}

			{tab === 'savings' && (
				<div className="grid two">
					{data.savingsGoals.map((goal) => {
						const percent = goal.targetMinor > 0 ? Math.round((goal.currentMinor / goal.targetMinor) * 100) : 0;
						return (
							<div className="card premiumPanel" key={goal.id}>
								<div className="premiumPanelHeader">
									<h3 className="premiumPanelTitle">{goal.name}</h3>
									<span className="badge">{percent}%</span>
								</div>
								<div className="sectionProgress"><div className="sectionProgressFill" style={{ width: `${Math.min(100, percent)}%` }} /></div>
								<div className="row between mt-md">
									<span className="value">{formatMinor(goal.currentMinor, goal.currency)}</span>
									<span className="subtle">of {formatMinor(goal.targetMinor, goal.currency)}</span>
								</div>
								<div className="row gap-sm mt-md">
									<button className="btn btn-sm" type="button" onClick={async () => {
										await life.upsertSavingsGoal({ ...goal, currentMinor: addMinor(goal.currentMinor, goal.contributionMinor ?? 0) });
										refresh();
									}}>Contribute</button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{tab === 'reports' && (
				<div className="card premiumPanel">
					<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">Cashflow report</h3></div>
					<p className="subtle">This month: income {formatMinor(totals.incomeMinor, currency)} · expenses {formatMinor(totals.expenseMinor, currency)} · net {formatMinor(totals.netMinor, currency)}</p>
					<p className="subtle">Open invoices outstanding: {formatMinor(invoiceDashboard(data.invoices, data.invoicePayments).due, currency)}</p>
				</div>
			)}
		</div>
	);
}

function accountBalanceLocal(account, transactions) {
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
