import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus } from './entities/report.entity';
import { Block, BlockStatus } from './entities/block.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { ReleaseBlockDto } from './dto/release-block.dto';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
  ) {}

  createReport(input: CreateReportDto) {
    const report = this.reportRepository.create({
      reporterId: input.reporterId,
      targetUserId: input.targetUserId,
      reason: input.reason,
      details: input.details ?? null,
      status: ReportStatus.Pending,
    });
    return this.reportRepository.save(report);
  }

  findReports() {
    return this.reportRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async resolveReport(id: string, input: ResolveReportDto) {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException('report not found');
    }

    report.status = ReportStatus.Resolved;
    report.resolvedBy = input.resolvedBy ?? null;
    report.actionNote = input.actionNote ?? null;
    report.resolvedAt = new Date();
    return this.reportRepository.save(report);
  }

  createBlock(input: CreateBlockDto) {
    const block = this.blockRepository.create({
      targetUserId: input.targetUserId,
      reportId: input.reportId ?? null,
      createdBy: input.createdBy ?? null,
      note: input.note ?? null,
      status: BlockStatus.Active,
    });
    return this.blockRepository.save(block);
  }

  findBlocks() {
    return this.blockRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async releaseBlock(id: string, input: ReleaseBlockDto) {
    const block = await this.blockRepository.findOne({ where: { id } });
    if (!block) {
      throw new NotFoundException('block not found');
    }

    block.status = BlockStatus.Released;
    block.releasedBy = input.releasedBy ?? null;
    block.releaseNote = input.releaseNote ?? null;
    block.releasedAt = new Date();
    return this.blockRepository.save(block);
  }
}
