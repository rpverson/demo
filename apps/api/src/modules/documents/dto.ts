import { IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDocumentContentDto {
  @IsString()
  markdownSource!: string;

  @IsOptional()
  @IsObject()
  astSnapshot?: Record<string, unknown>;
}

export class CreateCommentDto {
  @IsString()
  @MaxLength(2000)
  body!: string;
}

export class AcceptChangeDto {
  @IsString()
  changeSetId!: string;

  @IsOptional()
  @IsArray()
  appliedOperations?: unknown[];
}
