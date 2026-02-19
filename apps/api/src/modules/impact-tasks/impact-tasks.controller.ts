import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { assertRole, getRequestContext } from '../../common/request-context';
import { CreateImpactTaskDto, UpdateImpactTaskDto } from './dto';
import { ImpactTasksService } from './impact-tasks.service';

@Controller('impact-tasks')
export class ImpactTasksController {
  constructor(private readonly impactTasksService: ImpactTasksService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateImpactTaskDto) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.impactTasksService.create(ctx.tenantId, dto);
  }

  @Get()
  list(@Req() req: Request) {
    const ctx = getRequestContext(req.headers);
    return this.impactTasksService.list(ctx.tenantId);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateImpactTaskDto) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.impactTasksService.update(ctx.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.impactTasksService.remove(ctx.tenantId, id);
  }
}
