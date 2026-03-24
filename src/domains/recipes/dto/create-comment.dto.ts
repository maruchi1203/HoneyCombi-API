/**
 * 댓글 생성 요청에서 사용하는 입력 DTO 정의입니다.
 */
import { IsString } from 'class-validator';

export class CreateCommentDto {
  recipeId!: string;
  authorId!: string;
  text!: string;
}

export class CreateCommentInput {
  @IsString()
  text!: string;
}
