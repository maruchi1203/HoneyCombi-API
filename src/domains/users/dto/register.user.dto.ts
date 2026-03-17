import { IsOptional, IsString } from 'class-validator';

export class RegisterUserDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  nickname!: string;

  @IsOptional()
  @IsString()
  profileImgPath?: string;
}
