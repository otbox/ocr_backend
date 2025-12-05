import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
    SocketEvent,
    NotificationPayload,
    OcrProgressPayload,
    OcrCompletedPayload,
    OcrFailedPayload,
} from './dto/socket-events.dto';
import { DocumentStatus } from '@prisma/client';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    namespace: '/notifications', // ws://localhost:3001/notifications
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationsGateway.name);
    private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>
    // prisma: any;
    // llmService: any;

    constructor(private jwtService: JwtService,
            private llmService: LlmService,
            private prisma: PrismaService,
    ) { }

    afterInit(server: Server) {
        this.logger.log('🔌 WebSocket Gateway inicializado');
        this.logger.log(`📡 Socket.IO rodando na porta ${process.env.PORT || 3001}`);
    }


    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                this.logger.warn(`❌ Cliente ${client.id} sem token - desconectando`);
                client.disconnect();
                return;
            }

            const payload = await this.jwtService.verifyAsync(token);
            const userId = payload.sub;


            client.data.userId = userId;


            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            const userSocketSet = this.userSockets.get(userId);
            if (userSocketSet) {
                userSocketSet.add(client.id);
            }

            client.join(`user:${userId}`);

            this.logger.log(`✅ Cliente conectado: ${client.id} (User: ${userId})`);
            this.logger.log(`👥 Total de sockets do usuário ${userId}: ${this.userSockets.get(userId)?.size}`);

            client.emit(SocketEvent.NOTIFICATION, {
                type: 'connected',
                message: 'Conectado ao servidor de notificações',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            this.logger.error(`❌ Erro na conexão do cliente ${client.id}:`, error.message);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const userId = client.data.userId;

        if (userId && this.userSockets.has(userId)) {
            const userSocketSet = this.userSockets.get(userId);
            if (userSocketSet) {
                userSocketSet.delete(client.id);

                if (userSocketSet.size === 0) {
                    this.userSockets.delete(userId);
                }

                this.logger.log(`👋 Cliente desconectado: ${client.id} (User: ${userId})`);
            }
        }
    }


    @SubscribeMessage(SocketEvent.JOIN_ROOM)
    handleJoinRoom(
        @MessageBody() data: { room: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.join(data.room);
        this.logger.log(`🚪 Cliente ${client.id} entrou na sala: ${data.room}`);

        return { event: 'joined', room: data.room };
    }

    // Cliente sai de uma sala
    @SubscribeMessage(SocketEvent.LEAVE_ROOM)
    handleLeaveRoom(
        @MessageBody() data: { room: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.leave(data.room);
        this.logger.log(`🚪 Cliente ${client.id} saiu da sala: ${data.room}`);

        return { event: 'left', room: data.room };
    }


        @SubscribeMessage('llm:ask')
    async handleLlmAsk(
        @MessageBody() data: { documentId: string; question: string },
        @ConnectedSocket() client: Socket,
    ) {
        const userId = client.data.userId; // usuário já autenticado no handleConnection
        
        this.logger.log("aqui:",data.documentId, data.question)
        try {
            this.logger.log(`💬 Pergunta recebida de user:${userId} para doc:${data.documentId}`);

            // 1) Buscar documento com conversas
            const document = await this.prisma.document.findUnique({
                where: { id: data.documentId },
                include: {
                    conversations: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
            });


            // Validações (mesma lógica do controller)
            if (!document) {
                throw new Error('Documento não encontrado');
            }

            if (document.userId !== userId) {
                throw new Error('Você não tem permissão para acessar este documento');
            }

            if (document.status !== DocumentStatus.COMPLETED) {
                throw new Error('Documento ainda está sendo processado');
            }

            if (!document.extractedText) {
                throw new Error('Nenhum texto extraído do documento');
            }

            // 2) Pegar histórico de conversa
            const existingConversation = document.conversations[0];
            const conversationHistory = existingConversation
                ? (existingConversation.messages as any[])
                : [];

            // 3) Gerar resposta com a LLM
            const answer = await this.llmService.generateResponse(
                document.extractedText,
                conversationHistory,
                data.question,
            );

            // 4) Salvar no banco
            const newMessages = [
                ...conversationHistory,
                { role: 'user', content: data.question },
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

            // 5) Emitir resposta de volta para o cliente
            client.emit('llm:answer', {
                documentId: data.documentId,
                question: data.question,
                answer,
                timestamp: new Date().toISOString(),
            });

            this.logger.log(`✅ Resposta enviada para user:${userId} - doc:${data.documentId}`);

        } catch (error) {
            this.logger.error(
                `❌ Erro ao processar pergunta para doc:${data.documentId}:`,
                error.message,
            );

            // Emitir erro de volta
            client.emit('llm:error', {
                documentId: data.documentId,
                question: data.question,
                error: error.message || 'Erro ao processar pergunta',
                timestamp: new Date().toISOString(),
            });
        }
    }

    
    notifyUser(userId: string, payload: NotificationPayload) {
        this.server.to(`user:${userId}`).emit(SocketEvent.NOTIFICATION, payload);
        this.logger.log(`📤 Notificação enviada para user:${userId}`);
    }

    notifyOcrProgress(userId: string, payload: OcrProgressPayload) {
        this.server.to(`user:${userId}`).emit(SocketEvent.OCR_PROGRESS, payload);
    }

    notifyOcrStarted(userId: string, documentId: string) {
        this.server.to(`user:${userId}`).emit(SocketEvent.OCR_STARTED, {
            documentId,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`🚀 OCR iniciado notificado para user:${userId} - doc:${documentId}`);
    }

    notifyOcrCompleted(userId: string, payload: OcrCompletedPayload) {
        this.server.to(`user:${userId}`).emit(SocketEvent.OCR_COMPLETED, {
            ...payload,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`✅ OCR concluído notificado para user:${userId} - doc:${payload.documentId}`);
    }

    notifyOcrFailed(userId: string, payload: OcrFailedPayload) {
        this.server.to(`user:${userId}`).emit(SocketEvent.OCR_FAILED, {
            ...payload,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`❌ OCR falhou notificado para user:${userId} - doc:${payload.documentId}`);
    }

    notifyDocumentDeleted(userId: string, documentId: string) {
        this.server.to(`user:${userId}`).emit(SocketEvent.DOCUMENT_DELETED, {
            documentId,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`🗑️ Documento deletado notificado para user:${userId} - doc:${documentId}`);
    }

    broadcast(event: string, payload: any) {
        this.server.emit(event, payload);
    }

    isUserOnline(userId: string): boolean {
        return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size ?? 0) > 0;
    }

    getUserConnectionCount(userId: string): number {
        return this.userSockets.get(userId)?.size || 0;
    }
}