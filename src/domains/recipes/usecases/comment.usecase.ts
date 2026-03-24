/**
 * 댓글 관련 요청을 저장소 포트로 위임하는 유스케이스 계층입니다.
 */
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

  /**
   * 댓글 생성 요청을 저장소에 전달합니다.
   * @param data 댓글 생성 DTO
   * @returns 생성된 댓글 정보
   */
  createComment(data: CreateCommentDto) {
    return this.commentRepository.createComment(data);
  }

  /**
   * 특정 사용자가 작성한 댓글 목록을 조회합니다.
   * @param authorId 댓글 작성자 ID
   * @returns 댓글 배열
   */
  findCommentsByUser(authorId: string) {
    return this.commentRepository.findCommentsByUser(authorId);
  }

  /**
   * 특정 레시피에 달린 댓글 목록을 조회합니다.
   * @param recipeId 조회 대상 레시피 ID
   * @returns 댓글 배열
   */
  findCommentsByRecipe(recipeId: string) {
    return this.commentRepository.findCommentsByRecipe(recipeId);
  }

  /**
   * 댓글 수정 요청을 저장소에 전달합니다.
   * @param authorId 현재 인증 사용자 ID
   * @param data 댓글 수정 DTO
   * @returns 수정된 댓글 정보
   */
  updateComment(authorId: string, data: UpdateCommentDto) {
    return this.commentRepository.updateComment(authorId, data);
  }

  /**
   * 댓글 삭제 요청을 저장소에 전달합니다.
   * @param authorId 현재 인증 사용자 ID
   * @param recipeId 댓글이 속한 레시피 ID
   * @param commentId 삭제 대상 댓글 ID
   * @returns 삭제 완료 결과
   */
  deleteComment(authorId: string, recipeId: string, commentId: string) {
    return this.commentRepository.deleteComment(authorId, recipeId, commentId);
  }
}

