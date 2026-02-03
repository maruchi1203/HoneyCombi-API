import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { ReleaseBlockDto } from './dto/release-block.dto';

@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('reports')
  createReport(@Body() body: CreateReportDto) {
    return this.moderationService.createReport(body);
  }

  @Get('reports')
  findReports() {
    return this.moderationService.findReports();
  }

  @Post('reports/:reportId/resolve')
  resolveReport(
    @Param('reportId') reportId: string,
    @Body() body: ResolveReportDto,
  ) {
    return this.moderationService.resolveReport(reportId, body);
  }

  @Post('blocks')
  createBlock(@Body() body: CreateBlockDto) {
    return this.moderationService.createBlock(body);
  }

  @Get('blocks')
  findBlocks() {
    return this.moderationService.findBlocks();
  }

  @Post('blocks/:blockId/release')
  releaseBlock(
    @Param('blockId') blockId: string,
    @Body() body: ReleaseBlockDto,
  ) {
    return this.moderationService.releaseBlock(blockId, body);
  }
}
