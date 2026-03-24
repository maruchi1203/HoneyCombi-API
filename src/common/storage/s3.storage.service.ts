import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3StorageService {
  private readonly bucketName: string;
  private readonly region: string;
  private readonly signedUrlExpiresIn: number;
  private readonly client: S3Client;

  constructor() {
    const missingEnvs = [
      'AWS_S3_BUCKET',
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ].filter((name) => !process.env[name]?.trim());

    if (missingEnvs.length > 0) {
      throw new Error(`AWS S3 환경변수가 누락됨 : ${missingEnvs.join(', ')}`);
    }

    this.bucketName = process.env.AWS_S3_BUCKET ?? '';
    this.region = process.env.AWS_REGION ?? '';
    this.signedUrlExpiresIn = Number(
      process.env.AWS_SIGNED_URL_EXPIRES_IN ?? 3600,
    );

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  // 사진 업로드 로직
  async uploadBuffer(
    key: string,
    file: Pick<Express.Multer.File, 'buffer' | 'mimetype'>,
  ) {
    if (!this.bucketName || !this.client || !file.buffer) {
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

  async getDownloadUrl(key: string | undefined | null) {
    if (!this.bucketName || !this.client || !this.signedUrlExpiresIn || !key) {
      return undefined;
    }

    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: this.signedUrlExpiresIn,
    });
  }
}
