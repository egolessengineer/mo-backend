import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsArray,
  IsBoolean,
  IsDate,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
  isNotEmpty,
} from 'class-validator';
import {
  FILTER_BY,
  FILTER_PROJECTS_BY,
  SAVE_TYPE,
  TRANSACTION_EVENTS,
} from 'src/constants/enums';
import {
  Category,
  DurationType,
  Prisma,
  ProjectCurrency,
  RoyaltyType,
  documentType,
  MilestoneStatus,
  FundTransferType,
  milestoneType,
  PenaltyDurationType,
  ProjectState,
  ProjectStatus,
  Role,
  DraftType,
  TransactionsType,
  FundingType,
  EndPointType,
  AmountType,
  PenaltyType,
} from '@prisma/client';
import { Type, TypeHelpOptions } from 'class-transformer';
import { CONSTANT } from 'src/constants';

export class ProjectDetailsDTO {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsEnum(Category)
  category: Category;

  @ApiProperty()
  @IsEnum(ProjectCurrency)
  currency: ProjectCurrency;

  @ApiProperty()
  @IsNumber()
  duration: number;

  @ApiProperty()
  @IsEnum(DurationType)
  durationType: DurationType;

  @ApiProperty()
  @IsString()
  totalProjectFund: string;

  // @ApiProperty()
  // @IsEnum(RoyaltyType)
  // @Equals(RoyaltyType.POST_KPI_ROYALTY)
  // royaltyType: RoyaltyType;

  @ApiProperty()
  @IsNumber()
  postKpiRoyalty: number;

  @ApiProperty()
  @IsString()
  scope: string;

  @ApiProperty()
  @IsString()
  deliverables: string;
}

export enum referedTo {}

enum DocumentType {
  RESEARCH,
  TermAndCondition,
}
export class DocLinksDto {
  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  url: string[];

  @ApiProperty()
  @IsEnum(DocumentType)
  @IsNotEmpty()
  type: DocumentType;
}

export class DocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  requirements: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  termsAndConditions: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocLinksDto)
  documentLinks: DocLinksDto[];
}

export class DocumentWithRemarksDto extends DocumentDto {
  @ApiProperty()
  @IsString()
  @ValidateIf((o) => {
    return (
      o.type === SAVE_TYPE.COMPLETE &&
      o.role === Role.PROVIDER &&
      (o.projectState === ProjectState.NEW_PROJECT ||
        o.projectState === ProjectState.ADD_MILESTONES)
    );
  })
  remark: string;
}

export class DeleteFileDto {
  @ApiProperty()
  @IsString()
  url: string;
}

export class GetAllProjectsDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(FILTER_PROJECTS_BY)
  filterBy: FILTER_PROJECTS_BY;

  @ApiProperty()
  @IsEnum(Prisma.SortOrder)
  @IsOptional()
  @IsNotEmpty()
  sortBy: Prisma.SortOrder;
}
export class getProjectDto {
  @ApiProperty()
  @IsString()
  projectId: string;
}

export class GetCollabsDto {
  @ApiProperty()
  @IsEnum(Prisma.SortOrder)
  @IsOptional()
  @IsNotEmpty()
  sortBy: Prisma.SortOrder;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  pageNo: string;

  @ApiProperty()
  @IsOptional()
  @IsNotEmpty()
  pageSize: string;
}
export class GetProviderDto {
  @ApiProperty()
  @IsString()
  search: string;

  @ApiProperty()
  @IsEnum(Prisma.SortOrder)
  @IsOptional()
  @IsNotEmpty()
  sortBy: Prisma.SortOrder;

  @ApiProperty()
  @IsString()
  @IsOptional()
  pageNo: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  pageSize: string;

  @ApiProperty()
  @IsEnum(FILTER_BY)
  @IsOptional()
  filterBy: FILTER_BY;
}
export class SearchProjectDto {
  @ApiProperty()
  @IsString()
  search: string;

  @ApiProperty()
  @IsEnum(Prisma.SortOrder)
  @IsOptional()
  @IsNotEmpty()
  sortBy: Prisma.SortOrder;

  @ApiProperty()
  @IsString()
  @IsOptional()
  pageNo: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  pageSize: string;

  @ApiProperty()
  @IsEnum(FILTER_BY)
  @IsOptional()
  filterBy: FILTER_BY;
}
export class PenalityBreachDto {
  @ApiProperty()
  @IsUUID()
  @IsOptional()
  id: number;

  @ApiProperty()
  @IsNumber()
  pentality: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  timeperiod: number;

  @ApiProperty()
  @IsEnum(PenaltyType)
  @IsOptional()
  penalityType: PenaltyType;

  @ApiProperty()
  @IsEnum(AmountType)
  @IsOptional()
  valueIn: AmountType;

