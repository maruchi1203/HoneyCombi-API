import { IsOptional, IsString } from 'class-validator';

export class CreateReportDto {
  @IsString()
  reporterId: string;

  @IsString()
  targetUserId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  details?: string;
}
