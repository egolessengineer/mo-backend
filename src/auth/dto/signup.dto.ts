import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsLowercase, IsNotEmpty, IsOptional } from 'class-validator';
import { MESSAGES } from 'src/constants';

export class SignUpDto {
  @ApiProperty()
  @IsEmail({}, { message: MESSAGES.ERROR.INVALID_EMAIL })
  @IsNotEmpty()
  @IsLowercase()
  email: string;

  @ApiProperty()
  @IsOptional()
  name: string;

  @ApiProperty()
  @IsOptional()
  password: string;

  @ApiProperty()
  @IsOptional()
  confirm_password: string;
}

export class ResponseSignUpDto {
  @ApiProperty()
  message: string;
}
