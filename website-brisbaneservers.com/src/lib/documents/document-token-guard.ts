import type { AuthRole } from '../../utils/auth';
import { DOCUMENT_TOKEN_COSTS } from '../../data/document-token-costs';
import type { DocumentExtractMethod } from './types';
import {
  addLedgerEntry,
  getUserBalance,
  type TokenReason,
} from '../token-ledger';

export type DocumentTokenSpendResult =
  | { ok: true; cost: number; balance: number; waived: boolean }
  | { ok: false; code: 'INSUFFICIENT_BALANCE'; error: string; balance: number; cost: number };

function isTokenWaived(role: AuthRole): boolean {
  return role === 'admin' || role === 'super-admin';
}

export function tokenCostForExtractMethod(method: DocumentExtractMethod): number {
  if (method === 'unsupported') return 0;
  if (method === 'nvidia_vision') return DOCUMENT_TOKEN_COSTS.extractVision;
  return DOCUMENT_TOKEN_COSTS.extractLocal;
}

function extOf(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  return i >= 0 ? fileName.slice(i + 1).toLowerCase() : '';
}

/** Balance required before extract runs (vision-priced for PDF/images). */
export function requiredExtractTokenBalance(fileName: string, mimeType = ''): number {
  const ext = extOf(fileName);
  const mime = mimeType || '';
  const visionExts = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'tif', 'tiff']);
  if (visionExts.has(ext) || mime === 'application/pdf' || mime.startsWith('image/')) {
    return DOCUMENT_TOKEN_COSTS.extractVision;
  }
  return DOCUMENT_TOKEN_COSTS.extractLocal;
}

export async function ensureExtractTokenBalance(params: {
  userId: string;
  role: AuthRole;
  fileName: string;
  mimeType?: string;
}): Promise<DocumentTokenSpendResult> {
  const cost = requiredExtractTokenBalance(params.fileName, params.mimeType);
  const balance = await getUserBalance(params.userId);
  if (cost <= 0 || isTokenWaived(params.role)) {
    return { ok: true, cost, balance, waived: isTokenWaived(params.role) };
  }
  if (balance < cost) {
    return {
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
      error: `Need at least ${cost} tokens for this file (you have ${balance}). Earn tokens by contributing to the resource library.`,
      balance,
      cost,
    };
  }
  return { ok: true, cost, balance, waived: false };
}

export async function spendDocumentTokens(params: {
  userId: string;
  role: AuthRole;
  cost: number;
  reason: TokenReason;
}): Promise<DocumentTokenSpendResult> {
  const balance = await getUserBalance(params.userId);
  if (params.cost <= 0 || isTokenWaived(params.role)) {
    return { ok: true, cost: params.cost, balance, waived: isTokenWaived(params.role) };
  }
  if (balance < params.cost) {
    return {
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
      error: `Need ${params.cost} tokens (you have ${balance}). Earn tokens by contributing to the resource library.`,
      balance,
      cost: params.cost,
    };
  }
  await addLedgerEntry({
    userId: params.userId,
    delta: -params.cost,
    reason: params.reason,
  });
  return {
    ok: true,
    cost: params.cost,
    balance: balance - params.cost,
    waived: false,
  };
}

export async function previewDocumentTokenBalance(
  userId: string,
  role: AuthRole
): Promise<{ balance: number; waived: boolean; costs: typeof DOCUMENT_TOKEN_COSTS }> {
  return {
    balance: await getUserBalance(userId),
    waived: isTokenWaived(role),
    costs: DOCUMENT_TOKEN_COSTS,
  };
}
