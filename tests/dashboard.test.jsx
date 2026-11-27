import { describe, it, expect } from 'vitest';
import {
	DASHBOARD_WIDGETS,
	DEFAULT_WIDGET_CONFIG,
	normalizeWidgetConfig,
	moveWidget,
} from '../src/lib/dashboard.js';

describe('dashboard library', () => {
	it('has the expected widget registry', () => {
		expect(DASHBOARD_WIDGETS.length).toBeGreaterThan(0);
		DASHBOARD_WIDGETS.forEach((widget) => {
			expect(widget).toHaveProperty('id');
			expect(widget).toHaveProperty('label');
			expect(widget).toHaveProperty('description');
		});
	});

	it('uses default widget config when no config provided', () => {
		expect(DEFAULT_WIDGET_CONFIG).toEqual([...DEFAULT_WIDGET_CONFIG]);
		expect(normalizeWidgetConfig(null)).toEqual([...DEFAULT_WIDGET_CONFIG]);
	});

	it('normalizes widget config', () => {
		const result = normalizeWidgetConfig({ widgets: ['habits', 'recentNotes', 'unknownId', 'habits'] });
		expect(result[0]).toBe('habits');
		expect(result[1]).toBe('recentNotes');
		expect(result).toContain('myDay');
		expect(result).toContain('cashflow');
		expect(result).not.toContain('unknownId');
		expect(result.filter((id) => id === 'habits').length).toBe(1);
	});

	it('handles array config', () => {
		const result = normalizeWidgetConfig(['habits', 'cashflow']);
		expect(result[0]).toBe('habits');
		expect(result[1]).toBe('cashflow');
	});

	it('moveWidget moves widget forward', () => {
		const config = { widgets: ['habits', 'cashflow', 'myDay', 'upcoming', 'recentNotes', 'projects', 'invoices'] };
		const result = moveWidget(config, 'habits', 1);
		expect(result[0]).toBe('cashflow');
		expect(result[1]).toBe('habits');
	});

	it('moveWidget moves widget backward', () => {
		const config = { widgets: ['habits', 'cashflow', 'myDay', 'upcoming', 'recentNotes', 'projects', 'invoices'] };
		const result = moveWidget(config, 'invoices', -1);
		expect(result[5]).toBe('invoices');
		expect(result[6]).toBe('projects');
	});

	it('moveWidget clamps at boundaries', () => {
		const config = { widgets: [...DEFAULT_WIDGET_CONFIG] };
		expect(moveWidget(config, 'habits', -1)).toEqual([...DEFAULT_WIDGET_CONFIG]);
		expect(moveWidget(config, 'invoices', 1)).toEqual([...DEFAULT_WIDGET_CONFIG]);
	});
});