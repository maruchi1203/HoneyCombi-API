import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * S3 업로드와 다운로드용 signed URL 생성을 담당하는 공통 스토리지 서비스입니다.
 */
@Injectable()
export class S3StorageService {
  private readonly bucketName: string;
  private readonly region: string;
  private readonly signedUrlExpiresIn: number;
  private readonly client: S3Client;

  constructor() {
    // signed URL 만료 시간 외의 필수 AWS 환경변수는 시작 시점에 모두 검증합니다.
    const missingEnvs = [
      'AWS_S3_BUCKET',
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ].filter((name) => !process.env[name]?.trim());

    if (missingEnvs.length > 0) {
      throw new Error(`AWS S3 환경변수가 비어 있습니다: ${missingEnvs.join(', ')}`);
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

  /**
   * Multer가 메모리에 올린 파일 버퍼를 지정한 S3 key에 업로드합니다.
   */
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

  /**
   * 내부 저장 경로를 외부 다운로드용 signed URL로 변환합니다.
   * 이미 완성된 URL이 들어오면 그대로 반환합니다.
   */
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
