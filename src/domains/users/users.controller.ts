import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RegisterUserDto } from './dto/register.user.dto';
import { UpdateUserDto } from './dto/update-info.user.dto';
import { SaveTokensDto } from './dto/save-tokens.dto';
import { UsersUseCase } from './usecases/users.usecase';

@Controller('users')
export class UsersController {
  constructor(private readonly usersUseCase: UsersUseCase) {}

  @Post()
  register(@Body() createUserDto: RegisterUserDto) {
    return this.usersUseCase.register(createUserDto);
  }

  @Get(':userId')
  findOne(@Param('userId') userId: string) {
    return this.usersUseCase.findUserInfo(userId);
  }

  @Patch(':userId')
  updateUserInfo(
    @Param('userId') userId: string,
    @Body() updateUserInfoDto: UpdateUserDto,
  ) {
    return this.usersUseCase.update(userId, updateUserInfoDto);
  }

  @Delete(':userId')
  unregister(@Param('userId') userId: string) {
    return this.usersUseCase.unregister(userId);
  }

  @Post(':userId/tokens')
  saveTokens(
    @Param('userId') userId: string,
    @Body() saveTokensDto: SaveTokensDto,
  ) {
    return this.usersUseCase.saveTokens(userId, saveTokensDto.refreshToken);
  }
}
