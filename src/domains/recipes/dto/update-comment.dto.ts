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
