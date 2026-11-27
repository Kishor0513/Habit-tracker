import { useMemo, useState } from 'react';
import { addDays, isoToday, startOfISOWeek } from '../lib/date.js';
import { isDueOn } from '../lib/habits.js';
import { useLifeData } from '../state/useLifeData.js';

function buildMonth(anchor) {
	const [year, month] = anchor.slice(0, 7).split('-').map(Number);
	const first = new Date(year, month - 1, 1);
	const start = addDays(isoToday(), -30); // fallback not used; compute properly
	const monday = startOfISOWeek(`${year}-${String(month).padStart(2, '0')}-01`);
	return Array.from({ length: 42 }, (_, index) => addDays(monday, index));
}

export default function CalendarPage() {
	const { data, loading } = useLifeData();
	const [anchor, setAnchor] = useState(isoToday());
	const today = isoToday();
	const days = useMemo(() => buildMonth(anchor), [anchor]);
	const monthKey = anchor.slice(0, 7);

	const eventsForDay = (day) => {
		const events = [];
		data.tasks.forEach((task) => {
			if (task.dueDate === day) events.push({ label: `Task: ${task.title}`, color: '#7c3aed' });
			if (task.startDate === day) events.push({ label: `Start: ${task.title}`, color: '#0ea5e9' });
		});
		data.habits.filter((habit) => !habit.archivedAt && isDueOn(habit, day)).forEach((habit) => {
			events.push({ label: `Habit: ${habit.name ?? 'Unnamed habit'}`, color: '#16a34a' });
		});
		data.invoices.forEach((invoice) => {
			if (invoice.dueDate === day) events.push({ label: `Invoice due: ${invoice.number}`, color: '#dc2626' });
		});
		return events;
	};

	const moveMonth = (delta) => {
		const [year, month] = anchor.slice(0, 7).split('-').map(Number);
		const next = new Date(year, month - 1 + delta, 1);
		setAnchor(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`);
	};

	if (loading) return <div className="pageContent"><div className="emptyPanelState">Loading calendar…</div></div>;

	return (
		<div className="pageContent">
			<div className="sectionHeader">
				<div>
					<div className="panelEyebrow">Overview</div>
					<h1 className="pageTitle">Calendar</h1>
					<p className="subtle">Tasks, habits and invoice due dates in one place.</p>
				</div>
				<div className="row gap-sm">
					<button className="btn" type="button" onClick={() => moveMonth(-1)}>←</button>
					<button className="btn ghost" type="button" onClick={() => setAnchor(isoToday())}>Today</button>
					<button className="btn" type="button" onClick={() => moveMonth(1)}>→</button>
				</div>
			</div>

			<div className="calendarWrap card premiumPanel">
				<div className="calendarToolbar">
					<strong>{new Date(anchor).toLocaleDateString([], { month: 'long', year: 'numeric' })}</strong>
				</div>
				<div className="calendarGrid">
					{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
						<div className="calendarWeekday" key={day}>{day}</div>
					))}
					{days.map((day) => {
						const events = eventsForDay(day);
						return (
							<div
								key={day}
								className={`calendarCell ${!day.startsWith(monthKey) ? 'isOutside' : ''} ${day === today ? 'isToday' : ''}`}
							>
								<span className="calendarDayNumber">{Number(day.slice(-2))}</span>
								{events.slice(0, 3).map((event, index) => (
									<span key={`${day}-${index}`} className="calendarTask" title={event.label} style={{ borderLeft: `3px solid ${event.color}` }}>
										{event.label}
									</span>
								))}
								{events.length > 3 && <span className="subtle">+{events.length - 3} more</span>}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}