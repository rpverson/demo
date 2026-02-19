import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateActivityDto, LinkActivityFormTemplateDto, UpdateActivityDto } from './dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateActivityDto) {
    return this.prisma.activity.create({
      data: {
        tenantId,
        name: dto.name,
        region: dto.region,
        documented: dto.documented ?? false,
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.activity.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        formLinks: {
          include: {
            formTemplate: {
              select: { id: true, name: true, version: true, isActive: true },
            },
          },
        },
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateActivityDto) {
    const activity = await this.prisma.activity.findFirst({ where: { id, tenantId } });
    if (!activity) throw new NotFoundException('Activity not found');

    return this.prisma.activity.update({ where: { id: activity.id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id, tenantId } });
    if (!activity) throw new NotFoundException('Activity not found');
    await this.prisma.activity.delete({ where: { id: activity.id } });
    return { id: activity.id, deleted: true };
  }

  async listLinkedFormTemplates(tenantId: string, activityId: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id: activityId, tenantId } });
    if (!activity) throw new NotFoundException('Activity not found');

    return this.prisma.activityFormTemplate.findMany({
      where: { tenantId, activityId: activity.id },
      include: {
        formTemplate: {
          select: { id: true, name: true, version: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async linkFormTemplate(tenantId: string, activityId: string, dto: LinkActivityFormTemplateDto) {
    const [activity, template] = await Promise.all([
      this.prisma.activity.findFirst({ where: { id: activityId, tenantId } }),
      this.prisma.formTemplate.findFirst({ where: { id: dto.formTemplateId, tenantId } }),
    ]);
    if (!activity) throw new NotFoundException('Activity not found');
    if (!template) throw new NotFoundException('Form template not found');

    return this.prisma.activityFormTemplate.upsert({
      where: { activityId_formTemplateId: { activityId: activity.id, formTemplateId: template.id } },
      create: {
        tenantId,
        activityId: activity.id,
        formTemplateId: template.id,
        required: dto.required ?? true,
      },
      update: {
        required: dto.required ?? true,
      },
      include: {
        formTemplate: { select: { id: true, name: true, version: true, isActive: true } },
      },
    });
  }

  async unlinkFormTemplate(tenantId: string, activityId: string, formTemplateId: string) {
    const link = await this.prisma.activityFormTemplate.findFirst({
      where: { tenantId, activityId, formTemplateId },
    });
    if (!link) throw new NotFoundException('Link not found');

    await this.prisma.activityFormTemplate.delete({ where: { id: link.id } });
    return { deleted: true, activityId, formTemplateId };
  }
}
