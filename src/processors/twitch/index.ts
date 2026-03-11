import {convert as htmlToText} from 'html-to-text';
import {Email} from 'postal-mime';

import {EmailProcessor, LunchMoneyMatch, LunchMoneyUpdate} from 'src/types';

const INVOICE_ID_REGEX = /Invoice\s+#?(\d+)/i;
const DESCRIPTION_REGEX = /^\$\d+(?:,\d{3})*\.\d{2}\s+--\s+(.+?)\s*$/m;
const PAID_REGEX = /Paid:\s*\$(\d+(?:,\d{3})*\.\d{2})/i;

function process(email: Email) {
  const emailText = email.text ?? (email.html ? htmlToText(email.html) : null);

  if (!emailText) {
    throw new Error('Twitch receipt email has no text content');
  }

  const invoiceMatch = emailText.match(INVOICE_ID_REGEX);
  const descriptionMatch = emailText.match(DESCRIPTION_REGEX);
  const paidMatch = emailText.match(PAID_REGEX);

  if (!invoiceMatch) {
    throw new Error('Failed to match Twitch invoice ID');
  }
  if (!descriptionMatch) {
    throw new Error('Failed to match Twitch purchase description');
  }
  if (!paidMatch) {
    throw new Error('Failed to match Twitch paid amount');
  }

  const invoiceId = invoiceMatch[1];
  const description = descriptionMatch[1].trim().replace(/\s+/g, ' ');
  const totalInCents = Math.round(Number(paidMatch[1].replace(/,/g, '')) * 100);

  const match: LunchMoneyMatch = {
    expectedPayee: 'Twitch',
    expectedTotal: totalInCents,
  };

  const updateAction: LunchMoneyUpdate = {
    type: 'update',
    match,
    note: `${description} (${invoiceId})`,
  };

  return Promise.resolve(updateAction);
}

function matchEmail(email: Email) {
  const {from, subject} = email;
  const isSupportedSubject =
    subject === 'Invoice Receipt' || !!subject?.startsWith('Thanks for Subscribing');

  return !!from?.address?.endsWith('twitch.tv') && isSupportedSubject;
}

export const twitchProcessor: EmailProcessor = {
  identifier: 'twitch',
  matchEmail,
  process,
};
