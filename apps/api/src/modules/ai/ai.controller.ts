import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { getRequestContext } from '../../common/request-context';
import { ChatDto } from './dto';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  chat(@Req() req: Request, @Body() dto: ChatDto) {
    const ctx = getRequestContext(req.headers);
    return this.aiService.chat(ctx.tenantId, ctx.userId, dto);
  }
}
