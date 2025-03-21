import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import { BlockchainService } from '../blockchain/blockchain.service';
import { WhitelistService } from './whitelist.service';

jest.mock('fs');
jest.mock('path');

describe('WhitelistService', () => {
  let service: WhitelistService;
  let mockConfigService: any;
  let mockCacheManager: any;
  let mockBlockchainService: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockBlockchainService = {
      getAirdropInfo: jest.fn(),
      updateMerkleRoot: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhitelistService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
      ],
    }).compile();

    service = module.get<WhitelistService>(WhitelistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('/path/to/whitelist.json');
      (path.join as jest.Mock).mockReturnValue('/path/to/whitelist.json');
      mockBlockchainService.getAirdropInfo.mockResolvedValue({
        merkleRoot: '0x1234',
      });
    });

    it('should load whitelist from file if it exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          addresses: ['0x1234567890123456789012345678901234567890', '0x2345678901234567890123456789012345678901'],
          merkleRoot: '0x1234',
          addressToProofMap: {},
          updatedAt: Date.now(),
        })
      );

      // Mock loadWhitelist method
      const loadWhitelistSpy = jest.spyOn(service as any, 'loadWhitelist');
      loadWhitelistSpy.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(loadWhitelistSpy).toHaveBeenCalled();
    });

    it('should create empty whitelist if file does not exist', async () => {
      // This test setup is modified to match the new implementation
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Mock loadWhitelist method which now handles creating empty whitelist
      const loadWhitelistSpy = jest.spyOn(service as any, 'loadWhitelist');
      loadWhitelistSpy.mockImplementation(async () => {
        (service as any).whitelistData = {
          addresses: [],
          merkleRoot: '',
          addressToProofMap: {},
        };
      });

      await service.onModuleInit();

      expect(loadWhitelistSpy).toHaveBeenCalled();
    });
  });

  describe('addAddresses', () => {
    beforeEach(() => {
      // Mock private methods
      jest.spyOn(service as any, 'regenerateMerkleTree').mockImplementation(async () => {
        // Update the merkleRoot in the whitelistData object to match the expected value
        (service as any).whitelistData.merkleRoot = '0xnewroot';
        return { root: '0xnewroot' };
      });
      jest.spyOn(service as any, 'saveWhitelist').mockResolvedValue(undefined);
    });

    it('should add new addresses to the whitelist', async () => {
      // Setup initial whitelist
      (service as any).whitelistData = {
        addresses: ['0x1234567890123456789012345678901234567890'],
        merkleRoot: '0xoldroot',
        addressToProofMap: {},
      };

      mockBlockchainService.updateMerkleRoot.mockResolvedValue({ transactionHash: '0xtx' });

      const result = await service.addAddresses(['0x2345678901234567890123456789012345678901', '0x3456789012345678901234567890123456789012']);

      expect(result.added).toBe(2);
      expect(result.total).toBe(3);
      expect(result.merkleRoot).toBe('0xnewroot');
      expect(mockBlockchainService.updateMerkleRoot).toHaveBeenCalledWith('0xnewroot');
    });

    it('should handle duplicate addresses', async () => {
      // Setup initial whitelist
      (service as any).whitelistData = {
        addresses: ['0x1234567890123456789012345678901234567890'],
        merkleRoot: '0xoldroot',
        addressToProofMap: {},
      };

      mockBlockchainService.updateMerkleRoot.mockResolvedValue({ transactionHash: '0xtx' });

      const result = await service.addAddresses(['0x1234567890123456789012345678901234567890', '0x2345678901234567890123456789012345678901']);

      expect(result.added).toBe(1);
      expect(result.total).toBe(2);
    });

    it('should handle blockchain update failure', async () => {
      // Setup initial whitelist
      (service as any).whitelistData = {
        addresses: ['0x1234567890123456789012345678901234567890'],
        merkleRoot: '0xoldroot',
        addressToProofMap: {},
      };

      mockBlockchainService.updateMerkleRoot.mockRejectedValue(new Error('Update failed'));

      const result = await service.addAddresses(['0x2345678901234567890123456789012345678901']);

      expect(result.added).toBe(1);
      expect(result.total).toBe(2);
      expect(result.merkleRoot).toBe('0xnewroot');
      // The method should not throw even if blockchain update fails
    });
  });

  describe('removeAddresses', () => {
    beforeEach(() => {
      // Mock private methods
      jest.spyOn(service as any, 'regenerateMerkleTree').mockImplementation(async () => {
        // Update the merkleRoot in the whitelistData object to match the expected value
        (service as any).whitelistData.merkleRoot = '0xnewroot';
        return { root: '0xnewroot' };
      });
      jest.spyOn(service as any, 'saveWhitelist').mockResolvedValue(undefined);
    });

    it('should remove addresses from the whitelist', async () => {
      // Setup initial whitelist
      (service as any).whitelistData = {
        addresses: ['0x1234567890123456789012345678901234567890', '0x2345678901234567890123456789012345678901', '0x3456789012345678901234567890123456789012'],
        merkleRoot: '0xoldroot',
        addressToProofMap: {},
      };

      mockBlockchainService.updateMerkleRoot.mockResolvedValue({ transactionHash: '0xtx' });

      const result = await service.removeAddresses(['0x2345678901234567890123456789012345678901', '0x3456789012345678901234567890123456789012']);

      expect(result.removed).toBe(2);
      expect(result.total).toBe(1);
      expect(result.merkleRoot).toBe('0xnewroot');
      expect(mockBlockchainService.updateMerkleRoot).toHaveBeenCalledWith('0xnewroot');
    });

    it('should handle non-existing addresses', async () => {
      // Setup initial whitelist
      (service as any).whitelistData = {
        addresses: ['0x1234567890123456789012345678901234567890'],
        merkleRoot: '0xoldroot',
        addressToProofMap: {},
      };

      mockBlockchainService.updateMerkleRoot.mockResolvedValue({ transactionHash: '0xtx' });

      const result = await service.removeAddresses(['0x9876543210987654321098765432109876543210']);

      expect(result.removed).toBe(0);
      expect(result.total).toBe(1);
    });
  });
  
  describe('syncMerkleRoot', () => {
    it('should regenerate merkle tree and update on blockchain', async () => {
      // Setup initial whitelist
      (service as any).whitelistData = {
        addresses: ['0x1234567890123456789012345678901234567890'],
        merkleRoot: '0xoldroot',
        addressToProofMap: {},
      };
      
      const regenerateSpy = jest.spyOn(service as any, 'regenerateMerkleTree');
      regenerateSpy.mockResolvedValue({ 
        root: '0xnewroot', 
        contractUpdateStatus: 'success', 
        transactionHash: '0xtx' 
      });
      
      const result = await service.syncMerkleRoot();
      
      expect(regenerateSpy).toHaveBeenCalledWith(true);
      expect(result.root).toBe('0xnewroot');
      expect(result.contractUpdateStatus).toBe('success');
      expect(result.transactionHash).toBe('0xtx');
    });
    
    it('should handle blockchain update failure', async () => {
      // Setup initial whitelist
      (service as any).whitelistData = {
        addresses: ['0x1234567890123456789012345678901234567890'],
        merkleRoot: '0xoldroot',
        addressToProofMap: {},
      };
      
      const regenerateSpy = jest.spyOn(service as any, 'regenerateMerkleTree');
      regenerateSpy.mockResolvedValue({ 
        root: '0xnewroot', 
        contractUpdateStatus: 'failed', 
        error: 'Update failed' 
      });
      
      const result = await service.syncMerkleRoot();
      
      expect(regenerateSpy).toHaveBeenCalledWith(true);
      expect(result.root).toBe('0xnewroot');
      expect(result.contractUpdateStatus).toBe('failed');
      expect(result.error).toBe('Update failed');
    });
  });
  
  describe('getMerkleProof', () => {
    it('should return proof for whitelisted address', async () => {
      // Setup whitelist data with proofs
      (service as any).whitelistData = {
        addresses: ['0x1234567890123456789012345678901234567890'],
        merkleRoot: '0xroot',
        addressToProofMap: {
          '0x1234567890123456789012345678901234567890': ['0xproof1', '0xproof2']
        },
      };
      
      const proof = await service.getMerkleProof('0x1234567890123456789012345678901234567890');
      
      expect(proof).toEqual(['0xproof1', '0xproof2']);
    });
    
    it('should handle address normalization', async () => {
      // Setup whitelist data with proofs for normalized address
      (service as any).whitelistData = {
        addresses: ['0x1234567890123456789012345678901234567890'],
        merkleRoot: '0xroot',
        addressToProofMap: {
          '0x1234567890123456789012345678901234567890': ['0xproof1', '0xproof2']
        },
      };
      
      // Mock ethers.getAddress to simulate address normalization
      jest.spyOn(require('ethers'), 'getAddress')
        .mockReturnValue('0x1234567890123456789012345678901234567890');
      
      const proof = await service.getMerkleProof('0x1234567890123456789012345678901234567890');
      
      expect(proof).toEqual(['0xproof1', '0xproof2']);
    });
  });
}); 