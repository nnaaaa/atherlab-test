import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import {
  AirdropInfo,
  ClaimEligibility,
  ClaimEvent,
  ClaimStatus,
  ContractAddresses,
  GasAnalytics,
  TokenBalance,
  TokenInfo,
} from './types';

// ABI for the Airdrop contract - simplified version
const AIRDROP_ABI = [
  // View functions
  'function amountPerAddress() view returns (uint256)',
  'function merkleRoot() view returns (bytes32)',
  'function endTime() view returns (uint256)',
  'function paused() view returns (bool)',
  'function hasClaimed(address) view returns (bool)',
  'function isEligible(address, bytes32[]) view returns (bool)',
  'function getAvailableTokens() view returns (uint256)',
  // State changing functions
  'function claim(bytes32[]) external',
  'function distributeBatch(address[], bytes32[][]) external',
  'function updateMerkleRoot(bytes32) external',
  'function updateAirdrop(uint256, uint256) external',
  'function setPaused(bool) external',
  'function emergencyWithdraw(address, address, uint256) external',
  // Events
  'event Claimed(address indexed account, uint256 amount)',
  'event MerkleRootUpdated(bytes32 indexed oldRoot, bytes32 indexed newRoot)',
  'event AirdropUpdated(uint256 newAmount, uint256 newEndTime)',
  'event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount)',
  'event Paused(bool isPaused)',
];

