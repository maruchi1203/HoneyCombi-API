import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { Report } from './entities/report.entity';
import { Block } from './entities/block.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Report, Block])],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
