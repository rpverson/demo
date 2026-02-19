import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ChatDto } from './dto';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
  ) {}

  async chat(tenantId: string, userId: string, dto: ChatDto) {
    let call:
      | {
          id: string;
          title: string;
          extractedText: string | null;
          phase1Requirements: unknown;
        }
      | null = null;

    let doc:
      | {
          id: string;
          markdownSource: string;
        }
      | null = null;

    if (dto.documentId) {
      doc = await this.prisma.documentDraft.findFirst({
        where: { id: dto.documentId, tenantId },
        select: { id: true, markdownSource: true },
      });
      if (!doc) throw new NotFoundException('Document not found for this tenant');
    }

    if (dto.callId) {
      call = await this.prisma.callForProposal.findFirst({
        where: { id: dto.callId, tenantId },
        select: {
          id: true,
          title: true,
          extractedText: true,
          phase1Requirements: true,
        },
      });
      if (!call) throw new NotFoundException('Call not found for this tenant');
    }

    if (!call && doc) {
      const callFromDoc = await this.prisma.callForProposal.findFirst({
        where: {
          tenantId,
          documentDraft: { id: doc.id },
        },
        select: {
          id: true,
          title: true,
          extractedText: true,
          phase1Requirements: true,
        },
      });
      call = callFromDoc;
    }

    const response = await this.llmService.chatAssistant({
      message: dto.message,
      context: {
        callTitle: call?.title,
        callText: call?.extractedText || undefined,
        phase1Requirements: call?.phase1Requirements,
        documentMarkdown: doc?.markdownSource,
      },
    });

    const trace = await this.prisma.aiTrace.create({
      data: {
        tenantId,
        userId,
        callId: call?.id,
        documentId: doc?.id,
        prompt: dto.message,
        response,
      },
    });

    return {
      answer: response,
      traceId: trace.id,
      createdAt: trace.createdAt,
    };
  }
}
