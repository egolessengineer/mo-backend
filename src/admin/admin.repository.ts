import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { MESSAGES } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminRepository {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger();

  async getUserOverviews() {
    try {
      // Get graph data monthly
      const graph = await this.prisma.$queryRaw`WITH PROVIDER_AS_IP AS (
        SELECT u."id", TO_CHAR(u."createdAt", 'YYYY-MM') AS month_ip
        FROM "ProjectMembers" pm
        INNER JOIN "User" u ON pm."userId" = u.id
        WHERE u.role = 'PROVIDER' AND pm."projectUsers" = 'IP'
        GROUP BY u."id", month_ip
    ), PROVIDER_AS_CP AS ( 
        SELECT u."id", TO_CHAR(u."createdAt", 'YYYY-MM') AS month_cp
        FROM "ProjectMembers" pm
        INNER JOIN "User" u ON pm."userId" = u.id
        WHERE u.role = 'PROVIDER' AND pm."projectUsers" = 'CP'
        GROUP BY u."id", month_cp
    )
    
    SELECT
        coalesce(TO_CHAR(u."createdAt", 'YYYY-MM'), 'total') AS month,
        COUNT(DISTINCT u."id") AS totalUsers,
        COUNT(DISTINCT CASE WHEN u.role = 'ADMIN' THEN u."id" END) AS admins,
        COUNT(DISTINCT CASE WHEN u.role = 'PROVIDER' THEN u."id" END) AS providers,
        COUNT(DISTINCT CASE WHEN u.role = 'PURCHASER' THEN u."id" END) AS purchasers,
        COUNT(DISTINCT CASE WHEN u.role IS NULL THEN u."id" END) AS no_role,
        COUNT(DISTINCT ip."id") AS provider_as_ip,
        COUNT(DISTINCT cp."id") AS provider_as_cp
    FROM "User" u
    LEFT JOIN PROVIDER_AS_IP ip ON u.id = ip.id AND TO_CHAR(u."createdAt", 'YYYY-MM') = ip.month_ip
    LEFT JOIN PROVIDER_AS_CP cp ON u.id = cp.id AND TO_CHAR(u."createdAt", 'YYYY-MM') = cp.month_cp
    GROUP BY GROUPING SETS ((TO_CHAR(u."createdAt", 'YYYY-MM')), ())
    ORDER BY month;`;

      return graph;
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.ADMIN.USER_OVERVIEW);
    }
  }

  async projectMetricsOverview() {
    try {
      const graph = await this.prisma.$queryRaw`WITH MilestoneCTE AS (
        SELECT
            m."projectId", m."createdAt",
            TO_CHAR(m."createdAt", 'YYYY-MM') AS month_milestone
        FROM
            "Milestones" m
        GROUP BY
            m."projectId", month_milestone, m."createdAt" 
    ), SubmilestoneCTE AS (
        SELECT
            m.*,
            TO_CHAR(m."createdAt", 'YYYY-MM') AS month_submilestone
        FROM
            "Milestones" m
        WHERE
            m."milestoneType" = 'submilestone'
    ), PROJECT_NO_MILESTONES AS (
        SELECT
            p2.*,
            TO_CHAR(p2."createdAt", 'YYYY-MM') AS month_nomilestone
        FROM
            "Projects" p2
        WHERE NOT EXISTS (
            SELECT 1
            FROM "Milestones" m
            WHERE m."projectId" = p2."id"
        )
    )
    
    select
        COALESCE(mcte.month_milestone, pnm.month_nomilestone, TO_CHAR(COALESCE(mcte."createdAt", scte."createdAt", p2."createdAt"), 'YYYY-MM'), 'total') AS month,
        COUNT(DISTINCT mcte."projectId") AS total_project_with_milestone,
        COUNT(DISTINCT p2.id) AS total_projects,
        COUNT(DISTINCT scte.id) AS total_projects_with_submilestones,
        COUNT(DISTINCT pnm.id) AS project_with_no_milestones
    FROM
        MilestoneCTE mcte
    FULL JOIN
        SubmilestoneCTE scte ON mcte."projectId" = scte."projectId" AND mcte.month_milestone = scte.month_submilestone
    FULL JOIN
        "Projects" p2 ON COALESCE(mcte."projectId", scte."projectId") = p2.id
    LEFT JOIN
        PROJECT_NO_MILESTONES pnm ON p2.id = pnm.id
    GROUP BY GROUPING SETS ((mcte.month_milestone, pnm.month_nomilestone, TO_CHAR(COALESCE(mcte."createdAt", scte."createdAt", p2."createdAt"), 'YYYY-MM')), ())
    ORDER BY
        month;`;

      return graph;
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.ADMIN.PROJECT_OVERVIEW);
    }
  }

  async escrowAndPenaltyOverview() {
    try {
      return this.prisma.$queryRaw`WITH ESCROW AS (
        SELECT *, TO_CHAR(e."createdAt", 'YYYY-MM') AS month FROM "Escrow" e
    ), PENALTY AS (
        SELECT *, TO_CHAR(pb."createdAt", 'YYYY-MM') AS month FROM "PenalityBreach" pb WHERE pb."penalityType" = 'PENALTY'
    )
    
    select
       CASE WHEN e.month IS NULL THEN 'total' ELSE e.month END AS month,
        COUNT(DISTINCT e.id) AS escrow,
        COUNT(DISTINCT p.id) AS penalty_no
    FROM ESCROW e
    LEFT JOIN PENALTY p ON e.month = p.month
    GROUP BY GROUPING SETS ((e.month), ())
    ORDER BY e.month;
    `;
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.ADMIN.ESCORW_OVERVIEW);
    }
  }

  async royaltyManagementOverview() {
    try {
      return await this.prisma.$queryRaw`SELECT
      COALESCE(TO_CHAR(p."createdAt", 'YYYY-MM'), 'total') AS month,
      COUNT(*) FILTER(WHERE p."royaltyType" = 'PRE_PAYMENT_ROYALTY') AS pre_payment_royalty,
      COUNT(*) FILTER(WHERE p."royaltyType" = 'POST_KPI_ROYALTY') AS post_payment_royalty
    FROM "Milestones" p
    GROUP BY GROUPING SETS ((TO_CHAR(p."createdAt", 'YYYY-MM')), ())
    ORDER BY month;`;
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.ADMIN.ROYALTY_OVERVIEW);
    }
  }

  async performanceOverview() {
    try {
      return await this.prisma.$queryRaw`SELECT
      coalesce(TO_CHAR(d."createdAt", 'YYYY-MM') , 'total')AS month,
      COUNT(*) FILTER(WHERE d."status" = 'RESOLVED') AS resolved_disputes_with_mo,
      COUNT(*) FILTER(WHERE d."status" = 'CLOSED') AS resolved_without_mo,
      COUNT(*) FILTER(WHERE d."status" NOT IN ('CLOSED', 'RESOLVED')) AS unresolved,
      COUNT(*) AS total_disputes
  FROM "Dispute" d
  GROUP BY GROUPING SETS ((TO_CHAR(d."createdAt", 'YYYY-MM')), ())
  ORDER BY month;`;
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.ADMIN.PERFORMANCE_OVERVIEW);
    }
  }

  async financialRevenuePlatform() {
    try {
      return await this.prisma.$queryRaw`SELECT
      coalesce(TO_CHAR(pd."createdAt", 'YYYY-MM') , 'total')AS month,
      COUNT(*) FILTER (WHERE pd."currency" = 'USDC' AND pd."leftProjectFund" = '0') AS platform_usdc_rev,
      COUNT(*) FILTER (WHERE pd."currency" = 'HBAR' AND pd."leftProjectFund" = '0') AS platform_hbar_rev
   FROM "ProjectDetails" pd
   GROUP BY GROUPING SETS ((TO_CHAR(pd."createdAt", 'YYYY-MM')), ())
   order by month`;
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.ADMIN.FINANCIAL_REVENUE_OVERVIEW);
    }
  }

  async financialRevenuePurchaser() {
    try {
      return await this.prisma.$queryRaw`WITH HBAR_REV AS (
        SELECT
            m."id",
            m."milestoneStatus",
            m."fundAllocation",
            f."fundTypeId",
            f."fundTranscationIdFromEscrow",
            pd."currency",
            pd."createdAt" -- Replace with the actual column name
        FROM
            "Milestones" m
        LEFT JOIN
            "Funds" f ON f."fundTypeId" = m."id"
        LEFT JOIN 
            "ProjectDetails" pd ON pd."projectId" = m."projectId"
        WHERE
            pd."currency" = 'HBAR'
            AND m."milestoneStatus" = 'COMPLETED'
            AND m."milestoneType" = 'milestone'
            AND f."fundTranscationIdFromEscrow" IS NOT NULL
    ), USDC_REV AS (
        SELECT
            m."id",
            m."milestoneStatus",
            m."fundAllocation",
            f."fundTypeId",
            f."fundTranscationIdFromEscrow",
            pd."currency",
            pd."createdAt" -- Replace with the actual column name
        FROM
            "Milestones" m
        LEFT JOIN
            "Funds" f ON f."fundTypeId" = m."id"
        LEFT JOIN 
            "ProjectDetails" pd ON pd."projectId" = m."projectId"
        WHERE
            pd."currency" = 'USDC'
            AND m."milestoneStatus" = 'COMPLETED'
            AND m."milestoneType" = 'milestone'
            AND f."fundTranscationIdFromEscrow" IS NOT NULL
    )
    
    SELECT
        COALESCE(TO_CHAR(pr."createdAt", 'YYYY-MM'), 'total') AS month,
        SUM(pr."fundAllocation") AS hbar_totalFundAllocation,
        COALESCE(SUM(usdc."fundAllocation"), 0) AS usdc_totalFundAllocation
    FROM
        HBAR_REV pr
    LEFT JOIN USDC_REV usdc ON TO_CHAR(pr."createdAt", 'YYYY-MM') = TO_CHAR(usdc."createdAt", 'YYYY-MM')
    GROUP BY GROUPING SETS ((TO_CHAR(pr."createdAt", 'YYYY-MM')), ())
    ORDER BY
        month;`;
    } catch (error) {
      this.logger.error(error);
      throw new Error(MESSAGES.ERROR.ADMIN.FINANCIAL_REVENUE_OVERVIEW);
    }
  }

  async getLatestMoFee() {
    try {
      const commission = await this.prisma.fees.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: 1, // optional, if you only want the latest record
      });
      return commission[0];
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async addMooContractFee(params: { data: Prisma.FeesCreateInput }) {
    try {
      return await this.prisma.fees.create({ ...params });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
