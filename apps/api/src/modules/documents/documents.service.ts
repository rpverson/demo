import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { AcceptChangeDto, CreateCommentDto, UpdateDocumentContentDto } from './dto';

const DEFAULT_LOCK_TTL_MINUTES = 30;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDocument(tenantId: string, documentId: string) {
    const document = await this.prisma.documentDraft.findFirst({
      where: { id: documentId, tenantId },
      include: {
        comments: { orderBy: { createdAt: 'desc' }, take: 50 },
        changes: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });

    if (!document) throw new NotFoundException('Document not found');

    return document;
  }

  async updateContent(tenantId: string, userId: string, documentId: string, dto: UpdateDocumentContentDto) {
    const document = await this.prisma.documentDraft.findFirst({ where: { id: documentId, tenantId } });
    if (!document) throw new NotFoundException('Document not found');

    this.assertLock(document.lockOwner, document.lockExpiresAt, userId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.documentDraft.update({
        where: { id: document.id },
        data: {
          markdownSource: dto.markdownSource,
          astSnapshot: dto.astSnapshot as Prisma.InputJsonValue | undefined,
          version: { increment: 1 },
        },
      });

      await tx.documentChangeSet.create({
        data: {
          tenantId,
          documentId,
          authorId: userId,
          changeType: 'CONTENT_UPDATE',
          payload: {
            version: updated.version,
            appliedAt: new Date().toISOString(),
          },
        },
      });

      return updated;
    });
  }

  async lockDocument(tenantId: string, userId: string, documentId: string) {
    const lockTtl = Number(process.env.LOCK_TTL_MINUTES || DEFAULT_LOCK_TTL_MINUTES);
    const lockUntil = new Date(Date.now() + lockTtl * 60 * 1000);

    const document = await this.prisma.documentDraft.findFirst({ where: { id: documentId, tenantId } });
    if (!document) throw new NotFoundException('Document not found');

    const hasActiveLock =
      document.lockOwner && document.lockExpiresAt && new Date(document.lockExpiresAt).getTime() > Date.now();

    if (hasActiveLock && document.lockOwner !== userId) {
      throw new ForbiddenException('Document already locked by another user');
    }

    return this.prisma.documentDraft.update({
      where: { id: document.id },
      data: {
        lockOwner: userId,
        lockExpiresAt: lockUntil,
      },
    });
  }

  async unlockDocument(tenantId: string, userId: string, documentId: string) {
    const document = await this.prisma.documentDraft.findFirst({ where: { id: documentId, tenantId } });
    if (!document) throw new NotFoundException('Document not found');

    if (document.lockOwner && document.lockOwner !== userId) {
      throw new ForbiddenException('Only lock owner can unlock this document');
    }

    return this.prisma.documentDraft.update({
      where: { id: document.id },
      data: {
        lockOwner: null,
        lockExpiresAt: null,
      },
    });
  }

  async createComment(tenantId: string, userId: string, documentId: string, dto: CreateCommentDto) {
    const document = await this.prisma.documentDraft.findFirst({ where: { id: documentId, tenantId } });
    if (!document) throw new NotFoundException('Document not found');

    return this.prisma.documentComment.create({
      data: {
        tenantId,
        documentId,
        authorId: userId,
        body: dto.body,
      },
    });
  }

  async acceptChange(tenantId: string, userId: string, documentId: string, dto: AcceptChangeDto) {
    const document = await this.prisma.documentDraft.findFirst({ where: { id: documentId, tenantId } });
    if (!document) throw new NotFoundException('Document not found');

    const change = await this.prisma.documentChangeSet.findFirst({
      where: { id: dto.changeSetId, documentId, tenantId },
    });

    if (!change) throw new NotFoundException('Change set not found');

    return this.prisma.documentChangeSet.update({
      where: { id: change.id },
      data: {
        accepted: true,
        payload: {
          ...(change.payload as Record<string, unknown>),
          acceptedBy: userId,
          acceptedAt: new Date().toISOString(),
          appliedOperations: dto.appliedOperations || [],
        } as Prisma.InputJsonValue,
      },
    });
  }

  private assertLock(lockOwner: string | null, lockExpiresAt: Date | null, userId: string) {
    const active = lockOwner && lockExpiresAt && new Date(lockExpiresAt).getTime() > Date.now();

    if (!active) {
      throw new BadRequestException('Document is not locked. Acquire lock before editing.');
    }

    if (lockOwner !== userId) {
      throw new ForbiddenException('Document is locked by another user.');
    }
  }
}
