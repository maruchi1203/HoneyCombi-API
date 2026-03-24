/**
 * PostgreSQL과 S3를 사용해 사용자 정보를 저장하는 저장소 구현입니다.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3StorageService } from '../../../common/storage/s3.storage.service';
import {
  RegisterUserCommand,
  UpdateUserDto,
} from '../dto/index.dto';
import { User } from '../entities/user.entity';
import { UsersPort } from '../ports/users.port';
import { UserOrmEntity } from './entities/user.orm-entity';

@Injectable()
export class SupabaseUsersRepository implements UsersPort {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepo: Repository<UserOrmEntity>,
    private readonly s3Storage: S3StorageService,
  ) {}

  /**
   * 사용자 ID로 사용자 정보를 조회합니다.
   * @param userId 조회 대상 사용자 ID
   * @returns 사용자 정보 또는 null
   */
  async findOne(userId: string): Promise<User | null> {
    const row = await this.userRepo.findOne({ where: { userId } });
    return row ? this.mapUser(row) : null;
  }

  /**
   * 사용자를 생성하거나 기존 사용자 프로필을 갱신합니다.
   * @param registerData 등록 DTO
   * @param profileImage 프로필 이미지 파일
   * @returns 저장된 사용자 정보
   */
  async register(
    registerData: RegisterUserCommand,
    profileImage?: Express.Multer.File,
  ): Promise<User> {
    // 이미지가 함께 오면 먼저 업로드해 경로를 확정한 뒤 DB에 반영합니다.
    const uploadedProfileImgPath = await this.uploadProfileImage(
      registerData.userId,
      profileImage,
    );
    const existing = await this.userRepo.findOne({
      where: { userId: registerData.userId },
    });

    // 동일 ID가 이미 있으면 신규 생성 대신 프로필 정보를 갱신합니다.
    if (existing) {
      existing.nickname = registerData.nickname ?? existing.nickname;
      existing.profileImgPath =
        uploadedProfileImgPath ??
        registerData.profileImgPath ??
        existing.profileImgPath;
      const updated = await this.userRepo.save(existing);
      return this.mapUser(updated);
    }

    const created = this.userRepo.create({
      userId: registerData.userId,
      nickname: registerData.nickname,
      profileImgPath:
        uploadedProfileImgPath ?? registerData.profileImgPath ?? null,
    });

    const saved = await this.userRepo.save(created);
    return this.mapUser(saved);
  }

  /**
   * 사용자 정보를 수정합니다.
   * @param userId 수정 대상 사용자 ID
   * @param data 수정 DTO
   * @param profileImage 프로필 이미지 파일
   * @returns 수정된 사용자 정보
   */
  async update(
    userId: string,
    data: UpdateUserDto,
    profileImage?: Express.Multer.File,
  ): Promise<User> {
    const row = await this.userRepo.findOne({ where: { userId } });
    if (!row) {
      throw new NotFoundException('User not found.');
    }

    const uploadedProfileImgPath = await this.uploadProfileImage(
      userId,
      profileImage,
    );
    row.nickname = data.nickname ?? row.nickname;
    row.profileImgPath =
      uploadedProfileImgPath ?? data.profileImgPath ?? row.profileImgPath;

    const updated = await this.userRepo.save(row);
    return this.mapUser(updated);
  }

  /**
   * 사용자 정보를 삭제합니다.
   * @param userId 삭제 대상 사용자 ID
   * @returns 삭제 완료 결과
   */
  async unregister(userId: string): Promise<void> {
    await this.userRepo.delete({ userId });
  }

  /**
   * 메모리에 올라온 프로필 이미지를 S3에 저장하고 경로를 반환합니다.
   * @param userId 사용자 ID
   * @param profileImage 프로필 이미지 파일
   * @returns 저장된 프로필 이미지 경로 또는 undefined
   */
  private async uploadProfileImage(
    userId: string,
    profileImage?: Express.Multer.File,
  ) {
    if (!profileImage?.buffer) {
      return undefined;
    }

    const extension = this.resolveFileExtension(profileImage.mimetype);
    const storagePath = `users/${userId}/profile.${extension}`;
    await this.s3Storage.uploadBuffer(storagePath, profileImage);
    return storagePath;
  }

  /**
   * MIME 타입에서 파일 확장자를 추출합니다.
   * @param mimeType 업로드 파일의 MIME 타입
   * @returns 저장 경로에 사용할 확장자
   */
  private resolveFileExtension(mimeType: string | undefined) {
    const type = mimeType ?? '';
    if (!type.includes('/')) {
      return 'jpg';
    }

    return type.split('/')[1] ?? 'jpg';
  }

  /**
   * DB 행을 API 응답용 사용자 모델로 변환하고 signed URL을 채웁니다.
   * @param row 사용자 ORM 엔티티
   * @returns 응답용 사용자 모델
   */
  private async mapUser(row: UserOrmEntity): Promise<User> {
    return {
      userId: row.userId,
      nickname: row.nickname,
      profileImgPath: row.profileImgPath ?? undefined,
      profileImgUrl:
        (await this.s3Storage.getDownloadUrl(row.profileImgPath)) ?? undefined,
    };
  }
}
