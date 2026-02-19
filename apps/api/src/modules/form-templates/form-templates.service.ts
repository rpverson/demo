import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateFormTemplateDto, UpdateFormTemplateDto } from './dto';

@Injectable()
export class FormTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateFormTemplateDto) {
    return this.prisma.formTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        schemaJson: dto.schemaJson as Prisma.InputJsonValue,
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.formTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async update(tenantId: string, id: string, dto: UpdateFormTemplateDto) {
    const template = await this.prisma.formTemplate.findFirst({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('Template not found');

    return this.prisma.formTemplate.update({
      where: { id: template.id },
      data: {
        name: dto.name,
        schemaJson: dto.schemaJson as Prisma.InputJsonValue | undefined,
        version: { increment: 1 },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const template = await this.prisma.formTemplate.findFirst({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('Template not found');
    await this.prisma.formTemplate.delete({ where: { id: template.id } });
    return { id: template.id, deleted: true };
  }
}
