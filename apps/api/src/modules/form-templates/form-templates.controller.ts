import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { assertRole, getRequestContext } from '../../common/request-context';
import { CreateFormTemplateDto, UpdateFormTemplateDto } from './dto';
import { FormTemplatesService } from './form-templates.service';

@Controller('form-templates')
export class FormTemplatesController {
  constructor(private readonly formTemplatesService: FormTemplatesService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateFormTemplateDto) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.formTemplatesService.create(ctx.tenantId, dto);
  }

  @Get()
  list(@Req() req: Request) {
    const ctx = getRequestContext(req.headers);
    return this.formTemplatesService.list(ctx.tenantId);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateFormTemplateDto) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.formTemplatesService.update(ctx.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.formTemplatesService.remove(ctx.tenantId, id);
  }
}
