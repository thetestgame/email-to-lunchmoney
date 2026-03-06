import {convert as htmlToText} from 'html-to-text';
import {Email} from 'postal-mime';

import {EmailProcessor, LunchMoneyMatch, LunchMoneyUpdate} from 'src/types';

/**
 * Matches the confirmation number from Southwest receipts
 * Example: "Confirmation # 2CEPA9"
 */
const CONFIRMATION_REGEX = /Confirmation #\s*([A-Z0-9]{6})/;

/**
 * Matches departure and arrival airports from Southwest itineraries
 * Southwest shows simple lines like "SJC" and "SNA" for origin/destination
 */
const ROUTE_REGEX = /\b([A-Z]{3})\b[\s\S]*?\b([A-Z]{3})\b/;

function process(email: Email) {
  if (!email.html) {
    throw new Error('Southwest itinerary email has no HTML content');
  }

  const emailText = htmlToText(email.html);

  const confirmationMatch = emailText.match(CONFIRMATION_REGEX);

  if (!confirmationMatch) {
    throw new Error('Failed to match confirmation number from Southwest receipt');
  }

  const confirmation = confirmationMatch[1];

  // Extract airport codes - filter out non-airport codes like "SWA", "FLY", "RSD"
  const airportMatches = [...emailText.matchAll(/\b([A-Z]{3})\b/g)];
  const airports = airportMatches
    .map(m => m[1])
    .filter(code => !['SWA', 'FLY', 'RSD', 'SRC'].includes(code));

  // Take first two unique airports as origin and destination
  const uniqueAirports = [...new Set(airports)];

  if (uniqueAirports.length < 2) {
    throw new Error('Failed to match route from Southwest receipt');
  }

  const origin = uniqueAirports[0];
  const destination = uniqueAirports[1];

  const note = `${origin} → ${destination} (${confirmation})`;

  // Southwest itinerary emails don't include the total amount
  // Set expectedTotal to 0 to skip amount matching
  const match: LunchMoneyMatch = {
    expectedPayee: 'Southwest Airlines',
    expectedTotal: 0,
  };

  const updateAction: LunchMoneyUpdate = {type: 'update', match, note};

  return Promise.resolve(updateAction);
}

function matchEmail(email: Email) {
  const {from} = email;
  // Match any email from southwest.com or subdomain (e.g., @southwest.com, @iluv.southwest.com, @ifly.southwest.com)
  const isSouthwest = !!from?.address?.match(/(@|\.+)southwest\.com$/);

  return isSouthwest;
}

export const southwestProcessor: EmailProcessor = {
  identifier: 'airline-southwest',
  matchEmail,
  process,
};
