type AccountMail = { email: string; name?: string };

const appOrigin = () => String(process.env.APP_ORIGIN || '').replace(/\/$/, '');

export function authEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM && appOrigin());
}

async function send(to: AccountMail, subject: string, text: string, fetcher: typeof fetch = fetch) {
  if (!authEmailConfigured()) return { delivered: false, reason: 'not_configured' as const };
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.AUTH_EMAIL_FROM, to: [to.email], subject, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return { delivered: false, reason: 'delivery_failed' as const };
  return { delivered: true as const };
}

export function sendPasswordResetEmail(user: AccountMail, token: string, fetcher?: typeof fetch) {
  const link = `${appOrigin()}/?auth=reset&token=${encodeURIComponent(token)}`;
  return send(user, 'Reset your GXA AI Workspace password', `Hello ${user.name || 'there'},\n\nReset your password using this secure link:\n${link}\n\nThis link expires in 30 minutes.`, fetcher);
}

export function sendVerificationEmail(user: AccountMail, token: string, fetcher?: typeof fetch) {
  const link = `${appOrigin()}/?auth=verify&token=${encodeURIComponent(token)}`;
  return send(user, 'Verify your GXA AI Workspace email', `Hello ${user.name || 'there'},\n\nVerify your email using this secure link:\n${link}\n\nThis link expires in 24 hours.`, fetcher);
}
