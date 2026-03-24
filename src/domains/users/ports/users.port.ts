/**
 * 사용자 저장소가 제공해야 하는 기능을 정의한 포트 인터페이스입니다.
 */
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
