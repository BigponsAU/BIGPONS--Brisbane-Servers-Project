import type { APIRoute } from 'astro';
import { authRateLimitResponse } from '../../../lib/auth-rate-limit';
import { sendContactInquiry } from '../../../lib/contact-inquiry';
import { isValidEmail } from '../../../utils/error-handling';

const MAX_FIELD_LENGTH = 4000;
const MAX_NAME_LENGTH = 120;

function trimField(value: unknown, max = MAX_FIELD_LENGTH): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export const POST: APIRoute = async ({ request }) => {
  const limited = authRateLimitResponse(request, 'contact-inquiry', 8, 15 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please provide a valid email address', code: 'INVALID_EMAIL' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const message = trimField(body?.message);
    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please include a message with your enquiry', code: 'MESSAGE_REQUIRED' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const referer = request.headers.get('referer') ?? '';
    let sourcePath = trimField(body?.sourcePath, 500);
    if (!sourcePath && referer) {
      try {
        sourcePath = new URL(referer).pathname;
      } catch {
        sourcePath = '';
      }
    }

    const delivery = await sendContactInquiry({
      name: trimField(body?.name, MAX_NAME_LENGTH),
      email,
      industry: trimField(body?.industry, 200),
      location: trimField(body?.location, 200),
      preference: trimField(body?.preference, 80),
      message,
      sourcePath,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thanks — your enquiry was sent. We will reply to the email you provided.',
        deliveryMode: delivery.deliveryMode,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'CONTACT_EMAIL_NOT_CONFIGURED' || message === 'AUTH_EMAIL_NOT_CONFIGURED') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Enquiry delivery is temporarily unavailable. Email connect@brisbaneservers.com directly.',
          code: 'EMAIL_NOT_CONFIGURED',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Could not send your enquiry. Please try again or email connect@brisbaneservers.com.',
        code: 'SEND_FAILED',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
