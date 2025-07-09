import PostalMime from 'postal-mime';

/**
 * This script receives emails forwarded from my gmail and recordes details
 * about expected transactions that will appear in my lunchmoney.
 */
const emailHandler: EmailExportedHandler<Env> = async function (message, env, _ctx) {
  const forwardedMessage = await PostalMime.parse(message.raw);
  const from = forwardedMessage.from.address;

  if (from !== env.ACCEPTED_EMAIL) {
    console.warn('Recieved email from disallowed address', {from});
    return;
  }

  // The Google App Script forwards the entire "raw" contents of the oirignal
  // message as plain text, so we parse the plain text portion
  const originalMessage = await PostalMime.parse(forwardedMessage.text);

  console.log(originalMessage.from);
  console.log(originalMessage.text);
  console.log(originalMessage.subject);
};

const app: ExportedHandler<Env> = {
  email: emailHandler,
};

export default app;
