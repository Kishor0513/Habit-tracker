// Dashboard widget registry. Widget order and visibility are user-configurable
// and persisted through lifeSettings (local IndexedDB or Supabase).

export const DASHBOARD_WIDGETS = [
	{ id: 'habits', label: 'Habits today', description: 'Daily habit completion' },
	{ id: 'myDay', label: 'My Day tasks', description: 'Tasks scheduled for today' },
	{ id: 'upcoming', label: 'Upcoming deadlines', description: 'Next five due dates' },
	{ id: 'recentNotes', label: 'Recent notes', description: 'Latest notes you edited' },
	{ id: 'projects', label: 'Active projects', description: 'Currently active projects' },
	{ id: 'cashflow', label: 'Cashflow', description: 'Six-month income and expenses' },
	{ id: 'invoices', label: 'Invoice summary', description: 'Outstanding and paid invoices' },
];

export const DEFAULT_WIDGET_CONFIG = DASHBOARD_WIDGETS.map((widget) => widget.id);

// Normalize a stored config into a valid, deduplicated ordering. Unknown ids are
// dropped and any missing known widgets are appended so no widget is lost.
export function normalizeWidgetConfig(config) {
	const raw = Array.isArray(config?.widgets) ? config.widgets : Array.isArray(config) ? config : null;
	if (!raw) return [...DEFAULT_WIDGET_CONFIG];

	const known = new Set(DASHBOARD_WIDGETS.map((widget) => widget.id));
	const seen = new Set();
	const widgets = [];
	for (const id of raw) {
		if (known.has(id) && !seen.has(id)) {
			seen.add(id);
			widgets.push(id);
		}
	}
	for (const id of DEFAULT_WIDGET_CONFIG) {
		if (!seen.has(id)) widgets.push(id);
	}
	return widgets;
}

export function visibleWidgets(config) {
	return normalizeWidgetConfig(config);
}

export function moveWidget(config, id, direction) {
	const widgets = normalizeWidgetConfig(config);
	const index = widgets.indexOf(id);
	if (index < 0) return widgets;
	const next = index + direction;
	if (next < 0 || next >= widgets.length) return widgets;
	[widgets[index], widgets[next]] = [widgets[next], widgets[index]];
	return widgets;
}