  @ApiProperty()
  @IsEnum(PenaltyDurationType)
  @IsNotEmpty()
  pentalityDuration: PenaltyDurationType;
}

export class MilestoneDTO {
  @ApiProperty()
  @IsUUID()
  @IsOptional()
  id: string;

  @ApiProperty()
  @IsString()
  @ValidateIf((o) => !o.id || o.milestoneType === milestoneType.submilestone)
  title: string;

  @ApiProperty()
  @IsString()
  @ValidateIf((o) => !o.id || o.milestoneType === milestoneType.submilestone)
  description: string;

  @ApiProperty()
  @IsString()
  @ValidateIf((o) => !o.id || o.milestoneType === milestoneType.submilestone)
  requirements: string;

  @ApiProperty()
  @IsNumber()
  @ValidateIf((o) => o.id || o.milestoneType === milestoneType.submilestone)
  endPoint: number;

  @ApiProperty()
  @IsEnum(EndPointType)
  @ValidateIf((o) => o.id || o.milestoneType === milestoneType.submilestone)
  endPointType: EndPointType;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(CONSTANT.MAX_UNIX)
  @ValidateIf((o) => o.id || o.milestoneType === milestoneType.submilestone)
  startDate: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(CONSTANT.MAX_UNIX)
  @ValidateIf((o) => o.id || o.milestoneType === milestoneType.submilestone)
  endDate: number;

  @ApiProperty()
  @IsNumber()
  @ValidateIf((o) => o.id || o.milestoneType === milestoneType.submilestone)
  fundAllocation: number;

  @ApiProperty()
  @IsNumber()
  @ValidateIf((o) => o.id || o.milestoneType === milestoneType.submilestone)
  revisions: number;

  @ApiProperty()
  @IsString()
  @ValidateIf((o) => o.id || o.milestoneType === milestoneType.submilestone)
  acceptanceCriteria: string;

  @ApiProperty()
  @IsBoolean()
  @ValidateIf((o) => o.id || o.milestoneType === milestoneType.submilestone)
  isPenaltyExcluded: boolean;

  @ApiProperty()
  @IsEnum(MilestoneStatus)
  @IsOptional()
  @ValidateIf((o) => o.id)
  milestoneStatus: MilestoneStatus;

  @ApiProperty()
  @ValidateIf((o) => o.milestoneType === milestoneType.submilestone)
  @IsNumber()
  @Min(1)
  @Max(CONSTANT.MAX_UNIX)
  dateAssigned: number;

  @ApiProperty()
  @IsString()
  @IsUUID(null, { message: 'Please assign IP' })
  @ValidateIf((o) => o.dateAssigned)
  AssignedTo: string;

  @ApiProperty()
  @IsEnum(milestoneType)
  @ValidateIf((o) => o.id || o.milestoneType === milestoneType.submilestone)
  milestoneType: milestoneType;

  @ApiProperty()
  @IsEnum(RoyaltyType)
  @ValidateIf((o) => o.id)
  royaltyType: RoyaltyType;

  @ApiProperty()
  @IsEnum(AmountType)
  @IsOptional()
  royaltyValueIn: AmountType;

  @ApiProperty()
  @IsNumber()
  @ValidateIf((o) => o.id)
  royaltyAmount: number;

  @ApiProperty()
  @IsUUID()
  @ValidateIf((o) => o.milestoneType === milestoneType.submilestone)
  milestoneId: string;

  @ApiProperty({ type: [PenalityBreachDto] })
  @IsOptional()
  @Type(() => PenalityBreachDto)
  @ValidateIf(
    (o) =>
      (o.id && !o.isPenaltyExcluded) ||
      (o.milestoneType === milestoneType.submilestone && !o.isPenaltyExcluded),
  )
  @ValidateNested({ each: true })
  penalityBreach: PenalityBreachDto[];
}

export class createProjectDTO {
  @ApiProperty()
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty()
  @IsEnum(SAVE_TYPE)
  @IsNotEmpty()
  type?: SAVE_TYPE;

  @ApiProperty()
  @IsString()
  role: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  projectState: string;

  @ApiProperty()
  @ValidateIf((o) => o.type === SAVE_TYPE.COMPLETE)
  @IsString()
  @IsEnum(FundingType)
  assignedFundTo: FundingType;

  @ApiProperty()
  @ValidateIf((o) => o.type === SAVE_TYPE.COMPLETE)
  @IsOptional()
  @IsEnum(FundTransferType)
  fundTransferType: FundTransferType;

  @ApiProperty({ type: ProjectDetailsDTO })
  @Type((data: TypeHelpOptions) => {
    switch (data.object.type) {
      case SAVE_TYPE.COMPLETE:
        return ProjectDetailsDTO;
    }
  })
  @ValidateIf((o) => {
    return o.type === SAVE_TYPE.COMPLETE;
  })
  @ValidateNested({ each: true })
  projectDetails?: ProjectDetailsDTO;

