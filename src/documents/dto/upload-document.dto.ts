import { IsNotEmpty } from 'class-validator';

export class UploadDocumentDto {
  @IsNotEmpty()
  file: Express.Multer.File;
}