import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class AboutDetailsDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  about: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  @IsNumber()
  phone_number: number;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  profile_image: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  @IsOptional()
  portfolio: string[];
}
