/**
 * 사용자 관련 요청을 정리해 저장소 포트로 전달하는 유스케이스 계층입니다.
 */
import { Injectable, Inject } from '@nestjs/common';
import {
  RegisterUserCommand,
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

  /**
   * 사용자 정보를 조회합니다.
   * @param userId 조회 대상 사용자 ID
   * @returns 사용자 정보 또는 null
   */
  findUserInfo(userId: string) {
    const txnRes = this.usersRepository.findOne(userId);
    return txnRes;
  }

  /**
   * 사용자 등록 요청을 저장소에 전달합니다.
   * @param registerUserDto 등록 DTO
   * @param profileImage 프로필 이미지 파일
   * @returns 저장된 사용자 정보
   */
  register(
    registerUserDto: RegisterUserCommand,
    profileImage?: Express.Multer.File,
  ) {
    const txnRes = this.usersRepository.register(registerUserDto, profileImage);
    return txnRes;
  }

  /**
   * 사용자 수정 요청을 저장소에 전달합니다.
   * @param userId 수정 대상 사용자 ID
   * @param updateUserInfoDto 수정 DTO
   * @param profileImage 프로필 이미지 파일
   * @returns 수정된 사용자 정보
   */
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

  /**
   * 사용자 삭제 요청을 저장소에 전달합니다.
   * @param userId 삭제 대상 사용자 ID
   * @returns 삭제 완료 결과
   */
  unregister(userId: string) {
    const txnRes = this.usersRepository.unregister(userId);
    return txnRes;
  }
}
