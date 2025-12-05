import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class AskQuestionDto {
  @IsUUID()
  @IsNotEmpty()
  documentId: string;

  @IsString()
  @IsNotEmpty()
  question: string;
}