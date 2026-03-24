/**
 * 사용자 조회, 등록, 수정, 탈퇴 HTTP 요청을 처리하는 컨트롤러입니다.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { RegisterUserDto, UpdateUserDto } from './dto/index.dto';
import { UsersUseCase } from './usecases/users.usecase';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersUseCase: UsersUseCase) {}

  /**
   * 사용자 ID로 사용자 정보를 조회합니다.
   * @param userId 조회 대상 사용자 ID
   * @returns 사용자 정보 또는 null
   */
  @Get(':userId')
  findOne(@Param('userId') userId: string) {
    return this.usersUseCase.findUserInfo(userId);
  }

  /**
   * 인증 사용자 ID를 기준으로 사용자 정보를 생성하거나 초기 프로필을 갱신합니다.
   * @param body 등록 요청 본문
   * @param req 인증 사용자 정보가 담긴 요청 객체
   * @param profileImage 프로필 이미지 파일
   * @returns 저장된 사용자 정보
   */
  @Post('register')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('profileImage', {
      storage: memoryStorage(),
    }),
  )
  register(
    @Body() body: RegisterUserDto,
    @Req() req: Request & { user?: { id?: string } },
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    const userId = this.getAuthenticatedUserId(req);

    const nickname = body.nickname?.trim();
    if (!nickname) {
      throw new BadRequestException('nickname is required.');
    }

    return this.usersUseCase.register(
      {
        userId,
        nickname,
        profileImgPath: body.profileImgPath,
      },
      profileImage,
    );
  }

  /**
   * 특정 사용자 정보를 수정합니다.
   * @param userId 수정 대상 사용자 ID
   * @param updateUserInfoDto 수정 요청 본문
   * @param req 인증 사용자 정보가 담긴 요청 객체
   * @param profileImage 새 프로필 이미지 파일
   * @returns 수정된 사용자 정보
   */
  @Patch(':userId')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('profileImage', {
      storage: memoryStorage(),
    }),
  )
  updateUserInfo(
    @Param('userId') userId: string,
    @Body() updateUserInfoDto: UpdateUserDto,
    @Req() req: Request & { user?: { id?: string } },
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    this.assertCurrentUser(userId, req);
    return this.usersUseCase.update(userId, updateUserInfoDto, profileImage);
  }

  /**
   * 특정 사용자를 삭제합니다.
   * @param userId 삭제 대상 사용자 ID
   * @param req 인증 사용자 정보가 담긴 요청 객체
   * @returns 삭제 완료 결과
   */
  @Delete(':userId')
  @UseGuards(AuthGuard)
  unregister(
    @Param('userId') userId: string,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    this.assertCurrentUser(userId, req);
    return this.usersUseCase.unregister(userId);
  }

  /**
   * 요청 객체에서 인증 사용자 ID를 꺼냅니다.
   * @param req 인증 사용자 정보가 담긴 요청 객체
   * @returns 인증 사용자 ID
   */
  private getAuthenticatedUserId(req: Request & { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid authentication context.');
    }

    return userId;
  }

  /**
   * 현재 인증 사용자와 URL의 사용자 ID가 같은지 확인합니다.
   * @param targetUserId URL 경로의 사용자 ID
   * @param req 인증 사용자 정보가 담긴 요청 객체
   * @returns 본인 확인 결과
   */
  private assertCurrentUser(
    targetUserId: string,
    req: Request & { user?: { id?: string } },
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    if (currentUserId !== targetUserId) {
      throw new ForbiddenException('You can only modify your own account.');
    }
  }
}
