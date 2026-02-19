import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { Request } from 'express';
import { getRequestContext } from '../../common/request-context';
import { AcceptChangeDto, CreateCommentDto, UpdateDocumentContentDto } from './dto';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id')
  getDocument(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    return this.documentsService.getDocument(ctx.tenantId, id);
  }

  @Put(':id/content')
  updateContent(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateDocumentContentDto) {
    const ctx = getRequestContext(req.headers);
    return this.documentsService.updateContent(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/lock')
  lockDocument(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    return this.documentsService.lockDocument(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/unlock')
  unlockDocument(@Req() req: Request, @Param('id') id: string) {
    const ctx = getRequestContext(req.headers);
    return this.documentsService.unlockDocument(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/comments')
  createComment(@Req() req: Request, @Param('id') id: string, @Body() dto: CreateCommentDto) {
    const ctx = getRequestContext(req.headers);
    return this.documentsService.createComment(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/review/accept-change')
  acceptChange(@Req() req: Request, @Param('id') id: string, @Body() dto: AcceptChangeDto) {
    const ctx = getRequestContext(req.headers);
    return this.documentsService.acceptChange(ctx.tenantId, ctx.userId, id, dto);
  }
}
