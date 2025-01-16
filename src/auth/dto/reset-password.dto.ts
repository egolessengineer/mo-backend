import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  email: string;
}

export class ConfirmResetPassword {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  confirm_password: string;
}

export class ChangePassword {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  old_password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  new_password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  confirm_password: string;
}

export class NewPassordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  otp: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  new_password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  confirm_password: string;
}

export class VerifiyOtpDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  otp: string;
}
