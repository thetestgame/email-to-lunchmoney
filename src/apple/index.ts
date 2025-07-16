import {convert as htmlToText} from 'html-to-text';
import {Email} from 'postal-mime';

import {EmailProcessor, LunchMoneyMatch, LunchMoneyUpdate} from 'src/types';

/**
 * Matches the total cost of the order
 */
const TOTAL_COST_REGEX = /TOTAL \$(?<totalCostUsd>\d+\.\d{2})/;

/**
 * Matches the order details
 */
const ORDER_DETAILS_REGEX =
  /ORDER ID\n(?<orderId>[A-Z0-9]+)[\s\S]*?(?=\n{2,})\n\n[^[]+\[[^\n]+\]\n(?<itemName>[^\n]+)\n(?<subItem>[^\n]+)\n/;

interface OrderDetails {
  itemName: string;
  subItem: string;
}

interface CostDetails {
  totalCostUsd: string;
}

function process(email: Email) {
  const emailText = htmlToText(email.html!);

  const orderMatch = emailText.match(ORDER_DETAILS_REGEX);
  const costMatch = emailText.match(TOTAL_COST_REGEX);

  if (orderMatch === null) {
    throw new Error('Failed to match Apple order details');
  }
  if (costMatch === null) {
    throw new Error('Failed to match Apple order cost details');
  }

  const orderDetails = orderMatch.groups! as unknown as OrderDetails;
  const costDetails = costMatch.groups! as unknown as CostDetails;

  const costInCents = Number(costDetails.totalCostUsd.replace('.', ''));

  const note = `${orderDetails.itemName}, ${orderDetails.subItem}`;

  const match: LunchMoneyMatch = {
    expectedPayee: 'Apple',
    expectedTotal: costInCents,
  };

  const updateAction: LunchMoneyUpdate = {type: 'update', match, note};

  return Promise.resolve(updateAction);
}

function matchEmail(email: Email) {
  const {from, subject} = email;

  return !!from.address?.endsWith('apple.com') && subject === 'Your receipt from Apple.';
}

export const appleEmailProcessor: EmailProcessor = {
  identifier: 'lyft-ride',
  matchEmail,
  process,
};
