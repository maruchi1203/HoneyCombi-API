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
import type { RegisterUserDto, UpdateUserDto } from './dto/index.dto';
import { UsersUseCase } from './usecases/users.usecase';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersUseCase: UsersUseCase) {}

  @Get(':userId')
  findOne(@Param('userId') userId: string) {
    return this.usersUseCase.findUserInfo(userId);
  }

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
      userId,
      {
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

  private getAuthenticatedUserId(req: Request & { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid authentication context.');
    }

    return userId;
  }

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
