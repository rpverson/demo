import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateFormTemplateDto {
  @IsString()
  name!: string;

  @IsObject()
  schemaJson!: Record<string, unknown>;
}

export class UpdateFormTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  schemaJson?: Record<string, unknown>;
}
