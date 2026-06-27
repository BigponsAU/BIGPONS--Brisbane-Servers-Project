import nodemailer from 'nodemailer';
import { siteMailboxes } from './site-mailboxes';
import { getRuntimeEnv, isDevelopmentMode } from '../utils/runtime-env';

interface AuthEmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Full RFC From header or bare address; defaults to AUTH_EMAIL_FROM / support@ */
  from?: string;
  replyTo?: string;
}

export interface AuthEmailResult {
  deliveryMode: 'resend' | 'smtp' | 'log';
  previewUrl?: string;
}

function getSmtpConfig() {
  const host = getRuntimeEnv('SMTP_HOST');
  const port = Number(getRuntimeEnv('SMTP_PORT', '587'));
  const secure = String(getRuntimeEnv('SMTP_SECURE', 'false')).toLowerCase() === 'true';
  const user = getRuntimeEnv('SMTP_USER');
  const pass = getRuntimeEnv('SMTP_PASS');

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  };
}

function getResendApiKey(): string | null {
  const key = getRuntimeEnv('RESEND_API_KEY')?.trim();
  return key || null;
}

export function isAuthEmailConfigured(): boolean {
  return Boolean(getSmtpConfig() || getResendApiKey());
}

function getFromAddress(): string {
  const defaultFrom = `Brisbane Servers <${siteMailboxes.support}>`;
  return String(getRuntimeEnv('AUTH_EMAIL_FROM', defaultFrom) ?? defaultFrom);
}

function getReplyToAddress(): string {
  return String(getRuntimeEnv('AUTH_EMAIL_REPLY_TO', siteMailboxes.connect) ?? siteMailboxes.connect);
}

function resolveFromAddress(override?: string): string {
  const trimmed = override?.trim();
  return trimmed || getFromAddress();
}

async function sendViaResend(payload: AuthEmailPayload): Promise<void> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  const from = resolveFromAddress(payload.from);
  const replyTo = payload.replyTo?.trim() || getReplyToAddress();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      reply_to: replyTo,
      subject: payload.subject,
      text: payload.text,
      html: payload.html
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend API error (${response.status}): ${body || response.statusText}`);
  }
}

export async function sendAuthEmail(payload: AuthEmailPayload): Promise<AuthEmailResult> {
  const replyTo = payload.replyTo?.trim() || getReplyToAddress();
  const from = resolveFromAddress(payload.from);

  if (getResendApiKey()) {
    await sendViaResend(payload);
    return { deliveryMode: 'resend' };
  }

  const config = getSmtpConfig();
  if (!config) {
    if (!isDevelopmentMode()) {
      throw new Error('AUTH_EMAIL_NOT_CONFIGURED');
    }

    console.log(`[AuthEmail] To: ${payload.to}\nSubject: ${payload.subject}\n\n${payload.text}`);
    const previewMatch = payload.text.match(/https?:\/\/\S+/);
    return {
      deliveryMode: 'log',
      previewUrl: previewMatch?.[0]
    };
  }

  const transport = nodemailer.createTransport(config);
  await transport.sendMail({
    from,
    to: payload.to,
    replyTo,
    subject: payload.subject,
    text: payload.text,
    html: payload.html
  });

  return { deliveryMode: 'smtp' };
}
