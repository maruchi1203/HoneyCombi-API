import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3StorageService } from '../../../common/storage/s3.storage.service';
import { RegisterUserDto, UpdateUserDto } from '../dto/index.dto';
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

  async findOne(id: string): Promise<User | null> {
    const row = await this.userRepo.findOne({ where: { id } });
    return row ? this.mapUser(row) : null;
  }

  async register(
    id: string,
    data: RegisterUserDto,
    profileImage?: Express.Multer.File,
  ): Promise<User> {
    const uploadedProfileImgPath = await this.uploadProfileImage(
      id,
      profileImage,
    );
    const existing = await this.userRepo.findOne({ where: { id } });

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
      id,
      nickname: data.nickname,
      profileImgPath: uploadedProfileImgPath ?? data.profileImgPath ?? null,
    });

    const saved = await this.userRepo.save(created);
    return this.mapUser(saved);
  }

  async update(
    id: string,
    data: UpdateUserDto,
    profileImage?: Express.Multer.File,
  ): Promise<User> {
    const row = await this.userRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('User not found.');
    }

    const uploadedProfileImgPath = await this.uploadProfileImage(
      id,
      profileImage,
    );
    row.nickname = data.nickname ?? row.nickname;
    row.profileImgPath =
      uploadedProfileImgPath ?? data.profileImgPath ?? row.profileImgPath;

    const updated = await this.userRepo.save(row);
    return this.mapUser(updated);
  }

  async unregister(id: string): Promise<void> {
    await this.userRepo.delete({ id });
  }

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

  private async mapUser(row: UserOrmEntity): Promise<User> {
    return {
      id: row.id,
      nickname: row.nickname,
      profileImgPath: row.profileImgPath ?? undefined,
      profileImgUrl:
        (await this.s3Storage.getDownloadUrl(row.profileImgPath)) ?? undefined,
    };
  }
}
