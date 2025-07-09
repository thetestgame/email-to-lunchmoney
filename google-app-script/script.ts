const LABEL = 'Fwd / Lunch Money';
const INGEST_EMAIL = 'lunchmoney-details@evanpurkhiser.com';

/**
 * Extracts the raw message body from emails labeled with the LABEL and forward
 * them to the INGEST_EMAIL.
 *
 * This Gooogle App Script exists purely due to a limitation with gmails filter
 * forwarding action, where it is impossible to access the plain text body of a
 * multipart email.
 */
function findAndForwardEmails() {
  const label = GmailApp.getUserLabelByName(LABEL);
  const threads = label.getThreads();

  if (threads.length > 0) {
    Logger.log(`Found ${threads.length} emails to forward...`);
  }

  for (const thread of threads) {
    const messages = thread.getMessages();
    const lastMessage = messages[messages.length - 1];

    const subject = lastMessage.getSubject();
    const rawBody = lastMessage.getRawContent();

    GmailApp.sendEmail(INGEST_EMAIL, subject, rawBody);

    thread.removeLabel(label);
  }
}
