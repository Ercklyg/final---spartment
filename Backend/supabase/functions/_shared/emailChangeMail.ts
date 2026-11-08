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

export function emailChangeOtpMessage(otp: string) {
  if (!/^\d{6}$/.test(otp)) throw new Error('Invalid verification code');
  return {
    subject: 'Your Spartment verification code',
    text: `Your Spartment verification code is ${otp}. It expires in 10 minutes. Do not share this code. If you did not request this email change, ignore this message.`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<div style="display:none;max-height:0;overflow:hidden;">Your email verification code expires in 10 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:36px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;"><tr><td style="padding:32px;">
<p style="margin:0 0 24px;color:#2563eb;font-size:14px;font-weight:700;letter-spacing:1px;">Spartment</p>
<h1 style="margin:0 0 12px;font-size:24px;line-height:32px;letter-spacing:-0.5px;">Verify your email</h1>
<p style="margin:0;font-size:14px;line-height:22px;color:#64748b;">Use this code to confirm your new email address.</p>
<div style="margin:24px 0 16px;padding:20px 8px;border-radius:10px;background:#eff6ff;border:1px solid #dbeafe;text-align:center;font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:7px;color:#1d4ed8;">${otp}</div>
<p style="margin:0;text-align:center;font-size:12px;line-height:20px;color:#64748b;">Expires in 10 minutes. Do not share this code.</p>
<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #f1f5f9;font-size:12px;line-height:20px;color:#64748b;">If you didn’t request this change, you can ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`,
  };
}

// No credentials or message bodies are logged. Provider errors stay private.
export async function sendEmailChangeMail(to: string, subject: string, text: string, deliveryKey: string, html?: string) {
  const config = emailChangeMailConfig();
  if (!/^[a-z0-9-]{1,160}$/i.test(deliveryKey)) throw new Error('Mail unavailable');
  const transport = nodemailer.createTransport(config);
  try {
    const result = await transport.sendMail({
      from: { name: 'Spartment', address: config.auth.user }, to, subject, text, html,
      // Stable Message-ID helps identify retries; SMTP does not guarantee deduplication.
      messageId: `<${deliveryKey}@${config.auth.user.split('@')[1]}>`,
      disableFileAccess: true, disableUrlAccess: true,
    });
    if (!result.accepted?.some((entry: string | { address: string }) =>
      (typeof entry === 'string' ? entry : entry.address).toLowerCase() === to.toLowerCase())) throw new Error('Mail unavailable');
  } catch { throw new Error('Mail unavailable'); }
  finally { transport.close(); }
}
