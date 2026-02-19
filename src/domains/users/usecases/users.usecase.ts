import { Injectable, Inject } from '@nestjs/common';
import { UpdateUserDto as UpdateUserInfoDto } from '../dto/update-info.user.dto';
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

  update(userId: string, updateUserInfoDto: UpdateUserInfoDto) {
    const txnRes = this.usersRepository.update(userId, updateUserInfoDto);
    return txnRes;
  }

  unregister(userId: string) {
    const txnRes = this.usersRepository.unregister(userId);
    return txnRes;
  }
}
