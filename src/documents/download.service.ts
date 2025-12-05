import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export interface DocumentData {
  originalName: string;
  extractedText: string;
  conversations: Array<{
    messages: Array<{
      role: string;
      content: string;
    }>;
    createdAt: Date;
  }>;
  createdAt: Date;
}

@Injectable()
export class DownloadService {
  private readonly logger = new Logger(DownloadService.name);

  async generatePdf(documentData: DocumentData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Relatório de Documento OCR', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Arquivo: ${documentData.originalName}`);
      doc.text(`Data de Upload: ${documentData.createdAt.toLocaleDateString('pt-BR')}`);
      doc.moveDown();

      doc.fontSize(16).text('Texto Extraído (OCR):', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(documentData.extractedText || 'Nenhum texto extraído');
      doc.moveDown(2);

      if (documentData.conversations.length > 0) {
        doc.fontSize(16).text('Interações com IA:', { underline: true });
        doc.moveDown(0.5);

        documentData.conversations.forEach((conv, convIndex) => {
          const messages = conv.messages as any[];
          
          messages.forEach((msg, msgIndex) => {
            if (msg.role === 'user') {
              doc.fontSize(11).fillColor('blue').text(`Pergunta: ${msg.content}`);
            } else if (msg.role === 'assistant') {
              doc.fontSize(10).fillColor('black').text(`Resposta: ${msg.content}`);
              doc.moveDown(0.5);
            }
          });

          if (convIndex < documentData.conversations.length - 1) {
            doc.moveDown();
          }
        });
      }

      doc.fontSize(8).fillColor('gray').text(
        `Gerado em ${new Date().toLocaleString('pt-BR')} por OCR`,
        { align: 'center' },
      );

      doc.end();
    });
  }

  async generateJson(documentData: DocumentData): Promise<string> {
    return JSON.stringify(
      {
        document: {
          originalName: documentData.originalName,
          uploadDate: documentData.createdAt,
          extractedText: documentData.extractedText,
        },
        conversations: documentData.conversations.map((conv) => ({
          date: conv.createdAt,
          messages: conv.messages,
        })),
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  }
}