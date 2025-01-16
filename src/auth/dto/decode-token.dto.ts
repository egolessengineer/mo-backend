import { ApiProperty } from '@nestjs/swagger';
import { TokenType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsString } from 'class-validator';

export class DecodeTokenDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(TokenType)
  type: TokenType;
}