// ABI for the Token contract - simplified version
const TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address, uint256) returns (bool)',
  'function allowance(address, address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function transferFrom(address, address, uint256) returns (bool)',
  'function owner() view returns (address)',
  'function MAX_SUPPLY() view returns (uint256)',
  'function blacklisted(address) view returns (bool)',
  'function mint(address, uint256) external',
  'function addToBlacklist(address) external',
  'function removeFromBlacklist(address) external',
  'function pause() external',
  'function unpause() external',
];

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly provider: ethers.JsonRpcProvider;
  private readonly wallet: ethers.Wallet;
  private readonly tokenContract: ethers.Contract;
  private readonly airdropContract: ethers.Contract;
  private readonly contractAddresses: ContractAddresses;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('RPC_URL');
    const privateKey = this.configService.get<string>('PRIVATE_KEY');
    const network = this.configService.get<string>('NETWORK');
    
    // Load deployment data from file
    const deploymentDataPath = this.configService.get<string>('DEPLOYMENT_DATA_PATH');
    let tokenAddress: string;
    let airdropAddress: string;
    
    try {
      // Resolve the path relative to the current directory
      const resolvedPath = path.resolve(process.cwd(), deploymentDataPath);
      this.logger.log(`Loading deployment data from: ${resolvedPath}`);
      
      if (fs.existsSync(resolvedPath)) {
        const deploymentData = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
        tokenAddress = deploymentData.token;
        airdropAddress = deploymentData.airdrop;
        
        this.logger.log(`Loaded contract addresses from deployment file`);
        this.logger.log(`Token address: ${tokenAddress}`);
        this.logger.log(`Airdrop address: ${airdropAddress}`);
      } else {
        throw new Error(`Deployment data file not found at path: ${resolvedPath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load deployment data: ${error.message}`);
      throw new Error(`Failed to load deployment data: ${error.message}`);
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    this.contractAddresses = {
      token: tokenAddress,
      airdrop: airdropAddress,
      network,
      chainId: 0, // Will be set after connecting
    };

    this.tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, this.wallet);
    this.airdropContract = new ethers.Contract(airdropAddress, AIRDROP_ABI, this.wallet);

    // Initialize and connect
    this.initializeConnection();
  }

  private async initializeConnection() {
    try {
      const network = await this.provider.getNetwork();
      this.contractAddresses.chainId = Number(network.chainId);

      this.logger.log(
        `Connected to ${this.contractAddresses.network} (chainId: ${this.contractAddresses.chainId})`
      );
      
      // Log addresses
      this.logger.log(`Token address: ${this.contractAddresses.token}`);
      this.logger.log(`Airdrop address: ${this.contractAddresses.airdrop}`);
    } catch (error) {
      this.logger.error(`Failed to initialize blockchain connection: ${error.message}`);
    }
  }

  // Token-related methods
  async getTokenInfo(): Promise<TokenInfo> {
    try {
      // Get basic token info first
      const name = await this.tokenContract.name();
      const symbol = await this.tokenContract.symbol();
      const totalSupply = await this.tokenContract.totalSupply();
      
      // Try to get maxSupply, but handle the case where it might not exist
      let maxSupply = "0";
      try {
        maxSupply = (await this.tokenContract.MAX_SUPPLY()).toString();
      } catch (error) {
        this.logger.warn(`maxSupply function not found on token contract: ${error.message}`);
        // Use a fallback approach or just keep it as "0"
      }

      return {
        name,
        symbol,
        totalSupply: totalSupply.toString(),
        maxSupply,
        address: this.contractAddresses.token,
      };
    } catch (error) {
      this.logger.error(`Failed to get token info: ${error.message}`);
      throw new Error(`Failed to get token info: ${error.message}`);
    }
  }

  async getTokenBalance(address: string): Promise<TokenBalance> {
    try {
      const balance = await this.tokenContract.balanceOf(address);
      
      return {
        address,
        balance: balance.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get token balance: ${error.message}`);
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  async isBlacklisted(address: string): Promise<boolean> {
    try {
      return await this.tokenContract.blacklisted(address);
    } catch (error) {
      this.logger.error(`Failed to check blacklist status: ${error.message}`);
      throw new Error(`Failed to check blacklist status: ${error.message}`);
    }
  }

  // Airdrop-related methods
  async getAirdropInfo(): Promise<AirdropInfo> {
    try {
      const [amountPerAddress, merkleRoot, endTime, isPaused, contractBalance] = await Promise.all([
        this.airdropContract.amountPerAddress(),
        this.airdropContract.merkleRoot(),
        this.airdropContract.endTime(),
        this.airdropContract.paused(),
        this.airdropContract.getAvailableTokens(),
      ]);

      const endTimeUnix = Number(endTime);
      
      // Get the current block number
      const currentBlock = await this.provider.getBlockNumber();
      
      // Get deployment block from deployment data
      const deploymentDataPath = this.configService.get<string>('DEPLOYMENT_DATA_PATH');
      const resolvedPath = path.resolve(process.cwd(), deploymentDataPath);
      const deploymentData = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
      const fromBlock = deploymentData.blockNumber || 0;

      // Calculate total claimed by looking at all claim events
      let totalClaimed = BigInt(0);
      try {
        // Get all Claimed events
        const claimFilter = this.airdropContract.filters.Claimed();
        const claimEvents = await this.airdropContract.queryFilter(claimFilter, fromBlock, currentBlock);
        
        // Sum up all claimed amounts
        totalClaimed = claimEvents.reduce((total, event) => {
          const eventLog = event as ethers.EventLog;
          if (eventLog.args) {
            return total + BigInt(eventLog.args[1]);
          }
          return total;
        }, BigInt(0));
      } catch (error) {
        this.logger.warn(`Failed to calculate claimed tokens from events: ${error.message}`);
        // If we can't get from events, we'll estimate from initial token balance
        
        // This is an alternative approach, but less accurate
        // Calculate based on initial allocation and remaining balance
        // Note: This assumes the contract was funded exactly with the amount to distribute
        // totalClaimed = initialTokenBalance - currentTokenBalance
      }

      return {
        amountPerAddress: amountPerAddress.toString(),
        merkleRoot,
        endTime: new Date(endTimeUnix * 1000).toISOString(),
        endTimeUnix,
        totalClaimed: totalClaimed.toString(),
        contractBalance: contractBalance.toString(),
        isPaused,
        address: this.contractAddresses.airdrop,
      };
    } catch (error) {
      this.logger.error(`Failed to get airdrop info: ${error.message}`);
      throw new Error(`Failed to get airdrop info: ${error.message}`);
    }
  }

  async getClaimStatus(address: string): Promise<ClaimStatus> {
    try {
      const hasClaimed = await this.airdropContract.hasClaimed(address);
      
      return {
        address,
        hasClaimed,
      };
    } catch (error) {
      this.logger.error(`Failed to get claim status: ${error.message}`);
      throw new Error(`Failed to get claim status: ${error.message}`);
    }
  }

  async checkEligibility(address: string, proof: string[]): Promise<ClaimEligibility> {
    try {
      // Get claim status, check if blacklisted, and get token info
      const [hasClaimed, isBlacklisted, airdropInfo, tokenInfo] = await Promise.all([
        this.airdropContract.hasClaimed(address),
        this.tokenContract.blacklisted(address),
        this.getAirdropInfo(),
        this.getTokenInfo()
      ]);
      
      // Check eligibility using Merkle proof
      const isWhitelisted = await this.airdropContract.isEligible(address, proof);
      
      // Overall eligibility
      const isEligible = isWhitelisted && !hasClaimed && !isBlacklisted;
      
      // Convert raw token amount to decimal-adjusted value
      const tokenDecimals = tokenInfo.decimals || '18';
      const divisor = BigInt(10) ** BigInt(tokenDecimals);
      const rawAmount = BigInt(airdropInfo.amountPerAddress);
      const formattedAmount = (rawAmount / divisor).toString();
      
      return {
        address,
        isWhitelisted,
        hasClaimed,
        isBlacklisted,
        isEligible,
        proof,
        amountPerAddress: formattedAmount,
        rawAmountPerAddress: airdropInfo.amountPerAddress,
        tokenDecimals,
        tokenSymbol: tokenInfo.symbol,
        endTime: airdropInfo.endTime,
      };
    } catch (error) {
      this.logger.error(`Failed to check eligibility: ${error.message}`);
      throw new Error(`Failed to check eligibility: ${error.message}`);
    }
  }

  // User claim method
  async claimTokens(address: string, proof: string[]): Promise<any> {
    try {
      // Verify address is connected wallet
      if (this.wallet.address.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Address does not match connected wallet');
      }
      
      // Check if eligible and get token info
      const [eligibility, tokenInfo] = await Promise.all([
        this.checkEligibility(address, proof),
        this.getTokenInfo()
      ]);
      
      if (!eligibility.isEligible) {
        throw new Error('Address is not eligible for claiming tokens');
      }
      
      // Get token decimals for conversion
      const tokenDecimals = tokenInfo.decimals || '18';
      const divisor = BigInt(10) ** BigInt(tokenDecimals);
      
      // Execute claim transaction
      const tx = await this.airdropContract.claim(proof);
      const receipt = await tx.wait();
      
      // Get the amount from claim event
      let claimedAmount = '';
      let rawClaimedAmount = '';
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = this.airdropContract.interface.parseLog(log);
            if (parsed && parsed.name === 'Claimed' && parsed.args) {
              rawClaimedAmount = parsed.args[1].toString();
              claimedAmount = (BigInt(rawClaimedAmount) / divisor).toString();
              break;
            }
          } catch (error) {
            // Skip logs that can't be parsed
            continue;
          }
        }
      }
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        amount: claimedAmount,
        rawAmount: rawClaimedAmount,
        tokenSymbol: tokenInfo.symbol,
        tokenDecimals
      };
    } catch (error) {
      this.logger.error(`Failed to claim tokens: ${error.message}`);
      throw new Error(`Failed to claim tokens: ${error.message}`);
    }
  }

  // Admin distribute tokens method
  async airdropTokensManually(addresses: string[]): Promise<any> {
    try {
      // For each address, we need to get the Merkle proof
      // This would typically come from a whitelist service
      // Here we're just providing an empty proof for the example
      const proofs = addresses.map(() => []);
      
      // Execute distributeBatch transaction
      const tx = await this.airdropContract.distributeBatch(addresses, proofs);
      const receipt = await tx.wait();
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
      };
    } catch (error) {
      this.logger.error(`Failed to distribute tokens: ${error.message}`);
      throw new Error(`Failed to distribute tokens: ${error.message}`);
    }
  }

  // Admin update merkle root
  async updateMerkleRoot(newRoot: string): Promise<any> {
    try {
      const tx = await this.airdropContract.updateMerkleRoot(newRoot);
      const receipt = await tx.wait();

      console.log('receipt', receipt);
      console.log('tx', tx);
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed',
      };
    } catch (error) {
      this.logger.error(`Failed to update merkle root: ${error.message}`);
      throw new Error(`Failed to update merkle root: ${error.message}`);
    }
  }

  // Admin update airdrop parameters
  async updateAirdrop(newAmountPerAddress: string, newEndTime: number): Promise<any> {
    try {
      const tx = await this.airdropContract.updateAirdrop(
        ethers.parseEther(newAmountPerAddress),
        newEndTime
      );
      const receipt = await tx.wait();
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed',
      };
    } catch (error) {
      this.logger.error(`Failed to update airdrop: ${error.message}`);
      throw new Error(`Failed to update airdrop: ${error.message}`);
    }
  }

  // Admin pause/unpause airdrop
  async setPaused(isPaused: boolean): Promise<any> {
    try {
      const tx = await this.airdropContract.setPaused(isPaused);
      const receipt = await tx.wait();
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed',
      };
    } catch (error) {
      this.logger.error(`Failed to set paused state: ${error.message}`);
      throw new Error(`Failed to set paused state: ${error.message}`);
    }
  }

  // Emergency withdraw tokens
  async emergencyWithdraw(tokenAddress: string, to: string, amount: string): Promise<any> {
    try {
      const tx = await this.airdropContract.emergencyWithdraw(
        tokenAddress,
        to,
        ethers.parseEther(amount)
      );
      const receipt = await tx.wait();
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed',
      };
    } catch (error) {
      this.logger.error(`Failed to emergency withdraw: ${error.message}`);
      throw new Error(`Failed to emergency withdraw: ${error.message}`);
    }
  }

  // Helper methods
  getContractAddresses(): ContractAddresses {
    return this.contractAddresses;
  }

  async getClaimEvents(address: string): Promise<ClaimEvent[]> {
    try {
      // Get the current block number and token info
      const [currentBlock, tokenInfo] = await Promise.all([
        this.provider.getBlockNumber(),
        this.getTokenInfo()
      ]);
      
      // Get token decimals for conversion
      const tokenDecimals = tokenInfo.decimals || '18';
      const divisor = BigInt(10) ** BigInt(tokenDecimals);
      
      // Get deployment block from deployment data
      const deploymentDataPath = this.configService.get<string>('DEPLOYMENT_DATA_PATH');
      const resolvedPath = path.resolve(process.cwd(), deploymentDataPath);
      const deploymentData = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
      const fromBlock = deploymentData.blockNumber || 0;

      // Create filter for Claimed events
      const filter = this.airdropContract.filters.Claimed(address);
      
      // Get all events from deployment to current block
      const events = await this.airdropContract.queryFilter(filter, fromBlock, currentBlock);
      
      // Transform events into our ClaimEvent format
      return Promise.all(events.map(async (event) => {
        const eventLog = event as ethers.EventLog;
        if (!eventLog.args) {
          throw new Error('Invalid event format');
        }
        
        const rawAmount = eventLog.args[1].toString();
        const formattedAmount = (BigInt(rawAmount) / divisor).toString();
        
        // Try to get the block timestamp
        let timestamp = Math.floor(Date.now() / 1000);
        try {
          const block = await this.provider.getBlock(eventLog.blockNumber);
          if (block && block.timestamp) {
            timestamp = Number(block.timestamp);
          }
        } catch (error) {
          this.logger.warn(`Could not get block timestamp: ${error.message}`);
        }
        
        return {
          address: eventLog.args[0], // account is the first argument
          amount: formattedAmount,
          rawAmount: rawAmount,
          timestamp: timestamp,
          transactionHash: eventLog.transactionHash,
          blockNumber: eventLog.blockNumber,
        };
      }));
    } catch (error) {
      this.logger.error(`Failed to get claim events: ${error.message}`);
      throw new Error(`Failed to get claim events: ${error.message}`);
    }
  }

  async getGasAnalytics(): Promise<GasAnalytics> {
    try {
      // Get current block number and token info
      const [currentBlock, tokenInfo] = await Promise.all([
        this.provider.getBlockNumber(),
        this.getTokenInfo()
      ]);
      
      // Get token decimals for conversion
      const tokenDecimals = tokenInfo.decimals || '18';
      const divisor = BigInt(10) ** BigInt(tokenDecimals);
      
      // Get deployment block from deployment data
      const deploymentDataPath = this.configService.get<string>('DEPLOYMENT_DATA_PATH');
      const resolvedPath = path.resolve(process.cwd(), deploymentDataPath);
      const deploymentData = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
      const fromBlock = deploymentData.blockNumber || 0;

      // Get all Claimed events
      const claimFilter = this.airdropContract.filters.Claimed();
      const claimEvents = await this.airdropContract.queryFilter(claimFilter, fromBlock, currentBlock);
      
      // Calculate gas metrics for claim events
      let totalClaimGas = BigInt(0);
      let totalClaimValue = BigInt(0);
      const claimGasData = await Promise.all(
        claimEvents.map(async (event) => {
          const eventLog = event as ethers.EventLog;
          const tx = await this.provider.getTransactionReceipt(eventLog.transactionHash);
          if (!tx) return null;
          
          const gasUsed = tx.gasUsed.toString();
          totalClaimGas += tx.gasUsed;
          
          // Add to the total claimed value
          if (eventLog.args) {
            totalClaimValue += BigInt(eventLog.args[1]);
          }
          
          // Try to get the timestamp
          let timestamp = Math.floor(Date.now() / 1000);
          try {
            const block = await this.provider.getBlock(eventLog.blockNumber);
            if (block && block.timestamp) {
              timestamp = Number(block.timestamp);
            }
          } catch (error) {
            this.logger.warn(`Could not get block timestamp: ${error.message}`);
          }
          
          return {
            transactionHash: eventLog.transactionHash,
            blockNumber: eventLog.blockNumber,
            gasUsed,
            timestamp,
            address: eventLog.args ? eventLog.args[0] : '0x',
          };
        })
      );
      
      // Filter out nulls
      const validClaimGasData = claimGasData.filter(data => data !== null);
      
      // For batch distributions, we would need batch distribution events
      // This is a simplified version assuming no batch distributions yet
      const distributionGasData = [];
      
      // Calculate averages
      const averageGasPerClaim = validClaimGasData.length > 0 
        ? (totalClaimGas / BigInt(validClaimGasData.length)).toString() 
        : '0';
      
      // Format token values with correct decimals
      const formattedTotalClaimValue = (totalClaimValue / divisor).toString();
      
      return {
        totalClaimValue: formattedTotalClaimValue,
        rawTotalClaimValue: totalClaimValue.toString(),
        totalGasUsed: totalClaimGas.toString(),
        totalTxCost: '0', // Would require gas price data to calculate
        averageGasPerClaim,
        claimGasData: validClaimGasData,
        distributionGasData,
        totalClaims: validClaimGasData.length,
        tokenSymbol: tokenInfo.symbol,
        tokenDecimals
      };
    } catch (error) {
      this.logger.error(`Failed to get gas analytics: ${error.message}`);
      throw new Error(`Failed to get gas analytics: ${error.message}`);
    }
  }
} 