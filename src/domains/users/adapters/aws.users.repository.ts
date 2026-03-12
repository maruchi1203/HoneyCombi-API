import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegisterUserDto, UpdateUserDto } from '../dto/index.dto';
import { User } from '../entities/user.entity';
import { UsersPort } from '../ports/users.port';
import { UserOrmEntity } from './entities/user.orm-entity';

@Injectable()
export class AwsUsersRepository implements UsersPort {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async findOne(id: string): Promise<User | null> {
    const row = await this.userRepo.findOne({ where: { id } });
    return row ? this.mapUser(row) : null;
  }

  async register(id: string, data: RegisterUserDto): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { id } });

    if (existing) {
      existing.nickname = data.nickname ?? existing.nickname;
      existing.profileImgPath = data.profileImgPath ?? existing.profileImgPath;
      const updated = await this.userRepo.save(existing);
      return this.mapUser(updated);
    }

    const created = this.userRepo.create({
      id,
      nickname: data.nickname,
      profileImgPath: data.profileImgPath ?? null,
    });

    const saved = await this.userRepo.save(created);
    return this.mapUser(saved);
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const row = await this.userRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('User not found.');
    }

    row.nickname = data.nickname ?? row.nickname;
    row.profileImgPath = data.profileImgPath ?? row.profileImgPath;

    const updated = await this.userRepo.save(row);
    return this.mapUser(updated);
  }

  async unregister(id: string): Promise<void> {
    await this.userRepo.delete({ id });
  }

  private mapUser(row: UserOrmEntity): User {
    return {
      id: row.id,
      nickname: row.nickname,
      profileImgPath: row.profileImgPath ?? undefined,
    };
  }
}
