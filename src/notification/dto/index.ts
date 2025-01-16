import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  IsUUID,
} from 'class-validator';

export class Content {
  message: string;
  timestamp: number;
  senderProfileImage: string;
  metadata: object;
}
export class SendNotificationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  recipientId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsObject()
  content: Content;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  pattern: string;
}
