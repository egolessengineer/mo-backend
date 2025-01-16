import { ApiProperty } from '@nestjs/swagger';
import { DisputeNature, Prisma, ResolutionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DISPUTE_STATUS } from 'src/constants/enums';
import { UploadDocDto } from 'src/project/dto';

export class PostDisputeDto {
  @ApiProperty()
  @ValidateIf((o) => !o.milestoneId)
  @IsNotEmpty()
  @IsUUID()
  projectId: string;

  @ApiProperty()
  @ValidateIf((o) => !o.projectId)
  @IsNotEmpty()
  @IsUUID()
  milestoneId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(DisputeNature)
  disputeNature: DisputeNature;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  raisedBy: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  raisedTo: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  disputeDescription: string;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadDocDto)
  evidenceDocLink: UploadDocDto[];

  @ApiProperty()
  @IsOptional()
  @IsString()
  disputeComment: string;
}

enum BooleanValue {
  true = 'true',
  false = 'false',
}
export class PatchDisputeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @ValidateIf((o) => !o.isAgree && !o.closed && !o.legalWay)
  @IsNotEmpty()
  @IsEnum(ResolutionType)
  resolutionType: ResolutionType;

  @ApiProperty()
  @ValidateIf((o) => o.resolutionType === ResolutionType.WRITTEN)
  @IsNotEmpty()
  @IsUUID()
  inFavourOf: string;

  @ApiProperty()
  @ValidateIf((o) => o.resolutionType === ResolutionType.WRITTEN)
  @IsNotEmpty()
  @IsString()
  resolutionDescription: string;

  @ApiProperty()
  @ValidateIf((o) => o.resolutionType === ResolutionType.WRITTEN)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadDocDto)
  resolutionDocLink: UploadDocDto[];

  @ApiProperty()
  @ValidateIf((o) => o.resolutionType === ResolutionType.WRITTEN)
  @IsOptional()
  @IsString()
  resolutionComment: string;

  @ApiProperty()
  @ValidateIf((o) => !o.resolutionType && !o.closed)
  @IsOptional()
  @IsEnum(BooleanValue)
  isAgree: BooleanValue;

  @ApiProperty()
  @ValidateIf((o) => !o.resolutionType && !o.isAgree)
  @IsOptional()
  @IsEnum(BooleanValue)
  closed: BooleanValue;

  @ApiProperty()
  @ValidateIf((o) => !o.resolutionType && !o.isAgree && o.closed)
  @IsString()
  closedComment: string;

  @ApiProperty()
  @ValidateIf((o) => !o.resolutionType && !o.isAgree && !o.closed)
  @IsEnum(BooleanValue)
  legalWay: BooleanValue;
}

export class GetDisputesDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsOptional()
  @IsEnum(DISPUTE_STATUS)
  status: DISPUTE_STATUS;

  @ApiProperty()
  @IsEnum(Prisma.SortOrder)
  @IsOptional()
  @IsNotEmpty()
  sortBy: Prisma.SortOrder;
}
export class GetDisputeDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  id: string;
}

export class createManyFAQS {
  @ApiProperty()
  @IsArray()
  @Type(() => createFAQS)
  @ValidateNested({ each: true })
  faqs: createFAQS[];
}

export class createFAQS {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  answer: string;
}
