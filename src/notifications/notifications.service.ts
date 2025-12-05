import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OcrCompletedEvent, OcrFailedEvent } from '../ocr/events/ocr.events';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  @OnEvent('ocr.completed')
  handleOcrCompleted(event: OcrCompletedEvent) {
    this.logger.log(`📧 Notificar usuário ${event.userId}: OCR concluído para documento ${event.documentId}`);
    
  }

  @OnEvent('ocr.failed')
  handleOcrFailed(event: OcrFailedEvent) {
    this.logger.error(`⚠️ Notificar usuário ${event.userId}: OCR falhou para documento ${event.documentId}`);

  }
}