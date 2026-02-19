import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaService } from '../../common/prisma.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [AiController],
  providers: [AiService, PrismaService],
})
export class AiModule {}
