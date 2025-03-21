import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ethers } from 'ethers';
import { AdminGuard } from '../auth/admin.guard';
import { BlockchainService } from '../blockchain/blockchain.service';
import { AddAddressesDto } from './dto/add-addresses.dto';
import { RemoveAddressesDto } from './dto/remove-addresses.dto';
import { WhitelistService } from './whitelist.service';

@ApiTags('whitelist')
@Controller('whitelist')
@UseGuards(ThrottlerGuard)
@ApiSecurity('admin_key')
@UseGuards(AdminGuard)
export class WhitelistController {
  constructor(
    private readonly whitelistService: WhitelistService,
    private blockchainService: BlockchainService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all whitelisted addresses' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all whitelisted addresses',
  })
  async getAllAddresses() {
    const addresses = await this.whitelistService.getWhitelistedAddresses();
    return {
      addresses,
      merkleRoot: await this.whitelistService.getMerkleRoot(),
      count: addresses.length,
    };
  }

  @Get('merkle-root')
  @ApiOperation({ summary: 'Get the current merkle root' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the current merkle root',
  })
  async getMerkleRoot() {
    return {
      merkleRoot: await this.whitelistService.getMerkleRoot(),
    };
  }

  @Get(':address')
  @ApiOperation({ summary: 'Check if an address is whitelisted' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns whitelist status for the address',
  })
  @ApiParam({
    name: 'address',
    required: true,
    description: 'Ethereum address to check',
  })
  async checkAddress(@Param('address') address: string) {
    if (!ethers.isAddress(address)) {
      throw new BadRequestException('Invalid Ethereum address format');
    }

    const isWhitelisted = await this.whitelistService.isWhitelisted(address);
    let proof = null;

    if (isWhitelisted) {
      proof = await this.whitelistService.getMerkleProof(address);
    }

    return {
      address,
      isWhitelisted,
      proof,
    };
  }

  @Post('add')
  @ApiOperation({ summary: 'Add addresses to whitelist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns result of adding addresses',
  })
  async addAddresses(@Body() dto: AddAddressesDto) {
    try {
      const result = await this.whitelistService.addAddresses(dto.addresses);

      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('remove')
  @ApiOperation({ summary: 'Remove addresses from whitelist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns result of removing addresses',
  })
  async removeAddresses(@Body() dto: RemoveAddressesDto) {
    try {
      const result = await this.whitelistService.removeAddresses(dto.addresses);

      // Update the merkle root in the blockchain if necessary
      if (result.removed > 0) {
        try {
          await this.blockchainService.updateMerkleRoot(result.merkleRoot);
        } catch (error) {
          return {
            ...result,
            blockchainUpdate: {
              success: false,
              error: error.message,
            },
          };
        }

        return {
          ...result,
          blockchainUpdate: {
            success: true,
          },
        };
      }

      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
