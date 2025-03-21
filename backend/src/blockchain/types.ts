export interface TokenInfo {
  name: string;
  symbol: string;
  totalSupply: string;
  maxSupply: string;
  address: string;
  decimals?: string;
}

export interface AirdropInfo {
  amountPerAddress: string;
  merkleRoot: string;
  endTime: string;
  endTimeUnix: number;
  totalClaimed: string;
  contractBalance: string;
  isPaused: boolean;
  address: string;
}

export interface ClaimStatus {
  address: string;
  hasClaimed: boolean;
}

export interface TokenBalance {
  address: string;
  balance: string;
}

export interface ClaimEligibility {
  address: string;
  isWhitelisted: boolean;
  hasClaimed: boolean;
  isBlacklisted: boolean;
  isEligible: boolean;
  proof: string[];
  amountPerAddress: string;
  rawAmountPerAddress?: string;
  tokenDecimals?: string;
  tokenSymbol?: string;
  endTime: string;
}

export interface ContractAddresses {
  token: string;
  airdrop: string;
  network: string;
  chainId: number;
}

// Internal types used by the service
export interface ContractInfo {
  address: string;
  abi: any[];
}

export interface DeploymentData {
  token: string;
  airdrop: string;
  network: string;
  chainId: number;
  blockNumber: number;
  deployer: string;
}

export interface ClaimEvent {
  address: string;
  amount: string;
  rawAmount?: string;
  timestamp: number;
  transactionHash: string;
  blockNumber: number;
}

export interface GasAnalytics {
  totalClaimValue: string;
  rawTotalClaimValue: string;
  totalGasUsed: string;
  totalTxCost: string;
  averageGasPerClaim: string;
  claimGasData: any[];
  distributionGasData: any[];
  totalClaims: number;
  tokenSymbol: string;
  tokenDecimals: string;
}
