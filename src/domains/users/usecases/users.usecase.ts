import { Injectable, Inject } from '@nestjs/common';
import { RegisterUserDto } from '../dto/register.user.dto';
import { UpdateUserDto as UpdateUserInfoDto } from '../dto/update-info.user.dto';
import type { UsersRepository } from '../ports/users.repository';
import { USERS_REPOSITORY } from '../users.tokens';

@Injectable()
export class UsersUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  register(registerUserDto: RegisterUserDto) {
    const input = registerUserDto;
    const txnRes = this.usersRepository.register(input);
    return txnRes;
  }

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
