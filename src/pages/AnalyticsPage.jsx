import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useLifeData } from '../state/useLifeData.js';
import { addDays, isoToday } from '../lib/date.js';
import { entryMeetsTarget } from '../lib/habits.js';
import { categorySpend, incomeByMonth, monthlyTotals } from '../lib/finance.js';
import { formatMinor } from '../lib/money.js';
import { taskCounts } from '../lib/tasks.js';

const COLORS = ['#7c3aed', '#d946ef', '#f59e0b', '#0ea5e9', '#16a34a', '#dc2626', '#6b7280'];

export default function AnalyticsPage() {
	const { data, loading } = useLifeData();
	const today = isoToday();
	const month = today.slice(0, 7);

	const habitTrend = useMemo(() => {
		return Array.from({ length: 30 }, (_, index) => {
			const day = addDays(today, -(29 - index));
			const due = data.habits.filter((habit) => !habit.archivedAt);
			const done = due.filter((habit) =>
				entryMeetsTarget(habit, data.entries.find((entry) => entry.habitId === habit.id && entry.date === day)),
			);
			return { day: day.slice(5), done: done.length, due: due.length, rate: due.length ? Math.round((done.length / due.length) * 100) : 0 };
		});
	}, [data.entries, data.habits, today]);

	const finance = monthlyTotals(data.transactions, month);
	const spend = categorySpend(data.transactions, month).slice(0, 6);
	const cashflow = incomeByMonth(data.transactions, 6).map((row) => ({ ...row, label: row.month.slice(5) }));
	const tasks = taskCounts(data.tasks, today);

	if (loading) return <div className="pageContent"><div className="emptyPanelState">Loading analytics…</div></div>;

	return (
		<div className="pageContent">
			<div className="sectionHeader">
				<div>
					<div className="panelEyebrow">Insight</div>
					<h1 className="pageTitle">Analytics</h1>
					<p className="subtle">Habits, productivity and money — with real numbers.</p>
				</div>
			</div>

			<div className="kpiGrid">
				<div className="kpi card"><span className="label">Open tasks</span><span className="value">{tasks.total - tasks.completed}</span></div>
				<div className="kpi card"><span className="label">Completed</span><span className="value">{tasks.completed}</span></div>
				<div className="kpi card"><span className="label">Income</span><span className="value successText">{formatMinor(finance.incomeMinor)}</span></div>
				<div className="kpi card"><span className="label">Expenses</span><span className="value dangerText">{formatMinor(finance.expenseMinor)}</span></div>
			</div>

			<div className="grid two">
				<div className="card premiumPanel">
					<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">Habit completion (30 days)</h3></div>
					<div className="chartFrame">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={habitTrend}>
								<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
								<XAxis dataKey="day" stroke="var(--text-muted)" fontSize={10} interval={4} />
								<YAxis stroke="var(--text-muted)" fontSize={11} />
								<Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }} />
								<Bar dataKey="done" fill="#7c3aed" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="card premiumPanel">
					<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">Cashflow (6 months)</h3></div>
					<div className="chartFrame">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={cashflow}>
								<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
								<XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} />
								<YAxis stroke="var(--text-muted)" fontSize={11} />
								<Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }} />
								<Bar dataKey="incomeMinor" name="Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
								<Bar dataKey="expenseMinor" name="Expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="card premiumPanel">
					<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">Spending by category</h3></div>
					<div className="chartFrame">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie data={spend} dataKey="amountMinor" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={2}>
									{spend.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
								</Pie>
								<Tooltip formatter={(value) => formatMinor(value)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }} />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="card premiumPanel">
					<div className="premiumPanelHeader"><h3 className="premiumPanelTitle">Productivity summary</h3></div>
					<div className="list">
						<div className="row between"><span className="label">Tasks in My Day</span><span className="value">{tasks.myDay}</span></div>
						<div className="row between"><span className="label">Overdue</span><span className="value dangerText">{tasks.overdue}</span></div>
						<div className="row between"><span className="label">Completed</span><span className="value successText">{tasks.completed}</span></div>
						<div className="row between"><span className="label">Net cashflow</span><span className={`value ${finance.netMinor >= 0 ? 'successText' : 'dangerText'}`}>{formatMinor(finance.netMinor)}</span></div>
					</div>
				</div>
			</div>
		</div>
	);
}