import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class RequestUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  sub: string;

  @ApiProperty()
  @IsString()
  role: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  isActive: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  isEmailVerified: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  isAboutComplete: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  isExperienceComplete: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  isAddressComplete: boolean;

  @ApiProperty()
  @IsNotEmpty()
  walletAddress: null | string;

  @ApiProperty()
  @IsNotEmpty()
  About: any;
}
