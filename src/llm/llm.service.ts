import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private gemini: GoogleGenerativeAI;
  private modelName: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('GEMINI_API_KEY');

    if (!apiKey) {
      this.logger.warn('⚠️ GEMINI_API_KEY não configurada');
      return;
    }

    this.gemini = new GoogleGenerativeAI(apiKey);

    this.modelName = this.configService.get(
      'GEMINI_MODEL',
      'gemini-2.0-flash'
    );

    this.logger.log(`🤖 Gemini configurado: ${this.modelName}`);
  }

  async generateResponse(
    extractedText: string,
    conversationHistory: Message[],
    newQuestion: string,
  ): Promise<string> {
    try {
      const model = this.gemini.getGenerativeModel({ model: this.modelName });

      const systemPrompt = this.buildSystemPrompt(extractedText);

      const fullPrompt =
        this.convertToPrompt(systemPrompt, conversationHistory, newQuestion);

      this.logger.log(`💬 Gerando resposta para: "${newQuestion.substring(0, 50)}..."`);

      const result = await model.generateContent(fullPrompt);

      const answer = result.response.text();

      return answer || '';
    } catch (error) {
      this.logger.error('❌ Erro ao gerar resposta:', error);
      throw error;
    }
  }

  private convertToPrompt(
    systemPrompt: string,
    history: Message[],
    newQuestion: string,
  ): string {
    let prompt = `${systemPrompt}\n\n`;

    for (const msg of history) {
      prompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
    }

    prompt += `USER: ${newQuestion}\nASSISTANT:`;
    return prompt;
  }

  private buildSystemPrompt(extractedText: string): string {
    return `Você é um assistente especializado em analisar notas fiscais e documentos.

TEXTO EXTRAÍDO DO DOCUMENTO:
---
${extractedText}
---

INSTRUÇÕES:
- Responda perguntas sobre o documento acima
- Seja preciso e cite informações específicas do texto
- Se não encontrar a informação, diga claramente
- Formate valores monetários adequadamente (R$)
- Seja conciso mas completo
- Use português brasileiro

EXEMPLOS DE PERGUNTAS:
- Qual o valor total da nota?
- Quem é o fornecedor?
- Quais produtos estão listados?
- Qual a data de emissão?
- Há algum desconto aplicado?`;
  }

  async summarizeDocument(extractedText: string): Promise<string> {
    try {
      const model = this.gemini.getGenerativeModel({ model: this.modelName });

      const prompt = `
Você é um assistente que cria resumos concisos de documentos fiscais.
Resuma este documento em 3-4 linhas destacando as informações principais:

${extractedText}
      `;

      const result = await model.generateContent(prompt);

      return result.response.text() || '';
    } catch (error) {
      this.logger.error('Erro ao resumir documento:', error);
      throw error;
    }
  }
}
