import { useEffect, useState } from 'react';
import { useLifeData } from '../state/useLifeData.js';
import { useApp } from '../state/AppState.jsx';
import AppIcon from '../components/AppIcon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { isoToday } from '../lib/date.js';
import { addMinor, formatMinor, parseMinor, subMinor } from '../lib/money.js';
import { effectiveInvoiceStatus, invoiceBalance, invoiceDashboard, invoiceTotals, nextInvoiceNumber } from '../lib/invoices.js';

const TABS = [
	{ id: 'invoices', label: 'Invoices', icon: 'invoice' },
	{ id: 'clients', label: 'Clients', icon: 'user' },
];

const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

function blankInvoice(invoices) {
	const today = isoToday();
	return {
		number: nextInvoiceNumber(invoices, today),
		clientId: '',
		issueDate: today,
		dueDate: addDaysDate(today, 14),
		status: 'draft',
		currency: 'NPR',
		taxRateBps: 0,
		discountMinor: 0,
		notes: '',
		items: [{ id: crypto.randomUUID(), description: '', quantity: 1, rateMinor: 0 }],
	};
}

function addDaysDate(iso, days) {
	const [y, m, d] = iso.split('-').map(Number);
	const date = new Date(y, m - 1, d);
	date.setDate(date.getDate() + days);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function blankClient() {
	return { name: '', email: '', phone: '', address: '', taxId: '', note: '' };
}

export default function InvoicesPage() {
	const { life, refresh } = useApp();
	const { data, loading } = useLifeData();
	const [tab, setTab] = useState('invoices');
	const [invoiceModal, setInvoiceModal] = useState(null);
	const [clientModal, setClientModal] = useState(null);
	const [detail, setDetail] = useState(null);
	const [payment, setPayment] = useState({ amountMinor: 0, currency: 'NPR', date: isoToday(), method: 'cash', note: '' });

	useEffect(() => {
		const onNewInvoice = () => { setInvoiceModal(blankInvoice(data.invoices)); setTab('invoices'); };
		const onNewClient = () => { setClientModal(blankClient()); setTab('clients'); };
		window.addEventListener('life:new-invoice', onNewInvoice);
		window.addEventListener('life:new-client', onNewClient);
		return () => {
			window.removeEventListener('life:new-invoice', onNewInvoice);
			window.removeEventListener('life:new-client', onNewClient);
		};
	}, [data.invoices]);

	if (loading) return <div className="pageContent"><div className="emptyPanelState">Loading invoices…</div></div>;

	const dashboard = invoiceDashboard(data.invoices, data.invoicePayments);
	const currency = invoiceModal?.currency ?? data.invoices[0]?.currency ?? 'NPR';

	const saveInvoice = async () => {
		if (!invoiceModal.clientId || invoiceModal.items.filter((item) => item.description.trim()).length === 0) return;
		await life.upsertInvoice({
			...invoiceModal,
			id: invoiceModal.id,
			items: invoiceModal.items.filter((item) => item.description.trim()),
		});
		setInvoiceModal(null);
		refresh();
	};

	const saveClient = async () => {
		if (!clientModal.name.trim()) return;
		await life.upsertClient(clientModal);
		setClientModal(null);
		refresh();
	};

	const deleteInvoice = async (invoice) => {
		if (!window.confirm(`Delete invoice ${invoice.number}?`)) return;
		for (const payment of data.invoicePayments.filter((item) => item.invoiceId === invoice.id)) {
			await life.deleteInvoicePayment(payment.id);
		}
		await life.deleteInvoice(invoice.id);
		setDetail(null);
		refresh();
	};

	const recordPayment = async () => {
		if (!detail || payment.amountMinor <= 0) return;
		await life.upsertInvoicePayment({ ...payment, invoiceId: detail.id, currency: detail.currency });
		refresh();
	};

	const markPaid = async (invoice) => {
		const { totalMinor, paidMinor } = invoiceBalance(invoice, data.invoicePayments);
		await life.upsertInvoicePayment({ invoiceId: invoice.id, amountMinor: subMinor(totalMinor, paidMinor), currency: invoice.currency, date: isoToday(), method: 'full', note: 'Marked as paid' });
		await life.upsertInvoice({ ...invoice, status: 'paid' });
		refresh();
	};

	const clientName = (clientId) => data.clients.find((client) => client.id === clientId)?.name ?? '—';

	return (
		<div className="pageContent">
			<div className="sectionHeader">
				<div>
					<div className="panelEyebrow">Money</div>
					<h1 className="pageTitle">Invoices</h1>
					<p className="subtle">Bill clients, track payments, export and print.</p>
				</div>
				<div className="row gap-sm flex-wrap">
					<button className="btn" type="button" onClick={() => setClientModal(blankClient())}><AppIcon name="plus" size={15} /> New client</button>
					<button className="btn primary" type="button" onClick={() => setInvoiceModal(blankInvoice(data.invoices))}><AppIcon name="plus" size={15} /> New invoice</button>
				</div>
			</div>

			<div className="kpiGrid">
				<div className="kpi card"><span className="label">Outstanding</span><span className="value dangerText">{formatMinor(dashboard.due, currency)}</span></div>
				<div className="kpi card"><span className="label">Paid</span><span className="value successText">{formatMinor(dashboard.paid, currency)}</span></div>
				<div className="kpi card"><span className="label">Sent</span><span className="value">{formatMinor(dashboard.sent, currency)}</span></div>
				<div className="kpi card"><span className="label">Drafts</span><span className="value">{formatMinor(dashboard.draft, currency)}</span></div>
			</div>

			<div className="viewTabs tabsWrap">
				{TABS.map((item) => (
					<button key={item.id} className={`viewTab ${tab === item.id ? 'isActive' : ''}`} type="button" onClick={() => setTab(item.id)}>
						<AppIcon name={item.icon} size={14} /> {item.label}
					</button>
				))}
			</div>

			{tab === 'invoices' && (
				<div className="list">
					{data.invoices.length === 0 && (
						<EmptyState
							emoji="🧾"
							title="No invoices yet"
							body="Create your first invoice — totals, tax and payments are calculated for you."
							action={<button className="btn primary" type="button" onClick={() => setInvoiceModal(blankInvoice(data.invoices))}>New invoice</button>}
						/>
					)}
					{data.invoices.map((invoice) => {
						const { totalMinor, dueMinor } = invoiceBalance(invoice, data.invoicePayments);
						const status = effectiveInvoiceStatus(invoice, data.invoicePayments);
						return (
							<div className="card premiumPanel" key={invoice.id}>
								<div className="premiumPanelHeader">
									<div>
										<h3 className="premiumPanelTitle">{invoice.number || 'Unnumbered'}</h3>
										<span className="subtle">{clientName(invoice.clientId)} · due {invoice.dueDate || '—'}</span>
									</div>
									<span className={`badge ${status === 'paid' ? 'success' : status === 'overdue' ? 'danger' : status === 'sent' ? 'warning' : ''}`}>{status}</span>
								</div>
								<div className="row gap-sm flex-wrap">
									<span className="value">{formatMinor(totalMinor, invoice.currency)}</span>
									{dueMinor > 0 && <span className="badge warning">Due {formatMinor(dueMinor, invoice.currency)}</span>}
									<button className="btn btn-sm" type="button" onClick={() => setDetail(invoice)}>View / Pay</button>
									<button className="btn btn-sm ghost" type="button" onClick={() => setInvoiceModal({ ...invoice })}>Edit</button>
									{status !== 'paid' && status !== 'cancelled' && (
										<button className="btn btn-sm ghost successText" type="button" onClick={() => markPaid(invoice)}>Mark paid</button>
									)}
									<button className="btn btn-sm ghost dangerText" type="button" onClick={() => deleteInvoice(invoice)}>Delete</button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{tab === 'clients' && (
				<div className="list">
					{data.clients.length === 0 && <div className="emptyPanelState">No clients yet — add one to start invoicing.</div>}
					{data.clients.map((client) => (
						<div className="card premiumPanel" key={client.id}>
							<div className="premiumPanelHeader">
								<h3 className="premiumPanelTitle">{client.name}</h3>
								<span className="subtle">{client.email}</span>
							</div>
							<div className="row gap-sm flex-wrap">
								<button className="btn btn-sm" type="button" onClick={() => setClientModal({ ...client })}>Edit</button>
								<button className="btn btn-sm ghost dangerText" type="button" onClick={async () => {
									if (!window.confirm(`Delete client ${client.name}?`)) return;
									await life.deleteClient(client.id);
									refresh();
								}}>Delete</button>
							</div>
						</div>
					))}
				</div>
			)}

			{invoiceModal && (
				<Modal
					title={invoiceModal.id ? 'Edit invoice' : 'New invoice'}
					onClose={() => setInvoiceModal(null)}
					actions={<>
						<button className="btn ghost" type="button" onClick={() => setInvoiceModal(null)}>Cancel</button>
						<button className="btn primary" type="button" onClick={saveInvoice} disabled={!invoiceModal.clientId}>Save invoice</button>
					</>}
				>
					<div className="stack">
						<div className="formGrid">
							<label className="field"><span className="label">Number</span>
								<input className="input" value={invoiceModal.number} onChange={(event) => setInvoiceModal({ ...invoiceModal, number: event.target.value })} />
							</label>
							<label className="field"><span className="label">Client</span>
								<select className="select" value={invoiceModal.clientId} onChange={(event) => setInvoiceModal({ ...invoiceModal, clientId: event.target.value })}>
									<option value="">Select a client</option>
									{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
								</select>
							</label>
							<label className="field"><span className="label">Issue date</span>
								<input className="input" type="date" value={invoiceModal.issueDate} onChange={(event) => setInvoiceModal({ ...invoiceModal, issueDate: event.target.value })} />
							</label>
							<label className="field"><span className="label">Due date</span>
								<input className="input" type="date" value={invoiceModal.dueDate} onChange={(event) => setInvoiceModal({ ...invoiceModal, dueDate: event.target.value })} />
							</label>
							<label className="field"><span className="label">Status</span>
								<select className="select" value={invoiceModal.status} onChange={(event) => setInvoiceModal({ ...invoiceModal, status: event.target.value })}>
									{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
								</select>
							</label>
							<label className="field"><span className="label">Tax %</span>
								<input className="input" type="number" step="0.1" value={(invoiceModal.taxRateBps ?? 0) / 100} onChange={(event) => setInvoiceModal({ ...invoiceModal, taxRateBps: Math.round(Number(event.target.value) * 100) })} />
							</label>
						</div>
						<div className="subtaskEditor">
							<div className="row between"><span className="label">Line items</span>
								<button className="btn btn-sm ghost" type="button" onClick={() => setInvoiceModal({ ...invoiceModal, items: [...invoiceModal.items, { id: crypto.randomUUID(), description: '', quantity: 1, rateMinor: 0 }] })}>
									<AppIcon name="plus" size={13} /> Add item
								</button>
							</div>
							{invoiceModal.items.map((item, index) => (
								<div className="row gap-sm" key={item.id}>
									<input className="input flex-1" placeholder="Description" value={item.description} onChange={(event) => {
										const items = [...invoiceModal.items];
										items[index] = { ...item, description: event.target.value };
										setInvoiceModal({ ...invoiceModal, items });
									}} />
									<input className="input" style={{ width: 70 }} type="number" min="1" value={item.quantity} onChange={(event) => {
										const items = [...invoiceModal.items];
										items[index] = { ...item, quantity: Math.max(1, Number(event.target.value)) };
										setInvoiceModal({ ...invoiceModal, items });
									}} />
									<input className="input" style={{ width: 110 }} value={formatMinor(item.rateMinor ?? 0, invoiceModal.currency)} onChange={(event) => {
										const items = [...invoiceModal.items];
										items[index] = { ...item, rateMinor: parseMinor(event.target.value, invoiceModal.currency) };
										setInvoiceModal({ ...invoiceModal, items });
									}} />
									<button className="iconBtn ghostIcon" type="button" onClick={() => setInvoiceModal({ ...invoiceModal, items: invoiceModal.items.filter((_, i) => i !== index) })}><AppIcon name="trash" size={14} /></button>
								</div>
							))}
						</div>
						<div className="row between">
							<span className="label">Subtotal</span>
							<span className="value">{formatMinor(invoiceTotals(invoiceModal).subtotalMinor, invoiceModal.currency)}</span>
						</div>
						<div className="row between">
							<span className="label">Tax</span>
							<span className="value">{formatMinor(invoiceTotals(invoiceModal).taxMinor, invoiceModal.currency)}</span>
						</div>
						<div className="row between">
							<span className="label">Total</span>
							<span className="value">{formatMinor(invoiceTotals(invoiceModal).totalMinor, invoiceModal.currency)}</span>
						</div>
						<textarea className="textarea" placeholder="Notes / payment terms" value={invoiceModal.notes} onChange={(event) => setInvoiceModal({ ...invoiceModal, notes: event.target.value })} />
					</div>
				</Modal>
			)}

			{detail && (
				<Modal
					title={`Invoice ${detail.number}`}
					onClose={() => setDetail(null)}
					actions={<>
						<button className="btn ghost" type="button" onClick={() => window.print()}>Print / PDF</button>
						<button className="btn ghost" type="button" onClick={() => { setDetail(null); }}>Close</button>
					</>}
				>
					<div className="stack" id="invoice-printable">
						<div className="row between">
							<div>
								<div className="panelEyebrow">From</div>
								<div className="value">LifeOS Workspace</div>
							</div>
							<div>
								<div className="panelEyebrow">To</div>
								<div className="value">{clientName(detail.clientId)}</div>
							</div>
						</div>
						<div className="tableWrap">
							<table className="dataTable">
								<thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
								<tbody>
									{detail.items.map((item) => (
										<tr key={item.id}>
											<td>{item.description}</td>
											<td>{item.quantity}</td>
											<td>{formatMinor(item.rateMinor, detail.currency)}</td>
											<td>{formatMinor(addMinor(item.rateMinor * item.quantity), detail.currency)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="row between"><span className="label">Subtotal</span><span>{formatMinor(invoiceTotals(detail).subtotalMinor, detail.currency)}</span></div>
						<div className="row between"><span className="label">Tax</span><span>{formatMinor(invoiceTotals(detail).taxMinor, detail.currency)}</span></div>
						<div className="row between"><span className="label">Total</span><span className="value">{formatMinor(invoiceTotals(detail).totalMinor, detail.currency)}</span></div>
						<div className="subtaskEditor">
							<div className="row between"><span className="label">Payments</span>
								<button className="btn btn-sm" type="button" onClick={() => setPayment({ amountMinor: 0, currency: detail.currency, date: isoToday(), method: 'cash', note: '' })}>Add payment</button>
							</div>
							{data.invoicePayments.filter((item) => item.invoiceId === detail.id).map((item) => (
								<div className="row between" key={item.id}>
									<span>{item.date} · {item.method}</span>
									<span className="value successText">{formatMinor(item.amountMinor, item.currency)}</span>
								</div>
							))}
							{payment && (
								<div className="row gap-sm">
									<input className="input flex-1" placeholder="Amount" value={payment.amountMinor === 0 ? '' : formatMinor(payment.amountMinor, detail.currency)} onChange={(event) => setPayment({ ...payment, amountMinor: parseMinor(event.target.value, detail.currency) })} />
									<button className="btn btn-sm primary" type="button" onClick={async () => { await recordPayment(); setPayment(null); }} disabled={payment.amountMinor <= 0}>Save</button>
								</div>
							)}
						</div>
					</div>
				</Modal>
			)}

			{clientModal && (
				<Modal
					title={clientModal.id ? 'Edit client' : 'New client'}
					onClose={() => setClientModal(null)}
					actions={<>
						<button className="btn ghost" type="button" onClick={() => setClientModal(null)}>Cancel</button>
						<button className="btn primary" type="button" onClick={saveClient} disabled={!clientModal.name.trim()}>Save client</button>
					</>}
				>
					<div className="formGrid">
						<label className="field"><span className="label">Name</span>
							<input className="input" autoFocus value={clientModal.name} onChange={(event) => setClientModal({ ...clientModal, name: event.target.value })} />
						</label>
						<label className="field"><span className="label">Email</span>
							<input className="input" value={clientModal.email} onChange={(event) => setClientModal({ ...clientModal, email: event.target.value })} />
						</label>
						<label className="field"><span className="label">Phone</span>
							<input className="input" value={clientModal.phone} onChange={(event) => setClientModal({ ...clientModal, phone: event.target.value })} />
						</label>
						<label className="field"><span className="label">Tax ID</span>
							<input className="input" value={clientModal.taxId} onChange={(event) => setClientModal({ ...clientModal, taxId: event.target.value })} />
						</label>
						<label className="field" style={{ gridColumn: 'span 2' }}><span className="label">Address</span>
							<input className="input" value={clientModal.address} onChange={(event) => setClientModal({ ...clientModal, address: event.target.value })} />
						</label>
					</div>
				</Modal>
			)}
		</div>
	);
}