import { listRecentAuthAuditEvents, countAuthAuditEvents, recordAuthAuditEvent } from './db/auth-db';

export async function logAuthEvent(event: {
  userId?: string | null;
  email?: string | null;
  eventType: string;
  eventMeta?: Record<string, unknown> | null;
}): Promise<void> {
  await recordAuthAuditEvent(event);
}

export async function getRecentAuthEvents(limit = 25, offset = 0) {
  return listRecentAuthAuditEvents(limit, offset);
}

export async function getAuthEventsTotal(): Promise<number> {
  return countAuthAuditEvents();
}
