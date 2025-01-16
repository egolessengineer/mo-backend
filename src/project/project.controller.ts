import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  DeleteFileDto,
  createProjectDTO,
  getProjectDto,
  GetProviderDto,
  ToogleIpViewDto,
  GetAllProjectsDto,
  SubMilestoneDto,
  updateMilestoneStatus,
  addIndividualProvider,
  DevliveralbesDto,
  GetTransactionDto,
  ProviderListActionDto,
  CreateNotesDto,
  GetNotesDto,
  GetProviderListDto,
  updateShortListProviderDto,
  GetAllowedChatDto,
  updatePermissionsDto,
  requestFundDto,
  DeleteProjectDto,
  SearchProjectDto,
  PurchaserInviteDto,
  GetCollabsDto,
} from './dto/index';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectsPurchaserService } from './project.service';
import { RoleGuard } from 'src/Guard';
import { Role } from '@prisma/client';

@UseGuards(AuthGuard('jwt'))
@ApiTags('ProjectsFlow')
@Controller('project')
export class ProjectsController {
  constructor(
    private readonly projectsPurchaserService: ProjectsPurchaserService,
  ) {}
  private readonly logger = new Logger();
  @Post()
  @ApiResponse({
    status: 201,
    description: 'To save project Data.',
  })
  async addProject(@Req() req, @Body() body: createProjectDTO): Promise<any> {
    try {
      // if(req.user.role === )
      const response = await this.projectsPurchaserService.addProject(
        req.user,
        body,
      );

      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get('/')
  @ApiResponse({
    status: 201,
    description: 'To get all projects.',
  })
  async getAllProjects(@Req() req, @Query() query: GetAllProjectsDto) {
    try {
      return await this.projectsPurchaserService.getAllProjects(
        req.user,
        query,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Delete('/')
  @ApiResponse({
    status: 201,
    description: 'To delete the project Data.',
  })
  async deleteProject(
    @Req() req,
    @Body() body: DeleteProjectDto,
  ): Promise<any> {
    try {
      // if(req.user.role === )
      const response = await this.projectsPurchaserService.deleteProject(
        req.user,
        body,
      );

      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('document-upload')
  @ApiResponse({
    status: 201,
    description: 'To upload documents.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Req() req,
    @UploadedFile()
    file: Express.Multer.File,
  ): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.uploadFile(
        req.user,
        file,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Delete('document-delete')
  @ApiResponse({
    status: 201,
    description: 'To delete documents.',
  })
  async deleteFile(@Req() req, @Body() body: DeleteFileDto): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.deleteFile(
        req.user,
        body.url,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('toogle-ip-info')
  @ApiResponse({
    status: 201,
    description: 'Used to toogle the view of Ip from the POV of puchaser',
  })
  async toogleIpInfo(@Req() req, @Body() body: ToogleIpViewDto): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.toogleIpInfo(
        req.user,
        body,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('invite')
  @ApiResponse({
    status: 201,
    description: 'Used to add provider in used users.',
  })
  async addToUsedUsers(
    @Req() req,
    @Body() body: PurchaserInviteDto,
  ): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.addToUsedUsers(
        req.user,
        body,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get('collabs')
  @ApiResponse({
    status: 201,
    description: 'To get the invites for collaborations',
  })
  async getCollads(@Req() req, @Body() body: GetCollabsDto): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.getCollabs(
        req.user,
        body,
      );
      return response;
    } catch (error) {
      this.logger.log(error);
      throw error;
    }
  }

  @Get('providers')
  @ApiResponse({
    status: 201,
    description: 'To Get Provider list.',
  })
  async getProviders(@Req() req, @Query() query: GetProviderDto): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.getProviders(
        req.user,
        query,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get('search')
  @ApiResponse({
    status: 201,
    description: 'To Get Provider list.',
  })
  async searchProjects(
    @Req() req,
    @Query() query: SearchProjectDto,
  ): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.searchProjects(
        req.user,
        query,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('transaction')
  @ApiResponse({
    status: 201,
    description: 'To toogle Funds section button states for events',
  })
  async getTransactions(
    @Req() req,
    @Body() body: GetTransactionDto,
  ): Promise<any> {
    try {
      return await this.projectsPurchaserService.getTransactions(
        req.user,
        body.transactionId,
        body.event,
        body.functionName,
        body.reworkDocs,
        body.reworkComment,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('accept-project')
  @UseGuards(new RoleGuard(Role.PROVIDER))
  @ApiResponse({
    status: 201,
    description: 'To accept project.',
  })
  async acceptProject(@Req() req, @Body() body: getProjectDto): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.acceptProject(
        req.user,
        body.projectId,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('sub-milestone')
  @UseGuards(new RoleGuard(Role.PROVIDER))
  @ApiResponse({
    status: 201,
    description: 'To add sub milestone.',
  })
  async addSubMilestone(
    @Req() req,
    @Body() body: SubMilestoneDto,
  ): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.addSubMilestone(
        req.user,
        body,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Patch('milestone/status')
  @ApiResponse({
    status: 200,
    description: 'To update milestone status',
  })
  async updateMilestoneStatus(
    @Req() req,
    @Body() body: updateMilestoneStatus,
  ): Promise<any> {
    try {
      const response =
        await this.projectsPurchaserService.updateMilestoneStatus(
          req.user,
          body,
        );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('addIP')
  @UseGuards(new RoleGuard(Role.PROVIDER))
  @ApiResponse({
    status: 200,
    description: 'To add individual provider',
  })
  async addIP(@Req() req, @Body() body: addIndividualProvider): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.addIP(
        req.user,
        body,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('modifyIP')
  @UseGuards(new RoleGuard(Role.PROVIDER))
  @ApiResponse({
    status: 200,
    description: 'To modify individual provider',
  })
  async modifyIp(
    @Req() req,
    @Body() body: addIndividualProvider,
  ): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.modifyIp(
        req.user,
        body,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('add-escrow')
  @UseGuards(new RoleGuard(Role.PURCHASER))
  @ApiResponse({
    status: 200,
    description: 'To add escrow',
  })
  async addEscrow(@Req() req, @Body() body: getProjectDto): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.addEscrow(
        req.user,
        body,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('upload-deliverables')
  @UseGuards(new RoleGuard(Role.PROVIDER))
  @ApiResponse({
    status: 200,
    description: 'To upload deliveralbes',
  })
  async uploadDeliverables(
    @Req() req,
    @Body() body: DevliveralbesDto,
  ): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.uploadDeliverables(
        req.user,
        body,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('upload-web3-storage')
  @UseGuards(new RoleGuard(Role.PURCHASER))
  @ApiResponse({
    status: 200,
    description: 'To upload project deliverables on web 3 storage',
  })
  async uploadWeb3Storage(@Req() req, @Body() body): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.uploadWeb3Storage(
        req.user,
        body,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('/providerList')
  @ApiResponse({
    status: 201,
    description: 'To post provider list.',
  })
  async toggleShortListProviders(
    @Req() req,
    @Body() body: ProviderListActionDto,
  ): Promise<any> {
    try {
      const response =
        await this.projectsPurchaserService.toggleShortListProviders(
          req.user,
          body,
        );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Patch('/providerList')
  @ApiResponse({
    status: 201,
    description: 'To udpate provider list.',
  })
  async updateShortListProvider(
    @Req() req,
    @Body() body: updateShortListProviderDto,
  ): Promise<any> {
    try {
      const response =
        await this.projectsPurchaserService.updateShortlistProvider(
          req.user,
          body,
        );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post('notes')
  @ApiResponse({
    status: 200,
    description: 'To add notes in the db',
  })
  async createNotes(@Req() req, @Body() body: CreateNotesDto): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.createNotes(
        req.user,
        body,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get('/providerList')
  @ApiResponse({
    status: 201,
    description: 'To get provider list.',
  })
  async getShortListedProviders(
    @Req() req,
    @Query() query: GetProviderListDto,
  ): Promise<any> {
    try {
      // return body;
      const response =
        await this.projectsPurchaserService.getShortListedProviders(
          req.user,
          query.sortBy,
        );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get('notes/:projectId')
  @ApiResponse({
    status: 201,
    description: 'To get project Data.',
  })
  async getNotes(@Req() req, @Param() param): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.getNotes(
        req.user,
        param.projectId,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get('chat-list')
  @ApiResponse({
    status: 201,
    description: 'To get the available chat memebers for a user ',
  })
  async getAllowedChat(@Req() req, @Query() query: GetAllowedChatDto) {
    try {
      const response = await this.projectsPurchaserService.getAllowedChat(
        req.user,
        query,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Patch('permissions')
  @ApiResponse({
    status: 201,
    description: 'To update the permissions',
  })
  async updatePermissions(@Req() req, @Body() body: updatePermissionsDto) {
    try {
      const response = await this.projectsPurchaserService.updatePermissions(
        req.user,
        body,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @UseGuards(new RoleGuard(Role.PROVIDER))
  @Post('requestFund')
  @ApiResponse({
    status: 200,
    description: 'To notify purchaser for the fund',
  })
  async requestFund(@Req() req, @Body() body: requestFundDto) {
    try {
      const response = await this.projectsPurchaserService.requestFund(
        req.user,
        body,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get(':projectId')
  @ApiResponse({
    status: 201,
    description: 'To get project Data.',
  })
  async getProject(@Req() req, @Param() param: getProjectDto): Promise<any> {
    try {
      const response = await this.projectsPurchaserService.getProject(
        req.user,
        param.projectId,
      );
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
