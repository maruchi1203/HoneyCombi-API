import { Injectable } from '@nestjs/common';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { Post } from '../entities/post.entity';
import { PostsRepository } from '../ports/posts.repository';

@Injectable()
export class AwsPostsRepository implements PostsRepository {
  async create(data: CreatePostDto): Promise<Post> {
    return { id: 'aws-post-id', ...data };
  }

  async findAll(): Promise<Post[]> {
    return [];
  }

  async findOne(id: string): Promise<Post | null> {
    return { id, title: 'aws-post', content: 'aws-content', authorId: 'aws-user-id' };
  }

  async update(id: string, data: UpdatePostDto): Promise<Post> {
    return { id, title: data.title ?? 'aws-post', content: data.content ?? 'aws-content', authorId: 'aws-user-id' };
  }

  async remove(_id: string): Promise<void> {
    return;
  }
}
