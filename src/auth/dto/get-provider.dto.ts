import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class GetProviderDetailsDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  id: string;
}
