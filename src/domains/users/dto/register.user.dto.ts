import { IsOptional, IsString } from 'class-validator';

export class RegisterUserDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  nickname!: string;

  @IsOptional()
  @IsString()
  profileImgPath?: string;
}
