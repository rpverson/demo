import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CallStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportPdf(tenantId: string, documentId: string) {
    const document = await this.prisma.documentDraft.findFirst({
      where: { id: documentId, tenantId },
      include: { call: true },
    });

    if (!document) throw new NotFoundException('Document not found');

    if (document.call.status !== CallStatus.GENERATED_PHASE_2) {
      throw new BadRequestException('Cannot export until phase 2 is generated');
    }

    const phase1Report = (document.call.phase1GapReport as { blocked?: boolean } | null) || {};
    if (phase1Report.blocked) {
      throw new BadRequestException('Cannot export while phase 1 gaps are unresolved');
    }

    const checksum = createHash('sha256')
      .update(`${document.id}:${document.version}:${document.updatedAt.toISOString()}`)
      .digest('hex');

    const storageKey = `exports/${tenantId}/${document.id}/v${document.version}.pdf`;

    const artifact = await this.prisma.exportArtifact.create({
      data: {
        tenantId,
        documentId: document.id,
        version: document.version,
        format: 'PDF',
        storageKey,
        checksum,
      },
    });

    const pdfBuffer = this.buildSimplePdf(document.markdownSource || '');

    return {
      exportId: artifact.id,
      storageKey: artifact.storageKey,
      checksum: artifact.checksum,
      version: artifact.version,
      generatedAt: artifact.generatedAt,
      fileName: `anteproyecto-v${artifact.version}.pdf`,
      mimeType: 'application/pdf',
      pdfBase64: pdfBuffer.toString('base64'),
    };
  }

  private buildSimplePdf(markdown: string): Buffer {
    const encoding: BufferEncoding = 'latin1';
    const lines = markdown
      .replace(/\r/g, '')
      .replace(/\t/g, '  ')
      .split('\n')
      .filter((line) => line.trim().length > 0);

    const wrapped = this.wrapLines(lines, 92).slice(0, 52);

    const textOps = wrapped
      .map((line, index) => {
        const safe = this.escapePdfText(this.toPdfSafeLatin(line));
        const y = 770 - index * 14;
        return `BT /F1 11 Tf 50 ${y} Td (${safe}) Tj ET`;
      })
      .join('\n');

    const stream = textOps || 'BT /F1 12 Tf 50 760 Td (Documento sin contenido) Tj ET';
    const objects: string[] = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
      `4 0 obj\n<< /Length ${Buffer.byteLength(stream, encoding)} >>\nstream\n${stream}\nendstream\nendobj\n`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];

    for (const obj of objects) {
      offsets.push(Buffer.byteLength(pdf, encoding));
      pdf += obj;
    }

    const xrefOffset = Buffer.byteLength(pdf, encoding);
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i += 1) {
      pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, encoding);
  }

  private escapePdfText(input: string): string {
    return input.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private wrapLines(lines: string[], maxChars: number): string[] {
    const out: string[] = [];
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line) continue;
      if (line.length <= maxChars) {
        out.push(line);
        continue;
      }
      let pending = line;
      while (pending.length > maxChars) {
        const cut = pending.lastIndexOf(' ', maxChars);
        const idx = cut > 24 ? cut : maxChars;
        out.push(pending.slice(0, idx).trimEnd());
        pending = pending.slice(idx).trimStart();
      }
      if (pending.length) out.push(pending);
    }
    return out;
  }

  private toPdfSafeLatin(input: string): string {
    return input
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/\u00a0/g, ' ');
  }
}
