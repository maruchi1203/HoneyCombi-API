import { Injectable, Inject } from '@nestjs/common';
import {
  RegisterUserCommand,
  UpdateUserDto as UpdateUserInfoDto,
} from '../dto/index.dto';
import type { UsersPort } from '../ports/users.port';
import { USERS_REPOSITORY } from '../users.tokens';

/**
 * 사용자 도메인의 애플리케이션 서비스입니다.
 * 컨트롤러 요청을 저장소 인터페이스에 연결하는 얇은 조정 계층 역할을 합니다.
 */
@Injectable()
export class UsersUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersPort,
  ) {}

  findUserInfo(userId: string) {
    const txnRes = this.usersRepository.findOne(userId);
    return txnRes;
  }

  register(
    registerUserDto: RegisterUserCommand,
    profileImage?: Express.Multer.File,
  ) {
    const txnRes = this.usersRepository.register(registerUserDto, profileImage);
    return txnRes;
  }

  update(
    userId: string,
    updateUserInfoDto: UpdateUserInfoDto,
    profileImage?: Express.Multer.File,
  ) {
    const txnRes = this.usersRepository.update(
      userId,
      updateUserInfoDto,
      profileImage,
    );
    return txnRes;
  }

  unregister(userId: string) {
    const txnRes = this.usersRepository.unregister(userId);
    return txnRes;
  }
}
