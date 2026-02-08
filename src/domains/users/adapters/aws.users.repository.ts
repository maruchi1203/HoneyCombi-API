import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from '../dto/register.user.dto';
import { UpdateUserDto } from '../dto/update-info.user.dto';
import { User } from '../entities/user.entity';
import { UsersPort } from '../ports/users.port';

@Injectable()
export class AwsUsersRepository implements UsersPort {
  async register(data: RegisterUserDto): Promise<User> {
    return { id: 'aws-user-id', ...data };
  }

  async findAll(): Promise<User[]> {
    return [];
  }

  async findOne(id: string): Promise<User | null> {
    return { id, name: 'aws-user', email: 'aws@example.com' };
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    return {
      id,
      name: data.name ?? 'aws-user',
      email: data.email ?? 'aws@example.com',
    };
  }

  async unregister(_id: string): Promise<void> {
    return;
  }
}
