import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddWalletDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  wallet_address: string;
}
