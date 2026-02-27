import { RegisterUserDto, UpdateUserDto } from '../dto/index.dto';
import { User } from '../entities/user.entity';

export interface UsersPort {
  findOne(id: string): Promise<User | null>;

  register(id: string, data: RegisterUserDto): Promise<User>;

  update(id: string, data: UpdateUserDto): Promise<User>;

  unregister(id: string): Promise<void>;
}
