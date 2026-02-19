import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateImpactTaskDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;
}

export class UpdateImpactTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;
}
