import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { UsersRepository } from '../ports/users.repository';

@Injectable()
export class FirebaseUsersRepository implements UsersRepository {
  async create(data: CreateUserDto): Promise<User> {
    return { id: 'firebase-user-id', ...data };
  }

  async findAll(): Promise<User[]> {
    return [];
  }

  async findOne(id: string): Promise<User | null> {
    return { id, name: 'firebase-user', email: 'firebase@example.com' };
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    return { id, name: data.name ?? 'firebase-user', email: data.email ?? 'firebase@example.com' };
  }

  async remove(_id: string): Promise<void> {
    return;
  }
}
