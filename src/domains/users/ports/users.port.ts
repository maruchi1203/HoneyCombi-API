import { RegisterUserDto } from '../dto/register.user.dto';
import { UpdateUserDto } from '../dto/update-info.user.dto';
import { User } from '../entities/user.entity';

export interface UsersPort {
  register(data: RegisterUserDto): Promise<User>;

  findOne(id: string): Promise<User | null>;

  update(id: string, data: UpdateUserDto): Promise<User>;

  unregister(id: string): Promise<void>;
}
