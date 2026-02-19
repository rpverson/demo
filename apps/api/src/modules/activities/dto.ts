import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  name!: string;

  @IsString()
  region!: string;

  @IsOptional()
  @IsBoolean()
  documented?: boolean;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsBoolean()
  documented?: boolean;
}

export class LinkActivityFormTemplateDto {
  @IsString()
  formTemplateId!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}
