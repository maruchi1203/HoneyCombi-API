import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { Post } from '../entities/post.entity';

export interface PostsRepository {
  create(data: CreatePostDto): Promise<Post>;
  findAll(): Promise<Post[]>;
  findOne(id: string): Promise<Post | null>;
  update(id: string, data: UpdatePostDto): Promise<Post>;
  remove(id: string): Promise<void>;
}
