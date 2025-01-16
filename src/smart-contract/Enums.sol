// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

enum CurrencyType {
    HBAR,
    USDC
}

enum FundingType {
    PROJECT,
    MILESTONE
}

enum FundTransferType {
    PROJECT_COMPLETE,
    MILESTONE_COMPLETE
}

enum MilestoneStatus {
    INIT, // Not Started
    FUNDED, // Funded by purchaser
    IN_PROGRESS, // InProgress by onlyProvider
    IN_REVIEW, // Inreview by onlyProvider
    REWORK, //rework by onlyPurchaser
    COMPLETED, // Completed by onlyPurchaser
    STOP, // on hold and can be started again by onlyPurchaser
    FORCE_CLOSED //force closed by onlyPurchaser
}

enum RoyaltyStatus {
    INIT,
    PAYED_OUT,
    FORCE_CLOSED
}

enum RoyaltyType {
    PRE_PAYMENT,
    POST_KPI
}