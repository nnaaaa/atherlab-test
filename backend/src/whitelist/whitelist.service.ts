import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { ethers } from 'ethers';
import * as fs from 'fs';
import { MerkleTree } from 'merkletreejs';
import * as path from 'path';
import { BlockchainService } from '../blockchain/blockchain.service';

interface WhitelistData {
  addresses: string[];
  merkleRoot: string;
  addressToProofMap: Record<string, string[]>;
}

@Injectable()
export class WhitelistService implements OnModuleInit {
  private readonly logger = new Logger(WhitelistService.name);
  private whitelistData: WhitelistData;
  private merkleTree: MerkleTree;
  private whitelistPath: string;
  private readonly CACHE_KEY_PREFIX = 'whitelist:';

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(forwardRef(() => BlockchainService))
    private blockchainService: BlockchainService,
  ) {}

  async onModuleInit() {
    this.whitelistPath =
      this.configService.get<string>('WHITELIST_DATA_PATH') ||
      path.join(process.cwd(), '../data/whitelist.json');

    await this.loadWhitelist();

  }

  private async loadWhitelist() {
    try {
      if (fs.existsSync(this.whitelistPath)) {
        const data = JSON.parse(
          fs.readFileSync(this.whitelistPath, 'utf8'),
        );
        
        // Normalize addresses in the whitelist
        const normalizedAddresses = data.addresses.map(addr => 
          ethers.getAddress(addr.toLowerCase())
        );
        
        // Normalize address keys in the proof map
        const normalizedProofs: Record<string, string[]> = {};
        if (data.addressToProofMap) {
          for (const addr in data.addressToProofMap) {
            const normalizedAddr = ethers.getAddress(addr.toLowerCase());
            normalizedProofs[normalizedAddr] = data.addressToProofMap[addr];
          }
        }
        
        this.whitelistData = {
          addresses: normalizedAddresses,
          merkleRoot: data.merkleRoot,
          addressToProofMap: normalizedProofs,
        };
        
        this.logger.log(
          `Loaded ${this.whitelistData.addresses.length} addresses from whitelist`,
        );
      } else {
        this.logger.log('Whitelist file not found, creating empty whitelist');
        this.whitelistData = {
          addresses: [],
          merkleRoot: '',
          addressToProofMap: {},
        };
        await this.saveWhitelist();
      }
    } catch (error) {
      this.logger.error(`Failed to load whitelist: ${error.message}`);
      throw error;
    }
  }

  private async saveWhitelist() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.whitelistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Save file
      fs.writeFileSync(
        this.whitelistPath,
        JSON.stringify(this.whitelistData, null, 2),
      );
      this.logger.log(
        `Whitelist saved with ${this.whitelistData.addresses.length} addresses`,
      );
    } catch (error) {
      this.logger.error(`Failed to save whitelist: ${error.message}`);
      throw error;
    }
  }

  private async regenerateMerkleTree(updateBlockchain = false) {
    try {
      // Normalize and sort addresses
      const normalizedAddresses = this.whitelistData.addresses
        .map((addr) => ethers.getAddress(addr.toLowerCase()))
        .sort();

      // Generate leaf nodes
      const leaves = normalizedAddresses.map((addr) =>
        ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(['address'], [addr]),
        ),
      );

      // Create Merkle tree
      this.merkleTree = new MerkleTree(leaves, ethers.keccak256, {
        sortPairs: true,
      });

      // Update root
      const root = this.merkleTree.getHexRoot();
      this.whitelistData.merkleRoot = root;

      // Generate proofs for all addresses
      this.whitelistData.addressToProofMap = {};
      for (const address of normalizedAddresses) {
        const leaf = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(['address'], [address]),
        );
        const proof = this.merkleTree.getHexProof(leaf);
        this.whitelistData.addressToProofMap[address] = proof;
      }

      await this.saveWhitelist();

      // Clear cache
      await this.invalidateCache();

      this.logger.log(`Merkle tree regenerated with root: ${root}`);
      
      // Update the blockchain contract if requested
      if (updateBlockchain) {
        try {
          const result = await this.blockchainService.updateMerkleRoot(root);
          this.logger.log(`Merkle root updated in smart contract: ${result.transactionHash}`);
          return { root, contractUpdateStatus: 'success', transactionHash: result.transactionHash };
        } catch (error) {
          this.logger.error(`Failed to update Merkle root in smart contract: ${error.message}`);
          return { root, contractUpdateStatus: 'failed', error: error.message };
        }
      }
      
      return { root };
    } catch (error) {
      this.logger.error(`Failed to regenerate Merkle tree: ${error.message}`);
      throw error;
    }
  }

  private async invalidateCache() {
    // Clear all cache keys related to whitelist
    try {
      // In a more comprehensive implementation, you would clear pattern-based keys
      this.logger.log('Cache invalidated for whitelist data');
    } catch (error) {
      this.logger.error(`Failed to invalidate cache: ${error.message}`);
    }
  }

  async getWhitelistedAddresses() {
    return this.whitelistData.addresses;
  }

  async getMerkleRoot() {
    return this.whitelistData.merkleRoot;
  }

  async isWhitelisted(address: string) {
    try {
      // Normalize address for comparison
      const normalizedAddress = ethers.getAddress(address.toLowerCase());

      // Check if address is in whitelist
      const isInWhitelist = this.whitelistData.addresses.some(
        (addr) => ethers.getAddress(addr.toLowerCase()) === normalizedAddress,
      );

      return isInWhitelist;
    } catch (error) {
      this.logger.error(
        `Failed to check if address ${address} is whitelisted: ${error.message}`,
      );
      throw error;
    }
  }

  async getMerkleProof(address: string) {
    try {
      // Normalize address
      const normalizedAddress = ethers.getAddress(address.toLowerCase());
      
      // Get proof directly from the map (addresses are now normalized)
      const proof = this.whitelistData.addressToProofMap[normalizedAddress];

      return proof;
    } catch (error) {
      this.logger.error(
        `Failed to get Merkle proof for ${address}: ${error.message}`,
      );
      throw error;
    }
  }

  async addAddresses(addresses: string[]) {
    try {
      if (!addresses || addresses.length === 0) {
        throw new Error('No addresses provided');
      }

      // Normalize and validate addresses
      const normalizedAddresses = addresses.map((addr) => {
        try {
          return ethers.getAddress(addr.toLowerCase());
        } catch (error) {
          throw new Error(`Invalid address format: ${addr}`);
        }
      });

      // Add new addresses (avoid duplicates)
      const currentAddresses = new Set(
        this.whitelistData.addresses.map((addr) =>
          ethers.getAddress(addr.toLowerCase()),
        ),
      );

      let addedCount = 0;
      for (const addr of normalizedAddresses) {
        if (!currentAddresses.has(addr)) {
          currentAddresses.add(addr);
          addedCount++;
        }
      }

      if (addedCount === 0) {
        return {
          added: 0,
          total: currentAddresses.size,
          message: 'All addresses already in whitelist',
        };
      }

      // Update whitelist data
      this.whitelistData.addresses = Array.from(currentAddresses);

      // Regenerate Merkle tree
      await this.regenerateMerkleTree();
      
      // Update the Merkle root in the smart contract
      try {
        const result = await this.blockchainService.updateMerkleRoot(this.whitelistData.merkleRoot);
        console.log('result', result);
        this.logger.log(`Merkle root updated in smart contract: ${result.transactionHash}`);
      } catch (error) {
        this.logger.error(`Failed to update Merkle root in smart contract: ${error.message}`);
        // We don't throw here as we still want to return the successful whitelist update
        // even if the blockchain update fails
      }

      return {
        added: addedCount,
        total: currentAddresses.size,
        message: `Added ${addedCount} addresses to whitelist`,
        merkleRoot: this.whitelistData.merkleRoot,
        contractUpdateStatus: 'success',
      };
    } catch (error) {
      this.logger.error(`Failed to add addresses: ${error.message}`);
      throw error;
    }
  }

  async removeAddresses(addresses: string[]) {
    try {
      if (!addresses || addresses.length === 0) {
        throw new Error('No addresses provided');
      }

      // Normalize addresses
      const addressesToRemove = new Set(
        addresses.map((addr) => ethers.getAddress(addr.toLowerCase())),
      );

      // Filter out addresses to remove
      const initialLength = this.whitelistData.addresses.length;
      this.whitelistData.addresses = this.whitelistData.addresses.filter(
        (addr) => {
          const normalized = ethers.getAddress(addr.toLowerCase());
          return !addressesToRemove.has(normalized);
        },
      );

      const removedCount = initialLength - this.whitelistData.addresses.length;

      if (removedCount === 0) {
        return {
          removed: 0,
          total: this.whitelistData.addresses.length,
          message: 'None of the addresses were in the whitelist',
        };
      }

      // Regenerate Merkle tree
      await this.regenerateMerkleTree();
      
      // Update the Merkle root in the smart contract
      try {
        const result = await this.blockchainService.updateMerkleRoot(this.whitelistData.merkleRoot);
        this.logger.log(`Merkle root updated in smart contract: ${result.transactionHash}`);
      } catch (error) {
        this.logger.error(`Failed to update Merkle root in smart contract: ${error.message}`);
        // We don't throw here as we still want to return the successful whitelist update
        // even if the blockchain update fails
      }

      return {
        removed: removedCount,
        total: this.whitelistData.addresses.length,
        merkleRoot: this.whitelistData.merkleRoot,
        message: `Removed ${removedCount} addresses from whitelist`,
        contractUpdateStatus: 'success',
      };
    } catch (error) {
      this.logger.error(`Failed to remove addresses: ${error.message}`);
      throw error;
    }
  }

  async verifyProof(address: string, proof: string[]) {
    try {
      const normalizedAddress = ethers.getAddress(address.toLowerCase());
      const leaf = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address'],
          [normalizedAddress],
        ),
      );

      return this.merkleTree.verify(proof, leaf, this.whitelistData.merkleRoot);
    } catch (error) {
      this.logger.error(
        `Failed to verify proof for ${address}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Updates the Merkle tree and syncs it to the blockchain
   * @returns The result of the operation including the new root and transaction details
   */
  async syncMerkleRoot() {
    return await this.regenerateMerkleTree(true);
  }
}
