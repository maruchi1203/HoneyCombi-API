import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3StorageService {
  private readonly bucketName = process.env.AWS_S3_BUCKET ?? '';
  private readonly region = process.env.AWS_REGION ?? 'us-east-1';
  private readonly signedUrlExpiresIn = Number(
    process.env.AWS_SIGNED_URL_EXPIRES_IN ?? 3600,
  );
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

  async getDownloadUrl(key: string | undefined | null) {
    if (!this.bucketName || !key) {
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
