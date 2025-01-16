import { Strategy, ExtractJwt } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthRepository } from 'src/auth/auth.repository';
import { VerifyCallback } from 'jsonwebtoken';
import { RequestUserDto } from 'src/auth/dto/request-user.dto';
import { CONSTANT, MESSAGES } from 'src/constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly authService: AuthService,
    private readonly authRepository: AuthRepository,
    readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'), // Replace with your actual secret key
    });
  }

  async validate(payload: any, done: VerifyCallback) {
    const userExist: any = await this.authRepository.getUser({
      where: { id: payload.sub },
      include: {
        About: true,
      },
    });
    if (!userExist) {
      throw new UnauthorizedException(MESSAGES.ERROR.ACCESS_DENIED);
    }

    const user: RequestUserDto = {
      email: userExist.email,
      isAboutComplete: userExist.isAboutComplete,
      isActive: userExist.isActive,
      isAddressComplete: userExist.isAddressComplete,
      isEmailVerified: userExist.isEmailVerified,
      walletAddress: userExist.walletAddress,
      isExperienceComplete: userExist.isExperienceComplete,
      role: userExist.role,
      sub: userExist.id,
      username: userExist.name,
      About: userExist.About,
    };

    done(null, user);
  }
}
