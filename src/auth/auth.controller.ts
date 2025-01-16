import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  AboutDetailsDto,
  AddWalletDto,
  AddressDto,
  ExperienceDto,
  LoginDto,
  SignUpDto,
} from './dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CreateRoleDto } from './dto/create-role.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerifyEmailDto } from './dto/resend-verify-link.dto';
import {
  ChangePassword,
  ConfirmResetPassword,
  NewPassordDto,
  ResetPasswordDto,
  VerifiyOtpDto,
} from './dto/reset-password.dto';
import { GetProviderDetailsDto } from './dto/get-provider.dto';
import { UpdateProfile } from './dto/update-profile.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiResponse({
    status: 201,
    description: 'User has been successfully created.',
  })
  async signup(@Body() body: SignUpDto): Promise<any> {
    try {
      const response = await this.authService.basicSignup(body);
      return response;
    } catch (error) {
      throw error;
    }
  }

  @Post('login')
  @ApiResponse({
    status: 200,
    description: 'User has been logged in successfully',
  })
  async login(@Body() body: LoginDto) {
    try {
      const response = await this.authService.basicLogin(body);
      return response;
    } catch (error) {
      throw error;
    }
  }

  @Get('get-me')
  @ApiResponse({
    status: 200,
    description: 'Returns decoded access token',
  })
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req) {
    try {
      const response = await this.authService.getMe(req.user);
      return response;
    } catch (error) {
      throw error;
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googlePurchaserAuth() {
    return;
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googlePurchaserAuthRedirect(@Req() req, @Res() res) {
    try {
      return await this.authService.redirectUserAndAssignToken(req.user, res);
    } catch (error) {
      throw error;
    }
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: VerifyEmailDto) {
    try {
      return await this.authService.verifyEmail(body);
    } catch (error) {
      throw error;
    }
  }

  @Post('resend-verify-email')
  async resendVerrifyEmailLink(@Body() body: ResendVerifyEmailDto) {
    try {
      return await this.authService.resendVerifyEmail(body);
    } catch (error) {
      throw error;
    }
  }

  @Post('role')
  @UseGuards(AuthGuard('jwt'))
  async selectRole(@Req() req, @Body() body: CreateRoleDto) {
    try {
      return await this.authService.selectRole(req.user, body);
    } catch (error) {
      throw error;
    }
  }

  @Post('about')
  @UseGuards(AuthGuard('jwt'))
  async about(@Req() req, @Body() body: AboutDetailsDto) {
    try {
      return await this.authService.about(req.user, body);
    } catch (error) {
      throw error;
    }
  }

  @Post('address')
  @UseGuards(AuthGuard('jwt'))
  async address(@Req() req, @Body() body: AddressDto) {
    try {
      return await this.authService.address(req.user, body);
    } catch (error) {
      throw error;
    }
  }
  @Post('wallet')
  @UseGuards(AuthGuard('jwt'))
  async wallet(@Req() req, @Body() body: AddWalletDto) {
    try {
      return await this.authService.addWallet(req.user, body);
    } catch (error) {
      throw error;
    }
  }

  @Post('experience')
  @UseGuards(AuthGuard('jwt'))
  async experience(@Req() req, @Body() body: ExperienceDto) {
    try {
      return await this.authService.experience(req.user, body);
    } catch (error) {
      throw error;
    }
  }

  @Post('send-reset-password')
  async sendResetPassword(@Body() body: ResetPasswordDto) {
    try {
      return await this.authService.sendResetPassword(body);
    } catch (error) {
      throw error;
    }
  }

  @Post('send-otp')
  @UseGuards(AuthGuard('jwt'))
  async sendOtp(@Req() req) {
    try {
      return await this.authService.sendOtp(req.user);
    } catch (error) {
      throw error;
    }
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ConfirmResetPassword) {
    try {
      return await this.authService.resetPassword(body);
    } catch (error) {
      throw error;
    }
  }

  @Post('change-password-otp')
  @UseGuards(AuthGuard('jwt'))
  async resetPasswordWithOTP(@Req() req, @Body() body: NewPassordDto) {
    try {
      return await this.authService.resetPasswordWithOTP(req.user, body);
    } catch (error) {
      throw error;
    }
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(@Req() req, @Body() body: ChangePassword) {
    try {
      return await this.authService.changePassword(req.user, body);
    } catch (error) {
      throw error;
    }
  }

  @Get('verify-otp')
  @UseGuards(AuthGuard('jwt'))
  async verifyOtp(@Req() req, @Query() query: VerifiyOtpDto) {
    try {
      return await this.authService.verifyOtp(req.user, query);
    } catch (error) {
      throw error;
    }
  }

  @Post('invite')
  @UseGuards(AuthGuard('jwt'))
  async invite(@Req() req, @Body() body: ResetPasswordDto) {
    try {
      return await this.authService.inviteUser(req.user, body);
    } catch (error) {
      throw error;
    }
  }

  @Post('invite-platform')
  @UseGuards(AuthGuard('jwt'))
  async platfromInvite(@Req() req, @Body() body: ResetPasswordDto) {
    try {
      return await this.authService.platformInviteUser(req.user, body);
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('provider/:id')
  @ApiResponse({
    status: 201,
    description: 'To Get Provider list.',
  })
  async getProviderDetails(
    @Req() req,
    @Param() param: GetProviderDetailsDto,
  ): Promise<any> {
    try {
      const response = await this.authService.getProviderDetails(
        req.user,
        param,
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(@Req() req, @Body() body: UpdateProfile) {
    try {
      return await this.authService.updateProfile(req.user, body);
    } catch (error) {
      throw error;
    }
  }
}
