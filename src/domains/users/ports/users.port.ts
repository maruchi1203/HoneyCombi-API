import { RegisterUserDto, UpdateUserDto } from '../dto/index.dto';
import { User } from '../entities/user.entity';

export interface UsersPort {
  findOne(id: string): Promise<User | null>;

  register(
    id: string,
    data: RegisterUserDto,
    profileImage?: Express.Multer.File,
  ): Promise<User>;

  update(
    id: string,
    data: UpdateUserDto,
    profileImage?: Express.Multer.File,
  ): Promise<User>;

  unregister(id: string): Promise<void>;
}
