import { Module } from '@nestjs/common';
import { FormTemplatesController } from './form-templates.controller';
import { FormTemplatesService } from './form-templates.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [FormTemplatesController],
  providers: [FormTemplatesService, PrismaService],
})
export class FormTemplatesModule {}
