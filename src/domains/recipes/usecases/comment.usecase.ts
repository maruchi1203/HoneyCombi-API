import { Injectable, Inject } from '@nestjs/common';
import type { CommentsPort } from '../ports/comments.port';
import { COMMENT_REPOSITORY } from '../recipe.tokens';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';

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
