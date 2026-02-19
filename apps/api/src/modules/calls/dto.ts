import { IsIn, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

const allowedSourceTypes = ['URL', 'PDF', 'DOCX', 'MD'] as const;
type AllowedSourceType = (typeof allowedSourceTypes)[number];

export class ImportCallDto {
  @IsString()
  title!: string;

  @IsIn(allowedSourceTypes)
  sourceType!: AllowedSourceType;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  sourceStorageKey?: string;

  @IsOptional()
  @IsString()
  markdownContent?: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class SubmitCallFormResponseDto {
  @IsString()
  activityId!: string;

  @IsString()
  formTemplateId!: string;

  @IsObject()
  response!: Record<string, unknown>;
}

export class SubmitPublicCallFormResponseDto {
  @IsString()
  token!: string;

  @IsString()
  activityId!: string;

  @IsString()
  formTemplateId!: string;

  @IsObject()
  response!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  assistantName?: string;
}
