import nodemailer from 'npm:nodemailer@10.4.0';

// Supabase Auth's SMTP settings are separate from Edge Function secrets.
// Port 465 uses implicit TLS; the hosted Edge runtime blocks ports 25 and 587.
export function emailChangeMailConfig() {
  const user = Deno.env.get('EMAIL_CHANGE_SMTP_USER')?.trim();
  const password = Deno.env.get('EMAIL_CHANGE_SMTP_PASSWORD')?.replace(/\s/g, '');
  if (!user || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user) || !password) throw new Error('Mail unavailable');
  return {
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user, pass: password },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000,
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    logger: false, debug: false,
  };
}

// No credentials or message bodies are logged. Provider errors stay private.
export async function sendEmailChangeMail(to: string, subject: string, text: string, deliveryKey: string) {
  const config = emailChangeMailConfig();
  if (!/^[a-z0-9-]{1,160}$/i.test(deliveryKey)) throw new Error('Mail unavailable');
  const transport = nodemailer.createTransport(config);
  try {
    const result = await transport.sendMail({
      from: { name: 'Spartment', address: config.auth.user }, to, subject, text,
      // Stable Message-ID helps identify retries; SMTP does not guarantee deduplication.
      messageId: `<${deliveryKey}@${config.auth.user.split('@')[1]}>`,
      disableFileAccess: true, disableUrlAccess: true,
    });
    if (!result.accepted?.some((entry: string | { address: string }) =>
      (typeof entry === 'string' ? entry : entry.address).toLowerCase() === to.toLowerCase())) throw new Error('Mail unavailable');
  } catch { throw new Error('Mail unavailable'); }
  finally { transport.close(); }
}
