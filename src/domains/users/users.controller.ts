import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersUseCase } from './usecases/users.usecase';

@Controller('users')
export class UsersController {
  constructor(private readonly usersUseCase: UsersUseCase) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersUseCase.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersUseCase.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersUseCase.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersUseCase.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersUseCase.remove(id);
  }
}
