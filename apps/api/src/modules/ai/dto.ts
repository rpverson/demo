import { IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @IsOptional()
  @IsString()
  callId?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsString()
  message!: string;
}
