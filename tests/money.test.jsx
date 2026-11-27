import { describe, it, expect } from 'vitest';
import {
	parseMinor,
	formatMinor,
	addMinor,
	subMinor,
	mulMinor,
	taxMinor,
} from '../src/lib/money.js';

describe('money library', () => {
	describe('parseMinor', () => {
		it('parses basic amounts', () => {
			expect(parseMinor('10.00')).toBe(1000);
			expect(parseMinor('5.5')).toBe(550);
			expect(parseMinor('5')).toBe(500);
		});

		it('handles commas and currency symbols', () => {
			expect(parseMinor('1,234.56')).toBe(123456);
			expect(parseMinor('रु. 500.00')).toBe(50000);
			expect(parseMinor('$10.99')).toBe(1099);
		});

		it('handles negative amounts', () => {
			expect(parseMinor('-20.00')).toBe(-2000);
			expect(parseMinor('(5.00)')).toBe(500); // just digits/dots kept
		});

		it('handles zero decimal currencies (JPY)', () => {
			expect(parseMinor('100', 'JPY')).toBe(100);
		});
	});

	describe('formatMinor', () => {
		it('formats basic amounts', () => {
			expect(formatMinor(1000)).toBe('रु. 10.00');
			expect(formatMinor(50000, 'NPR')).toBe('रु. 500.00');
		});

		it('formats USD', () => {
			expect(formatMinor(1099, 'USD')).toBe('$ 10.99');
		});

		it('handles negative amounts', () => {
			expect(formatMinor(-1000)).toBe('-रु. 10.00');
		});

		it('handles options', () => {
			expect(formatMinor(1000, 'NPR', { symbol: false })).toBe('10.00');
			expect(formatMinor(1200000000, 'NPR', { compact: true })).toBe('रु. 1.2 Cr');
		});
	});

	describe('arithmetic', () => {
		it('adds amounts', () => {
			expect(addMinor(1000, 500, '250')).toBe(1750);
		});

		it('subtracts amounts', () => {
			expect(subMinor(1000, 400)).toBe(600);
		});

		it('multiplies amounts', () => {
			expect(mulMinor(1000, 2)).toBe(2000);
			expect(mulMinor(100, 1.5)).toBe(150); // rounds properly via rational factor logic
		});

		it('calculates tax', () => {
			expect(taxMinor(10000, 500)).toBe(500); // 5% of 100.00
			expect(taxMinor(10000, 1300)).toBe(1300); // 13% (VAT)
		});
	});
});