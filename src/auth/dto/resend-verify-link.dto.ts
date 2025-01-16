import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { MESSAGES } from 'src/constants';

export class ResendVerifyEmailDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail({}, { message: MESSAGES.ERROR.INVALID_EMAIL })
  email: string;
}
