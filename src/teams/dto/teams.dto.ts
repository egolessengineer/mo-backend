import { ApiProperty } from '@nestjs/swagger';
import { DisputeNature, Prisma } from '@prisma/client';
import {
  ValidateIf,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsString,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export enum TeamAction {
  BOOKMARKED,
  REMOVE_BOOKMARKED,
  ADD_MEMBER,
  REMOVE_MEMBER,
}
export class CreateTeamDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  members: string[];
}

export class updateTeamDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  usersId: string[];

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(3)
  @IsEnum(TeamAction)
  action: TeamAction;
}

export class getAllTeamDto {
  @ApiProperty()
  @IsEnum(Prisma.SortOrder)
  @IsOptional()
  @IsNotEmpty()
  sortBy: Prisma.SortOrder;
}
