import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './common/prisma.service';
import { CallsModule } from './modules/calls/calls.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ExportsModule } from './modules/exports/exports.module';
import { AiModule } from './modules/ai/ai.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ImpactTasksModule } from './modules/impact-tasks/impact-tasks.module';
import { FormTemplatesModule } from './modules/form-templates/form-templates.module';
import { LlmModule } from './modules/llm/llm.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CallsModule,
    DocumentsModule,
    ExportsModule,
    AiModule,
    LlmModule,
    ActivitiesModule,
    ImpactTasksModule,
    FormTemplatesModule,
    AuthModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
