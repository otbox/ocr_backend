import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Res,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { DownloadService } from './download.service';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private downloadService: DownloadService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    return this.documentsService.uploadDocument(user.id, file);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.documentsService.findAll(user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.findOne(id, user.id);
  }

    @Get(':id/job-status')
    async getJobStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.getJobStatus(id, user.id);
    }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.delete(id, user.id);
  }

   @Get(':id/download')
  async downloadDocument(
    @Param('id') id: string,
    @Query('format') format: string = 'pdf',
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const document = await this.documentsService.findOne(id, user.id);

    const documentData = {
      originalName: document.originalName || "",
      extractedText: document.extractedText || "",
      conversations: (document.conversations || []).map((conv: any) => ({
        messages: Array.isArray(conv.messages)
          ? conv.messages.filter(
              (msg: any) =>
                msg &&
                typeof msg.role === 'string' &&
                typeof msg.content === 'string'
            )
          : [],
        createdAt: conv.createdAt,
      })),
      createdAt: document.createdAt || "",
    };

    if (format === 'json') {
      const json = await this.downloadService.generateJson(documentData); 
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${document.originalName}_result.json"`,
      );
      
      return res.send(json);
    } else {
      // PDF (padrão)
      const pdf = await this.downloadService.generatePdf(documentData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${document.originalName}_result.pdf"`,
      );
      
      return res.send(pdf);
    }
  }
}