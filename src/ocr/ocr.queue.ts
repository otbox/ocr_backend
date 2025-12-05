export const OCR_QUEUE = 'ocr-processing';

export interface OcrJobData {
  documentId: string;
  filePath: string;
}

export interface OcrJobResult {
  documentId: string;
  extractedText: string;
  confidence: number;
  success: boolean;
  error?: string;
}