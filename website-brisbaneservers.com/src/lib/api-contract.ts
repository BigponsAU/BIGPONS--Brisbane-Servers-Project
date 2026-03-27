export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export interface ApiUser {
  id: string;
  email: string;
  role: 'super-admin' | 'admin' | 'editor' | 'viewer' | 'client';
}

export interface ResourceMetadata {
  wordCount?: number;
  semanticLevel?: string;
  voiceScore?: number;
  [key: string]: unknown;
}

export interface ResourceRecord {
  id: string;
  industry: string;
  topic: string;
  title: string;
  description: string;
  content: string;
  generatedAt?: string;
  generatedBy?: string;
  ownerId?: string;
  version?: number;
  status?: string;
  isStarterBlock?: boolean;
  visibility?: string;
  metadata?: ResourceMetadata;
  [key: string]: unknown;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  services?: Record<string, unknown>;
}

export interface AuthSuccessResponse {
  success: true;
  token?: string;
  user: ApiUser;
}

export interface PublicResourcesResponse {
  success: true;
  resources?: ResourceRecord[];
  resource?: ResourceRecord;
  count?: number;
}

export interface CommunityContributionResponse {
  success: true;
  contribution: Record<string, unknown>;
  resource?: ResourceRecord;
  voiceValidation?: Record<string, unknown>;
  tokensAwarded?: number;
}

export type ApiResponse<T> = T | ApiErrorResponse;
