import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { assertRole, getRequestContext } from '../../common/request-context';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, LinkActivityFormTemplateDto, UpdateActivityDto } from './dto';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateActivityDto) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.activitiesService.create(ctx.tenantId, dto);
  }

  @Get()
  list(@Req() req: Request) {
    const ctx = getRequestContext(req.headers);
    return this.activitiesService.list(ctx.tenantId);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateActivityDto) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.activitiesService.update(ctx.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.activitiesService.remove(ctx.tenantId, id);
  }

  @Get(':id/form-templates')
  listFormTemplates(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    return this.activitiesService.listLinkedFormTemplates(ctx.tenantId, id);
  }

  @Post(':id/form-templates')
  linkFormTemplate(@Req() req: Request, @Param('id') id: string, @Body() dto: LinkActivityFormTemplateDto) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.activitiesService.linkFormTemplate(ctx.tenantId, id, dto);
  }

  @Delete(':id/form-templates/:formTemplateId')
  unlinkFormTemplate(@Req() req: Request, @Param('id') id: string, @Param('formTemplateId') formTemplateId: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.activitiesService.unlinkFormTemplate(ctx.tenantId, id, formTemplateId);
  }
}
