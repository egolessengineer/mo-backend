import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfile {
  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(40)
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  @IsEnum(Gender)
  gender: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(255)
  @MinLength(5)
  @IsString()
  about: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(15)
  @MinLength(10)
  @IsString()
  phone_number: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  profile_image: string;
}
