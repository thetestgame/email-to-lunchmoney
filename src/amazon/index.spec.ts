import {describe, expect, it} from 'vitest';

import amazonEmailText from '../../fixtures/amazon.txt';

import {extractOrderBlock} from './index';

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
