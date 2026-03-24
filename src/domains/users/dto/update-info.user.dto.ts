/**
 * 사용자 정보 수정 요청에서 사용하는 입력 DTO 정의입니다.
 */
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  profileImgPath?: string;
}
