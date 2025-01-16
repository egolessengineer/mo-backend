import { ApiProperty } from '@nestjs/swagger';
import { AcceptedStatus } from '@prisma/client';
import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class PurchaserInviteDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(AcceptedStatus)
  status: AcceptedStatus;
}
