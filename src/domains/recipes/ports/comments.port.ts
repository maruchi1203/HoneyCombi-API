/**
 * 댓글 저장소가 제공해야 하는 기능을 정의한 포트 인터페이스입니다.
 */
import { CreateCommentDto } from '../dto/index.dto';
import { UpdateCommentDto } from '../dto/index.dto';
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

