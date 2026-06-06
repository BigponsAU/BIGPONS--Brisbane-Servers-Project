import { sendAuthEmail, isAuthEmailConfigured } from './auth-email';
import { siteMailboxes } from './site-mailboxes';

export interface ContactInquiryPayload {
  name?: string;
  email: string;
  industry?: string;
  location?: string;
  preference?: string;
  message?: string;
  sourcePath?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildInquiryText(payload: ContactInquiryPayload): string {
  const lines = [
    payload.name ? `Name: ${payload.name}` : 'Name: (not provided)',
    `Email: ${payload.email}`,
    payload.industry ? `Industry: ${payload.industry}` : '',
    payload.location ? `Location: ${payload.location}` : '',
    payload.preference ? `Consultation preference: ${payload.preference}` : '',
    payload.sourcePath ? `Page: ${payload.sourcePath}` : '',
    '',
    payload.message?.trim() ? `Message:\n${payload.message.trim()}` : 'Message: (not provided)',
  ].filter(Boolean);
  return lines.join('\n');
}

function buildInquiryHtml(payload: ContactInquiryPayload): string {
  const text = buildInquiryText(payload);
  return `<pre style="font-family:ui-monospace,Consolas,monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`;
}

export async function sendContactInquiry(payload: ContactInquiryPayload): Promise<{ deliveryMode: string }> {
  if (!isAuthEmailConfigured()) {
    throw new Error('CONTACT_EMAIL_NOT_CONFIGURED');
  }

  const subjectParts = ['Website enquiry'];
  if (payload.industry) subjectParts.push(payload.industry);
  if (payload.name) subjectParts.push(`from ${payload.name}`);
  const subject = subjectParts.join(' — ').slice(0, 180);

  const result = await sendAuthEmail({
    to: siteMailboxes.connect,
    replyTo: payload.email,
    subject,
    text: buildInquiryText(payload),
    html: buildInquiryHtml(payload),
  });

  return { deliveryMode: result.deliveryMode };
}
