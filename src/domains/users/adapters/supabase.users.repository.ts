import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3StorageService } from '../../../common/storage/s3.storage.service';
import { RegisterUserDto, UpdateUserDto } from '../dto/index.dto';
import { User } from '../entities/user.entity';
import { UsersPort } from '../ports/users.port';
import { UserOrmEntity } from './entities/user.orm-entity';

/**
 * PostgreSQL(TypeORM) 기반 사용자 저장소입니다.
 * 사용자 메타데이터는 DB에 저장하고, 프로필 이미지는 S3에 업로드합니다.
 */
@Injectable()
export class SupabaseUsersRepository implements UsersPort {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepo: Repository<UserOrmEntity>,
    private readonly s3Storage: S3StorageService,
  ) {}

  async findOne(userId: string): Promise<User | null> {
    const row = await this.userRepo.findOne({ where: { userId } });
    return row ? this.mapUser(row) : null;
  }

  async register(
    userId: string,
    data: RegisterUserDto,
    profileImage?: Express.Multer.File,
  ): Promise<User> {
    // 이미지가 함께 오면 먼저 업로드해 경로를 확정한 뒤 DB에 반영합니다.
    const uploadedProfileImgPath = await this.uploadProfileImage(
      userId,
      profileImage,
    );
    const existing = await this.userRepo.findOne({ where: { userId } });

    // 동일 ID가 이미 있으면 신규 생성 대신 프로필 정보를 갱신합니다.
    if (existing) {
      existing.nickname = data.nickname ?? existing.nickname;
      existing.profileImgPath =
        uploadedProfileImgPath ??
        data.profileImgPath ??
        existing.profileImgPath;
      const updated = await this.userRepo.save(existing);
      return this.mapUser(updated);
    }

    const created = this.userRepo.create({
      userId,
      nickname: data.nickname,
      profileImgPath: uploadedProfileImgPath ?? data.profileImgPath ?? null,
    });

    const saved = await this.userRepo.save(created);
    return this.mapUser(saved);
  }

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

  async unregister(userId: string): Promise<void> {
    await this.userRepo.delete({ userId });
  }

  /**
   * 메모리 업로드된 프로필 이미지를 S3에 저장하고 저장 경로를 반환합니다.
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

  private resolveFileExtension(mimeType: string | undefined) {
    const type = mimeType ?? '';
    if (!type.includes('/')) {
      return 'jpg';
    }

    return type.split('/')[1] ?? 'jpg';
  }

  /**
   * DB 행을 API 응답용 사용자 모델로 변환하면서 서명 URL을 함께 채웁니다.
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
