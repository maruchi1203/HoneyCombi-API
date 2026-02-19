import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  UseGuards,
  Body,
} from '@nestjs/common';
import type { UpdateUserDto } from './dto/index.dto';
import { UsersUseCase } from './usecases/users.usecase';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersUseCase: UsersUseCase) {}

  @Get(':userId')
  findOne(@Param('userId') userId: string) {
    return this.usersUseCase.findUserInfo(userId);
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
