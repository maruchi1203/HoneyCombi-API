import { Injectable, Inject } from '@nestjs/common';
import type { CommentsPort } from '../ports/comments.port';
import { COMMENT_REPOSITORY } from '../recipe.tokens';
import { CreateCommentDto } from '../dto/index.dto';
import { UpdateCommentDto } from '../dto/index.dto';

/**
 * 댓글 관련 애플리케이션 서비스입니다.
 * 현재는 권한 주체와 요청 데이터를 저장소 계층으로 전달하는 역할에 집중합니다.
 */
@Injectable()
export class CommentUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY)
    private readonly commentRepository: CommentsPort,
  ) {}

  createComment(data: CreateCommentDto) {
    return this.commentRepository.createComment(data);
  }

  findCommentsByUser(authorId: string) {
    return this.commentRepository.findCommentsByUser(authorId);
  }

  findCommentsByRecipe(recipeId: string) {
    return this.commentRepository.findCommentsByRecipe(recipeId);
  }

  updateComment(authorId: string, data: UpdateCommentDto) {
    return this.commentRepository.updateComment(authorId, data);
  }

  deleteComment(authorId: string, recipeId: string, commentId: string) {
    return this.commentRepository.deleteComment(authorId, recipeId, commentId);
  }
}

