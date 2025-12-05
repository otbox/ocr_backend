import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { StorageModule } from '../storage/storage.module';
import { OcrModule } from '../ocr/ocr.module';
import { DownloadService } from 'src/documents/download.service';

@Module({
  imports: [
    StorageModule,
    OcrModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DownloadService],
  exports: [DocumentsService],
})
export class DocumentsModule {}