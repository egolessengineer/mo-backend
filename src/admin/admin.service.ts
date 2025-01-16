import { Injectable, Logger } from '@nestjs/common';
import { AuthRepository } from 'src/auth/auth.repository';
import { RequestUserDto } from 'src/auth/dto/request-user.dto';
import { ProjectRepository } from 'src/project/project.repository';
import { AdminRepository } from './admin.repository';
import { UpdateMoFeeDto } from './dto/update-fee.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly authRepository: AuthRepository,
    private readonly adminRepository: AdminRepository,
  ) {}
  private readonly logger = new Logger();

  async usersOverview(user: RequestUserDto) {
    try {
      const promises = [
        this.adminRepository.getUserOverviews(),
        this.adminRepository.projectMetricsOverview(),
        this.adminRepository.escrowAndPenaltyOverview(),
        this.adminRepository.royaltyManagementOverview(),
        this.adminRepository.performanceOverview(),
        this.adminRepository.financialRevenuePlatform(),
        this.adminRepository.financialRevenuePurchaser(),
        this.adminRepository.getLatestMoFee(),
      ];
      // TODO: Promisify
      // Use Promise.all to wait for all promises to resolve
      const [
        usersOverview,
        projectMetricsOverview,
        escrowAndPenaltyOverview,
        royaltyManagementOverview,
        performanceOverview,
        financialRevenuePlatform,
        financialRevenuePurchaser,
        commission,
      ] = await Promise.all(promises);
      return {
        usersOverview,
        projectMetricsOverview,
        escrowAndPenaltyOverview,
        royaltyManagementOverview,
        performanceOverview,
        financialRevenuePlatform,
        financialRevenuePurchaser,
        commission,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateMoFee(user: RequestUserDto, body: UpdateMoFeeDto) {
    try {
      return await this.adminRepository.addMooContractFee({
        data: { commission: body.commission },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
