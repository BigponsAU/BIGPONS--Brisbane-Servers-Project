/**
 * Corpus document integrity checks and repairs (Neon corpus_documents).
 */
import type { Pool } from 'pg';
import { CORPUS_DOC_KEYS, type CorpusDocKey } from './corpus-store';
import {
  coerceCorpusPayload,
  corpusPayloadKind,
  isStringEncodedCorpusPayload,
  normalizeForJsonbStorage,
} from './corpus-payload-coerce';

export const EXPECTED_CORPUS_SHAPE: Partial<Record<CorpusDocKey, 'array' | 'object'>> = {
  [CORPUS_DOC_KEYS.RESOURCES]: 'array',
  [CORPUS_DOC_KEYS.GROWTH_PROPOSALS]: 'array',
  [CORPUS_DOC_KEYS.CONTRIBUTIONS]: 'array',
  [CORPUS_DOC_KEYS.TOKEN_LEDGER]: 'array',
  [CORPUS_DOC_KEYS.USAGE_LEDGER]: 'array',
  [CORPUS_DOC_KEYS.AI_DAILY_BONUSES]: 'array',
  [CORPUS_DOC_KEYS.TOKEN_REDEMPTION_QUEUE]: 'array',
  [CORPUS_DOC_KEYS.GROWTH_USAGE_LEDGER]: 'array',
  [CORPUS_DOC_KEYS.CASE_STUDY_DRAFTS]: 'array',
  [CORPUS_DOC_KEYS.SEMANTIC_INDEX]: 'object',
  [CORPUS_DOC_KEYS.LIBRARY_GROWTH_CONFIG]: 'object',
  [CORPUS_DOC_KEYS.PIPELINE_CONFIG]: 'object',
  [CORPUS_DOC_KEYS.PROFILES]: 'object',
  [CORPUS_DOC_KEYS.TEXT_STORAGE]: 'object',
};

export type CorpusRowStatus = 'ok' | 'missing' | 'string-encoded' | 'shape-mismatch';

export interface CorpusAuditRow {
  doc_key: CorpusDocKey | string;
  status: CorpusRowStatus;
  jsonb_type: string | null;
  coerced_type: string | null;
  detail?: string;
}

export interface CorpusAuditReport {
  summary: {
    ok: number;
    missing: number;
    stringEncoded: number;
    shapeMismatch: number;
    extraRows: string[];
  };
  rows: CorpusAuditRow[];
}

export async function auditCorpusDocuments(pool: Pool): Promise<CorpusAuditReport> {
  const allKeys = Object.values(CORPUS_DOC_KEYS);
  const { rows } = await pool.query<{ doc_key: string; payload: unknown; payload_type: string }>(
    `SELECT doc_key, payload, jsonb_typeof(payload) AS payload_type FROM corpus_documents`,
  );
  const byKey = new Map(rows.map((r) => [r.doc_key, r]));
  const report: CorpusAuditRow[] = [];

  for (const key of allKeys) {
    const row = byKey.get(key);
    if (!row) {
      report.push({ doc_key: key, status: 'missing', jsonb_type: null, coerced_type: null });
      continue;
    }

    if (row.payload_type === 'string' || isStringEncodedCorpusPayload(row.payload)) {
      report.push({
        doc_key: key,
        status: 'string-encoded',
        jsonb_type: row.payload_type,
        coerced_type: corpusPayloadKind(coerceCorpusPayload(row.payload)),
        detail: 'npm run audit:corpus -- --repair --apply',
      });
      continue;
    }

    const coerced = coerceCorpusPayload(row.payload);
    const coercedType = corpusPayloadKind(coerced);
    const expected = EXPECTED_CORPUS_SHAPE[key];
    if (expected && coercedType !== expected) {
      report.push({
        doc_key: key,
        status: 'shape-mismatch',
        jsonb_type: row.payload_type,
        coerced_type: coercedType,
        detail: `expected ${expected}`,
      });
      continue;
    }

    report.push({
      doc_key: key,
      status: 'ok',
      jsonb_type: row.payload_type,
      coerced_type: coercedType,
    });
  }

  const extraRows = rows
    .filter((r) => !allKeys.includes(r.doc_key as CorpusDocKey))
    .map((r) => r.doc_key);

  return {
    rows: report,
    summary: {
      ok: report.filter((r) => r.status === 'ok').length,
      missing: report.filter((r) => r.status === 'missing').length,
      stringEncoded: report.filter((r) => r.status === 'string-encoded').length,
      shapeMismatch: report.filter((r) => r.status === 'shape-mismatch').length,
      extraRows,
    },
  };
}

export interface CorpusRepairResult {
  mode: 'dry-run' | 'apply';
  repairCount: number;
  repairs: Array<{ doc_key: string; fromType: string; toType: string }>;
}

export async function repairStringEncodedCorpusDocuments(
  pool: Pool,
  apply: boolean,
): Promise<CorpusRepairResult> {
  const { rows } = await pool.query<{ doc_key: string; payload: unknown }>(
    'SELECT doc_key, payload FROM corpus_documents ORDER BY doc_key',
  );

  const repairs: CorpusRepairResult['repairs'] = [];

  for (const row of rows) {
    if (!isStringEncodedCorpusPayload(row.payload)) continue;
    const coerced = coerceCorpusPayload(row.payload);
    const toType = corpusPayloadKind(coerced);
    repairs.push({
      doc_key: row.doc_key,
      fromType: 'string',
      toType: toType === 'array' || toType === 'object' ? toType : String(toType),
    });
    if (apply) {
      const normalized = normalizeForJsonbStorage(row.payload);
      await pool.query(
        `UPDATE corpus_documents SET payload = $2::jsonb, updated_at = NOW() WHERE doc_key = $1`,
        [row.doc_key, JSON.stringify(normalized)],
      );
    }
  }

  return {
    mode: apply ? 'apply' : 'dry-run',
    repairCount: repairs.length,
    repairs,
  };
}

export function corpusAuditExitCode(report: CorpusAuditReport): number {
  return report.summary.stringEncoded + report.summary.shapeMismatch > 0 ? 2 : 0;
}
