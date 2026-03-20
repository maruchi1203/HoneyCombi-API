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

/**
 * 사용자 조회, 등록, 수정, 탈퇴 API를 노출합니다.
 * 인증이 필요한 변경 작업은 현재 로그인한 사용자만 수행할 수 있습니다.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersUseCase: UsersUseCase) {}

  @Get(':userId')
  findOne(@Param('userId') userId: string) {
    return this.usersUseCase.findUserInfo(userId);
  }

  /**
   * 인증된 사용자 ID를 기준으로 회원 정보를 생성하거나 초기 프로필을 갱신합니다.
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
   * 인증 미들웨어가 주입한 사용자 ID를 읽고, 없으면 즉시 401을 반환합니다.
   */
  private getAuthenticatedUserId(req: Request & { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid authentication context.');
    }

    return userId;
  }

  /**
   * URL 파라미터의 대상 사용자와 현재 인증된 사용자가 같은지 검사합니다.
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
