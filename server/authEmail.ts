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

const billingMessages: Record<string, { subject: string; message: string }> = {
  subscription_authenticated: { subject: 'Your GXA subscription is being verified', message: 'Your subscription authentication was received. Paid access will activate after provider confirmation.' },
  subscription_activated: { subject: 'Your GXA subscription is active', message: 'Your subscription is active and your plan benefits are available.' },
  renewal_successful: { subject: 'Your GXA subscription renewed', message: 'Your recurring payment was confirmed and your subscription remains active.' },
  subscription_pending: { subject: 'Your GXA renewal is pending', message: 'Your renewal is pending. Current paid access remains available through the confirmed paid period.' },
  subscription_halted: { subject: 'Your GXA renewal needs attention', message: 'Automatic renewal has stopped. Your saved work remains safe, and current access continues through the confirmed paid period.' },
  cancellation_scheduled: { subject: 'Your GXA cancellation is scheduled', message: 'Your subscription will cancel at the end of the current paid period. Your saved work remains safe.' },
  subscription_cancelled: { subject: 'Your GXA subscription was cancelled', message: 'Your subscription cancellation was confirmed. Your saved work remains available.' },
  subscription_completed: { subject: 'Your GXA subscription completed', message: 'Your subscription has completed. Your saved work remains available on your effective plan.' },
};

export function sendBillingLifecycleEmail(user: AccountMail, event: string, fetcher?: typeof fetch) {
  const content = billingMessages[event];
  if (!content) return Promise.resolve({ delivered: false, reason: 'unsupported_event' as const });
  return send(user, content.subject, `Hello ${user.name || 'there'},\n\n${content.message}\n\nFor help, contact support@gxatechnologies.com.`, fetcher);
}
