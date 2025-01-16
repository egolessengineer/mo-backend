import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiResponse } from '@nestjs/swagger';
import { UpdateMoFeeDto } from './dto/update-fee.dto';
import { AuthGuard } from '@nestjs/passport';
import { RoleGuard } from 'src/Guard';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('usersOverview')
  @UseGuards(new RoleGuard(Role.ADMIN))
  @ApiResponse({
    status: 201,
    description: 'Gets the analytics data overview for admin',
  })
  async usersOverview(@Req() req): Promise<any> {
    try {
      const response = await this.adminService.usersOverview(req.user);
      return response;
    } catch (error) {
      throw error;
    }
  }

  @Post('fee')
  @UseGuards(new RoleGuard(Role.ADMIN))
  @ApiResponse({
    status: 201,
    description: 'Updates the fee for contracts ',
  })
  async updateMoFee(@Req() req, @Body() body: UpdateMoFeeDto): Promise<any> {
    try {
      return await this.adminService.updateMoFee(req.user, body);
    } catch (error) {
      throw error;
    }
  }
}
