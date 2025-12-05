export enum SocketEvent {
    // Client 2 Server
  JOIN_ROOM = 'join:room',
  LEAVE_ROOM = 'leave:room',
  
    // Server 2 Client
  NOTIFICATION = 'notification',
  OCR_STARTED = 'ocr:started',
  OCR_PROGRESS = 'ocr:progress',
  OCR_COMPLETED = 'ocr:completed',
  OCR_FAILED = 'ocr:failed',
  DOCUMENT_DELETED = 'document:deleted',
}

export interface NotificationPayload {
  type: string;
  message: string;
  data?: any;
  timestamp: string;
}

export interface OcrProgressPayload {
  documentId: string;
  progress: number;
  status: string;
}

export interface OcrCompletedPayload {
  documentId: string;
  extractedText: string;
  confidence: number;
}

export interface OcrFailedPayload {
  documentId: string;
  error: string;
}