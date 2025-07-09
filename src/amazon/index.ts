import {Email} from 'postal-mime';

import {extractOrder} from './prompt';
import {AmazonOrderItem} from './types';

/**
 * Extracts the main order block from an Amazon plain text email.
 * It starts at the line containing "Order #" and ends before the footer.
 */
export function extractOrderBlock(emailText: string): string | null {
  const orderStartMatch = emailText.match(/Order #\s*\n(.+?)\n/i);
  if (!orderStartMatch || orderStartMatch.index === undefined) {
    return null;
  }

  const orderStartIndex = orderStartMatch.index;
  const footerIndex = emailText.indexOf('©2025 Amazon.com');
  if (footerIndex === -1) {
    return null;
  }

  return emailText.slice(orderStartIndex, footerIndex).trim();
}

/**
 * Computes the tax amount for each item in an order by proportionally
 * allocating the total tax across all items based on their pre-tax cost.
 * Works with cents (integers) to avoid floating-point precision issues.
 * Returns tax amounts in cents.
 */
export function computeItemTaxes(items: AmazonOrderItem[], totalCostCents: number): number[] {
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.priceEachCents * item.quantity,
    0
  );

  const totalTaxCents = totalCostCents - subtotalCents;
  
  if (totalTaxCents < 0) {
    throw new Error('Total cost is less than subtotal.');
  }

  if (totalTaxCents === 0) {
    return items.map(() => 0);
  }

  // Calculate proportional tax for each item in cents
  const taxCents = items.map(item => {
    const itemCostCents = item.priceEachCents * item.quantity;
    return Math.round((itemCostCents / subtotalCents) * totalTaxCents);
  });

  // Adjust for rounding errors by adding/subtracting from the last item
  const calculatedTotalTax = taxCents.reduce((sum, tax) => sum + tax, 0);
  const difference = totalTaxCents - calculatedTotalTax;
  taxCents[taxCents.length - 1] += difference;

  return taxCents;
}

export async function processAmazonEmail(email: Email, env: Env) {
  const emailText = email.text ?? '';
  const orderText = extractOrderBlock(emailText);

  if (orderText === null) {
    console.error({orderText});
    throw new Error('Failed to extract order block from amazon email');
  }

  const order = await extractOrder(orderText, env);
  const itemTaxCents = computeItemTaxes(order.orderItems, order.totalCostCents);

  console.log(
    order,
    itemTaxCents.map((tax, i) => order.orderItems[i].priceEachCents + tax)
  );
}

export function isAmazonOrder(email: Email) {
  const {from, subject} = email;
  return from.address?.endsWith('amazon.com') && subject?.startsWith('Ordered');
}
