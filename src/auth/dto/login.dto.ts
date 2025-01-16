import { PartialType } from '@nestjs/mapped-types';
import { SignUpDto } from './signup.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { LOGIN_TYPES } from 'src/constants/enums';

export class LoginDto extends PartialType(SignUpDto) {
  @ApiProperty()
  email?: string;

  @ApiProperty()
  password?: string;
}

export class ResponseLoginDto {
  @ApiProperty()
  token: string;
}
