// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

import './Enums.sol';
import './Milestone.sol';
import './Royalty.sol';
import './HederaTokenService.sol';
import './HederaResponseCodes.sol';
import './IERC20.sol';

/**
 * @title Escrow Contract
 * @notice This contract facilitates the escrow of funds for a project, including milestones and royalties.
 */
contract Escrow is HederaTokenService {
    // Initially Wallet Address who will deploy the contracts
    address public OWNER_ADDR;

    // Reference Project Id
    string public projectId;

    // Purchaser Wallet Address
    address payable public PURCHASER_ADDR;

    // Provider Wallet Address
    address payable public PROVIDER_ADDR;

    // Total project allocated fund including royalty
    uint256 public totalFundAllocated;

    // Escrow funding type either project or milestone level
    FundingType public fundingType;

    // Fund transfer type can be either project or milestone level
    FundTransferType public fundTransferType;

    // Currency type can be HBAR or USDC
    CurrencyType public currencyType = CurrencyType.HBAR;

    // MO Platform Fee Wallet Address
    address public MO_FEE_ADDR;

    // MO Platform Fee Percent
    uint16 public MO_FEE_PERCENT;

    // Milestone Smart Contract Address
    Milestone public milestoneContract;

    // Royalty Smart Contract Address
    Royalty public royaltyContract;

    // To track current fund allocated on milestine + royalty
    uint256 public currentFundAllocated = 0;

    // Mapping to store milestone allocated fund
    mapping(string => uint256) currMilestoneFund;

    // USDC token address
    address public usdcTokenAddr;

    /**
     * @notice Constructor to initialize the Escrow contract.
     * @param _projectId Unique project ID.
     * @param _purchaser Purchaser's wallet address.
     * @param _provider Provider's wallet address.
     * @param _totalFundAllocated Total allocated funds for the project, including royalties.
     * @param _fundingType Type of funding (project or milestone).
     * @param _fundTransferType Type of fund transfer (project or milestone level).
     */
    constructor(
        string memory _projectId,
        address payable _purchaser,
        address payable _provider,
        uint16 _moFeePercent,
        address payable _moFeeAddress,
        address _usdcTokenAddr,
        uint256 _totalFundAllocated,
        FundingType _fundingType,
        FundTransferType _fundTransferType
    ) {
        OWNER_ADDR = msg.sender;
        projectId = _projectId;
        PURCHASER_ADDR = _purchaser;
        PROVIDER_ADDR = _provider;
        MO_FEE_PERCENT = _moFeePercent;
        MO_FEE_ADDR = _moFeeAddress;
        totalFundAllocated = _totalFundAllocated;
        fundingType = _fundingType;
        fundTransferType = _fundTransferType;

        if (_usdcTokenAddr != address(0)) {
            currencyType = CurrencyType.USDC;
            usdcTokenAddr = _usdcTokenAddr;
        }

        milestoneContract = new Milestone(
            _purchaser,
            _provider,
            address(this),
            _moFeeAddress,
            MO_FEE_PERCENT,
            _usdcTokenAddr
        );

        royaltyContract = new Royalty(
            _purchaser,
            _provider,
            address(this),
            _moFeeAddress,
            MO_FEE_PERCENT,
            _usdcTokenAddr
        );
    }

    receive() external payable {}

    // Owner is purchaser
    modifier onlyOwner() {
        require(msg.sender == OWNER_ADDR, 'Only owner can call this function');
        _;
    }

    modifier onlyPurchaser() {
        require(
            msg.sender == PURCHASER_ADDR,
            'Only purchaser can call this function'
        );
        _;
    }

    modifier onlyProvider() {
        require(msg.sender == PROVIDER_ADDR, 'Only CP can call this function');
        _;
    }

    modifier onlyPurchaserOrProvider() {
        require(
            msg.sender == PURCHASER_ADDR || msg.sender == PROVIDER_ADDR,
            'Only purchaser or provider can call this function'
        );
        _;
    }

    event OwnershipTransferred(address previousOwner, address newOwner);

    event FeeUpdated(address feeAddr, uint256 feePercent);

    event MilestoneFunded(string milestoneId, uint256 amount);

    event MilestoneRoyaltyFunded(string milestoneId, uint256 royaltyAmount);

    event MilestoneStateChanged(
        string milestoneId,
        MilestoneStatus state,
        uint32 endDate
    );

    event SubMilestoneStateChanged(
        string subMilestoneId,
        MilestoneStatus state,
        uint32 endDate
    );

    event MilestonePayout(string milestoneId);

    event RoyaltyPaid(string milestoneId);

    event RoyaltyReleased(string milestoneId);

    event FreeBalanceReleased(string projectId, uint256 amount);

    // Function to get the address of the deployed Milestone contract
    function getMilestoneContract() external view onlyOwner returns (address) {
        return address(milestoneContract);
    }

    // Function to get the address of the deployed Royalty contract
    function getRoyaltyContract() external view onlyOwner returns (address) {
        return address(royaltyContract);
    }

    /**
     * @notice Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     * @param _newOwner Address of the new owner.
     */
    function transferOwnership(address _newOwner) public virtual onlyOwner {
        require(_newOwner != address(0), 'new owner is the zero address');
        address oldOwner = OWNER_ADDR;
        OWNER_ADDR = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }

    /**
     * @notice Check allowance and verify it against the total project fund.
     * @param owner the owner of the tokens to be spent
     * @param amountRequired The minimum required allowance amount.
     */
    function checkAllowance(address owner, uint256 amountRequired) internal {
        (int256 responseCode, uint256 allowanceAmount) = HederaTokenService
            .allowance(usdcTokenAddr, owner, address(this));

        require(
            responseCode == HederaResponseCodes.SUCCESS,
            'Allowance check failed'
        );
        require(
            allowanceAmount >= amountRequired,
            'Allowance amount is insufficient'
        );
    }

    /**
     * @dev Associates the contract with the specified token using HederaTokenService.
     *      Calls tokenAssociate function on MilestoneContract and RoyaltyContract.
     */
    function tokenAssociate() external onlyOwner {
        int256 response = HederaTokenService.associateToken(
            address(this),
            usdcTokenAddr
        );
        milestoneContract.tokenAssociate();
        royaltyContract.tokenAssociate();
        if (response != HederaResponseCodes.SUCCESS) {
            revert('Associate Failed');
        }
    }

    /**
     * @notice Update MO fee details, including MO fee address and MO fee percentage.
     * Can only be called by the owner.
     * @param _moFeeAddr Address for MO fees.
     * @param _moFeePercent Percentage of MO fees.
     */
    function updateFeeDetails(
        address _moFeeAddr,
        uint16 _moFeePercent
    ) external onlyOwner {
        require(_moFeeAddr != address(0), 'Fee address is the zero address');
        MO_FEE_ADDR = _moFeeAddr;
        MO_FEE_PERCENT = _moFeePercent;
        milestoneContract.updateFeeDetails(_moFeeAddr, _moFeePercent);
        royaltyContract.updateFeeDetails(_moFeeAddr, _moFeePercent);
        emit FeeUpdated(_moFeeAddr, _moFeePercent);
    }

    /**
     * @notice Add multiple milestones to the project. Can only be called by the owner.
     * @param _milestoneIds An array of milestone IDs.
     * @param _startDates An array of milestone start dates in Unix timestamp format.
     * @param _endDates An array of milestone end dates in Unix timestamp format.
     * @param _fundAllocated An array of allocated funds for each milestone.
     * @param _noOfRevisions An array specifying the number of revisions allowed for each milestone.
     * @param _royaltyTypes An array specifying the type of royalty (PRE_PAYMENT or POST_KPI) for each milestone.
     * @param _royaltyAmounts An array of royalty amounts for each milestone.
     * @param _penaltyDurations An array of each specifying penalty durations for the corresponding milestone.
     * @param _penaltyValues An array of each specifying penalty values for the corresponding milestone.
     */
    function addMilestones(
        string[] memory _milestoneIds,
        uint32[] memory _startDates,
        uint32[] memory _endDates,
        uint256[] memory _fundAllocated,
        uint8[] memory _noOfRevisions,
        RoyaltyType[] memory _royaltyTypes,
        uint256[] memory _royaltyAmounts,
        string[] memory _penaltyDurations,
        string[] memory _penaltyValues
    ) public onlyOwner {
        uint256 totalAllocatedFund = 0;
        for (uint256 i = 0; i < _milestoneIds.length; i++) {
            Milestone.MilestoneData memory milestone = milestoneContract
                .getMilestone(_milestoneIds[i]);
            Royalty.MilestoneRoyalty memory milestoneRoyalty = royaltyContract
                .getMilestoneRoyalty(_milestoneIds[i]);

            require(
                bytes(milestone.milestoneId).length == 0,
                'Milestone already exists'
            );

            require(
                bytes(milestoneRoyalty.milestoneId).length == 0,
                'Royalty already exists'
            );

            require(_royaltyAmounts[i] > 0, 'royalty is mandatory');
            require(
                _endDates[i] > _startDates[i],
                'end date must be greater than start date'
            );
            require(
                currentFundAllocated +
                    totalAllocatedFund +
                    _fundAllocated[i] +
                    _royaltyAmounts[i] <=
                    totalFundAllocated,
                'exceeding project allocated fund'
            );
            totalAllocatedFund += _fundAllocated[i] + _royaltyAmounts[i];
        }

        milestoneContract.addMilestones(
            _milestoneIds,
            _startDates,
            _endDates,
            _fundAllocated,
            _noOfRevisions,
            _penaltyDurations,
            _penaltyValues
        );

        royaltyContract.addMilestoneRoyalties(
            _milestoneIds,
            _royaltyTypes,
            _royaltyAmounts
        );
        currentFundAllocated += totalAllocatedFund;
    }

    /**
     * @notice Add a sub-milestone to a milestone.
     * Can only be called by the provider.
     * @param _individualProvider Individual provider's wallet address.
     * @param _milestoneId ID of the parent milestone.
     * @param _subMilestoneIds ID of the sub-milestone.
     * @param _startDates Sub-milestone start date in Unix timestamp.
     * @param _endDates Sub-milestone end date in Unix timestamp.
     * @param _fundAllocated Allocated fund for the sub-milestone.
     * @param _noOfRevisions Number of revisions allowed for the sub-milestone.
     * @param _penaltyDurations Array of penalty durations.
     * @param _penaltyValues Array of penalty values.
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
    ) public onlyProvider {
        uint256 totalSubMilestonesFund = 0;
        Milestone.MilestoneData memory milestone = milestoneContract
            .getMilestone(_milestoneId);
        require(bytes(milestone.milestoneId).length > 0, 'Milestone not exist');
        require(
            milestone.state != MilestoneStatus.COMPLETED,
            'Milestone is completed, sub-milestones cannot be added.'
        );
        for (uint256 i = 0; i < _individualProvider.length; i++) {
            Milestone.MilestoneData memory subMilestone = milestoneContract
                .getSubMilestone(milestone.milestoneId, _subMilestoneIds[i]);
            require(
                bytes(subMilestone.milestoneId).length == 0,
                'SubMilestone already exists'
            );

            require(
                _individualProvider[i] != address(0),
                'IP address is the zero address'
            );

            require(
                _endDates[i] > _startDates[i],
                'end date must be greater than start date'
            );

            require(
                currMilestoneFund[milestone.milestoneId] +
                    totalSubMilestonesFund +
                    _fundAllocated[i] <=
                    milestone.fundAllocated,
                'Exceeding milestone allocated fund'
            );

            totalSubMilestonesFund += _fundAllocated[i];
        }

        milestoneContract.addSubMilestones(
            _individualProvider,
            milestone.milestoneId,
            _subMilestoneIds,
            _startDates,
            _endDates,
            _fundAllocated,
            _noOfRevisions,
            _penaltyDurations,
            _penaltyValues
        );
        currMilestoneFund[milestone.milestoneId] += totalSubMilestonesFund;
    }

    /**
     * @notice Fund the entire project. This function is for the purchaser.
     * Can only be called when the funding type is "PROJECT".
     */
    function fundProject() public payable onlyPurchaser {
        require(
            fundingType == FundingType.PROJECT,
            'you need to fund milestone wise'
        );
        require(
            msg.value >= totalFundAllocated,
            'amount must be >= project allocated fund'
        );

        require(currencyType == CurrencyType.HBAR, 'currency must be HBAR');

        // Transfer all milestone and royalty fund to milestone and royalty contract
        string[] memory milestoneIds = milestoneContract.getAllMilestoneIds();
        uint256 totalMilestoneFund = 0;
        uint256 totalRoyaltyFund = 0;
        for (uint8 i = 0; i < milestoneIds.length; i++) {
            Milestone.MilestoneData memory milestone = milestoneContract
                .getMilestone(milestoneIds[i]);
            totalMilestoneFund += milestone.fundAllocated;

            // Mark milestone state to funded
            milestoneContract.changeState(
                milestoneIds[i],
                MilestoneStatus.FUNDED,
                0
            );

            emit MilestoneFunded(milestoneIds[i], milestone.fundAllocated);

            Royalty.MilestoneRoyalty memory milestoneRoyalty = royaltyContract
                .getMilestoneRoyalty(milestoneIds[i]);
            totalRoyaltyFund += milestoneRoyalty.royaltyAmount;

            emit MilestoneRoyaltyFunded(
                milestoneIds[i],
                milestoneRoyalty.royaltyAmount
            );
        }

        // Transfer milestone fund to milestone contract
        (bool success, ) = address(milestoneContract).call{
            value: totalMilestoneFund
        }('');
        require(success, 'Transfer to Milestone contract failed');

        // Transfer milestone royalty to royalty contract
        (bool royaltySuccess, ) = address(royaltyContract).call{
            value: totalRoyaltyFund
        }('');
        require(royaltySuccess, 'Transfer to Royalty contract failed');

        uint256 remainingAmount = msg.value -
            (totalMilestoneFund + totalRoyaltyFund);

        // Refund the remaining amount back to the purchaser.
        if (remainingAmount > 0) {
            (bool remainingAmountSuccess, ) = address(PURCHASER_ADDR).call{
                value: remainingAmount
            }('');
            require(
                remainingAmountSuccess,
                'Remaining amount transfer to purchaser failed'
            );
        }
    }

    /**
     * @notice Fund the entire project using USDC. This function is for the purchaser.
     * Can only be called when the funding type is "PROJECT".
     */
    function fundUsdcToProject() public onlyPurchaser {
        require(
            fundingType == FundingType.PROJECT,
            'you need to fund milestone wise'
        );
        require(currencyType == CurrencyType.USDC, 'currency must be USDC');

        // Get the current USDC balance of the contract
        uint256 usdcBalance = IERC20(usdcTokenAddr).balanceOf(msg.sender);

        require(
            usdcBalance >= totalFundAllocated,
            'less USDC balance to fund the project'
        );

        // Check allowance
        checkAllowance(msg.sender, totalFundAllocated);

        // Transfer all milestone and royalty fund to milestone and royalty contract
        string[] memory milestoneIds = milestoneContract.getAllMilestoneIds();
        uint256 totalMilestoneFund = 0;
        uint256 totalRoyaltyFund = 0;
        for (uint8 i = 0; i < milestoneIds.length; i++) {
            Milestone.MilestoneData memory milestone = milestoneContract
                .getMilestone(milestoneIds[i]);
            totalMilestoneFund += milestone.fundAllocated;

            // Mark milestone state to funded
            milestoneContract.changeState(
                milestoneIds[i],
                MilestoneStatus.FUNDED,
                0
            );

            emit MilestoneFunded(milestoneIds[i], milestone.fundAllocated);

            Royalty.MilestoneRoyalty memory milestoneRoyalty = royaltyContract
                .getMilestoneRoyalty(milestoneIds[i]);
            totalRoyaltyFund += milestoneRoyalty.royaltyAmount;

            emit MilestoneRoyaltyFunded(
                milestoneIds[i],
                milestoneRoyalty.royaltyAmount
            );
        }

        // Transfer milestone fund to milestone contract
        IERC20(usdcTokenAddr).transferFrom(
            msg.sender,
            address(milestoneContract),
            totalMilestoneFund
        );

        // Transfer milestone royalty to royalty contract
        IERC20(usdcTokenAddr).transferFrom(
            msg.sender,
            address(royaltyContract),
            totalRoyaltyFund
        );
    }

    /**
     * @notice Fund a specific milestone. This function is for the purchaser.
     * Can only be called when the funding type is 'MILESTONE'.
     * @param _milestoneId ID of the milestone to fund.
     */
    function fundMilestone(
        string memory _milestoneId
    ) public payable onlyPurchaser {
        require(
            fundingType == FundingType.MILESTONE,
            'you need to fund the complete project'
        );

        require(currencyType == CurrencyType.HBAR, 'currency must be HBAR');

        Milestone.MilestoneData memory milestone = milestoneContract
            .getMilestone(_milestoneId);
        require(
            bytes(milestone.milestoneId).length > 0,
            'Milestone does not exist'
        );

        Royalty.MilestoneRoyalty memory milestoneRoyalty = royaltyContract
            .getMilestoneRoyalty(milestone.milestoneId);

        uint256 totalFundRequired = milestone.fundAllocated +
            milestoneRoyalty.royaltyAmount;

        require(
            msg.value >= totalFundRequired,
            'more amount is required to fund the milestone'
        );

        // Transfer fund to milestone contract
        (bool success, ) = address(milestoneContract).call{
            value: milestone.fundAllocated
        }('');
        require(success, 'Transfer to Milestone contract failed');

        emit MilestoneFunded(_milestoneId, milestone.fundAllocated);

        // Mark milestone state to funded
        milestoneContract.changeState(_milestoneId, MilestoneStatus.FUNDED, 0);

        // Transfer fund to royalty contract
        if (milestoneRoyalty.royaltyAmount > 0) {
            (bool royaltySuccess, ) = address(royaltyContract).call{
                value: milestoneRoyalty.royaltyAmount
            }('');
            require(royaltySuccess, 'Transfer to Royalty contract failed');

            emit MilestoneRoyaltyFunded(
                _milestoneId,
                milestoneRoyalty.royaltyAmount
            );
        }
    }

    /**
     * @notice Fund a specific milestone using USDC. This function is for the purchaser.
     * Can only be called when the funding type is 'MILESTONE'.
     * @param _milestoneId ID of the milestone to fund.
     */
    function fundUsdcToMilestone(
        string memory _milestoneId
    ) public onlyPurchaser {
        require(
            fundingType == FundingType.MILESTONE,
            'you need to fund the complete project'
        );
        require(currencyType == CurrencyType.USDC, 'currency must be USDC');

        Milestone.MilestoneData memory milestone = milestoneContract
            .getMilestone(_milestoneId);
        require(
            bytes(milestone.milestoneId).length > 0,
            'Milestone does not exist'
        );

        Royalty.MilestoneRoyalty memory milestoneRoyalty = royaltyContract
            .getMilestoneRoyalty(milestone.milestoneId);

        uint256 totalMilestoneFund = milestone.fundAllocated +
            milestoneRoyalty.royaltyAmount;

        // Get the current USDC balance of the contract
        uint256 usdcBalance = IERC20(usdcTokenAddr).balanceOf(msg.sender);

        require(
            usdcBalance >= totalMilestoneFund,
            'less USDC balance to fund the milestone'
        );

        // Check allowance
        checkAllowance(msg.sender, totalMilestoneFund);

        // Transfer USDC fund to milestone contract
        IERC20(usdcTokenAddr).transferFrom(
            msg.sender,
            address(milestoneContract),
            milestone.fundAllocated
        );

        emit MilestoneFunded(_milestoneId, milestone.fundAllocated);

        // Mark milestone state to funded
        milestoneContract.changeState(_milestoneId, MilestoneStatus.FUNDED, 0);

        // Transfer fund to royalty contract
        if (milestoneRoyalty.royaltyAmount > 0) {
            IERC20(usdcTokenAddr).transferFrom(
                msg.sender,
                address(royaltyContract),
                milestoneRoyalty.royaltyAmount
            );

            emit MilestoneRoyaltyFunded(
                _milestoneId,
                milestoneRoyalty.royaltyAmount
            );
        }
    }

    /**
     * @notice Change the state of a milestone.
     * @param _milestoneId ID of the milestone to change the state.
     * @param _state New state of the milestone.
     * @param _endDate New end date for the milestone.
     */
    function changeMilestoneState(
        string memory _milestoneId,
        MilestoneStatus _state,
        uint32 _endDate
    ) public {
        checkStateChange(_state, PROVIDER_ADDR, PURCHASER_ADDR);
        milestoneContract.changeState(_milestoneId, _state, _endDate);
        emit MilestoneStateChanged(_milestoneId, _state, _endDate);
    }

    /**
     * @notice Change the state of a sub-milestone within a milestone.
     * @param _milestoneId ID of the parent milestone.
     * @param _subMilestoneId ID of the sub-milestone to change the state.
     * @param _state New state of the sub-milestone.
     * @param _endDate New end date for the sub-milestone.
     */
    function changeSubMilestoneState(
        string memory _milestoneId,
        string memory _subMilestoneId,
        MilestoneStatus _state,
        uint32 _endDate
    ) public {
        Milestone.MilestoneData memory subMilestone = milestoneContract
            .getSubMilestone(_milestoneId, _subMilestoneId);
        checkStateChange(_state, subMilestone.provider, PROVIDER_ADDR);
        milestoneContract.changeSubMilestoneState(
            _milestoneId,
            _subMilestoneId,
            _state,
            _endDate
        );
        emit SubMilestoneStateChanged(_subMilestoneId, _state, _endDate);
    }

    /**
     * @notice Check if the state change is allowed based on the new state and the caller's role.
     * @param newState New state being set.
     * @param providerOrIP Provider or IP (Individual Provider) address.
     * @param purchaserOrProvider Purchaser or Provider address.
     */
    function checkStateChange(
        MilestoneStatus newState,
        address providerOrIP,
        address purchaserOrProvider
    ) internal view {
        if (
            newState == MilestoneStatus.IN_PROGRESS ||
            newState == MilestoneStatus.IN_REVIEW
        ) {
            require(msg.sender == providerOrIP, 'you are not authorized');
        } else if (
            newState == MilestoneStatus.REWORK ||
            newState == MilestoneStatus.COMPLETED ||
            newState == MilestoneStatus.STOP
        ) {
            require(
                msg.sender == purchaserOrProvider,
                'you are not authorized'
            );
        }
    }

    /**
     * @notice Check the state of a specific milestone.
     * @param _milestoneId ID of the milestone to check.
     * @return The state of the milestone.
     */
    function checkMilestoneState(
        string memory _milestoneId
    ) public view onlyPurchaserOrProvider returns (MilestoneStatus) {
        Milestone.MilestoneData memory milestoneData = milestoneContract
            .getMilestone(_milestoneId);
        return milestoneData.state;
    }

    /**
     * @notice Check the state of a specific sub-milestone within a milestone.
     * @param _milestoneId ID of the parent milestone.
     * @param _subMilestoneId ID of the sub-milestone to check.
     * @return The state of the sub-milestone.
     */
    function checkSubMilestoneState(
        string memory _milestoneId,
        string memory _subMilestoneId
    ) public view onlyPurchaserOrProvider returns (MilestoneStatus) {
        Milestone.MilestoneData memory subMilestone = milestoneContract
            .getSubMilestone(_milestoneId, _subMilestoneId);
        return subMilestone.state;
    }

    /**
     * @notice Pay out the entire project once all milestones are completed. This function is for the purchaser.
     */
    function payoutProject() public onlyPurchaser {
        require(
            fundTransferType == FundTransferType.PROJECT_COMPLETE,
            'you can only pay milestone wise'
        );
        // check if all milestone are completed or not
        string[] memory milestoneIds = milestoneContract.getAllMilestoneIds();
        for (uint8 i = 0; i < milestoneIds.length; i++) {
            Milestone.MilestoneData memory milestone = milestoneContract
                .getMilestone(milestoneIds[i]);
            require(
                milestone.state == MilestoneStatus.COMPLETED,
                'you can only pay once all milestone are completed'
            );
        }

        // pay all milestone
        for (uint8 i = 0; i < milestoneIds.length; i++) {
            Milestone.MilestoneData memory milestone = milestoneContract
                .getMilestone(milestoneIds[i]);
            if (milestone.state == MilestoneStatus.COMPLETED) {
                milestoneContract.payout(milestoneIds[i]);
                emit MilestonePayout(milestoneIds[i]);
            }
        }
        milestoneContract.releaseStakingReward();
    }

    /**
     * @notice Pay out a specific milestone. This function is for the purchaser.
     * @param _milestoneId ID of the milestone to pay out.
     */
    function payoutMilestone(string memory _milestoneId) public onlyPurchaser {
        require(
            fundTransferType == FundTransferType.MILESTONE_COMPLETE,
            'you can only pay once all milestone is completed'
        );
        milestoneContract.payout(_milestoneId);
        emit MilestonePayout(_milestoneId);

        string[] memory milestoneIds = milestoneContract.getAllMilestoneIds();
        bool allMilestonesPaidOut = true;

        for (uint8 i = 0; i < milestoneIds.length; i++) {
            Milestone.MilestoneData memory milestone = milestoneContract
                .getMilestone(milestoneIds[i]);

            if (!milestone.payoutStatus) {
                allMilestonesPaidOut = false;
                break;
            }
        }

        // If all milestones are paid out, release staking reward
        if (allMilestonesPaidOut) {
            milestoneContract.releaseStakingReward();
        }
    }

    /**
     * @notice Pay out the royalty for a specific milestone. This function is for the purchaser.
     * @param _milestoneId ID of the milestone to pay royalty for.
     */
    function payoutMilestoneRoyalty(
        string memory _milestoneId
    ) public onlyPurchaser {
        Milestone.MilestoneData memory milestone = milestoneContract
            .getMilestone(_milestoneId);
        require(
            bytes(milestone.milestoneId).length > 0,
            'Milestone does not exist'
        );
        require(
            milestone.payoutStatus == true,
            'Royalty can be paid after milestone is paid'
        );
        royaltyContract.payMilestoneRoyalty(_milestoneId);
        emit RoyaltyPaid(_milestoneId);

        // check if all royalties are payed out.
        string[] memory milestoneIds = milestoneContract.getAllMilestoneIds();
        bool allRoyaltiesPaidOut = true;

        for (uint8 i = 0; i < milestoneIds.length; i++) {
            Royalty.MilestoneRoyalty memory royalty = royaltyContract
                .getMilestoneRoyalty(milestoneIds[i]);

            if (royalty.state != RoyaltyStatus.PAYED_OUT) {
                allRoyaltiesPaidOut = false;
                break;
            }
        }

        // If all royalties are paid out, release staking reward
        if (allRoyaltiesPaidOut) {
            royaltyContract.releaseStakingReward();
        }
    }

    /**
     * @notice Purchaser can release post kpi royalty of milestone.
     * @param _milestoneId ID of the milestone to release.
     */
    function releaseMilestoneRoyalty(
        string memory _milestoneId
    ) public onlyPurchaser {
        Milestone.MilestoneData memory milestone = milestoneContract
            .getMilestone(_milestoneId);
        require(
            bytes(milestone.milestoneId).length > 0,
            'Milestone does not exist'
        );
        require(
            milestone.payoutStatus == true,
            'Royalty can be paid after milestone is paid'
        );
        Royalty.MilestoneRoyalty memory milestoneRoyalty = royaltyContract
            .getMilestoneRoyalty(_milestoneId);
        require(
            milestoneRoyalty.royaltyType == RoyaltyType.POST_KPI,
            'Only post kpi royalty can be released'
        );
        royaltyContract.forceClosePayout(_milestoneId);
        emit RoyaltyReleased(_milestoneId);
    }

    /**
     * @notice Release any remaining free balance (HBAR or USDC) in the contract to the purchaser's address.
     * Can only be called by the owner.
     */
    function releaseFreeBalance() external onlyOwner {
        // check if all milestones are paid out or not
        string[] memory milestoneIds = milestoneContract.getAllMilestoneIds();
        for (uint8 i = 0; i < milestoneIds.length; i++) {
            Milestone.MilestoneData memory milestone = milestoneContract
                .getMilestone(milestoneIds[i]);
            require(
                milestone.payoutStatus == true,
                'you can only release free balance if all the milestones are paid out'
            );
        }
        if (currencyType == CurrencyType.HBAR) {
            // Get the current free balance of the contract (HBAR)
            uint256 hbarBalance = address(this).balance;

            require(hbarBalance > 0, 'No HBAR balance to release');

            // Transfer the HBAR balance to the purchaser
            (bool success, ) = address(PURCHASER_ADDR).call{value: hbarBalance}(
                ''
            );
            require(success, 'Failed to release HBAR balance');
            emit FreeBalanceReleased(projectId, hbarBalance);
        } else {
            // Get the current USDC balance of the contract
            uint256 usdcBalance = IERC20(usdcTokenAddr).balanceOf(
                address(this)
            );

            require(usdcBalance > 0, 'No USDC balance to release');

            // Transfer the USDC balance to the purchaser
            require(
                IERC20(usdcTokenAddr).transfer(
                    payable(PURCHASER_ADDR),
                    usdcBalance
                ),
                'Failed to release USDC balance'
            );
            emit FreeBalanceReleased(projectId, usdcBalance);
        }
    }
}
