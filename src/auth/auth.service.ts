import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AboutDetailsDto,
  AddWalletDto,
  AddressDto,
  ExperienceDto,
  LoginDto,
  SignUpDto,
} from './dto';
import { ConfigService } from '@nestjs/config';
import { configData } from 'src/config';
import { JwtService } from '@nestjs/jwt';
import { CreateRoleDto } from './dto/create-role.dto';
import { RequestUserDto } from './dto/request-user.dto';
import { EmailService } from 'src/email-service/email-service.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthRepository } from './auth.repository';
import { CONSTANT } from 'src/constants';
import { ResendVerifyEmailDto } from './dto/resend-verify-link.dto';
import {
  ChangePassword,
  ConfirmResetPassword,
  NewPassordDto,
  ResetPasswordDto,
  VerifiyOtpDto,
} from './dto/reset-password.dto';
import { Role, TokenType } from '@prisma/client';
import { MESSAGES } from 'src/constants';
import * as bcrypt from 'bcrypt';
import { GetProviderDetailsDto } from './dto/get-provider.dto';
import { UpdateProfile } from './dto/update-profile.dto';
import { ProjectRepository } from 'src/project/project.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly authRepository: AuthRepository,
    private readonly emailService: EmailService,
    private readonly projectRepository: ProjectRepository,
  ) {}

  private logger = new Logger();
  config: any = configData(this.configService);

  async basicSignup(body: SignUpDto) {
    try {
      const { confirm_password, password, email, name } = body;
      let user = await this.authRepository.getUser({
        where: { email },
      });
      if (user) {
        throw new BadRequestException(MESSAGES.ERROR.EMAIL_REGISTERED);
      }
      if (password != confirm_password) {
        throw new BadRequestException(MESSAGES.ERROR.PASSWORD_MISMATCH);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Add user in databse
      try {
        user = await this.authRepository.createUser({
          data: {
            email,
            password: hashedPassword,
            name,
          },
        });

        const payload = {
          id: user.id,
        };

        const token = await this.createToken(payload);

        // Save the current token in db
        try {
          await this.authRepository.addToken({
            data: {
              userId: user.id,
              token,
              tokenType: TokenType.EmailVerificationToken,
            },
          });
        } catch (error) {
          throw new BadRequestException(MESSAGES.ERROR.ADD_TOKEN);
        }

        // Send email-invite to the user
        try {
          await this.emailService.sendEmail(
            { path: '/verify-email', token },
            CONSTANT.EMAIL_SUBJECT.VERIFICATION_INVITE,
            CONSTANT.MAIL_TYPE.VERIFICATION_INVITE,
            email,
          );
        } catch (error) {
          throw new BadRequestException(MESSAGES.ERROR.SEND_EMAIL);
        }
      } catch (error) {
        throw error;
      }

      return MESSAGES.SUCCESS.USER_REGISTERED;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async resendVerifyEmail(body: ResendVerifyEmailDto) {
    try {
      const { email } = body;
      let user;
      try {
        user = await this.authRepository.getUser({
          where: {
            email,
          },
        });

        // Throw if email is not registered.
        if (!user) {
          throw new UnauthorizedException(MESSAGES.ERROR.EMAIL_UNREGISTERED);
        }

        // Returns if email is already verified.
        if (user.isEmailVerified) {
          return MESSAGES.ERROR.EMAIL_VERIFIED;
        }

        const payload = {
          id: user.id,
        };

        // Creates a token for the payload
        const token = await this.createToken(payload);

        // Save the current token in db
        try {
          const dbToken = await this.authRepository.getToken({
            where: {
              tokenType: TokenType.EmailVerificationToken,
              userId: user.id,
            },
          });

          // Expires the old token
          await this.authRepository.updateToken({
            where: { id: dbToken.id },
            data: {
              token,
            },
          });
        } catch (error) {
          throw new BadRequestException(MESSAGES.ERROR.ADD_TOKEN);
        }

        // Send email-invite to the user
        try {
          await this.emailService.sendEmail(
            { path: '/verify-email', token },
            CONSTANT.EMAIL_SUBJECT.VERIFICATION_INVITE,
            CONSTANT.MAIL_TYPE.VERIFICATION_INVITE,
            user.email,
          );
        } catch (error) {
          throw new BadRequestException(MESSAGES.ERROR.SEND_EMAIL);
        }
      } catch (error) {
        throw new BadRequestException(MESSAGES.ERROR.CREATE_USER);
      }
      return MESSAGES.SUCCESS.VERIFICATION_LINK;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async basicLogin(body: LoginDto) {
    try {
      const { email, password } = body;

      // Check if email exists
      const user = await this.authRepository.getUser({
        where: { email },
        include: { Address: true, Experiences: true, About: true },
      });

      if (!user) {
        throw new BadRequestException(MESSAGES.ERROR.EMAIL_UNREGISTERED);
      }
      if (!user.password) {
        throw new BadRequestException(MESSAGES.ERROR.GMAIL_LOGIN);
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        throw new BadRequestException(MESSAGES.ERROR.INCORRECT_PASSWORD);
      }

      if (!user.isEmailVerified) {
        await this.resendVerifyEmail({ email });
        throw new BadRequestException(MESSAGES.ERROR.EMAIL_NOT_VERIFIED);
      }

      const payload = {
        sub: user.id,
      };

      // Create a toke for the payload
      const access_token = await this.createToken(payload);
      delete user.password;

      return { access_token, user };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createToken(data, expiry = null) {
    try {
      // Signes the token with secret key and adds expiry date if provided: Expiry defaults to 7 days
      const access_token = await this.jwtService.signAsync(data, {
        secret: this.config.JWT_SECRET,
        expiresIn: expiry ? expiry : CONSTANT.TOKEN_EXPIRY,
      });
      return access_token;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async validateGoogleUser(payload) {
    try {
      // Helper function for google strategy
      let user = await this.authRepository.getUser({
        where: { email: payload.email },
      });

      if (!user) {
        user = await this.authRepository.createUser({
          data: {
            email: payload.email,
            name: payload.username,
            isEmailVerified: true,
          },
        });
      }

      const response = {
        username: user.name,
        email: user.email,
        sub: user.id,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        isAboutComplete: user.isAboutComplete,
        isAddressComplete: user.isAddressComplete,
        walletAddress: user.walletAddress,
      };

      return response;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(MESSAGES.ERROR.GMAIL_FAILED);
    }
  }
  async decodeToken(token) {
    try {
      // Verifies and decodes the token.
      const secret = this.config.JWT_SECRET;
      return await this.jwtService.verifyAsync(token, {
        secret,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getMe(user: RequestUserDto) {
    try {
      // Gets the basic information of a user.
      const response = await this.authRepository.getUser({
        where: { email: user.email },
        include: {
          Address: true,
          About: true,
          Experiences: true,
        },
      });
      delete response.password;
      return response;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(MESSAGES.ERROR.INVALID_TOKEN);
    }
  }

  async redirectUserAndAssignToken(user: RequestUserDto, res) {
    try {
      const token = await this.createToken(user);
      return res.redirect(`${this.config.FRONTEND_URL}/success?token=${token}`);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async selectRole(user: RequestUserDto, body: CreateRoleDto) {
    try {
      const { role } = body;
      let userToUpdate = await this.authRepository.getUser({
        where: { id: user.sub },
      });

      if (userToUpdate && !userToUpdate.role) {
        userToUpdate = await this.authRepository.updateUser({
          where: { id: userToUpdate.id },
          data: { role },
        });
      }

      return `${MESSAGES.SUCCESS.ROLE_SELECTION} ${role}`;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async about(user: RequestUserDto, body: AboutDetailsDto) {
    try {
      const { about, name, phone_number, profile_image, portfolio } = body;
      const update = {};

      if (about) {
        update['about'] = about;
      }

      if (name) {
        update['name'] = name;
      }

      if (phone_number) {
        update['phoneNumber'] = phone_number?.toString();
      }

      if (profile_image) {
        update['profilePictureLink'] = profile_image;
      }

      if (portfolio) {
        update['portfolioLink'] = portfolio;
      }
      // Upserts the about information of user
      await this.authRepository.createAbout({
        where: { userId: user.sub },
        update,
        create: {
          name: name,
          about: about ?? null,
          phoneNumber: phone_number?.toString(),
          profilePictureLink: profile_image ?? null,
          portfolioLink: portfolio ?? null,
          userId: user.sub,
        },
      });

      await this.authRepository.updateUser({
        where: { id: user.sub },
        data: { isAboutComplete: true, name: name },
      });

      return MESSAGES.SUCCESS.ABOUT_DETAILS;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async verifyEmail(body: VerifyEmailDto) {
    try {
      // Return with a new Token
      const { token } = body;

      const decryptedToken: any = await this.decodeToken(token);

      // Verifing the token matches with the databse token.
      const isValidToken = await this.authRepository.getToken({
        where: {
          userId: decryptedToken.id,
          token,
          tokenType: TokenType.EmailVerificationToken,
        },
      });

      if (!isValidToken) {
        throw new BadRequestException(MESSAGES.ERROR.INVALID_TOKEN);
      }

      await this.authRepository.updateUser({
        where: { id: decryptedToken.id },
        data: { isEmailVerified: true },
      });

      await this.authRepository.updateToken({
        where: { id: isValidToken.id },
        data: { token: MESSAGES.ERROR.EXPIRED },
      });

      return MESSAGES.SUCCESS.EMAIL_VERIFIED;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async address(user: RequestUserDto, body: AddressDto) {
    try {
      const { city, country, postal_code, state, street } = body;
      // Upserts the address of the user.
      await this.authRepository.createAddress({
        where: { userId: user.sub },
        update: {
          city: city ?? null,
          country: country ?? null,
          postalCode: postal_code ?? null,
          state: state ?? null,
          street: street ?? null,
        },
        create: {
          city: city ?? null,
          country: country ?? null,
          postalCode: postal_code ?? null,
          state: state ?? null,
          street: street ?? null,
          userId: user.sub,
        },
      });

      await this.authRepository.updateUser({
        where: { id: user.sub },
        data: { isAddressComplete: true },
      });

      return MESSAGES.SUCCESS.ADDRESS_DETAILS;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async experience(user: RequestUserDto, body: ExperienceDto) {
    try {
      const { company, end_date, position, start_date } = body;

      if (user.role != Role.PROVIDER) {
        throw new UnauthorizedException(MESSAGES.ERROR.UNAUTHORIZED_ACTION);
      }

      await this.authRepository.createExperience({
        data: {
          company: company ?? null,
          endDate: end_date ? new Date(end_date * 1000) : null,
          position: position ?? null,
          startDate: start_date ? new Date(start_date * 1000) : null,
          userId: user.sub,
        },
      });

      await this.authRepository.updateUser({
        where: { id: user.sub },
        data: { isExperienceComplete: true },
      });

      return MESSAGES.SUCCESS.EXPERIENCE_DEAILS;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async addWallet(user: RequestUserDto, body: AddWalletDto) {
    try {
      const { wallet_address } = body;
      // Updates the wallet address of a user
      await this.authRepository.updateUser({
        where: { id: user.sub },
        data: { walletAddress: wallet_address },
      });
      return MESSAGES.SUCCESS.WALLET_UPDATE;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async inviteUser(user: RequestUserDto, body: ResetPasswordDto) {
    try {
      const { email } = body;

      if (email == user.email) {
        throw new UnauthorizedException(MESSAGES.ERROR.EMAIL_REGISTERED);
      }

      const userExist: any = await this.authRepository.getUser({
        where: {
          email,
        },
        include: { Collaborators: { where: { purchaserId: user.sub } } },
      });

      if (!userExist) {
        await this.platformInviteUser(user, body);
        return MESSAGES.SUCCESS.EMAIL_SENT;
      }

      // Checks if the email is already registered.
      if (userExist.role == Role.PURCHASER) {
        throw new UnauthorizedException(MESSAGES.ERROR.USER_IS_PURCHASER);
      }

      if (userExist.Collaborators?.length) {
        throw new UnauthorizedException(MESSAGES.ERROR.INVITED);
      }
      const payload = {
        purchaser: user.sub,
        collaborator: userExist.id,
      };
      const access_token = await this.createToken(payload);
      const availableToken = await this.authRepository.getToken({
        where: {
          tokenType: TokenType.PurchaserInviteToken,
          userId: user.sub,
        },
      });

      if (availableToken) {
        await this.authRepository.updateToken({
          where: { id: availableToken.id },
          data: { token: access_token },
        });
      } else {
        await this.authRepository.addToken({
          data: {
            token: access_token,
            tokenType: TokenType.PurchaserInviteToken,
            userId: user.sub,
          },
        });
      }

      await this.projectRepository.addCollaborators({
        data: { collaboratorEmail: email, purchaserId: user.sub },
      });

      // Send reset token email to the user
      try {
        await this.emailService.sendEmail(
          { path: '/invitation', token: access_token },
          CONSTANT.EMAIL_SUBJECT.PURCHASER_INVITE,
          CONSTANT.MAIL_TYPE.PURCHASER_INVITE,
          email,
          user.email,
        );
      } catch (error) {
        throw new BadRequestException(MESSAGES.ERROR.SEND_EMAIL);
      }
      return MESSAGES.SUCCESS.EMAIL_SENT;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async platformInviteUser(user: RequestUserDto, body: ResetPasswordDto) {
    try {
      const { email } = body;
      const userExist = await this.authRepository.getUser({ where: { email } });

      // Checks if the email is already registered.
      if (userExist) {
        throw new UnauthorizedException(MESSAGES.ERROR.EMAIL_REGISTERED);
      }

      // Send reset token email to the user
      try {
        await this.emailService.sendEmail(
          { path: '/signUp' },
          CONSTANT.EMAIL_SUBJECT.NEW_USER,
          CONSTANT.MAIL_TYPE.NEW_USER,
          email,
          user.email,
        );
      } catch (error) {
        throw new BadRequestException(MESSAGES.ERROR.SEND_EMAIL);
      }
      return MESSAGES.SUCCESS.DEFAULT;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async sendResetPassword(body: ResetPasswordDto) {
    try {
      const { email } = body;
      const user = await this.authRepository.getUser({ where: { email } });

      if (!user) {
        throw new UnauthorizedException(MESSAGES.ERROR.EMAIL_UNREGISTERED);
      }
      const payload = {
        sub: user.id,
      };
      const access_token = await this.createToken(payload);
      const availableToken = await this.authRepository.getToken({
        where: { tokenType: TokenType.ForgotPasswordToken, userId: user.id },
      });

      if (availableToken) {
        await this.authRepository.updateToken({
          where: { id: availableToken.id },
          data: { token: access_token },
        });
      } else {
        await this.authRepository.addToken({
          data: {
            token: access_token,
            tokenType: TokenType.ForgotPasswordToken,
            userId: user.id,
          },
        });
      }

      // Send reset token email to the user
      try {
        await this.emailService.sendEmail(
          { path: '/reset-password', token: access_token },
          CONSTANT.EMAIL_SUBJECT.RESET_TOKEN,
          CONSTANT.MAIL_TYPE.RESET_TOKEN,
          email,
        );
      } catch (error) {
        throw new BadRequestException(MESSAGES.ERROR.SEND_EMAIL);
      }
      return MESSAGES.SUCCESS.PASSWORD_LINK_SENT;
      // Add api to update new password
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async sendOtp(user: RequestUserDto) {
    try {
      // Create a 6 digit random number
      const otp = this.generateRandomNumber(6);

      const availableToken = await this.authRepository.getToken({
        where: { tokenType: TokenType.OTP, userId: user.sub },
      });

      if (availableToken) {
        await this.authRepository.updateToken({
          where: { id: availableToken.id },
          data: { token: otp.toString() },
        });
      } else {
        await this.authRepository.addToken({
          data: {
            token: otp.toString(),
            tokenType: TokenType.OTP,
            userId: user.sub,
          },
        });
      }

      // Send reset token email to the user
      try {
        await this.emailService.sendEmail(
          { token: otp.toString() },
          CONSTANT.EMAIL_SUBJECT.RESET_PASSWORD_OTP,
          CONSTANT.MAIL_TYPE.RESET_PASSWORD_OTP,
          user.email,
        );
      } catch (error) {
        throw new BadRequestException(MESSAGES.ERROR.SEND_EMAIL);
      }
      return MESSAGES.SUCCESS.EMAIL_SENT;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async verifyOtp(user: RequestUserDto, body: VerifiyOtpDto) {
    try {
      // Get the OTP
      const userToken: any = await this.authRepository.getUser({
        where: { id: user.sub },
        select: { VerficationToken: { where: { tokenType: TokenType.OTP } } },
      });

      // Verifiy OTP
      if (body.otp != userToken?.VerficationToken[0]?.token) {
        throw new UnauthorizedException(MESSAGES.ERROR.INVALID_TOKEN);
      }
      return true;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  generateRandomNumber(length) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async resetPasswordWithOTP(user: RequestUserDto, body: NewPassordDto) {
    try {
      // Get the OTP
      const userToken: any = await this.authRepository.getUser({
        where: { id: user.sub },
        select: { VerficationToken: { where: { tokenType: TokenType.OTP } } },
      });

      // Verifiy OTP
      if (body.otp != userToken?.VerficationToken[0]?.token) {
        throw new UnauthorizedException(MESSAGES.ERROR.INVALID_TOKEN);
      }
      if (body.new_password != body.confirm_password) {
        throw new BadRequestException(MESSAGES.ERROR.BAD_REQUEST);
      }

      // Generate a password hash
      const hashedPassword = await bcrypt.hash(body.new_password, 10);

      // Update the password
      await this.authRepository.updateUser({
        where: { id: user.sub },
        data: { password: hashedPassword },
      });

      // Delete the token from database
      await this.authRepository.deleteToken({
        where: { id: userToken.VerficationToken[0].id },
      });
      return MESSAGES.SUCCESS.PASSWORD_CHANGED;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async resetPassword(body: ConfirmResetPassword) {
    try {
      // Decode the token
      // Return with a new Token
      const { token, confirm_password, password } = body;

      const decryptedToken: any = await this.decodeToken(token);

      // Verifing the token matches with the databse token.
      const isValidToken: any = await this.authRepository.getUser({
        where: {
          id: decryptedToken.sub,
        },
        include: {
          VerficationToken: {
            where: { token, tokenType: TokenType.ForgotPasswordToken },
          },
        },
      });

      if (!isValidToken?.VerficationToken?.length) {
        throw new BadRequestException(MESSAGES.ERROR.INVALID_TOKEN);
      }

      // check the password and confirm password matches
      if (password != confirm_password) {
        throw new BadRequestException(MESSAGES.ERROR.PASSWORD_MISMATCH);
      }

      // Check of the user is using the old password.
      const passwordMatch = await bcrypt.compare(
        password,
        isValidToken.password,
      );

      if (passwordMatch) {
        throw new UnauthorizedException(MESSAGES.ERROR.OLD_PASSWORD_USED);
      }

      // Generate a password hash
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update the password
      await this.authRepository.updateUser({
        where: { id: decryptedToken.sub },
        data: { password: hashedPassword },
      });

      // Delete the token from database
      await this.authRepository.deleteToken({
        where: { id: isValidToken.VerficationToken[0].id },
      });
      return MESSAGES.SUCCESS.PASSWORD_CHANGED;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async changePassword(user: RequestUserDto, body: ChangePassword) {
    try {
      const { confirm_password, new_password, old_password } = body;

      // check the password and confirm password matches
      if (new_password != confirm_password) {
        throw new BadRequestException(MESSAGES.ERROR.PASSWORD_MISMATCH);
      }

      const userData = await this.authRepository.getUser({
        where: { id: user.sub },
      });

      // Check if the user is using the old password.
      const passwordMatch = await bcrypt.compare(
        new_password,
        userData.password,
      );

      if (passwordMatch) {
        throw new UnauthorizedException(MESSAGES.ERROR.OLD_PASSWORD_USED);
      }

      // Check if the user has entered correct old password
      const correctPassword = await bcrypt.compare(
        old_password,
        userData.password,
      );

      if (!correctPassword) {
        throw new UnauthorizedException(MESSAGES.ERROR.INCORRECT_PASSWORD);
      }

      // Generate a password hash
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Update the password
      await this.authRepository.updateUser({
        where: { id: user.sub },
        data: { password: hashedPassword },
      });

      return MESSAGES.SUCCESS.PASSWORD_CHANGED;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getProviderDetails(user: RequestUserDto, param: GetProviderDetailsDto) {
    try {
      const response = await this.authRepository.getUser({
        where: {
          id: param.id,
          role: Role.PROVIDER,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          Experiences: true,
          About: true,
          Address: true,
          createdAt: true,
          ProviderListMember: {
            where: {
              creatorId: user.sub,
              memberId: param.id,
            },
            select: {
              note: true,
            },
          },
        },
      });

      if (!response) {
        throw new NotFoundException(MESSAGES.ERROR.NOT_FOUND);
      }
      return response;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateProfile(user, body: UpdateProfile) {
    try {
      const { about, gender, name, phone_number, profile_image } = body;
      const dataToUpdate = {};
      const update = {};

      if (name) {
        dataToUpdate['name'] = name;
        update['name'] = name;
      }
      if (about) {
        update['about'] = about;
      }
      if (gender) {
        update['gender'] = gender;
      }
      if (phone_number) {
        update['phoneNumber'] = phone_number;
        update['isPhoneVerified'] = false;
      }
      if (profile_image) {
        update['profilePictureLink'] = profile_image;
      }
      if (Object.keys(update).length) {
        dataToUpdate['About'] = {};
        dataToUpdate['About']['update'] = update;
      }

      if (!Object.keys(dataToUpdate).length) {
        return body;
      }

      await this.authRepository.updateUser({
        where: { id: user.sub },
        data: dataToUpdate,
      });

      return body;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
