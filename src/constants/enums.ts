export enum LOGIN_TYPES {
  GOOGLE = 'google',
  BASIC = 'basic',
}

export enum SAVE_TYPE {
  DRAFT = 'DRAFT',
  COMPLETE = 'COMPLETE',
}

export enum FILTER_BY {
  NAME = 'NAME',
  SKILLS = 'SKILLS',
  USERID = 'USERID',
}
export enum FILTER_PROJECTS_BY {
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
}

export enum TRANSACTION_EVENTS {
  MilestoneFunded = 'MilestoneFunded',
  MilestoneForceClosed = 'MilestoneForceClosed',
  MilestonePayout = 'MilestonePayout',
  MilestoneStateChanged = 'MilestoneStateChanged',
  SubMilestoneStateChanged = 'SubMilestoneStateChanged',
  RoyaltyPaid = 'RoyaltyPaid',
  SubMilestoneAdded = 'SubMilestoneAdded',
  FreeBalanceReleased = 'FreeBalanceReleased',
}

export enum DISPUTE_STATUS {
  INREVIEW = 'INREVIEW',
  RESOLVED = 'RESOLVED',
}

export enum FUNCTION_NAMES {
  FUND_PROJECT = 'fundProject',
  FUND_PROJECT_USDC = 'fundUsdcToProject',
}

export enum VALID_STATE_CHANGE_FUNCTION_NAME {
  CHECK = 'check',
}

export enum contractMilestoneStatus {
  INIT, // Not Started
  FUNDED, // Funded by purchaser
  IN_PROGRESS, // InProgress by onlyProvider
  IN_REVIEW, // Inreview by onlyProvider
  REWORK, //rework by onlyPurchaser
  COMPLETED, // Completed by onlyPurchaser
  STOP, // on hold and can be started again by onlyPurchaser
  FORCE_CLOSED, //force closed by onlyPurchaser
}
