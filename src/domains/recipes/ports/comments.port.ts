import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { Comment } from '../entities/comment.entity';

export interface CommentsPort {
  createComment(data: CreateCommentDto): Promise<Comment>;
  findCommentsByUser(authorId: string): Promise<Comment[] | null>;
  findCommentsByRecipe(recipeId: string): Promise<Comment[] | null>;
  updateComment(authorId: string, data: UpdateCommentDto): Promise<Comment>;
  deleteComment(
    authorId: string,
    recipeId: string,
    commentId: string,
  ): Promise<void>;
}
