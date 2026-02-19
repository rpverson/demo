-- CreateTable
CREATE TABLE "ActivityFormTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "formTemplateId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityFormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityFormTemplate_tenantId_activityId_idx" ON "ActivityFormTemplate"("tenantId", "activityId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityFormTemplate_activityId_formTemplateId_key" ON "ActivityFormTemplate"("activityId", "formTemplateId");

-- AddForeignKey
ALTER TABLE "ActivityFormTemplate" ADD CONSTRAINT "ActivityFormTemplate_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityFormTemplate" ADD CONSTRAINT "ActivityFormTemplate_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
