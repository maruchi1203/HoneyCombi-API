import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class S3StorageService {
  private readonly bucketName = process.env.AWS_S3_BUCKET ?? '';
  private readonly region = process.env.AWS_REGION ?? 'us-east-1';
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: this.region,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async uploadBuffer(
    key: string,
    file: Pick<Express.Multer.File, 'buffer' | 'mimetype'>,
  ) {
    if (!this.bucketName || !file.buffer) {
      return;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.client.send(command);
  }
}
