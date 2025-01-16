import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateMoFeeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  commission: string;
}
