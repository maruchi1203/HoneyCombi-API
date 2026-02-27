import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  UseGuards,
  Body,
  Post,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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
  register(
    @Body() body: RegisterUserDto,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid authentication context.');
    }

    const nickname = body.nickname?.trim();
    if (!nickname) {
      throw new BadRequestException('nickname is required.');
    }

    return this.usersUseCase.register(userId, {
      nickname,
      profileImgPath: body.profileImgPath,
    });
  }

  @Patch(':userId')
  @UseGuards(AuthGuard)
  updateUserInfo(
    @Param('userId') userId: string,
    @Body() updateUserInfoDto: UpdateUserDto,
  ) {
    return this.usersUseCase.update(userId, updateUserInfoDto);
  }

  @Delete(':userId')
  @UseGuards(AuthGuard)
  unregister(@Param('userId') userId: string) {
    return this.usersUseCase.unregister(userId);
  }
}
