import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateImpactTaskDto, UpdateImpactTaskDto } from './dto';

@Injectable()
export class ImpactTasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateImpactTaskDto) {
    return this.prisma.impactTask.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? 3,
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.impactTask.findMany({ where: { tenantId }, orderBy: { priority: 'asc' } });
  }

  async update(tenantId: string, id: string, dto: UpdateImpactTaskDto) {
    const task = await this.prisma.impactTask.findFirst({ where: { id, tenantId } });
    if (!task) throw new NotFoundException('Impact task not found');
    return this.prisma.impactTask.update({ where: { id: task.id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    const task = await this.prisma.impactTask.findFirst({ where: { id, tenantId } });
    if (!task) throw new NotFoundException('Impact task not found');
    await this.prisma.impactTask.delete({ where: { id: task.id } });
    return { id: task.id, deleted: true };
  }
}
