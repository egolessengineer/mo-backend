import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddressDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  street: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  city: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  state: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  postal_code: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  country: string;
}
