import nodemailer from 'nodemailer';
import { getRuntimeEnv, isDevelopmentMode } from '../utils/runtime-env';

interface AuthEmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface AuthEmailResult {
  deliveryMode: 'smtp' | 'log';
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

export function isAuthEmailConfigured(): boolean {
  return Boolean(getSmtpConfig());
}

export async function sendAuthEmail(payload: AuthEmailPayload): Promise<AuthEmailResult> {
  const config = getSmtpConfig();
  const from = getRuntimeEnv('AUTH_EMAIL_FROM', 'Brisbane Servers <support@brisbaneservers.com>');
  const replyTo = getRuntimeEnv('AUTH_EMAIL_REPLY_TO', from);

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
