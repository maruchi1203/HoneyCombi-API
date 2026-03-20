import { RegisterUserCommand, UpdateUserDto } from '../dto/index.dto';
import { User } from '../entities/user.entity';

export interface UsersPort {
  findOne(userId: string): Promise<User | null>;

  register(
    data: RegisterUserCommand,
    profileImage?: Express.Multer.File,
  ): Promise<User>;

  update(
    userId: string,
    data: UpdateUserDto,
    profileImage?: Express.Multer.File,
  ): Promise<User>;

  unregister(userId: string): Promise<void>;
}
