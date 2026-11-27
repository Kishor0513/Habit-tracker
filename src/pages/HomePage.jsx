import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppIcon from '../components/AppIcon.jsx';
import Modal from '../components/Modal.jsx';
import { useApp } from '../state/AppState.jsx';
import { useLifeData } from '../state/useLifeData.js';
import { isoToday } from '../lib/date.js';
import { isDueOn, entryMeetsTarget } from '../lib/habits.js';
import { currentStreak } from '../lib/stats.js';
import { filterTasks, isOverdue } from '../lib/tasks.js';
import { totalBalance, monthlyTotals, incomeByMonth } from '../lib/finance.js';
import { invoiceDashboard } from '../lib/invoices.js';
import { formatMinor } from '../lib/money.js';
import { DASHBOARD_WIDGETS, DEFAULT_WIDGET_CONFIG, normalizeWidgetConfig, moveWidget } from '../lib/dashboard.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const WIDGET_KEY = 'dashboardWidgets';
const WIDGET_LABELS = Object.fromEntries(DASHBOARD_WIDGETS.map((widget) => [widget.id, widget]));

export default function HomePage() {
	const navigate = useNavigate();
	const { life, refresh } = useApp();
	const { data, loading } = useLifeData();
	const [widgets, setWidgets] = useState(DEFAULT_WIDGET_CONFIG);
	const [customizing, setCustomizing] = useState(false);
	const today = isoToday();

	useEffect(() => {
		if (!life) return;
		life.getLifeSetting(WIDGET_KEY)
			.then((setting) => setWidgets(normalizeWidgetConfig(setting?.value)))
			.catch(() => setWidgets([...DEFAULT_WIDGET_CONFIG]));
	}, [life]);

	const saveWidgets = async (next) => {
		const normalized = normalizeWidgetConfig(next);
		setWidgets(normalized);
		if (life) {
			await life.setLifeSetting(WIDGET_KEY, { widgets: normalized });
			refresh();
		}
	};

	const toggleWidget = (id) => {
		const next = widgets.includes(id) ? widgets.filter((item) => item !== id) : [...widgets, id];
		saveWidgets(next);
	};

	if (loading) return <div className="pageContent"><div className="emptyPanelState">Loading dashboard…</div></div>;

	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

	const entriesByKey = new Map(data.entries.map((entry) => [`${entry.habitId}__${entry.date}`, entry]));
	const dueHabits = data.habits.filter((habit) => !habit.archivedAt && isDueOn(habit, today));
	const habitsDone = dueHabits.filter((habit) => entryMeetsTarget(habit, entriesByKey.get(`${habit.id}__${today}`)));
	const streaks = data.habits.filter((habit) => !habit.archivedAt).map((habit) => ({ habit, streak: currentStreak(habit, entriesByKey) }));
	const topStreak = streaks.sort((a, b) => b.streak - a.streak)[0];

	const myDayTasks = filterTasks(data.tasks, 'my-day', { today });
	const upcoming = data.tasks
		.filter((task) => task.dueDate && task.dueDate >= today && task.status !== 'done')
		.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
		.slice(0, 5);
	const overdue = data.tasks.filter((task) => isOverdue(task, today));

	const month = today.slice(0, 7);
	const finance = monthlyTotals(data.transactions, month);
	const cashflow = incomeByMonth(data.transactions, 6).map((row) => ({ ...row, label: row.month.slice(5) }));

	const recentNotes = [...data.notes]
		.filter((note) => !note.deletedAt && !note.archivedAt)
		.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
		.slice(0, 5);

	const activeProjects = data.projects.filter((project) => !project.archivedAt).slice(0, 3);
	const invoiceSummary = invoiceDashboard(data.invoices, data.invoicePayments);

	const renderWidget = (id) => {
		switch (id) {
			case 'habits':
				return (
					<div className="card premiumPanel" key={id}>
						<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">Habits today</h3></div>
						<div className="list">
							{dueHabits.map((habit) => {
								const done = entryMeetsTarget(habit, entriesByKey.get(`${habit.id}__${today}`));
								return (
									<div className="row between taskRow" key={habit.id}>
										<span className="itemName" style={{ textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--text-muted)' : 'inherit' }}>{habit.name || habit.title || 'Untitled habit'}</span>
										<span className="badge">{done ? 'Done' : 'Pending'}</span>
									</div>
								);
							})}
							{dueHabits.length === 0 && <div className="emptyPanelState">No habits due today.</div>}
						</div>
					</div>
				);
			case 'myDay':
				return (
					<div className="card premiumPanel" key={id}>
						<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">My Day tasks</h3></div>
						<div className="list">
							{myDayTasks.map((task) => (
								<div className="row between taskRow" key={task.id}>
									<span className="itemName">{task.title}</span>
									<span className="badge">{task.dueDate ?? task.status}</span>
								</div>
							))}
							{myDayTasks.length === 0 && <div className="emptyPanelState">Nothing planned for My Day.</div>}
						</div>
					</div>
				);
			case 'upcoming':
				return (
					<div className="card premiumPanel" key={id}>
						<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">Upcoming deadlines</h3></div>
						<div className="list">
							{upcoming.map((task) => (
								<div className="row between taskRow" key={task.id}>
									<span className="itemName">{task.title}</span>
									<span className="badge warning">{task.dueDate}</span>
								</div>
							))}
							{upcoming.length === 0 && <div className="emptyPanelState">No upcoming deadlines.</div>}
						</div>
					</div>
				);
			case 'recentNotes':
				return (
					<div className="card premiumPanel" key={id}>
						<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">Recent notes</h3></div>
						<div className="list">
							{recentNotes.map((note) => (
								<div className="row between taskRow" key={note.id}>
									<span className="itemName">{note.title}</span>
									<span className="badge">{new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
								</div>
							))}
							{recentNotes.length === 0 && <div className="emptyPanelState">No notes yet.</div>}
						</div>
					</div>
				);
			case 'projects':
				return (
					<div className="card premiumPanel" key={id}>
						<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">Active projects</h3></div>
						<div className="list">
							{activeProjects.map((project) => (
								<div className="row between taskRow" key={project.id}>
									<span className="itemName">{project.name}</span>
									<span className="badge">{project.status ?? 'active'}</span>
								</div>
							))}
							{activeProjects.length === 0 && <div className="emptyPanelState">No active projects.</div>}
						</div>
					</div>
				);
			case 'cashflow':
				return (
					<div className="card premiumPanel span-12" key={id}>
						<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">Cashflow</h3></div>
						<div className="chartFrame">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={cashflow} barGap={4}>
									<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
									<XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} />
									<YAxis stroke="var(--text-muted)" fontSize={11} />
									<Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }} />
									<Bar dataKey="incomeMinor" name="Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
									<Bar dataKey="expenseMinor" name="Expenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
				);
			case 'invoices':
				return (
					<div className="card premiumPanel" key={id}>
						<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">Invoice summary</h3></div>
						<div className="list">
							<div className="row between"><span className="label">Outstanding</span><span className="value dangerText">{formatMinor(invoiceSummary.due)}</span></div>
							<div className="row between"><span className="label">Paid</span><span className="value successText">{formatMinor(invoiceSummary.paid)}</span></div>
							<div className="row between"><span className="label">Sent</span><span className="value">{formatMinor(invoiceSummary.sent)}</span></div>
						</div>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<div className="pageContent">
			<section className="heroCard todayHeroCard">
				<div className="todayHeroContent">
					<div className="panelEyebrow">✨ {greeting}</div>
					<h1 className="todayHeroTitle">Your day at a glance</h1>
					<p className="todayHeroSubtle">
						{new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })} · {today}
					</p>
					<div className="todayHeroPills">
						<span className="badge">{habitsDone.length}/{dueHabits.length} habits</span>
						<span className="badge">{myDayTasks.length} in My Day</span>
						{overdue.length > 0 && <span className="badge danger">{overdue.length} overdue</span>}
						{topStreak && topStreak.streak > 0 && <span className="badge success">🔥 {topStreak.streak}-day streak</span>}
					</div>
				</div>
				<div className="row gap-sm flex-wrap">
					<button className="btn" type="button" onClick={() => setCustomizing(true)}><AppIcon name="settings" size={15} /> Customize</button>
					<button className="btn primary" type="button" onClick={() => { window.dispatchEvent(new CustomEvent('life:new-task')); navigate('/tasks'); }}>New task</button>
					<button className="btn" type="button" onClick={() => { window.dispatchEvent(new CustomEvent('life:new-transaction')); navigate('/finance'); }}>Add expense</button>
				</div>
			</section>

			<div className="kpiGrid">
				<div className="kpi card">
					<span className="label">Habits today</span>
					<span className="value">{habitsDone.length}/{dueHabits.length}</span>
				</div>
				<div className="kpi card">
					<span className="label">Longest streak</span>
					<span className="value">{topStreak ? `${topStreak.streak} days` : '0 days'}</span>
				</div>
				<div className="kpi card">
					<span className="label">Cash balance</span>
					<span className="value">{formatMinor(totalBalance(data.accounts, data.transactions))}</span>
				</div>
				<div className="kpi card">
					<span className="label">Net this month</span>
					<span className={`value ${finance.netMinor >= 0 ? 'successText' : 'dangerText'}`}>{formatMinor(finance.netMinor)}</span>
				</div>
			</div>

			<div className="grid two">
				{widgets.map(renderWidget)}
			</div>

			{customizing && (
				<Modal
					title="Customize dashboard"
					onClose={() => setCustomizing(false)}
					actions={<button className="btn primary" type="button" onClick={() => setCustomizing(false)}>Done</button>}
				>
					<div className="stack">
						<p className="subtle">Choose which widgets appear on your dashboard and their order.</p>
						{widgets.map((id) => (
							<div className="row between widgetConfigRow" key={id}>
								<div>
									<strong>{WIDGET_LABELS[id]?.label ?? id}</strong>
									<div className="subtle">{WIDGET_LABELS[id]?.description}</div>
								</div>
								<div className="row gap-xs">
									<button className="iconBtn" type="button" title="Hide widget" onClick={() => toggleWidget(id)}><AppIcon name="eyeOff" size={15} /></button>
									<button className="iconBtn" type="button" title="Move up" onClick={() => saveWidgets(moveWidget(widgets, id, -1))}><AppIcon name="chevron" size={15} style={{ transform: 'rotate(-90deg)' }} /></button>
									<button className="iconBtn" type="button" title="Move down" onClick={() => saveWidgets(moveWidget(widgets, id, 1))}><AppIcon name="chevron" size={15} style={{ transform: 'rotate(90deg)' }} /></button>
								</div>
							</div>
						))}
						{DASHBOARD_WIDGETS.filter((widget) => !widgets.includes(widget.id)).map((widget) => (
							<button className="btn widgetAddRow" type="button" key={widget.id} onClick={() => toggleWidget(widget.id)}>
								<AppIcon name="plus" size={14} /> Add “{widget.label}”
							</button>
						))}
					</div>
				</Modal>
			)}
		</div>
	);
}
