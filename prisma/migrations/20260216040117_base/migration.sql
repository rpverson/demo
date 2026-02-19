-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('URL', 'PDF', 'DOCX');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('IMPORTED', 'ANALYZED_PHASE_1', 'GAP_PENDING', 'READY_FOR_PHASE_2', 'GENERATED_PHASE_2');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "schemaJson" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "documented" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "evidence" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImpactTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallForProposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "sourceStorageKey" TEXT,
    "extractedText" TEXT,
    "status" "CallStatus" NOT NULL DEFAULT 'IMPORTED',
    "phase1Requirements" JSONB,
    "phase1GapReport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallForProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentDraft" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "markdownSource" TEXT NOT NULL,
    "astSnapshot" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lockOwner" TEXT,
    "lockExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChangeSet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "accepted" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChangeSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportArtifact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTrace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "callId" TEXT,
    "documentId" TEXT,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTrace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentDraft_callId_key" ON "DocumentDraft"("callId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDraft" ADD CONSTRAINT "DocumentDraft_callId_fkey" FOREIGN KEY ("callId") REFERENCES "CallForProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChangeSet" ADD CONSTRAINT "DocumentChangeSet_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportArtifact" ADD CONSTRAINT "ExportArtifact_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
