/**
 * Extracts the raw message body from emails labeled with the configured monitorLabel
 * and POSTs them to the configured Worker endpoint.
 *
 * This Google App Script exists purely due to a limitation with gmails filter
 * forwarding action, where it is impossible to access the plain text body of a
 * multipart email.
 *
 * The raw content is base64-encoded to prevent line wrapping issues that could
 * corrupt email structure and attachments during transmission.
 *
 * Configuration:
 * - GMAIL_MONITOR_LABEL: The Gmail monitorLabel to monitor (e.g., "Lunch Money / Incoming")
 * - GMAIL_PROCESSED_LABEL: The Gmail label to apply to successfully processed emails (e.g., "Lunch Money / Processed")
 * - GMAIL_ERROR_LABEL: The Gmail label to apply to emails that failed processing (e.g., "Lunch Money / Errors")
 * - INGEST_URL: The Worker endpoint URL (e.g., "https://email-to-lunchmoney.your-subdomain.workers.dev/ingest")
 * - INGEST_TOKEN: Authentication token for the Worker endpoint
 *
 * These properties must be set in Project Settings > Script Properties.
 */
function findAndForwardEmails() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const monitorLabel = scriptProperties.getProperty('GMAIL_MONITOR_LABEL');
  const processedLabel = scriptProperties.getProperty('GMAIL_PROCESSED_LABEL');
  const errorLabel = scriptProperties.getProperty('GMAIL_ERROR_LABEL');
  const ingestUrl = scriptProperties.getProperty('INGEST_URL');
  const ingestToken = scriptProperties.getProperty('INGEST_TOKEN');

  if (!monitorLabel || !ingestUrl || !ingestToken) {
    throw new Error(
      'Missing required script properties. Please set GMAIL_MONITOR_LABEL, INGEST_URL, and INGEST_TOKEN in Project Settings > Script Properties.'
    );
  }

  const gmailLabel = GmailApp.getUserLabelByName(monitorLabel);

  if (!gmailLabel) {
    throw new Error(
      `Gmail monitorLabel "${monitorLabel}" not found. Please create the monitorLabel or update the GMAIL_MONITOR_LABEL property.`
    );
  }

  const threads = gmailLabel.getThreads();

  if (threads.length > 0) {
    Logger.log(`Found ${threads.length} emails to process...`);
  }

  for (const thread of threads) {
    const messages = thread.getMessages();
    const lastMessage = messages[messages.length - 1];

    const subject = lastMessage.getSubject();
    const rawBody = lastMessage.getRawContent();

    // Base64 encode the raw email content to prevent line wrapping issues that
    // could corrupt MIME structure and attachments during transmission
    const encodedBody = Utilities.base64Encode(rawBody);

    try {
      // POST to the Worker endpoint
      const response = UrlFetchApp.fetch(ingestUrl, {
        method: 'post',
        headers: {
          Authorization: `Bearer ${ingestToken}`,
        },
        payload: encodedBody,
        muteHttpExceptions: true,
      });

      const statusCode = response.getResponseCode();

      if (statusCode === 202) {
        Logger.log(`Successfully sent email: ${subject}`);
        thread.removeLabel(gmailLabel);

        // On success, add processed label if configured and remove monitor label to avoid reprocessing
        if (processedLabel) {
          const processedGmailLabel = GmailApp.getUserLabelByName(processedLabel) || GmailApp.createLabel(processedLabel);
          thread.addLabel(processedGmailLabel);
        }
      } else {
        const responseBody = response.getContentText();
        Logger.log(
          `Failed to send email "${subject}". Status: ${statusCode}, Response: ${responseBody}`
        );
        // Remove monitorLabel even on failure to avoid reprocessing (per design decision)
        // and add our error label for manual review
        if (errorLabel) {
          const errorGmailLabel = GmailApp.getUserLabelByName(errorLabel) || GmailApp.createLabel(errorLabel);
          thread.addLabel(errorGmailLabel);
        }
        thread.removeLabel(gmailLabel);
      }
    } catch (error) {
      Logger.log(`Error sending email "${subject}": ${error}`);
      // Remove monitorLabel even on error to avoid reprocessing
      thread.removeLabel(gmailLabel);
    }
  }
}
