import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBlockDto {
  @IsString()
  targetUserId: string;

  @IsOptional()
  @IsUUID()
  reportId?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
