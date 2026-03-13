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
