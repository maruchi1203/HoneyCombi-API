import { CreatePostDto } from '../dto/create.post.dto';
import { UpdatePostDto } from '../dto/update.post.dto';
import { Post } from '../entities/post.entity';

export interface PostsRepository {
  createPost(data: CreatePostDto): Promise<Post>;
  findManyPosts(): Promise<Post[] | null>;
  findOne(id: string): Promise<Post | null>;
  update(id: string, data: UpdatePostDto): Promise<Post>;
  remove(id: string): Promise<void>;
}
