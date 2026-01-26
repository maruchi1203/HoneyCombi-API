import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create.post.dto';
import { UpdatePostDto } from './dto/update.post.dto';
import { PostsUseCase } from './usecases/posts.usecase';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsUseCase: PostsUseCase) {}

  @Post()
  create(@Body() createPostDto: CreatePostDto) {
    return this.postsUseCase.create(createPostDto);
  }

  @Get()
  findAll() {
    return this.postsUseCase.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsUseCase.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postsUseCase.update(id, updatePostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postsUseCase.remove(id);
  }
}
