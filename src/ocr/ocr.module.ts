import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OcrService } from './ocr.service';
import { OcrProcessor } from './ocr.processor';
import { OCR_QUEUE } from './ocr.queue';

@Module({
  imports: [
    BullModule.registerQueue({
      name: OCR_QUEUE,
      defaultJobOptions: {
        attempts: 3,              
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,   
        removeOnFail: false,      
      },
    }),
  ],
  providers: [OcrService, OcrProcessor],
  exports: [OcrService, BullModule],
})
export class OcrModule {}