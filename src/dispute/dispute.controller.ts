import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { getProjectDto } from 'src/project/dto';
import {
  GetDisputeDto,
  GetDisputesDto,
  PostDisputeDto,
  PatchDisputeDto,
  createFAQS,
  createManyFAQS,
} from './dto/index.dto';
import { AuthGuard } from '@nestjs/passport';
import { RoleGuard } from 'src/Guard';
import { Role } from '@prisma/client';

@ApiTags('Disputes')
@UseGuards(AuthGuard('jwt'))
@Controller('dispute')
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post('')
  @ApiResponse({
    status: 200,
    description: 'To create dispute',
  })
  async createDispute(@Req() req, @Body() body: PostDisputeDto): Promise<any> {
    try {
      const response = await this.disputeService.createDispute(req.user, body);
      return response;
    } catch (error) {
      throw error;
    }
  }

  @Patch('')
  @ApiResponse({
    status: 200,
    description: 'To update dispute',
  })
  async updateDispute(@Req() req, @Body() body: PatchDisputeDto): Promise<any> {
    try {
      const response = await this.disputeService.updateDispute(req.user, body);
      return response;
    } catch (error) {
      throw error;
    }
  }

  @Get('members/:projectId')
  @ApiResponse({
    status: 200,
    description: 'To get project members list',
  })
  async getlistOfProjectMilestones(
    @Req() req,
    @Param() param: getProjectDto,
  ): Promise<any> {
    try {
      const response = await this.disputeService.getProjectMembers(
        req.user,
        param.projectId,
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  @Get('getAll')
  @ApiResponse({
    status: 201,
    description: 'To get all disputes',
  })
  async getAllDisputes(
    @Req() req,
    @Query() query: GetDisputesDto,
  ): Promise<any> {
    try {
      const response = await this.disputeService.getAllDisputes(
        req.user,
        query,
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  @Get('FAQ')
  @ApiResponse({
    status: 201,
    description: 'To get FAQs',
  })
  async getFAQS(): Promise<any> {
    try {
      const response = await this.disputeService.getFAQS();
      return response;
    } catch (error) {
      throw error;
    }
  }

  @Post('FAQ')
  @UseGuards(new RoleGuard(Role.ADMIN))
  @ApiResponse({
    status: 201,
    description: 'To add FAQs',
  })
  async addFAQS(@Req() req, @Body() body: createManyFAQS): Promise<any> {
    try {
      const response = await this.disputeService.addFAQS(body.faqs);
      return response;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiResponse({
    status: 201,
    description: 'To get dispute',
  })
  async getDispute(@Req() req, @Param() param: GetDisputeDto): Promise<any> {
    try {
      const response = await this.disputeService.getDispute(req.user, param);
      return response;
    } catch (error) {
      throw error;
    }
  }
}
