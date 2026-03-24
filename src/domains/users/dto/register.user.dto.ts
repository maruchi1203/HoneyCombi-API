/**
 * 사용자 등록 요청에서 사용하는 입력 DTO 정의입니다.
 */
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

export type RegisterUserCommand = RegisterUserDto & {
  userId: string;
};
