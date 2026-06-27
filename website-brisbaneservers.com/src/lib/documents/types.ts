export type DocumentExtractMethod =
  | 'plain_text'
  | 'html_strip'
  | 'docx_xml'
  | 'pdf_text'
  | 'nvidia_vision'
  | 'unsupported';

export interface DocumentExtractResult {
  text: string;
  method: DocumentExtractMethod;
  processingStatus: 'ready' | 'ocr' | 'failed';
  fileName: string;
  mimeType: string;
  charCount: number;
  visionModelId?: string;
  warning?: string;
}

export type DocumentRewriteMode = 'voice_only' | 'resource_ingest';

export interface DocumentRewriteResult {
  content: string;
  inferenceMode: string;
  modelId: string | null;
  voiceScore: number;
  voiceValid: boolean;
}
