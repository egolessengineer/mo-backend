// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

import './Enums.sol';
import './HederaTokenService.sol';
import './HederaResponseCodes.sol';
import './IERC20.sol';

/// @title Royalty Contract
/// @notice A smart contract for handling milestone royalties.
contract Royalty is HederaTokenService {
    // Struct to represent milestone royalty details,
    struct MilestoneRoyalty {
        string milestoneId;
        RoyaltyType royaltyType;
        uint256 royaltyAmount;
        RoyaltyStatus state;
        address provider;
    }

    // ESCROW SMART CONTRACT ADDRESS
    address public PURCHASER_ADDR;

    // Provider Wallet Address
    address public PROVIDER_ADDR;

    // ESCROW SMART CONTRACT ADDRESS
    address public ESCROW_CONTRACT_ADDR;

    // MO PLATFORM FEE WALLET ADDRESS
    address public MO_FEE_ADDR;

    // MO PLATFORM FEE PERCENT
    uint16 public MO_FEE_IN_PERCENT;

    // Mapping to store milestone royalty against milestoneId <milestoneId <> MilestoneRoyalty>
    mapping(string => MilestoneRoyalty) royalties;

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
            'Only escrow contract can call the royalty contract'
        );
        _;
    }

    event MilestoneRoyaltyAdded(
        string milestoneId,
        RoyaltyType royaltyType,
        uint256 royaltyAmount
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

    /**
     * @notice Add milestone royalties for multiple milestones.
     * @param _milestoneIds An array of milestone IDs.
     * @param _royaltyTypes An array specifying the type of royalty for each milestone.
     * @param _royaltyAmounts An array of royalty amounts for each milestone.
     */
    function addMilestoneRoyalties(
        string[] memory _milestoneIds,
        RoyaltyType[] memory _royaltyTypes,
        uint256[] memory _royaltyAmounts
    ) external onlyEscrow {
        for (uint256 i = 0; i < _milestoneIds.length; i++) {
            string memory _milestoneId = _milestoneIds[i];
            RoyaltyType _royaltyType = _royaltyTypes[i];
            uint256 _royaltyAmount = _royaltyAmounts[i];

            MilestoneRoyalty storage royalty = royalties[_milestoneId];

            royalty.milestoneId = _milestoneId;
            royalty.royaltyType = _royaltyType;
            royalty.royaltyAmount = _royaltyAmount;
            royalty.state = RoyaltyStatus.INIT;
            royalty.provider = PROVIDER_ADDR;
            emit MilestoneRoyaltyAdded(
                _milestoneId,
                _royaltyType,
                _royaltyAmount
            );
        }
    }

    /// @notice Get milestone royalty details for a given milestone.
    /// @param _milestoneId The ID of the milestone.
    /// @return MilestoneRoyalty structure containing milestone royalty details.
    function getMilestoneRoyalty(
        string memory _milestoneId
    ) external view returns (MilestoneRoyalty memory) {
        return royalties[_milestoneId];
    }

    /// @notice Pay milestone royalty to the respective providers and MO platform.
    /// @param _milestoneId The ID of the milestone.
    function payMilestoneRoyalty(
        string memory _milestoneId
    ) external onlyEscrow {
        MilestoneRoyalty storage royalty = royalties[_milestoneId];
        require(
            royalty.state == RoyaltyStatus.INIT,
            'Royalty has already been paid!'
        );

        // Transfer Royalty to CP
        uint256 moPlatformFee = (royalty.royaltyAmount *
            (MO_FEE_IN_PERCENT / 100)) / 100;
        uint256 royaltyToPay = royalty.royaltyAmount - moPlatformFee;

        if (currencyType == CurrencyType.HBAR) {
            (bool amountSuccess, ) = payable(royalty.provider).call{
                value: royaltyToPay
            }('');
            require(amountSuccess, 'Transfer to CP failed');
        } else {
            IERC20(usdcTokenAddr).transfer(
                payable(royalty.provider),
                royaltyToPay
            );
        }

        // Transfer Platform Fee to MO admin
        if (currencyType == CurrencyType.HBAR) {
            (bool onePercentSuccess, ) = payable(MO_FEE_ADDR).call{
                value: moPlatformFee
            }('');
            require(onePercentSuccess, 'Transfer to MO admin failed');
        } else {
            IERC20(usdcTokenAddr).transfer(payable(MO_FEE_ADDR), moPlatformFee);
        }

        royalty.state = RoyaltyStatus.PAYED_OUT;
    }

    /// @notice Forcefully close payout for a milestone
    /// @param _milestoneId The ID of the milestone.
    function forceClosePayout(string memory _milestoneId) external onlyEscrow {
        MilestoneRoyalty storage royalty = royalties[_milestoneId];
        require(
            royalty.state == RoyaltyStatus.INIT,
            'Royalty has already been paid!'
        );

        uint256 moPlatformFee = (royalty.royaltyAmount *
            (MO_FEE_IN_PERCENT / 100)) / 100;
        uint256 remainingAmount = royalty.royaltyAmount - moPlatformFee;

        // Transfer remaining amount to purchase
        if (currencyType == CurrencyType.HBAR) {
            (bool remainingAmountSuccess, ) = payable(PURCHASER_ADDR).call{
                value: remainingAmount
            }('');
            require(remainingAmountSuccess, 'Transfer to purchaser failed');
        } else {
            IERC20(usdcTokenAddr).transfer(
                payable(PURCHASER_ADDR),
                remainingAmount
            );
        }

        // Transfer platform fee to MO admin
        if (currencyType == CurrencyType.HBAR) {
            (bool feeSuccess, ) = payable(MO_FEE_ADDR).call{
                value: moPlatformFee
            }('');
            require(feeSuccess, 'Transfer to MO admin failed');
        } else {
            IERC20(usdcTokenAddr).transfer(payable(MO_FEE_ADDR), moPlatformFee);
        }

        royalty.state = RoyaltyStatus.FORCE_CLOSED;
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
