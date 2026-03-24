/**
 * 댓글 수정 요청에서 사용하는 입력 DTO 정의입니다.
 */
import { IsString } from 'class-validator';

export class UpdateCommentDto {
  recipeId!: string;
  commentId!: string;
  text!: string;
}

export class UpdateCommentInput {
  @IsString()
  text!: string;
}
