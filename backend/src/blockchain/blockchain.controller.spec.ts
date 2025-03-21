import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { WhitelistService } from '../whitelist/whitelist.service';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';

describe('BlockchainController', () => {
  let controller: BlockchainController;
  let blockchainService: BlockchainService;
  let whitelistService: WhitelistService;

  const mockBlockchainService = {
    getClaimStatus: jest.fn(),
    claimTokens: jest.fn(),
    getEligibility: jest.fn(),
    checkEligibility: jest.fn(),
    getTokenInfo: jest.fn(),
    getTokenBalance: jest.fn(),
    getAirdropInfo: jest.fn(),
    getClaimEvents: jest.fn(),
    getGasAnalytics: jest.fn(),
  };

  const mockWhitelistService = {
    isWhitelisted: jest.fn(),
    getMerkleProof: jest.fn(),
    getWhitelistedAddresses: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot([{
          name: 'default',
          ttl: 60000,
          limit: 10,
        }]),
      ],
      controllers: [BlockchainController],
      providers: [
        { provide: BlockchainService, useValue: mockBlockchainService },
        { provide: WhitelistService, useValue: mockWhitelistService },
      ],
    }).compile();

    controller = module.get<BlockchainController>(BlockchainController);
    blockchainService = module.get<BlockchainService>(BlockchainService);
    whitelistService = module.get<WhitelistService>(WhitelistService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getClaimStatus', () => {
    it('should return claim status for a valid address', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const claimStatus = { address, hasClaimed: false };
      
      mockBlockchainService.getClaimStatus.mockResolvedValue(claimStatus);
      
      expect(await controller.getClaimStatus(address)).toEqual(claimStatus);
    });
    
    it('should throw BadRequestException for invalid address', async () => {
      const invalidAddress = 'invalid';
      
      await expect(controller.getClaimStatus(invalidAddress)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDistributionProgress', () => {
    it('should return distribution progress statistics', async () => {
      const airdropInfo = {
        amountPerAddress: '100000000000000000000',
        merkleRoot: '0xroot',
        endTime: '2023-12-31T00:00:00.000Z',
        endTimeUnix: 1672444800,
        totalClaimed: '500000000000000000000',
        contractBalance: '9500000000000000000000',
        isPaused: false,
        address: '0xairdrop',
      };
      
      const tokenInfo = {
        name: 'Atherlabs Token',
        symbol: 'ATH',
        totalSupply: '10000000000000000000000',
        maxSupply: '100000000000000000000000',
        address: '0xtoken',
        decimals: '18',
      };
      
      const whitelist = [
        '0x1234567890123456789012345678901234567890',
        '0x2345678901234567890123456789012345678901',
        '0x3456789012345678901234567890123456789012',
        '0x4567890123456789012345678901234567890123',
        '0x5678901234567890123456789012345678901234',
      ];
      
      mockBlockchainService.getAirdropInfo.mockResolvedValue(airdropInfo);
      mockBlockchainService.getTokenInfo.mockResolvedValue(tokenInfo);
      mockWhitelistService.getWhitelistedAddresses.mockResolvedValue(whitelist);
      
      const result = await controller.getDistributionProgress();
      
      expect(result.totalWhitelisted).toBe(whitelist.length);
      expect(result.tokenName).toBe(tokenInfo.name);
      expect(result.tokenSymbol).toBe(tokenInfo.symbol);
      expect(result.tokenDecimals).toBe(tokenInfo.decimals);
      expect(result.isPaused).toBe(airdropInfo.isPaused);
      expect(result.endTime).toBe(airdropInfo.endTime);
      // Check formatted amounts
      expect(result.amountPerAddress).toBe('100');
      expect(result.rawAmountPerAddress).toBe('100000000000000000000');
    });
  });

  describe('getAllocationAmount', () => {
    it('should return allocation details for whitelisted address', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const isWhitelisted = true;
      const proof = ['0xproof1', '0xproof2'];
      const airdropInfo = {
        amountPerAddress: '100000000000000000000',
        endTime: '2023-12-31T00:00:00.000Z',
      };
      const claimStatus = { hasClaimed: false };
      const tokenInfo = {
        symbol: 'ATH',
        decimals: '18',
      };
      
      mockWhitelistService.isWhitelisted.mockResolvedValue(isWhitelisted);
      mockWhitelistService.getMerkleProof.mockResolvedValue(proof);
      mockBlockchainService.getAirdropInfo.mockResolvedValue(airdropInfo);
      mockBlockchainService.getClaimStatus.mockResolvedValue(claimStatus);
      mockBlockchainService.getTokenInfo.mockResolvedValue(tokenInfo);
      
      const result = await controller.getAllocationAmount(address);
      
      expect(result.address).toBe(address);
      expect(result.isWhitelisted).toBe(true);
      expect(result.allocation).toBe('100'); // Formatted with decimals
      expect(result.rawAllocation).toBe('100000000000000000000');
      expect(result.hasClaimed).toBe(false);
      expect(result.proof).toEqual(proof);
    });
    
    it('should return non-whitelisted status for address not in whitelist', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      mockWhitelistService.isWhitelisted.mockResolvedValue(false);
      
      const result = await controller.getAllocationAmount(address);
      
      expect(result.address).toBe(address);
      expect(result.isWhitelisted).toBe(false);
      expect(result.allocation).toBe('0');
      expect(result.message).toBe('Address is not whitelisted');
    });
  });
  
  describe('checkEligibility', () => {
    it('should check eligibility for a valid address', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const proof = ['0xproof1', '0xproof2'];
      
      const eligibility = {
        address,
        isWhitelisted: true,
        hasClaimed: false,
        isBlacklisted: false,
        isEligible: true,
        proof,
        amountPerAddress: '100', // Formatted with decimals
        rawAmountPerAddress: '100000000000000000000',
        tokenDecimals: '18',
        tokenSymbol: 'ATH',
        endTime: '2023-12-31T00:00:00.000Z',
        reason: null, // Controller adds this field
      };
      
      mockWhitelistService.isWhitelisted.mockResolvedValue(true);
      mockWhitelistService.getMerkleProof.mockResolvedValue(proof);
      mockBlockchainService.checkEligibility.mockResolvedValue(eligibility);
      
      const result = await controller.checkEligibility(address);
      
      expect(result).toEqual(eligibility);
    });
  });
  
  describe('getClaimEvents', () => {
    it('should return claim events for a valid address', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      const events = [
        {
          address,
          amount: '100', // Formatted with decimals
          rawAmount: '100000000000000000000',
          timestamp: 1672444800,
          transactionHash: '0xtx1',
          blockNumber: 123,
        },
        {
          address,
          amount: '50', // Formatted with decimals
          rawAmount: '50000000000000000000',
          timestamp: 1672531200,
          transactionHash: '0xtx2',
          blockNumber: 124,
        },
      ];
      
      mockBlockchainService.getClaimEvents.mockResolvedValue(events);
      
      const result = await controller.getClaimEvents(address);
      
      expect(result).toEqual(events);
    });
  });
  
  describe('getGasAnalytics', () => {
    it('should return gas analytics data', async () => {
      const analytics = {
        totalClaimValue: '500', // Formatted with decimals
        rawTotalClaimValue: '500000000000000000000',
        totalGasUsed: '2000000',
        totalTxCost: '0.01',
        averageGasPerClaim: '100000',
        claimGasData: [],
        distributionGasData: [],
        totalClaims: 5,
        tokenSymbol: 'ATH',
        tokenDecimals: '18',
      };
      
      mockBlockchainService.getGasAnalytics.mockResolvedValue(analytics);
      
      const result = await controller.getGasAnalytics();
      
      expect(result).toEqual(analytics);
    });
  });
}); 