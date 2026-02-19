import { Module } from '@nestjs/common';
import { ImpactTasksController } from './impact-tasks.controller';
import { ImpactTasksService } from './impact-tasks.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [ImpactTasksController],
  providers: [ImpactTasksService, PrismaService],
})
export class ImpactTasksModule {}
