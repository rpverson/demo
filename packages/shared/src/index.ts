export type SourceType = 'URL' | 'PDF' | 'DOCX' | 'MD';

export type CallStatus =
  | 'IMPORTED'
  | 'ANALYZED_PHASE_1'
  | 'GAP_PENDING'
  | 'READY_FOR_PHASE_2'
  | 'GENERATED_PHASE_2';

export interface GapItem {
  code: string;
  description: string;
  requiredCount: number;
  currentCount: number;
}

export interface GapReportDTO {
  callId: string;
  gaps: GapItem[];
  blocked: boolean;
}

export interface DocumentDTO {
  id: string;
  callId: string;
  title: string;
  markdownSource: string;
  version: number;
  lockOwner: string | null;
  lockExpiresAt: string | null;
}

export interface AIContextPacketDTO {
  tenantId: string;
  userId: string;
  callId?: string;
  documentId?: string;
  message: string;
}