  @ApiProperty({ type: DocumentDto })
  @Type((data: TypeHelpOptions) => {
    if (
      data.object.type === SAVE_TYPE.COMPLETE &&
      data.object.role === Role.PROVIDER
    )
      return DocumentWithRemarksDto;
    else return DocumentDto;
  })
  @ValidateIf((o) => {
    return o.type === SAVE_TYPE.COMPLETE;
  })
  @ValidateNested({ each: true })
  @IsNotEmpty()
  documents: DocumentDto | DocumentWithRemarksDto;

  @ApiProperty()
  @IsArray()
  @IsOptional({ each: true })
  individualProvider: string[];

  //check if project state is init
  @ApiProperty()
  @IsUUID()
  @IsOptional()
  provider?: string;

  @ApiProperty({ type: [MilestoneDTO] })
  @ValidateIf((o) => {
    return o.type === SAVE_TYPE.COMPLETE;
  })
  @ValidateNested({ each: true })
  @Type((data: TypeHelpOptions) => {
    return MilestoneDTO;
  })
  milestones?: MilestoneDTO[];
}

export class ToogleIpViewDto {
  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty()
  @IsBoolean()
  ipViewState: boolean;
}

export class getMilestoneDto {
  @ApiProperty()
  @IsUUID()
  milestoneId: string;
}

export class SubMilestoneDto {
  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDTO)
  subMilestones: MilestoneDTO[];

  @ApiProperty()
  @IsUUID()
  milestoneId: string;
}

export class updateMilestoneStatus {
  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty()
  @IsUUID()
  milestoneId: string;

  @ApiProperty()
  @IsEnum(MilestoneStatus)
  milestoneStatus: MilestoneStatus;
}

export class addIndividualProvider {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true }) // Validate each element as a UUID v4
  providerIds: string[];
}

export class UploadDocDto {
  @ApiProperty()
  @IsNotEmpty()
  url: string;

  @ApiProperty()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty()
  @IsNotEmpty()
  mimeType: string;
}

export class DevliveralbesDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  milestoneId: string;

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => UploadDocDto)
  deliverables: UploadDocDto[];
}
export class GetTransactionDto {
  @ApiProperty()
  @IsString()
  transactionId: string;

  @ApiProperty()
  @IsEnum(TRANSACTION_EVENTS)
  event: TRANSACTION_EVENTS;

  @ApiProperty()
  @IsString()
  functionName: string;

  @ApiProperty()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UploadDocDto)
  reworkDocs: UploadDocDto[];

  @ApiProperty()
  @IsOptional()
  @IsString()
  reworkComment: string;
}

export enum ProviderListAction {
  BOOKMARKED,
  REMOVE_BOOKMARKED,
}
export class ProviderListActionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  providerId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsEnum(ProviderListAction)
  action: ProviderListAction;
}

export class updateShortListProviderDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  providerId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  note: string;
}

export class GetProviderListDto {
  @ApiProperty()
  @IsEnum(Prisma.SortOrder)
  @IsOptional()
  @IsNotEmpty()
  sortBy: Prisma.SortOrder;
}

export class CreateNotesDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  milestoneId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  to: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  noteId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hcsTopicId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sequenceNumber: string;
}

export class GetNotesDto {
  @ApiProperty()
  @IsUUID()
  projectId: string;
}

export class GetAllowedChatDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsUUID()
  projectId: string;
}

export class updatePermissionsDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => updateUserPermissionDto)
  permissions: updateUserPermissionDto[];
}

export class updateUserPermissionDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  ProjectDetailsDuration: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  ProjectTotalProjectFund: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  ProjectPenalty: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  DocumentTermsAndConditions: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  MilestoneFundAllocation: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  MilestoneRevisionsCounter: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  MilestonesShowAll: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  SubMilestoneShowAll: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  FundsShowIndividualFund: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  FundsTab: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  FundAllocation: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  FundLeft: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  Members: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  EscrowProjectDetails: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  EscrowpartiesInvolved: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  EscrowMilestoneFund: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  EscrowRoyalty: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  EscrowPenalty: boolean;
}

export enum RequestType {
  FUND,
  ROYALTY,
}

export enum IdType {
  PROJECT,
  MILESTONE,
}

export class requestFundDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsNotEmpty()
  @Min(0)
  @Max(1)
  @IsEnum(IdType)
  idType: IdType;

  @ApiProperty()
  @IsNotEmpty()
  @Min(0)
  @Max(1)
  @IsEnum(RequestType)
  requestType: RequestType;
}

export class DeleteProjectDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  projectId: string;
}
