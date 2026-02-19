import { Controller, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { getRequestContext } from '../../common/request-context';
import { ExportsService } from './exports.service';

@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post(':documentId/pdf')
  exportPdf(@Req() req: Request, @Param('documentId') documentId: string) {
    const ctx = getRequestContext(req.headers);
    return this.exportsService.exportPdf(ctx.tenantId, documentId);
  }
}
