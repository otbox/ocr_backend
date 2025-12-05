import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OCR_QUEUE, OcrJobData } from '../ocr/ocr.queue';
import { DocumentStatus } from '@prisma/client';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    @InjectQueue(OCR_QUEUE) private ocrQueue: Queue<OcrJobData>, // 👈 Injeta a fila
  ) {}

  async uploadDocument(userId: string, file: Express.Multer.File) {
    // 1. Salvar arquivo no storage
    const { fileName, url } = await this.storageService.saveFile(file);

    // 2. Criar registro no banco
    const document = await this.prisma.document.create({
      data: {
        userId,
        originalName: file.originalname,
        storageUrl: url,
        mimeType: file.mimetype,
        fileSize: file.size,
        status: DocumentStatus.PROCESSING,
      },
    });

    // 3. Adicionar à fila (não espera processar)
    const filePath = await this.storageService.getFilePath(fileName);
    
    await this.ocrQueue.add({
      documentId: document.id,
      filePath,
    }, {
      priority: 1, 
      delay: 0,    
    });

    this.logger.log(`📤 Documento ${document.id} adicionado à fila OCR`);

    return document;
  }

  // Método para verificar status do job
  async getJobStatus(documentId: string, userId: string) {
    const document = await this.findOne(documentId, userId);

    // Buscar job na fila
    const jobs = await this.ocrQueue.getJobs(['active', 'waiting', 'delayed']);
    const job = jobs.find(j => j.data.documentId === documentId);

    if (!job) {
      return {
        status: document.status,
        inQueue: false,
      };
    }

    return {
      status: document.status,
      inQueue: true,
      jobId: job.id,
      progress: await job.progress(),
      attempts: job.attemptsMade,
      state: await job.getState(),
    };
  }

  // ... resto do código permanece igual ...

  async findAll(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        storageUrl: true,
        status: true,
        fileSize: true,
        createdAt: true,
        extractedText: true,
      },
    });
  }

  async findOne(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        conversations: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    if (document.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para acessar este documento');
    }

    return document;
  }

  async delete(id: string, userId: string) {
    const document = await this.findOne(id, userId);

    // Deletar arquivo do storage
    const fileName = document.storageUrl.split('/').pop();
    await this.storageService.deleteFile(fileName || '');

    // Deletar do banco
    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Documento deletado com sucesso' };
  }
}