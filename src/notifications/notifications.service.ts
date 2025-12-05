import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OcrCompletedEvent, OcrFailedEvent } from '../ocr/events/ocr.events';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private notificationsGateway: NotificationsGateway) {}

  @OnEvent('ocr.completed')
  handleOcrCompleted(event: OcrCompletedEvent) {
    this.logger.log(`📧 Processando evento OCR concluído: ${event.documentId}`);

    // Verificar se usuário está online
    const isOnline = this.notificationsGateway.isUserOnline(event.userId);
    this.logger.log(`User ${event.userId} online: ${isOnline}`);

    // Enviar via WebSocket se estiver online
    if (isOnline) {
      this.notificationsGateway.notifyOcrCompleted(event.userId, {
        documentId: event.documentId,
        extractedText: event.extractedText.substring(0, 200) + '...', // Preview
        confidence: event.confidence,
      });
    }

    // Aqui você poderia também:
    // - Enviar email se offline
    // - Salvar notificação no banco
    // - Enviar push notification
  }

  @OnEvent('ocr.failed')
  handleOcrFailed(event: OcrFailedEvent) {
    this.logger.error(`⚠️ Processando evento OCR falhou: ${event.documentId}`);

    const isOnline = this.notificationsGateway.isUserOnline(event.userId);

    if (isOnline) {
      this.notificationsGateway.notifyOcrFailed(event.userId, {
        documentId: event.documentId,
        error: event.error,
      });
    }

  }

  @OnEvent('ocr.started')
  handleOcrStarted(data: { documentId: string; userId: string }) {
    this.logger.log(`🚀 Processando evento OCR iniciado: ${data.documentId}`);

    const isOnline = this.notificationsGateway.isUserOnline(data.userId);

    if (isOnline) {
      this.notificationsGateway.notifyOcrStarted(data.userId, data.documentId);
    }
  }

  @OnEvent('document.deleted')
  handleDocumentDeleted(data: { documentId: string; userId: string }) {
    this.logger.log(`🗑️ Processando evento documento deletado: ${data.documentId}`);

    const isOnline = this.notificationsGateway.isUserOnline(data.userId);

    if (isOnline) {
      this.notificationsGateway.notifyDocumentDeleted(data.userId, data.documentId);
    }
  }
}