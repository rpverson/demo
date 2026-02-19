import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { assertRole, getRequestContext } from '../../common/request-context';
import { ImportCallDto, SubmitCallFormResponseDto, SubmitPublicCallFormResponseDto } from './dto';
import { CallsService } from './calls.service';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  list(@Req() req: Request) {
    const ctx = getRequestContext(req.headers);
    return this.callsService.list(ctx.tenantId);
  }

  @Post('import')
  importCall(@Req() req: Request, @Body() dto: ImportCallDto) {
    const ctx = getRequestContext(req.headers);
    return this.callsService.importCall(ctx.tenantId, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.callsService.remove(ctx.tenantId, id);
  }

  @Post(':id/collab-share')
  createCollabShare(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN', 'USER']);
    return this.callsService.createCollabShare(ctx.tenantId, ctx.userId, id);
  }

  @Get('public/:id/pending-forms')
  getPublicPendingForms(@Param('id') id: string, @Query('token') token: string) {
    return this.callsService.getPublicPendingForms(id, token);
  }

  @Post('public/:id/forms/submit')
  submitPublicForm(@Param('id') id: string, @Body() dto: SubmitPublicCallFormResponseDto) {
    return this.callsService.submitPublicFormResponse(id, dto);
  }

  @Get(':id/status')
  getStatus(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    return this.callsService.getStatus(ctx.tenantId, id);
  }

  @Post(':id/analyze-phase-1')
  analyzePhase1(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.callsService.analyzePhase1(ctx.tenantId, id);
  }

  @Post(':id/analyze-phase-1-llm')
  analyzePhase1Llm(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.callsService.analyzePhase1Llm(ctx.tenantId, id);
  }

  @Get(':id/analysis')
  getAnalysis(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    return this.callsService.getAnalysis(ctx.tenantId, id);
  }

  @Get(':id/gaps')
  getGaps(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    return this.callsService.getGaps(ctx.tenantId, id, ctx.userId);
  }

  @Get(':id/pending-forms')
  getPendingForms(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    return this.callsService.getPendingForms(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/forms/submit')
  submitForm(@Req() req: Request, @Param('id') id: string, @Body() dto: SubmitCallFormResponseDto) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN', 'USER']);
    return this.callsService.submitFormResponse(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/generate-phase-2')
  generatePhase2(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN', 'USER']);
    return this.callsService.generatePhase2(ctx.tenantId, id);
  }

  @Post(':id/recommend-impact-tasks')
  recommendImpactTasks(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.callsService.recommendImpactTasks(ctx.tenantId, id);
  }

  @Post(':id/generate-draft-llm')
  generateDraftLlm(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.callsService.generateDraftLlm(ctx.tenantId, id);
  }

  @Get(':id/draft-quality')
  draftQuality(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    return this.callsService.draftQuality(ctx.tenantId, id);
  }

  @Post(':id/minimum-plan/confirm')
  confirmMinimumPlan(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN']);
    return this.callsService.confirmMinimumPlan(ctx.tenantId, id);
  }

  @Post(':id/auto-process')
  autoProcess(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    assertRole(ctx, ['ADMIN', 'USER']);
    return this.callsService.autoProcess(ctx.tenantId, ctx.userId, id);
  }
}
