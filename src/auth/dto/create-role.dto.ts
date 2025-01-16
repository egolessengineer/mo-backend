import { PartialType } from '@nestjs/mapped-types';
import { SignUpDto } from './signup.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateRoleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}
