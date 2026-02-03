import { IsOptional, IsString } from 'class-validator';

export class ResolveReportDto {
  @IsOptional()
  @IsString()
  resolvedBy?: string;

  @IsOptional()
  @IsString()
  actionNote?: string;
}
