import { Injectable, Inject } from '@nestjs/common';
import {
  RegisterUserDto,
  UpdateUserDto as UpdateUserInfoDto,
} from '../dto/index.dto';
import type { UsersPort } from '../ports/users.port';
import { USERS_REPOSITORY } from '../users.tokens';

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
    userId: string,
    registerUserDto: RegisterUserDto,
    profileImage?: Express.Multer.File,
  ) {
    const txnRes = this.usersRepository.register(
      userId,
      registerUserDto,
      profileImage,
    );
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
