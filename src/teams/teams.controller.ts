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
import { TeamsService } from './teams.service';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetProviderDto } from 'src/project/dto';
import { CreateTeamDto, getAllTeamDto, updateTeamDto } from './dto/teams.dto';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RoleGuard } from 'src/Guard';

@ApiTags('Teams')
@UseGuards(AuthGuard('jwt'), new RoleGuard(Role.PROVIDER))
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // get team list and user information
  @Get('')
  @ApiResponse({
    status: 201,
    description: 'To Get Teams list.',
  })
  async getAllTeams(@Req() req, @Query() query: getAllTeamDto): Promise<any> {
    try {
      const response = await this.teamsService.getAllTeams(
        req.user,
        query.sortBy,
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  //create team and add team members
  @Post('')
  @ApiResponse({
    status: 201,
    description: 'To create Team.',
  })
  async createTeam(@Req() req, @Body() body: CreateTeamDto): Promise<any> {
    try {
      const response = await this.teamsService.createTeam(req.user, body);
      return response;
    } catch (error) {
      throw error;
    }
  }

  @Patch('')
  @ApiResponse({
    status: 201,
    description: 'To update Team.',
  })
  async updateTeam(@Req() req, @Body() body: updateTeamDto): Promise<any> {
    try {
      const response = await this.teamsService.updateTeam(req.user, body);
      return response;
    } catch (error) {
      throw error;
    }
  }
  //remove team membersq
}
