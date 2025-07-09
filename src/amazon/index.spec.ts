import {describe, expect, it} from 'vitest';

import amazonEmailText from '../../fixtures/amazon.txt';

import {computeItemTaxes, extractOrderBlock} from './index';

describe('extractOrderBlock', () => {
  it('extracts order block from Amazon email text', () => {
    const result = extractOrderBlock(amazonEmailText);

    expect(result).toContain('Order #');
    expect(result).toContain('114-0833187-7581859');
    expect(result).toContain('Bathroom Faucet Brushed Nickel');
    expect(result).toContain('Bathroom Sink Drain Without Overflow');
    expect(result).toContain('24.29 USD');
    expect(result).toContain('16.99 USD');
    expect(result).toContain('Total');
    expect(result).toContain('44.95 USD');
    expect(result).not.toContain('©2025 Amazon.com');
  });

  it('returns null when no order block found', () => {
    const invalidEmailText = 'This is not an Amazon order email';
    const result = extractOrderBlock(invalidEmailText);

    expect(result).toBeNull();
  });

  it('returns null when order start found but no footer', () => {
    const incompleteEmailText =
      'Order #\n114-0833187-7581859\nSome content without footer';
    const result = extractOrderBlock(incompleteEmailText);

    expect(result).toBeNull();
  });
});

describe('computeItemTaxes', () => {
  const i = {
    name: 'Some product',
    shortName: 'Product',
  };

  it('computes taxes for two items correctly', () => {
    const items = [
      {...i, priceEachUsd: 24.29, quantity: 1},
      {...i, priceEachUsd: 16.99, quantity: 1},
    ];
    const total = 44.95; // subtotal: 41.28, tax: 3.67

    const taxes = computeItemTaxes(items, total);
    expect(taxes).toEqual([2.16, 1.51]);
  });

  it('computes zero taxes correctly', () => {
    const items = [
      {...i, priceEachUsd: 10.0, quantity: 1},
      {...i, priceEachUsd: 15.0, quantity: 1},
    ];
    const total = 25.0;

    const taxes = computeItemTaxes(items, total);
    expect(taxes).toEqual([0, 0]);
  });

  it('throws if total is less than subtotal', () => {
    const items = [{...i, priceEachUsd: 10.0, quantity: 1}];
    const total = 9.0;

    expect(() => computeItemTaxes(items, total)).toThrow();
  });

  it('handles small tax split across identical items', () => {
    const items = Array(5).fill({...i, priceEachUsd: 1.0, quantity: 1});
    const total = 5.05; // subtotal: 5.00, tax: 0.05

    const taxes = computeItemTaxes(items, total);
    expect(taxes).toEqual([0.01, 0.01, 0.01, 0.01, 0.01]);
  });

  it('handles tricky rounding case with repeating decimals', () => {
    const items = [
      {...i, priceEachUsd: 1.0, quantity: 1},
      {...i, priceEachUsd: 2.0, quantity: 1},
    ];
    const total = 3.99; // subtotal: 3.00, tax: 0.99

    const taxes = computeItemTaxes(items, total);
    expect(taxes).toEqual([0.33, 0.66]);
  });

  it('handles fractional tax with very similar items', () => {
    const items = [
      {...i, priceEachUsd: 33.33, quantity: 1},
      {...i, priceEachUsd: 33.33, quantity: 1},
      {...i, priceEachUsd: 33.34, quantity: 1},
    ];
    const total = 105.03; // subtotal: 100.00, tax: 5.03

    const taxes = computeItemTaxes(items, total);
    expect(taxes).toEqual([1.68, 1.68, 1.67]);
  });

  it('allocates tax correctly when items differ greatly in price', () => {
    const items = [
      {...i, priceEachUsd: 0.99, quantity: 1},
      {...i, priceEachUsd: 199.99, quantity: 1},
    ];
    const total = 217.12; // subtotal: 200.98, tax: 16.14

    const taxes = computeItemTaxes(items, total);
    expect(taxes).toEqual([0.08, 16.06]);
  });

  it('distributes tax correctly across items with quantity > 1', () => {
    const items = [
      {...i, priceEachUsd: 10.0, quantity: 2},
      {...i, priceEachUsd: 5.0, quantity: 3},
    ];
    const total = 37.0; // subtotal: $35, tax: $2.00

    const taxes = computeItemTaxes(items, total);
    expect(taxes).toEqual([1.14, 0.86]); // $20 gets 57.14%, $15 gets 42.86% of $2.00
  });
});
