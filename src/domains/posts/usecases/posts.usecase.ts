import { Injectable, Inject } from '@nestjs/common';
import { CreatePostDto } from '../dto/create.post.dto';
import { UpdatePostDto } from '../dto/update.post.dto';
import type { PostsRepository } from '../ports/posts.repository';
import { POSTS_REPOSITORY } from '../posts.tokens';

@Injectable()
export class PostsUseCase {
  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly postsRepository: PostsRepository,
  ) {}

  create(createPostDto: CreatePostDto) {
    return this.postsRepository.createPost(createPostDto);
  }

  findAll() {
    return this.postsRepository.findManyPosts();
  }

  findOne(id: string) {
    return this.postsRepository.findOne(id);
  }

  update(id: string, updatePostDto: UpdatePostDto) {
    return this.postsRepository.update(id, updatePostDto);
  }

  remove(id: string) {
    return this.postsRepository.remove(id);
  }
}
