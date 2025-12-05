import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LlmService } from './llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { DocumentStatus } from '@prisma/client';

@Controller('llm')
@UseGuards(JwtAuthGuard)
export class LlmController {
  constructor(
    private llmService: LlmService,
    private prisma: PrismaService,
  ) {}

  @Post('ask')
  async askQuestion(@Body() dto: AskQuestionDto, @CurrentUser() user: any) {
    // 1. Buscar documento e verificar ownership
    const document = await this.prisma.document.findUnique({
      where: { id: dto.documentId },
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    if (document.userId !== user.id) {
      throw new BadRequestException('Você não tem permissão para acessar este documento');
    }

    if (document.status !== DocumentStatus.COMPLETED) {
      throw new BadRequestException('Documento ainda está sendo processado');
    }

    if (!document.extractedText) {
      throw new BadRequestException('Nenhum texto extraído do documento');
    }

    // 2. Buscar histórico de conversas
    const existingConversation = document.conversations[0];
    const conversationHistory = existingConversation
      ? (existingConversation.messages as any[])
      : [];

    // 3. Gerar resposta com LLM
    const answer = await this.llmService.generateResponse(
      document.extractedText,
      conversationHistory,
      dto.question,
    );

    // 4. Atualizar ou criar conversation
    const newMessages = [
      ...conversationHistory,
      { role: 'user', content: dto.question },
      { role: 'assistant', content: answer },
    ];

    if (existingConversation) {
      await this.prisma.conversation.update({
        where: { id: existingConversation.id },
        data: { messages: newMessages },
      });
    } else {
      await this.prisma.conversation.create({
        data: {
          documentId: document.id,
          messages: newMessages,
        },
      });
    }

    return {
      question: dto.question,
      answer,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('conversations/:documentId')
  async getConversations(@Param('documentId') documentId: string, @CurrentUser() user: any) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    if (document.userId !== user.id) {
      throw new BadRequestException('Você não tem permissão para acessar este documento');
    }

    const conversations = await this.prisma.conversation.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    return conversations.map((conv) => ({
      id: conv.id,
      messages: conv.messages,
      createdAt: conv.createdAt,
    }));
  }

  @Post('summarize/:documentId')
  async summarizeDocument(@Param('documentId') documentId: string, @CurrentUser() user: any) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    if (document.userId !== user.id) {
      throw new BadRequestException('Você não tem permissão');
    }

    if (document.status !== DocumentStatus.COMPLETED || !document.extractedText) {
      throw new BadRequestException('Documento ainda está sendo processado');
    }

    const summary = await this.llmService.summarizeDocument(document.extractedText);

    return { summary };
  }
}