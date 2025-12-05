import { Injectable, Logger } from '@nestjs/common';
import { createWorker, Worker } from 'tesseract.js';
import * as fs from 'fs-extra';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private worker: Worker;

  async onModuleInit() {
    this.logger.log('🔄 Inicializando Tesseract...');
    this.worker = await createWorker('por+eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          this.logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    this.logger.log('✅ Tesseract inicializado');
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.terminate();
      this.logger.log('🔌 Tesseract desconectado');
    }
  }

  async extractText(imagePath: string): Promise<string> {
    try {
      this.logger.log(`📄 Iniciando OCR: ${imagePath}`);
      
      const { data } = await this.worker.recognize(imagePath);
      
      this.logger.log(`✅ OCR concluído. Confiança: ${data.confidence}%`);
      
      return data.text.trim();
    } catch (error) {
      this.logger.error('❌ Erro no OCR:', error);
      throw error;
    }
  }

  async extractTextWithDetails(imagePath: string) {
    try {
      const { data } = await this.worker.recognize(imagePath);
      
      return {
        text: data.text.trim(),
        confidence: data.confidence,
      };
    } catch (error) {
      this.logger.error('Erro no OCR com detalhes:', error);
      throw error;
    }
  }
}