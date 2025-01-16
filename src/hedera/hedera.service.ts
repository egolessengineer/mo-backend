import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RequestUserDto } from 'src/auth/dto/request-user.dto';
import {
  AccountId,
  PrivateKey,
  Client,
  Hbar,
  ContractFunctionParameters,
  ContractExecuteTransaction,
  TopicCreateTransaction,
  PublicKey,
  TopicMessageSubmitTransaction,
  TopicId,
  ContractCreateTransaction,
  FileCreateTransaction,
  FileAppendTransaction,
  ContractCallQuery,
  ContractId,
  ContractUpdateTransaction,
} from '@hashgraph/sdk';
import { ConfigService } from '@nestjs/config';
import { configData } from 'src/config';
import axios from 'axios';
import Web3 from 'web3';
import { StorageService } from 'src/storage/storage.service';
import { Interface } from 'ethers';
import { TransactionsType } from '@prisma/client';

import { CONSTANT } from 'src/constants/constants';
import { ContractDeployStatus, ProjectUsers } from '@prisma/client';
import { ProjectRepository } from 'src/project/project.repository';
import { AdminRepository } from 'src/admin/admin.repository';
@Injectable()
export class HederaService {
  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly projectRepository: ProjectRepository,
    private readonly adminRepository: AdminRepository,
  ) {}

  private readonly logger = new Logger();
  config: any = configData(this.configService);
  web3 = new Web3();
  gasLimit = 10000000;

  client() {
    const operatorId = AccountId.fromString(this.config.HEDERA_ACCOUNT_ID);
    const operatorKey = PrivateKey.fromStringED25519(
      this.config.HEDERA_PRIVATE_KEY,
    );

    try {
      let client: Client;
      if (this.config.HEDERA_NETWORK == 'TESTNET') {
        client = Client.forTestnet();
      } else if (this.config.HEDERA_NETWORK == 'MAINNET') {
        client = Client.forMainnet();
      }

      client.setOperator(operatorId, operatorKey);
      return client;
    } catch (error) {
      this.logger.error(error);
      throw new Error(
        'Environment variables HEDERA_NETWORK, HEDERA_ACCOUNT_ID, and HEDERA_PRIVATE_KEY are required.',
      );
    }
  }

  async getEventsFromTransactionHash(
    user: RequestUserDto,
    transactionHash: string,
    event: string,
    functionName: string,
  ): Promise<any> {
    try {
      let response;
      try {
        response = await axios({
          method: 'get',
          url: `${this.config.HEDERA_TESTNET_ENDPOINT}/api/v1/contracts/results/${transactionHash}`,
          withCredentials: true,
        });
      } catch (error) {
        this.logger.error(error);
        return { error: true, message: error.message, cause: 'axios' };
      }

      const transaction = response.data;

      const output = [];
      for (let i = 0; i < transaction.logs.length; i++) {
        try {
          // decode the event data
          const log = transaction.logs[i];
          const data = await this.testDecodeEvent(log, event);
          output.push(data);
        } catch (error) {}
      }
      transaction.events = output;
      return transaction;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async testDecodeEvent(eventLog, event) {
    try {
      const iface = new Interface([
        'event MilestoneFunded(string milestoneId, uint256 amount)',
        'event MilestoneForceClosed(string milestoneId)',
        'event MilestonePayout(string milestoneId)',
        'event MilestoneStateChanged(string milestoneId,uint8 state,uint32 endDate)',
        'event SubMilestoneStateChanged(string subMilestoneId,uint8 state,uint32 endDate)',
        'event RoyaltyPaid(string milestoneId)',
        'event MilestoneRoyaltyFunded(string milestoneId, uint256 indexed amount)',
        'event SubMilestoneAdded(string subMilestoneId,uint256 fundAllocated, uint8 noOfRevisions)',
        'event FreeBalanceReleased(string projectId, uint256 amount)',
        // Todo: Add all the events here
      ]);

      const values = iface.decodeEventLog(
        event,
        eventLog.data,
        eventLog.topics,
      );
      const writableCopyofValues = { ...values };
      for (const i in writableCopyofValues) {
        const value = writableCopyofValues[i];
        if (typeof value == 'bigint') {
          writableCopyofValues[i] = Number(value).toString();
        }
      }

      return writableCopyofValues;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async eventMapping(functionName, event, logs) {
    // Returns the index of the event found in a transaction
    const output = [];
    const conditions = {
      [TransactionsType.MilestoneFunded]: {
        fundMilestone: (i) => i === 0,
        fundProject: (i) => i % 2 === 0,
        fundUsdcToMilestone: (i) => i === 1,
        fundUsdcToProject: (i) => i < logs.length - 3 && i % 2 === 0,
      },
      [TransactionsType.MilestoneForceClosed]: {
        forceCloseMilestone: (i) => i === 0,
      },
      [TransactionsType.MilestonePayout]: {
        payoutProject: (i) => i !== logs.length - 1,
        payoutMilestone: (i) => i === 0,
      },
      [TransactionsType.MilestoneStateChanged]: {
        changeMilestoneState: (i) => i === 0,
      },
      [TransactionsType.SubMilestoneStateChanged]: {
        changeSubMilestoneState: (i) => i === 0,
      },
      [TransactionsType.RoyaltyPaid]: {
        payoutProject: (i) => i % 2 === 1 && i !== logs.length - 1,
        payoutMilestoneRoyalty: (i) => i === 0,
      },
      [TransactionsType.SubMilestoneAdded]: {
        addSubMilestones: (i) => i >= 0,
      },
      [TransactionsType.FreeBalanceReleased]: {
        releaseFreeBalance: (i) => i == 0,
      },
    };

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      if (event in conditions && functionName in conditions[event]) {
        const condition = conditions[event][functionName];
        if (condition(i)) {
          output.push(log);
        }
      }
    }

    return output;
  }
  async addEscrow(projectData): Promise<any> {
    const client = this.client();

    const maxTransactionFee = new Hbar(100);
    client.setDefaultMaxTransactionFee(maxTransactionFee);
    client.setDefaultMaxQueryPayment(new Hbar(20));

    const result = {};

    let escrowContractId;

    const escrowData = await this.projectRepository.getEscrow({
      where: {
        projectId: projectData.id,
      },
    });

    try {
      const purchaserWalletAddress = AccountId.fromString(
        projectData.purchaserWalletAddress,
      ).toSolidityAddress();

      const providerWalletAddress = AccountId.fromString(
        projectData.providerWalletAddress,
      ).toSolidityAddress();

      const moFeeAddr = AccountId.fromString(
        this.config.MO_FEE_ADDR,
      ).toSolidityAddress();

      // Deploy the Escrow contract
      if (escrowData.escrowDeployedStatus != ContractDeployStatus.SUCCESS) {
        const escrowBytecode = await this.storageService.loadLocalFile(
          'src/smart-contract/bytecodes/Escrow_sol_Escrow.bin',
          true,
        );

        const feeData = await this.adminRepository.getLatestMoFee();

        const operatorKey = PrivateKey.fromStringED25519(
          this.config.HEDERA_PRIVATE_KEY,
        );

        // if (this.config.BYTECODE_FILEID) {
        //   this.logger.log(`- Using existing bytecode file ID: ${this.config.BYTECODE_FILEID}`);
        // } else {
        //     // Create a new file and store the contract bytecode
        //     const fileCreateTx = new FileCreateTransaction()
        //         .setKeys([operatorKey])
        //         .freezeWith(client);
        //     const fileCreateSign = await fileCreateTx.sign(operatorKey);
        //     const fileCreateSubmit = await fileCreateSign.execute(client);
        //     const fileCreateRx = await fileCreateSubmit.getReceipt(client);
        //     const bytecodeFileId = fileCreateRx.fileId;
        //     this.logger.log(`- The smart contract bytecode file ID is ${bytecodeFileId}`);

        //     // Append contents to the file
        //     const fileAppendTx = new FileAppendTransaction()
        //         .setFileId(bytecodeFileId)
        //         .setContents(escrowBytecode)
        //         .setMaxChunks(30)
        //         .freezeWith(client);
        //     const fileAppendSign = await fileAppendTx.sign(operatorKey);
        //     const fileAppendSubmit = await fileAppendSign.execute(client);
        //     const fileAppendRx = await fileAppendSubmit.getReceipt(client);
        //     this.logger.log(`- Content added: ${fileAppendRx.status} \n`);
        // }

        const totalProjectFund =
          projectData.ProjectDetails.currency == CONSTANT.CURRENCY_TYPE[0]
            ? projectData.ProjectDetails.totalProjectFund * CONSTANT.HBAR_VALUE
            : projectData.ProjectDetails.totalProjectFund * CONSTANT.USDC_VALUE;

        const escrowContractCreateTx = new ContractCreateTransaction()
          .setBytecodeFileId(this.config.BYTECODE_FILEID)
          .setGas(this.gasLimit)
          .setAdminKey(operatorKey)
          .setConstructorParameters(
            new ContractFunctionParameters()
              .addString(projectData.id)
              .addAddress(purchaserWalletAddress)
              .addAddress(providerWalletAddress)
              .addUint16(Math.round(parseFloat(feeData.commission) * 100))
              .addAddress(moFeeAddr)
              .addAddress(
                projectData.ProjectDetails.currency == CONSTANT.CURRENCY_TYPE[0]
                  ? CONSTANT.ZERO_ADDRESS
                  : this.config.USDC_ADDRESS,
              )
              .addUint256(totalProjectFund)
              .addUint8(
                CONSTANT.FUNDING_TYPE.indexOf(projectData.assignedFundTo),
              )
              .addUint8(
                CONSTANT.FUND_TRANSFER_TYPE.indexOf(
                  projectData.fundTransferType,
                ),
              ),
          );

        const escrowContractCreateSubmit = await escrowContractCreateTx.execute(
          client,
        );
        const escrowContractCreateRx =
          await escrowContractCreateSubmit.getReceipt(client);
        const contractId = escrowContractCreateRx.contractId;
        this.logger.log(`Escrow contract ID: ${contractId}`);

        escrowContractId = contractId;

        if (projectData.ProjectDetails.currency == CONSTANT.CURRENCY_TYPE[1]) {
          // Execute token association step
          const tokenAssociate = new ContractExecuteTransaction()
            .setContractId(
              escrowContractId ? escrowContractId : escrowData.escrowContractId,
            )
            .setGas(15000000)
            .setFunction('tokenAssociate');
          const tokenAssociateTx = await tokenAssociate.execute(client);
          const tokenAssociateRx = await tokenAssociateTx.getReceipt(client);
          const tokenAssociateStatus = tokenAssociateRx.status;

          this.logger.log(
            'Token associate transaction status: ' +
              tokenAssociateStatus.toString(),
          );
        }

        //Get the Milestone contract address
        const getMilestoneAddressQueryTx = await new ContractCallQuery()
          .setContractId(escrowContractId)
          .setGas(this.gasLimit)
          .setFunction('getMilestoneContract');
        const getMilestoneAddressSubmit =
          await getMilestoneAddressQueryTx.execute(client);
        const milestoneAddress = getMilestoneAddressSubmit.getAddress(0);
        const milestoneContractId = ContractId.fromEvmAddress(
          0,
          0,
          milestoneAddress,
        );

        //Update the staking reward on Milestone contract
        const milestoneStakingTx = await new ContractUpdateTransaction()
          .setContractId(milestoneContractId)
          .setStakedNodeId(parseInt(this.config.NODE_ADDRESS))
          .setDeclineStakingReward(false)
          .freezeWith(client);

        const milestoneStakingSignTx = await milestoneStakingTx.sign(
          operatorKey,
        );
        const milestoneStakingTxResponse = await milestoneStakingSignTx.execute(
          client,
        );
        const milestoneStakingReceipt =
          await milestoneStakingTxResponse.getReceipt(client);
        const milestoneStakingTxStatus = milestoneStakingReceipt.status;

        this.logger.log(
          'The consensus status of the milestone staking reward transaction is ' +
            milestoneStakingTxStatus,
        );

        //Get the Royalty contract address
        const getRoyaltyAddressQueryTx = await new ContractCallQuery()
          .setContractId(escrowContractId)
          .setGas(this.gasLimit)
          .setFunction('getRoyaltyContract');
        const getRoyaltyAddressSubmit = await getRoyaltyAddressQueryTx.execute(
          client,
        );
        const royaltyAddress = getRoyaltyAddressSubmit.getAddress(0);
        const royaltyContractId = ContractId.fromEvmAddress(
          0,
          0,
          royaltyAddress,
        );

        //Update the staking reward on Royalty contract
        const royaltyStakingTx = await new ContractUpdateTransaction()
          .setContractId(royaltyContractId)
          .setStakedNodeId(parseInt(this.config.NODE_ADDRESS))
          .setDeclineStakingReward(false)
          .freezeWith(client);

        const royaltyStakingSignTx = await royaltyStakingTx.sign(operatorKey);
        const royaltyStakingTxResponse = await royaltyStakingSignTx.execute(
          client,
        );
        const royaltyStakingReceipt = await royaltyStakingTxResponse.getReceipt(
          client,
        );
        const royaltyStakingTxStatus = royaltyStakingReceipt.status;

        this.logger.log(
          'The consensus status of the royalty staking reward transaction is ' +
            royaltyStakingTxStatus,
        );

        result['escrowAddress'] = contractId.toSolidityAddress();
        result['escrowDeployedStatus'] =
          escrowContractCreateRx.status.toString();
      }

      //adding milestones and royalties for project
      const batchSize = 7;
      if (escrowData.addMilestoneStatus != ContractDeployStatus.SUCCESS) {
        const milestoneCount = projectData.Milestones.length;

        // Loop through milestones in batches of batchSize
        for (let i = 0; i < milestoneCount; i += batchSize) {
          const batchMilestones = projectData.Milestones.slice(
            i,
            i + batchSize,
          );

          const milestoneIds = [];
          const startDates = [];
          const endDates = [];
          const fundAllocated = [];
          const noOfRevisions = [];
          const royaltyTypes = [];
          const royaltyAmounts = [];
          const penaltyDurations = [];
          const penaltyValues = [];

          for (const milestone of batchMilestones) {
            const fundAllocation =
              projectData.ProjectDetails.currency == CONSTANT.CURRENCY_TYPE[0]
                ? milestone.fundAllocation * CONSTANT.HBAR_VALUE
                : milestone.fundAllocation * CONSTANT.USDC_VALUE;

            let royaltyAmount;

            if (milestone.royaltyValueIn === 'AMOUNT') {
              royaltyAmount = milestone.royaltyAmount;
            } else if (milestone.royaltyValueIn === 'PERCENT') {
              const percentage = parseFloat(milestone.royaltyAmount) / 100;
              royaltyAmount = milestone.fundAllocation * percentage;
            }

            royaltyAmount *=
              projectData.ProjectDetails.currency === CONSTANT.CURRENCY_TYPE[0]
                ? CONSTANT.HBAR_VALUE
                : CONSTANT.USDC_VALUE;

            const milestonePenaltyDurations = [];
            const milestonePenaltyValues = [];

            if (milestone.PenalityBreach.length > 0) {
              for (const penaltyData of milestone.PenalityBreach) {
                let penaltyAmount;

                if (penaltyData.valueIn === 'AMOUNT') {
                  penaltyAmount = penaltyData.pentality;
                } else if (penaltyData.valueIn === 'PERCENT') {
                  const percentage = parseFloat(penaltyData.pentality) / 100;
                  penaltyAmount = milestone.fundAllocation * percentage;
                }

                penaltyAmount *=
                  projectData.ProjectDetails.currency ===
                  CONSTANT.CURRENCY_TYPE[0]
                    ? CONSTANT.HBAR_VALUE
                    : CONSTANT.USDC_VALUE;

                penaltyAmount = Math.round(penaltyAmount);

                milestonePenaltyDurations.push(
                  penaltyData.timeperiod.toString(),
                );
                milestonePenaltyValues.push(penaltyAmount.toString());
              }
            }

            milestoneIds.push(milestone.id);
            startDates.push(
              Math.floor(Date.parse(milestone.startDate.toString()) / 1000),
            );
            endDates.push(
              Math.floor(Date.parse(milestone.endDate.toString()) / 1000),
            );
            fundAllocated.push(fundAllocation);
            noOfRevisions.push(milestone.revisions);
            royaltyTypes.push(
              CONSTANT.ROYALTY_TYPE.indexOf(milestone.royaltyType),
            );
            royaltyAmounts.push(Math.round(royaltyAmount));
            penaltyDurations.push(milestonePenaltyDurations.join('-'));
            penaltyValues.push(milestonePenaltyValues.join('-'));
          }

          // Call the contract function with the batch of parameters
          const addMilestonesExecTx = await new ContractExecuteTransaction()
            .setContractId(
              escrowContractId ? escrowContractId : escrowData.escrowContractId,
            )
            .setGas(this.gasLimit)
            .setFunction(
              'addMilestones',
              new ContractFunctionParameters()
                .addStringArray(milestoneIds)
                .addUint32Array(startDates)
                .addUint32Array(endDates)
                .addUint256Array(fundAllocated)
                .addUint8Array(noOfRevisions)
                .addUint8Array(royaltyTypes)
                .addUint256Array(royaltyAmounts)
                .addStringArray(penaltyDurations)
                .addStringArray(penaltyValues),
            );

          const submitMilestonesExecTx = await addMilestonesExecTx.execute(
            client,
          );
          const milestonesReceipt = await submitMilestonesExecTx.getReceipt(
            client,
          );

          this.logger.log(
            'The add milestones transaction status is ' +
              milestonesReceipt.status.toString(),
          );
          this.logger.log(
            'The add milestones transaction id is ' +
              submitMilestonesExecTx.transactionId,
          );

          result['addMilestoneStatus'] = ContractDeployStatus.SUCCESS;
        }
      }

      // transfering ownership to purchaser
      if (escrowData.transferOwnershipStatus != ContractDeployStatus.SUCCESS) {
        const transferOwnershipExecTx = await new ContractExecuteTransaction()
          .setContractId(
            escrowContractId ? escrowContractId : escrowData.escrowContractId,
          )
          .setGas(this.gasLimit)
          .setFunction(
            'transferOwnership',
            new ContractFunctionParameters().addAddress(purchaserWalletAddress),
          );
        const submitTransferOwnershipExecTx =
          await transferOwnershipExecTx.execute(client);
        const transferOwnershipReceipt =
          await submitTransferOwnershipExecTx.getReceipt(client);
        this.logger.log(
          'The transferOwnership status is ' +
            transferOwnershipReceipt.status.toString(),
        );
        result['transferOwnershipStatus'] =
          transferOwnershipReceipt.status.toString();
      }

      return {
        escrowContractId: escrowContractId
          ? escrowContractId.toString()
          : escrowData.escrowContractId,
        escrowAddress: result['escrowAddress']
          ? result['escrowAddress']
          : escrowData.escrowAddress,
        escrowDeployedStatus: result['escrowDeployedStatus']
          ? result['escrowDeployedStatus']
          : escrowData.escrowDeployedStatus,
        addMilestoneStatus: result['addMilestoneStatus']
          ? result['addMilestoneStatus']
          : escrowData.addMilestoneStatus,
        transferOwnershipStatus: result['transferOwnershipStatus']
          ? result['transferOwnershipStatus']
          : escrowData.transferOwnershipStatus,
        error: {},
      };
    } catch (error) {
      this.logger.error(error);
      return {
        escrowContractId: escrowContractId
          ? escrowContractId.toString()
          : escrowData.escrowContractId,
        escrowAddress: escrowData.escrowAddress
          ? escrowData.escrowAddress
          : result['escrowAddress'] || null,
        escrowDeployedStatus:
          escrowData.escrowAddress || result['escrowAddress']
            ? ContractDeployStatus.SUCCESS
            : ContractDeployStatus.FAILED,
        addMilestoneStatus:
          escrowData.addMilestoneStatus == ContractDeployStatus.SUCCESS ||
          result['addMilestoneStatus']
            ? ContractDeployStatus.SUCCESS
            : ContractDeployStatus.FAILED,
        transferOwnershipStatus:
          escrowData.transferOwnershipStatus == ContractDeployStatus.SUCCESS ||
          result['transferOwnershipStatus']
            ? ContractDeployStatus.SUCCESS
            : ContractDeployStatus.FAILED,
        error,
      };
    }
  }

  async createTopic(topicDetails, client = null) {
    try {
      const { submitKey, topicMemo } = topicDetails;

      const transaction = new TopicCreateTransaction().setAutoRenewPeriod(
        7776000,
      );

      if (client) {
        transaction.setAdminKey(PublicKey.fromString(client.publicKey));
        transaction.setAutoRenewAccountId(
          AccountId.fromString(client.accountId),
        );
      }
      if (submitKey) {
        transaction.setSubmitKey(PublicKey.fromString(submitKey));
      }
      if (topicMemo) {
        transaction.setTopicMemo(topicMemo);
      }

      const response = await transaction.execute(this.client());
      const receipt = await response.getReceipt(this.client());

      return {
        topicId: receipt.topicId.toString(),
        receipt,
      };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  /**
   * Submit a message to HCS
   * @param {string} topicId What is the topic ID?
   * @param {string} message What message do you want to send?
   * @returns The Topic ID, message, and the Transaction ID
   */
  async submitMessage(topicId, message, options) {
    try {
      const submitMsgTx = await new TopicMessageSubmitTransaction()
        .setTopicId(TopicId.fromString(topicId))
        .setMessage(message)
        .freezeWith(this.client())
        .sign(PrivateKey.fromString(options.adminKey));

      const submitMsgTxSubmit = await submitMsgTx.execute(this.client());
      const receipt = await submitMsgTxSubmit.getReceipt(this.client());
      return {
        topicId: topicId,
        message: message,
        transactionId: submitMsgTx.transactionId.toString(),
        topicSequenceNumber: receipt.topicSequenceNumber.toString(),
      };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  /**
   * Get a specific message from HCS
   * @param {string} topicId What is the ID of the topic?
   * @param {string} transactionId What is the message's Transaction Id?
   * @returns The message stored in HCS
   */
  async getMessage(topicId, transactionId) {
    try {
      transactionId = transactionId.replace(/\./g, '').replace(/@/g, '');
      const url = `https://api-testnet.dragonglass.me/hedera/api/v1/topics/${topicId}/messages?transactionID=${transactionId}`;
      const options = {
        method: 'GET',
        headers: {
          'X-API-KEY': 'MESSAGE_SERVICE.ACCESS_KEY',
        },
      };
      const request = await fetch(url, options);
      const response = JSON.parse(await request.text());

      return Buffer.from(response.data[0].message, 'hex').toString();
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
