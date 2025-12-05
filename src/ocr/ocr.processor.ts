import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { OcrService } from './ocr.service';
import { OCR_QUEUE, OcrJobData  } from './ocr.queue';
import type { OcrJobResult } from './ocr.queue';
import { DocumentStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OcrCompletedEvent, OcrFailedEvent } from './events/ocr.events';

@Processor(OCR_QUEUE)
export class OcrProcessor {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    private prisma: PrismaService,
    private ocrService: OcrService, 
    private eventEmitter: EventEmitter2,
  ) {}

  @Process()
  async handleOcrJob(job: Job<OcrJobData>): Promise<OcrJobResult> {
    const { documentId, filePath } = job.data;

    this.logger.log(`🔄 Processando OCR - Job ${job.id} - Document ${documentId}`);

    try {
      await job.progress(10);

      const result = await this.ocrService.extractTextWithDetails(filePath);
      await job.progress(80);

      const document = await this.prisma.document.update({
        where: { id: documentId },
        data: {
          extractedText: result.text,
          status: DocumentStatus.COMPLETED,
        },
      });

      await job.progress(100);

    this.eventEmitter.emit(
        'ocr.completed',
        new OcrCompletedEvent(
          documentId,
          document.userId,
          result.text,
          result.confidence,
        ),
      );

      this.logger.log(`✅ OCR concluído - Document ${documentId} - Confiança: ${result.confidence}%`);

      return {
        documentId,
        extractedText: result.text,
        confidence: result.confidence,
        success: true,
      };
    } catch (error) {
      this.logger.error(`❌ Erro no OCR - Document ${documentId}:`, error);

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.FAILED,
          processingError: error.message,
        },
      });

    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });

    if (doc) {
        this.eventEmitter.emit(
            'ocr.failed',
            new OcrFailedEvent(documentId, doc.userId, error.message),
        );
    } else {
        this.logger.error(`❌ Document not found - Document ${documentId}`);
    }
      throw error; 
    }
  }

  @OnQueueActive()
  onActive(job: Job<OcrJobData>) {
    this.logger.log(`🚀 Job ${job.id} iniciado - Document ${job.data.documentId}`);
    this.prisma.document
      .findUnique({
        where: { id: job.data.documentId },
        select: { userId: true },
      })
      .then((doc) => {
        if (doc) {
          this.eventEmitter.emit('ocr.started', {
            documentId: job.data.documentId,
            userId: doc.userId,
          });
        }
      });
  }

  @OnQueueCompleted()
  onCompleted(job: Job<OcrJobData>, result: OcrJobResult) {
    this.logger.log(`✅ Job ${job.id} concluído - Document ${job.data.documentId}`);
  }

  @OnQueueFailed()
  onFailed(job: Job<OcrJobData>, error: Error) {
    this.logger.error(`❌ Job ${job.id} falhou - Document ${job.data.documentId}:`, error.message);
  }
}