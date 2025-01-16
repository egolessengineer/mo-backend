// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

import './Enums.sol';
import './HederaTokenService.sol';
import './HederaResponseCodes.sol';
import './IERC20.sol';

/// @title Milestone Contract
/// @notice Manages milestones and sub-milestones, including fund allocation, penalty calculations, and payouts.
/// @dev This contract facilitates the creation, management, and closure of milestones and their associated sub-milestones.
contract Milestone is HederaTokenService {
    /// @notice Data structure to represent a penalty for a milestone
    struct Penalty {
        uint32 duration; // Duration after which the penalty applies.
        uint256 penaltyValue; // The penalty value.
    }

    /// @notice Data structure to represent a milestone within the contract.
    struct MilestoneData {
        address provider; // Address of the milestone provider.
        string milestoneId; // Unique ID of the milestone.
        uint32 startDate; // Start date of the milestone in Unix timestamp format.
        uint32 endDate; // End date of the milestone in Unix timestamp format.
        uint256 fundAllocated; // Total fund allocated for this milestone.
        uint8 noOfRevision; // Maximum number of allowed revisions for the milestone.
        uint8 revisionCounter; // Counter to track the number of revisions made.
        MilestoneStatus state; // Current state of the milestone (e.g., INIT, FUNDED, COMPLETED, etc.).
        bool payoutStatus; // Indicates whether the payout for this milestone has been processed.
    }

    // Purchaser Wallet Address
    address public PURCHASER_ADDR;

    // Provider Wallet Address
    address public PROVIDER_ADDR;

    // Escrow Smart Contract Address
    address public ESCROW_CONTRACT_ADDR;

    // MO PLATFORM FEE WALLET ADDRESS
    address public MO_FEE_ADDR;

    // MO PLATFORM FEE PERCENT
    uint16 public MO_FEE_IN_PERCENT;

    // Array to store milestoneIds
    string[] private milestoneIds;

    // Mapping to store Milestone details against milestoneId <milestoneId <> MilestoneData>
    mapping(string => MilestoneData) private milestones;

    // Mapping to store Penalities of milestone <milestoneId <> Penalty[]>
    mapping(string => Penalty[]) private milestonePenalties;

    // Mapping to store sub milestone data against milestoneId <milestoneId <> <subMilestoneId<>MilestoneData>>
    mapping(string => mapping(string => MilestoneData)) private subMilestones;

    // Mapping to store array of subMilestoneIds against milestoneId <milestoneId <> subMilestoneId[]>
    mapping(string => string[]) private subMilestoneIds;

    // Currency type can be HBAR or USDC
    CurrencyType public currencyType = CurrencyType.HBAR;

    // USDC token address
    address public usdcTokenAddr;

    receive() external payable {}

    /// @dev Contract constructor to initialize addresses and fees.
    /// @param purchaserAddr The address of the purchaser.
    /// @param providerAddr The address of the provider.
    /// @param escrowContractAddr The address of the escrow contract.
    /// @param moFeeAddr The address of the MO fee wallet.
    /// @param moFeePercent The MO platform fee percentage.
    constructor(
        address purchaserAddr,
        address providerAddr,
        address escrowContractAddr,
        address moFeeAddr,
        uint16 moFeePercent,
        address _usdcTokenAddr
    ) {
        PURCHASER_ADDR = purchaserAddr;
        PROVIDER_ADDR = providerAddr;
        ESCROW_CONTRACT_ADDR = escrowContractAddr;
        MO_FEE_ADDR = moFeeAddr;
        MO_FEE_IN_PERCENT = moFeePercent;
        if (_usdcTokenAddr != address(0)) {
            currencyType = CurrencyType.USDC;
            usdcTokenAddr = _usdcTokenAddr;
        }
    }

    /// @dev Modifier to allow only the escrow contract to call the functions in this contract.
    modifier onlyEscrow() {
        require(
            msg.sender == ESCROW_CONTRACT_ADDR,
            'Only escrow contract can call the milestone contract'
        );
        _;
    }

    event MilestoneAdded(
        string milestoneId,
        uint256 fundAllocated,
        uint8 noOfRevisions
    );

    event SubMilestoneAdded(
        string subMilestoneId,
        uint256 fundAllocated,
        uint8 noOfRevisions
    );

    event ReleasedStakingReward(address owner, uint256 amount);

    /**
     * @dev Associates the contract with the specified token using HederaTokenService.
     */
    function tokenAssociate() external onlyEscrow {
        int256 response = HederaTokenService.associateToken(
            address(this),
            usdcTokenAddr
        );
        if (response != HederaResponseCodes.SUCCESS) {
            revert('Associate Failed');
        }
    }

    /// @notice Update the MO fee details.
    /// @dev Only the escrow contract can update MO fee details.
    /// @param _moFeeAddr The new MO fee wallet address.
    /// @param _moFeePercent The new MO platform fee percentage.
    function updateFeeDetails(
        address _moFeeAddr,
        uint16 _moFeePercent
    ) external onlyEscrow {
        MO_FEE_ADDR = _moFeeAddr;
        MO_FEE_IN_PERCENT = _moFeePercent;
    }

    // Helper function to split a string into an array using a delimiter
    function splitString(
        string memory input,
        string memory delimiter
    ) internal pure returns (string[] memory) {
        uint256 count = 1;

        bytes memory inputBytes = bytes(input);
        bytes memory delimiterBytes = bytes(delimiter);

        for (uint256 i = 0; i < inputBytes.length; i++) {
            if (inputBytes[i] == delimiterBytes[0]) {
                count++;
            }
        }

        string[] memory parts = new string[](count);
        uint256 startIndex = 0;
        uint256 partIndex = 0;

        for (uint256 i = 0; i < inputBytes.length; i++) {
            if (inputBytes[i] == delimiterBytes[0]) {
                parts[partIndex] = extractString(
                    inputBytes,
                    startIndex,
                    i - startIndex
                );
                startIndex = i + 1;
                partIndex++;
            }
        }

        parts[count - 1] = extractString(
            inputBytes,
            startIndex,
            inputBytes.length - startIndex
        );

        return parts;
    }

    // Helper function to extract a string from bytes
    function extractString(
        bytes memory source,
        uint256 startIndex,
        uint256 length
    ) internal pure returns (string memory) {
        bytes memory result = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = source[startIndex + i];
        }
        return string(result);
    }

    // Helper function to parse a string as a uint32
    function parseUint32(string memory _value) internal pure returns (uint32) {
        uint32 result = 0;
        bytes memory valueBytes = bytes(_value);

        for (uint256 i = 0; i < valueBytes.length; i++) {
            uint8 digit = uint8(valueBytes[i]);
            require(
                digit >= uint8(48) && digit <= uint8(57),
                'Invalid integer representation'
            );
            result = result * 10 + uint32(digit - uint8(48));
        }

        return result;
    }

    // Helper function to parse a string as a uint256
    function parseUint256(
        string memory _value
    ) internal pure returns (uint256) {
        uint256 result = 0;
        bytes memory valueBytes = bytes(_value);

        for (uint256 i = 0; i < valueBytes.length; i++) {
            uint8 digit = uint8(valueBytes[i]);
            require(
                digit >= uint8(48) && digit <= uint8(57),
                'Invalid integer representation'
            );
            result = result * 10 + uint256(digit - uint8(48));
        }

        return result;
    }

    /**
     * @notice Add multiple milestones to the project. Can only be called by the owner.
     * @param _milestoneIds An array of milestone IDs.
     * @param _startDates An array of milestone start dates in Unix timestamp format.
     * @param _endDates An array of milestone end dates in Unix timestamp format.
     * @param _fundAllocated An array of allocated funds for each milestone.
     * @param _noOfRevisions An array specifying the number of revisions allowed for each milestone.
     * @param _penaltyDurations An array of each specifying penalty durations for the corresponding milestone.
     * @param _penaltyValues An array of each specifying penalty values for the corresponding milestone.
     */
    function addMilestones(
        string[] memory _milestoneIds,
        uint32[] memory _startDates,
        uint32[] memory _endDates,
        uint256[] memory _fundAllocated,
        uint8[] memory _noOfRevisions,
        string[] memory _penaltyDurations,
        string[] memory _penaltyValues
    ) public onlyEscrow {
        for (uint256 i = 0; i < _milestoneIds.length; i++) {
            string memory milestoneId = _milestoneIds[i];
            uint32 startDate = _startDates[i];
            uint32 endDate = _endDates[i];
            uint256 milestoneFundAllocated = _fundAllocated[i];
            uint8 noOfRevision = _noOfRevisions[i];
            string memory penaltyDurations = _penaltyDurations[i];
            string memory penaltyValues = _penaltyValues[i];

            MilestoneData memory milestone = MilestoneData({
                provider: PROVIDER_ADDR,
                milestoneId: milestoneId,
                startDate: startDate,
                endDate: endDate,
                fundAllocated: milestoneFundAllocated,
                noOfRevision: noOfRevision,
                revisionCounter: 0,
                state: MilestoneStatus.INIT,
                payoutStatus: false
            });

            if (bytes(penaltyDurations).length > 0) {
                uint32[] memory durations = splitStringToUint32Array(
                    penaltyDurations,
                    '-'
                );
                uint256[] memory values = splitStringToUint256Array(
                    penaltyValues,
                    '-'
                );

                require(
                    durations.length == values.length,
                    'Penalty durations and penalty amount must have the same length'
                );

                for (uint256 j = 0; j < durations.length; j++) {
                    milestonePenalties[milestoneId].push(
                        Penalty({
                            duration: durations[j],
                            penaltyValue: values[j]
                        })
                    );
                }
            }

            milestones[milestoneId] = milestone;
            milestoneIds.push(milestoneId);
            emit MilestoneAdded(
                milestoneId,
                milestoneFundAllocated,
                noOfRevision
            );
        }
    }

    // Helper function to split a string with a delimiter and convert to uint32 array
    function splitStringToUint32Array(
        string memory input,
        string memory delimiter
    ) internal pure returns (uint32[] memory) {
        string[] memory stringArray = splitString(input, delimiter);
        uint32[] memory uint32Array = new uint32[](stringArray.length);
        for (uint256 i = 0; i < stringArray.length; i++) {
            uint32Array[i] = parseUint32(stringArray[i]);
        }
        return uint32Array;
    }

    // Helper function to split a string with a delimiter and convert to uint256 array
    function splitStringToUint256Array(
        string memory input,
        string memory delimiter
    ) internal pure returns (uint256[] memory) {
        string[] memory stringArray = splitString(input, delimiter);
        uint256[] memory uint256Array = new uint256[](stringArray.length);
        for (uint256 i = 0; i < stringArray.length; i++) {
            uint256Array[i] = parseUint256(stringArray[i]);
        }
        return uint256Array;
    }

    /// @notice Get all the milestone IDs.
    /// @return An array of all milestone IDs.
    function getAllMilestoneIds() external view returns (string[] memory) {
        return milestoneIds;
    }

    /// @notice Get the details of a specific milestone.
    /// @param _milestoneId The ID of the milestone.
    /// @return MilestoneData structure containing milestone details.
    function getMilestone(
        string memory _milestoneId
    ) external view returns (MilestoneData memory) {
        return milestones[_milestoneId];
    }

    /// @notice Change the state of a milestone.
    /// @dev Only the escrow contract can change the state of a milestone.
    /// @param _milestoneId The ID of the milestone.
    /// @param _state The new state to set for the milestone.
    /// @param _endDate The new end date for the milestone (used for REWORK state).
    function changeState(
        string memory _milestoneId,
        MilestoneStatus _state,
        uint32 _endDate
    ) external onlyEscrow {
        MilestoneData storage milestone = milestones[_milestoneId];
        require(
            bytes(milestone.milestoneId).length > 0,
            'Milestone does not exist'
        );
        checkStateChange(_state, milestone.state);
        if (_state == MilestoneStatus.REWORK) {
            require(
                milestone.revisionCounter < milestone.noOfRevision,
                'Milestone revision count exceeded'
            );
            milestone.endDate = _endDate;
            milestone.revisionCounter += 1;
        } else if (_state == MilestoneStatus.FUNDED) {
            if (subMilestoneIds[_milestoneId].length > 0) {
                for (
                    uint8 i = 0;
                    i < subMilestoneIds[_milestoneId].length;
                    i++
                ) {
                    Milestone.MilestoneData
                        storage subMilestone = subMilestones[_milestoneId][
                            subMilestoneIds[_milestoneId][i]
                        ];
                    if (subMilestone.state != MilestoneStatus.STOP) {
                        subMilestone.state = MilestoneStatus.FUNDED;
                    }
                }
            }
        }
        milestone.state = _state;
    }

    /// @notice Calculate the penalty for a milestone.
    /// @param _milestoneId The ID of the milestone.
    /// @return The calculated penalty amount for the milestone.
    function calculatePenalty(
        string memory _milestoneId
    ) internal view returns (uint256) {
        MilestoneData storage milestone = milestones[_milestoneId];
        uint256 penalty = 0;
        for (uint8 i = 0; i < milestonePenalties[_milestoneId].length; i++) {
            if (
                block.timestamp >
                milestone.endDate + milestonePenalties[_milestoneId][i].duration
            ) {
                penalty += milestonePenalties[_milestoneId][i].penaltyValue;
            }
        }
        return penalty;
    }

    /**
     * @notice Add multiple sub-milestones to an existing milestone.
     * @dev Only the escrow contract can add sub-milestones.
     * @param _individualProvider An array of individual provider's wallet addresses.
     * @param _milestoneId An array of IDs of the parent milestones.
     * @param _subMilestoneIds An array of IDs of the sub-milestones.
     * @param _startDates An array of sub-milestone start dates in Unix timestamp format.
     * @param _endDates An array of sub-milestone end dates in Unix timestamp format.
     * @param _fundAllocated An array of allocated funds for the sub-milestones.
     * @param _noOfRevisions An array specifying the number of revisions allowed for each sub-milestone.
     * @param _penaltyDurations An array of penalty durations for the corresponding sub-milestones.
     * @param _penaltyValues An array of penalty values for the corresponding sub-milestones.
     */
    function addSubMilestones(
        address payable[] memory _individualProvider,
        string memory _milestoneId,
        string[] memory _subMilestoneIds,
        uint32[] memory _startDates,
        uint32[] memory _endDates,
        uint256[] memory _fundAllocated,
        uint8[] memory _noOfRevisions,
        string[] memory _penaltyDurations,
        string[] memory _penaltyValues
    ) external onlyEscrow {
        MilestoneData storage milestone = milestones[_milestoneId];
        for (uint256 i = 0; i < _individualProvider.length; i++) {
            address payable individualProvider = payable(
                _individualProvider[i]
            );
            string memory subMilestoneId = _subMilestoneIds[i];
            uint32 startDate = _startDates[i];
            uint32 endDate = _endDates[i];
            uint256 fundAllocated = _fundAllocated[i];
            uint8 noOfRevisions = _noOfRevisions[i];
            string memory penaltyDurations = _penaltyDurations[i];
            string memory penaltyValues = _penaltyValues[i];

            MilestoneData memory subMilestone = MilestoneData({
                provider: individualProvider,
                milestoneId: subMilestoneId,
                startDate: startDate,
                endDate: endDate,
                fundAllocated: fundAllocated,
                noOfRevision: noOfRevisions,
                revisionCounter: 0,
                state: MilestoneStatus.INIT,
                payoutStatus: false
            });

            if (milestone.state == MilestoneStatus.FUNDED) {
                subMilestone.state = MilestoneStatus.FUNDED;
            }

            if (bytes(penaltyDurations).length > 0) {
                uint32[] memory durations = splitStringToUint32Array(
                    penaltyDurations,
                    '-'
                );
                uint256[] memory values = splitStringToUint256Array(
                    penaltyValues,
                    '-'
                );

                require(
                    durations.length == values.length,
                    'Penalty durations and penalty amount must have the same length'
                );

                for (uint256 j = 0; j < durations.length; j++) {
                    milestonePenalties[subMilestoneId].push(
                        Penalty({
                            duration: durations[j],
                            penaltyValue: values[j]
                        })
                    );
                }
            }

            subMilestones[milestone.milestoneId][subMilestoneId] = subMilestone;
            subMilestoneIds[milestone.milestoneId].push(subMilestoneId);
            emit SubMilestoneAdded(
                subMilestoneId,
                fundAllocated,
                noOfRevisions
            );
        }
    }

    /// @notice Get all the sub-milestone IDs for a given milestone.
    /// @param _milestoneId The ID of the parent milestone.
    /// @return An array of sub-milestone IDs for the specified milestone.
    function getAllSubMilestoneIds(
        string memory _milestoneId
    ) external view returns (string[] memory) {
        return subMilestoneIds[_milestoneId];
    }

    /// @notice Get the details of a specific sub-milestone.
    /// @param _milestoneId The ID of the parent milestone.
    /// @param _subMilestoneId The ID of the sub-milestone.
    /// @return MilestoneData structure containing sub-milestone details.
    function getSubMilestone(
        string memory _milestoneId,
        string memory _subMilestoneId
    ) external view returns (MilestoneData memory) {
        return subMilestones[_milestoneId][_subMilestoneId];
    }

    /// @notice Change the state of a sub-milestone.
    /// @dev Only the escrow contract can change the state of a sub-milestone.
    /// @param _milestoneId The ID of the parent milestone.
    /// @param _subMilestoneId The ID of the sub-milestone.
    /// @param _state The new state to set for the sub-milestone.
    /// @param _endDate The new end date for the sub-milestone (used for REWORK state).
    function changeSubMilestoneState(
        string memory _milestoneId,
        string memory _subMilestoneId,
        MilestoneStatus _state,
        uint32 _endDate
    ) external onlyEscrow {
        MilestoneData storage subMilestone = subMilestones[_milestoneId][
            _subMilestoneId
        ];
        require(
            bytes(subMilestone.milestoneId).length > 0,
            'SubMilestone does not exist'
        );
        checkStateChange(_state, subMilestone.state);
        if (_state == MilestoneStatus.REWORK) {
            require(
                subMilestone.revisionCounter < subMilestone.noOfRevision,
                'Milestone revision count exceeded'
            );
            subMilestone.endDate = _endDate;
            subMilestone.revisionCounter += 1;
        }
        subMilestone.state = _state;
    }

    /// @notice Check if a state change is allowed.
    /// @param newState The new state.
    /// @param currentState The current state.
    /// @return True if the state change is allowed; otherwise, false.
    function checkStateChange(
        MilestoneStatus newState,
        MilestoneStatus currentState
    ) internal pure returns (bool) {
        if (newState == MilestoneStatus.IN_PROGRESS) {
            require(
                currentState == MilestoneStatus.FUNDED ||
                    currentState == MilestoneStatus.REWORK,
                'This is not allowed'
            );
        } else if (newState == MilestoneStatus.IN_REVIEW) {
            require(
                currentState == MilestoneStatus.IN_PROGRESS,
                'Milestone must be in progress'
            );
        } else if (newState == MilestoneStatus.REWORK) {
            require(
                currentState == MilestoneStatus.IN_REVIEW,
                'Milestone must be in review'
            );
        } else if (newState == MilestoneStatus.STOP) {
            require(
                currentState == MilestoneStatus.FUNDED,
                'Milestone must be funded'
            );
        } else {
            return false;
        }
        return true;
    }

    /// @notice Calculate the penalty for a sub-milestone.
    /// @param _milestoneId The ID of the parent milestone.
    /// @param _subMilestoneId The ID of the sub-milestone.
    /// @return The calculated penalty amount for the sub-milestone.
    function calculateSubMilestonePenalty(
        string memory _milestoneId,
        string memory _subMilestoneId
    ) internal view returns (uint256) {
        MilestoneData storage subMilestone = subMilestones[_milestoneId][
            _subMilestoneId
        ];
        uint256 penalty = 0;
        for (uint8 i = 0; i < milestonePenalties[_subMilestoneId].length; i++) {
            if (
                block.timestamp >
                subMilestone.endDate +
                    milestonePenalties[_subMilestoneId][i].duration
            ) {
                penalty += milestonePenalties[_subMilestoneId][i].penaltyValue;
            }
        }
        return penalty;
    }

    /// @notice Process the payout for a milestone.
    /// @dev Only the escrow contract can process the payout.
    /// @param _milestoneId The ID of the milestone to payout.
    function payout(string memory _milestoneId) external onlyEscrow {
        MilestoneData storage milestone = milestones[_milestoneId];
        require(
            bytes(milestone.milestoneId).length > 0,
            'Milestone does not exist'
        );
        require(
            milestone.state == MilestoneStatus.COMPLETED,
            'milestone is not yet completed'
        );
        require(
            milestone.payoutStatus == false,
            'Payout has already been processed for this milestone'
        );
        uint256 totalSmPayout = 0;
        uint256 totalSmPenalty = 0;
        uint256 milestonePenalty = calculatePenalty(_milestoneId);
        if (subMilestoneIds[_milestoneId].length > 0 && milestonePenalty == 0) {
            for (uint8 i = 0; i < subMilestoneIds[_milestoneId].length; i++) {
                Milestone.MilestoneData memory subMilestone = subMilestones[
                    _milestoneId
                ][subMilestoneIds[_milestoneId][i]];
                // Transfer to IP for sub milestones
                totalSmPenalty += payoutSubMilestone(
                    _milestoneId,
                    subMilestone.milestoneId,
                    subMilestone.provider,
                    subMilestone.fundAllocated
                );
                subMilestone.payoutStatus = true;
                if (subMilestone.state != MilestoneStatus.COMPLETED) {
                    subMilestone.state = MilestoneStatus.COMPLETED;
                }
                totalSmPayout += subMilestone.fundAllocated;
            }
        }

        // Transfer to CP
        uint256 amountToPayCP = (milestone.fundAllocated -
            totalSmPayout -
            milestonePenalty) + totalSmPenalty;
        if (amountToPayCP > 0) {
            uint256 moTxFeeCP = (amountToPayCP * (MO_FEE_IN_PERCENT / 100)) /
                100;
            uint256 finalAmtToCP = amountToPayCP - moTxFeeCP;
            if (currencyType == CurrencyType.HBAR) {
                (bool providerSuccess, ) = payable(milestone.provider).call{
                    value: finalAmtToCP
                }('');
                require(providerSuccess, 'Transfer to CP failed');
            } else {
                IERC20(usdcTokenAddr).transfer(
                    payable(milestone.provider),
                    finalAmtToCP
                );
            }
        }

        // Transfer to purchaser - milestone penalty deductions
        if (milestonePenalty > 0) {
            uint256 moTxFeePurchaser = (milestonePenalty *
                (MO_FEE_IN_PERCENT / 100)) / 100;
            uint256 finalAmtToPurchaser = milestonePenalty - moTxFeePurchaser;
            if (currencyType == CurrencyType.HBAR) {
                (bool purchaserSuccess, ) = payable(PURCHASER_ADDR).call{
                    value: finalAmtToPurchaser
                }('');
                require(purchaserSuccess, 'Transfer to purchaser failed');
            } else {
                IERC20(usdcTokenAddr).transfer(
                    payable(PURCHASER_ADDR),
                    finalAmtToPurchaser
                );
            }
        }

        // Transfer Platform FEE to MO admin
        uint256 totalTxFee = (milestone.fundAllocated *
            (MO_FEE_IN_PERCENT / 100)) / 100;
        if (currencyType == CurrencyType.HBAR) {
            (bool feeSuccess, ) = payable(MO_FEE_ADDR).call{value: totalTxFee}(
                ''
            );
            require(feeSuccess, 'Transfer to MO admin failed');
        } else {
            IERC20(usdcTokenAddr).transfer(payable(MO_FEE_ADDR), totalTxFee);
        }
        milestone.payoutStatus = true;
    }

    /// @notice Process the payout for a sub-milestone.
    /// @param _milestoneId The ID of the parent milestone.
    /// @param _subMilestoneId The ID of the sub-milestone.
    /// @param _individualProvider The address of the individual provider for the sub-milestone.
    /// @param _payoutAmoumt The allocated funds for the sub-milestone.
    /// @return The calculated penalty amount for the sub-milestone.
    function payoutSubMilestone(
        string memory _milestoneId,
        string memory _subMilestoneId,
        address _individualProvider,
        uint256 _payoutAmoumt
    ) internal returns (uint256) {
        uint256 penaltyAmount = calculateSubMilestonePenalty(
            _milestoneId,
            _subMilestoneId
        );
        uint256 amountAfterPenalty = _payoutAmoumt - penaltyAmount;
        if (amountAfterPenalty > 0) {
            uint256 moPlatformFee = (amountAfterPenalty *
                (MO_FEE_IN_PERCENT / 100)) / 100;
            uint256 amountToPay = amountAfterPenalty - moPlatformFee;
            if (currencyType == CurrencyType.HBAR) {
                (bool amountSuccess, ) = payable(_individualProvider).call{
                    value: amountToPay
                }('');
                require(amountSuccess, 'Transfer to receiver failed');
            } else {
                IERC20(usdcTokenAddr).transfer(
                    payable(_individualProvider),
                    amountToPay
                );
            }
        }
        return penaltyAmount;
    }

    /**
     * @notice Release staking reward.
     * Can only be called by the Escrow contract.
     * @dev Distributes 50% of the current staked reward to the purchaser's address (PURCHASER_ADDR)
     *      and the remaining 50% to the MO platform fee wallet address (MO_FEE_ADDR).
     */
    function releaseStakingReward() external onlyEscrow {
        // Get the current staking reward balance of the contract
        uint256 hbarBalance = address(this).balance;

        if (hbarBalance > 0 && currencyType == CurrencyType.HBAR) {
            // Calculate 50% of the staked reward
            uint256 halfBalance = hbarBalance / 2;

            // Calculate the amount to transfer to the purchaser after cutting a fee
            uint256 purchaserAmount = (halfBalance *
                (100 - (MO_FEE_IN_PERCENT / 100))) / 100;

            (bool purchaserSuccess, ) = address(PURCHASER_ADDR).call{
                value: purchaserAmount
            }('');
            require(
                purchaserSuccess,
                'Failed to release staking reward to PURCHASER_ADDR'
            );

            emit ReleasedStakingReward(PURCHASER_ADDR, purchaserAmount);

            uint256 moFeeAmount = hbarBalance - purchaserAmount;
            (bool moFeeSuccess, ) = address(MO_FEE_ADDR).call{
                value: moFeeAmount
            }('');
            require(
                moFeeSuccess,
                'Failed to release staking reward to MO_FEE_ADDR'
            );

            emit ReleasedStakingReward(MO_FEE_ADDR, moFeeAmount);
        }
    }
}
