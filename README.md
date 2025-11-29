<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset=".github/logo.svg">
  <img alt="Email to Lunch Money" src=".github/logo.svg">
</picture>

[![Build Status](https://github.com/evanpurkhiser/email-to-lunchmoney/actions/workflows/main.yml/badge.svg)](https://github.com/evanpurkhiser/email-to-lunchmoney/actions/workflows/main.yml)

📥 _Parse receipt emails into meaningful metadata in Lunch Money_

**Email to Lunch Money** is a small Cloudflare worker application that accepts
various receipt emails via an email trigger and associates metadata from the
receipt to transactions in Lunch Money.

This may be useful for those who want to answer questions like:

> What did I buy on Amazon for $75?
> Where did I go on that $12.50 Lyft ride?

### Before Email to Lunch Money

| Payee      | Amount | Notes |
| ---------- | ------ | ----- |
| Amazon     | $43.21 |       |
| Cloudflare | $25.20 |       |
| Lyft       | $8.50  |       |
| Apple      | $9.99  |       |

### After Processing

| Payee      | Amount | Notes                                                                            |
| ---------- | ------ | -------------------------------------------------------------------------------- |
| Amazon     | $28.22 | Mise En Scene Hair Serum (113-7795219-8445010)                                   |
| Amazon     | $14.99 | CERRXIAN power adapter (113-5327144-6942647)                                     |
| Cloudflare | $25.20 | prolink.tools renewal (IN-48951432)                                              |
| Lyft       | $8.50  | 186 States St, San Francisco, CA → 882 Sutter St, San Francisco, CA [16:40, 27m] |
| Apple      | $9.99  | iCloud+ with 2TB storage                                                         |

## How it works

The general idea is that you send various types of receipts to this service.
Support for the following emails is currently implemented

- **Amazon order emails**. Orders with multiple items have their associated Lunch
  Money transactions split into a single transaction for each item. A note is
  added to transactions with a shortened item name and order number.

- **Cloudflare invoices**. Extracts invoice details from PDF invoice
  attachments. Domain renewals and other services are added as transaction
  notes with invoice IDs.

- **Lyft rideshare and Bike rides**. A note is added to each transaction with the
  start and end location, time of ride, and duration.

- **Apple receipts**. Adds the name of the app, subscription, or in-app purchase as
  a note to the Apple transaction.

Some emails I would like to add

- Uber rides. Basically the same as the Lyft rides

- All square receipt emails. Since many places use Square's point of sales
  terminals, we can record receipt details on transactions.

### Workflow

1. Receive receipt emails for some service such as Amazon or Lyft. These
   typically are sent automatically, though if disable, you can likely re-enable
   them in the settings of whatever the service is.

2. Setup Gmail filters to automatically label receipt emails to be forwarded. I
   use [gmailctl](https://github.com/mbrt/gmailctl) to declare my filters,
   though you can just as easily configure this in the Web UI. Emails to be
   forwarded are labeled with `Fwd / Lunch Money`. You can find [my filters
   here](https://github.com/evanpurkhiser/gmailctl-personal/blob/main/evanpurkhiser%40gmail.com.jsonnet)

3. A [Google App Script](https://developers.google.com/apps-script) is used to
   look for emails labeled as `Fwd / Lunch Money` and it forwards the entire
   raw email to the Cloudflare worker.

   The App Script is in [`./google-app-script`](./google-app-script).

4. The worker receives the email and determines which available Email Processor
   is able to parse the email. Processors typically look at the from header and
   subject, though they can use any part of the email to determine if they can
   handle the email.

5. Each processor may do their own processing:
   - `amazon` parses out the items ordered from the plain text email and passes
     the text to the OpenAI API to get a shortened version of the item names
     (since amazon items typically have very long names).

   - `cloudflare` extracts text from PDF attachments using pdfjs-serverless and
     uses OpenAI to parse structured invoice data including line items and costs.

   - `lyft-bike` converts the HTML email to text (as they do not send plain
     text variants) and simply uses regex to extract the ride metadata.

6. A "Lunch Money Action" is stored in a database to be processed once the
   transaction posts and is synchronized to Lunch Money.

7. The worker has a scheduled execution that looks for pending Lunch Money
   Actions and uses matching rules in the action (typically payyee name and
   amount) to match transactions in Lunch Money. Once found the transaction is
   updated according to the action

   Actions currently support:
   - Splitting transactions
   - Adding notes to transactions

> [!NOTE]
> Ideally the emails could be directly forwarded using the forwarding filter
> action, however doing so does not forward the entire email, including the
> plain text version, which is often easier to parse.

## Deployment

This service consists of two components that need to be deployed:

1. **Google App Script** - Forwards labeled emails from Gmail
2. **Cloudflare Worker** - Processes emails and updates Lunch Money

### Prerequisites

- [Node.js](https://nodejs.org/) (v22.11.0 or later, as specified in package.json)
- [pnpm](https://pnpm.io/) package manager
- A [Cloudflare](https://www.cloudflare.com/) account with Workers enabled
- A [Google](https://www.google.com/) account for Gmail and App Script
- [Lunch Money](https://lunchmoney.app/) account and API key
- [OpenAI](https://openai.com/) API key (for email parsing)

### Part 1: Deploy the Cloudflare Worker

#### 1.1 Install Dependencies

```bash
pnpm install
```

#### 1.2 Configure Wrangler

Update [wrangler.jsonc](wrangler.jsonc) with your settings:

- `vars.ACCEPTED_EMAIL` - The email address that the Google App Script will send from (your Gmail address)
- `d1_databases.database_id` - Your D1 database ID (see below to create)

#### 1.3 Create D1 Database

```bash
# Create a new D1 database
npx wrangler d1 create email-to-lunchmoney

# Copy the database_id from the output and update wrangler.jsonc
```

#### 1.4 Run Database Migrations

```bash
# Apply the schema and migrations to your D1 database
npx wrangler d1 migrations apply email-to-lunchmoney
```

#### 1.5 Set Secrets

Configure the required secrets:

```bash
# Set your Lunch Money API key
npx wrangler secret put LUNCHMONEY_API_KEY
# When prompted, paste your API key from https://my.lunchmoney.app/developers

# Set your OpenAI API key
npx wrangler secret put OPENAI_API_KEY
# When prompted, paste your API key from https://platform.openai.com/api-keys

# Optional: Set Discord webhook URL for notifications
npx wrangler secret put DISCORD_WEBHOOK_URL
```

#### 1.6 Deploy to Cloudflare

```bash
pnpm run deploy
```

After deployment, Wrangler will output your worker URL (e.g., `https://email-to-lunchmoney.<your-subdomain>.workers.dev`). Save this URL - you'll need it for configuring the Google App Script.

### Part 2: Deploy the Google App Script

The Google App Script forwards emails labeled `Fwd / Lunch Money` to your Cloudflare Worker.

#### 2.1 Install clasp CLI

[clasp](https://github.com/google/clasp) is Google's command-line tool for Apps Script:

```bash
npm install -g @google/clasp
```

#### 2.2 Login to Google

```bash
clasp login
```

This will open a browser window to authenticate with your Google account.

#### 2.3 Create a New App Script Project

```bash
cd google-app-script

# Create a new standalone Apps Script project
clasp create --type standalone --title "Email to Lunch Money Forwarder"
```

This will create a `.clasp.json` file with your script ID.

#### 2.4 Configure the Script

Edit [google-app-script/script.ts](google-app-script/script.ts) and update:

- `INGEST_EMAIL` - Change to your Cloudflare Worker email endpoint (the worker URL handles email via POST)

**Note**: If using Cloudflare Email Workers, you'll need to configure email routing in your Cloudflare dashboard. Alternatively, the script can POST the email directly to your worker endpoint - you may need to modify the script to use `UrlFetchApp.fetch()` instead of `GmailApp.sendEmail()`.

#### 2.5 Deploy the Script

```bash
cd google-app-script

# Install dependencies
pnpm install

# Push the script to Google
pnpm run deploy
```

#### 2.6 Set Up a Trigger

1. Run `clasp open` to open your script in the Apps Script editor
2. Click on the clock icon (Triggers) in the left sidebar
3. Click "Add Trigger" (bottom right)
4. Configure:
   - Choose function: `findAndForwardEmails`
   - Deployment: Head
   - Event source: Time-driven
   - Type of time based trigger: Minutes timer
   - Minute interval: Every 5 minutes (or your preference)
5. Save

The script will now run automatically and forward any emails labeled `Fwd / Lunch Money` to your Cloudflare Worker.

### Part 3: Configure Gmail Filters

Set up Gmail filters to automatically label receipt emails:

#### Option A: Using Gmail Web UI

1. Open Gmail and click the search bar dropdown
2. Enter filter criteria (e.g., from: `auto-confirm@amazon.com`)
3. Click "Create filter"
4. Check "Apply the label" and select/create `Fwd / Lunch Money`
5. Optionally check "Also apply filter to matching conversations"
6. Click "Create filter"

Repeat for each type of receipt email you want to process (Lyft, Apple, Cloudflare, etc.)

#### Option B: Using gmailctl (Recommended)

For a more maintainable approach, use [gmailctl](https://github.com/mbrt/gmailctl) to define filters as code.

Example filter configuration:

```jsonnet
{
  filter: {
    or: [
      { from: 'auto-confirm@amazon.com' },
      { from: 'no-reply@uber.com' },
      { from: 'rides@lyft.com' },
      { from: 'do_not_reply@email.apple.com' },
    ],
  },
  actions: {
    labels: ['Fwd / Lunch Money'],
  },
}
```

### Monitoring and Maintenance

- **Cloudflare Worker Logs**: View logs in the Cloudflare dashboard under Workers & Pages
- **App Script Logs**: Run `clasp logs` or view in the Apps Script editor
- **Scheduled Jobs**: The worker runs every 30 minutes (configurable in `wrangler.jsonc` triggers.crons) to process pending actions

### Troubleshooting

- **Emails not being forwarded**: Check that the Gmail label is spelled exactly as `Fwd / Lunch Money` and the App Script trigger is enabled
- **Worker not receiving emails**: Verify the `ACCEPTED_EMAIL` in wrangler.jsonc matches your Gmail address
- **Transactions not updating**: Check that your Lunch Money API key is valid and transactions exist matching the amount and payee

## Secrets Reference

- `LUNCHMONEY_API_KEY` - Get this in your Lunch Money settings under [Developers](https://my.lunchmoney.app/developers)
- `OPENAI_API_KEY` - Required for email parsing. Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- `DISCORD_WEBHOOK_URL` - (Optional) Discord webhook URL for notifications of old unprocessed actions. Create a webhook in your Discord server settings under Integrations > Webhooks
