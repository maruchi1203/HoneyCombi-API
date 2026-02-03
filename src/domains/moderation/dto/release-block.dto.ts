import { IsOptional, IsString } from 'class-validator';

export class ReleaseBlockDto {
  @IsOptional()
  @IsString()
  releasedBy?: string;

  @IsOptional()
  @IsString()
  releaseNote?: string;
}
