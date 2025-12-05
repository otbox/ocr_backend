import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs-extra';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private bucketName: string | undefined;
  private namespace: string | undefined;
  private region: string | undefined;
  private storageType: string;
  private uploadPath: string;

  constructor(private configService: ConfigService) {
    this.storageType = this.configService.get('STORAGE_TYPE', 'local');

    if (this.storageType === 'oracle') {
      this.region = this.configService.get('ORACLE_REGION') ?? '';
      this.bucketName = this.configService.get('ORACLE_BUCKET_NAME') ?? '';
      this.namespace = this.configService.get('ORACLE_NAMESPACE') ?? '';

      // Endpoint da Oracle Cloud (compatível com S3)
      const endpoint = `https://${this.namespace}.compat.objectstorage.${this.region}.oraclecloud.com`;

      this.s3Client = new S3Client({
        region: this.region,
        endpoint: endpoint,
        credentials: {
          accessKeyId: this.configService.get('ORACLE_ACCESS_KEY') ?? '',   
          secretAccessKey: this.configService.get('ORACLE_SECRET_KEY') ?? '',
        },
        forcePathStyle: true,
      });

      this.logger.log(`☁️ Storage: Oracle Cloud (${this.bucketName})`);
    } else {
      this.uploadPath = this.configService.get('UPLOAD_PATH', './uploads');
      fs.ensureDirSync(this.uploadPath);
      this.logger.log(`📁 Storage: Local (${this.uploadPath})`);
    }
  }

  async saveFile(file: Express.Multer.File): Promise<{ fileName: string; url: string }> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;

    if (this.storageType === 'oracle') {
      // Upload para Oracle Cloud
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      // URL pública da Oracle
      const url = `https://objectstorage.${this.region}.oraclecloud.com/n/${this.namespace}/b/${this.bucketName}/o/${fileName}`;
      
      this.logger.log(`✅ Arquivo salvo na Oracle Cloud: ${fileName}`);
      return { fileName, url };
    } else {
      // Salvar localmente
      const filePath = path.join(this.uploadPath, fileName);
      await fs.writeFile(filePath, file.buffer);

      const url = `/uploads/${fileName}`;
      this.logger.log(`✅ Arquivo salvo localmente: ${fileName}`);
      return { fileName, url };
    }
  }

  async getFilePath(fileName: string): Promise<string> {
    if (this.storageType === 'oracle') {
      return `https://objectstorage.${this.region}.oraclecloud.com/n/${this.namespace}/b/${this.bucketName}/o/${fileName}`;
    } else {
      return path.join(this.uploadPath, fileName);
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    if (this.storageType === 'oracle') {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(command);
      this.logger.log(`🗑️ Arquivo deletado da Oracle Cloud: ${fileName}`);
    } else {
      const filePath = path.join(this.uploadPath, fileName);
      await fs.unlink(filePath).catch(() => {});
      this.logger.log(`🗑️ Arquivo deletado localmente: ${fileName}`);
    }
  }

  async fileExists(fileName: string): Promise<boolean> {
    if (this.storageType === 'oracle') {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
        });
        await this.s3Client.send(command);
        return true;
      } catch {
        return false;
      }
    } else {
      const filePath = path.join(this.uploadPath, fileName);
      return fs.pathExists(filePath);
    }
  }
}