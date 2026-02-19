import { PrismaClient, SourceType, CallStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant' },
    update: {},
    create: {
      id: 'demo-tenant',
      name: 'Demo Ambiental Org',
    },
  });

  await prisma.user.upsert({
    where: { email: 'demo@ambiental.local' },
    update: {},
    create: {
      id: 'demo-user',
      tenantId: tenant.id,
      email: 'demo@ambiental.local',
      name: 'Demo User',
      role: 'ADMIN',
    },
  });

  await prisma.impactTask.createMany({
    data: [
      {
        tenantId: tenant.id,
        title: 'Restauracion de cobertura vegetal',
        description: 'Reforestacion de zonas criticas con especies nativas.',
        priority: 1,
      },
      {
        tenantId: tenant.id,
        title: 'Monitoreo hidrico comunitario',
        description: 'Seguimiento mensual de calidad de agua en puntos clave.',
        priority: 2,
      },
    ],
    skipDuplicates: true,
  });

  const call = await prisma.callForProposal.upsert({
    where: { id: 'demo-call' },
    update: {},
    create: {
      id: 'demo-call',
      tenantId: tenant.id,
      title: 'Convocatoria piloto de recuperacion ambiental',
      sourceType: SourceType.URL,
      sourceUrl: 'https://example.org/call',
      status: CallStatus.READY_FOR_PHASE_2,
      phase1GapReport: { gaps: [], blocked: false },
    },
  });

  const document = await prisma.documentDraft.upsert({
    where: { callId: call.id },
    update: {},
    create: {
      tenantId: tenant.id,
      callId: call.id,
      title: 'Anteproyecto Demo',
      markdownSource: '# Anteproyecto Demo\n\n## Objetivo\nReducir impacto ambiental local.',
      version: 1,
    },
  });

  console.log({ tenantId: tenant.id, userId: 'demo-user', callId: call.id, documentId: document.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
