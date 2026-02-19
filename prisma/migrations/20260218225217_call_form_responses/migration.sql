-- CreateTable
CREATE TABLE "CallActivityFormResponse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "formTemplateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responseJson" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallActivityFormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallActivityFormResponse_tenantId_callId_idx" ON "CallActivityFormResponse"("tenantId", "callId");

-- CreateIndex
CREATE UNIQUE INDEX "CallActivityFormResponse_callId_activityId_formTemplateId_u_key" ON "CallActivityFormResponse"("callId", "activityId", "formTemplateId", "userId");

-- AddForeignKey
ALTER TABLE "CallActivityFormResponse" ADD CONSTRAINT "CallActivityFormResponse_callId_fkey" FOREIGN KEY ("callId") REFERENCES "CallForProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallActivityFormResponse" ADD CONSTRAINT "CallActivityFormResponse_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallActivityFormResponse" ADD CONSTRAINT "CallActivityFormResponse_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
