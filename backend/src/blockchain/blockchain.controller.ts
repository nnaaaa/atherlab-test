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
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AdminGuard } from '../auth/admin.guard';
import { WhitelistService } from '../whitelist/whitelist.service';
import { BlockchainService } from './blockchain.service';
import { EligibilityResponseDto } from './dto/eligibility-response.dto';

@ApiTags('blockchain')
@UseGuards(ThrottlerGuard)
@Controller('blockchain')
export class BlockchainController {
  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly whitelistService: WhitelistService,
  ) {}

  @Get('claim-status/:address')
  @ApiOperation({ summary: 'Check if address has claimed tokens' })
  @ApiParam({
    name: 'address',
    description: 'Ethereum address to check claim status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns claim status',
  })
  async getClaimStatus(@Param('address') address: string) {
    if (!address || !address.startsWith('0x')) {
      throw new BadRequestException('Invalid Ethereum address');
    }
    return await this.blockchainService.getClaimStatus(address);
  }

  @UseGuards(AdminGuard)
  @Post('update-airdrop')
  @ApiOperation({ summary: 'Update airdrop parameters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns transaction details',
  })
  async updateAirdrop(
    @Body() data: { amountPerAddress: string; endTime: number },
  ) {
    return await this.blockchainService.updateAirdrop(
      data.amountPerAddress,
      data.endTime,
    );
  }

  @UseGuards(AdminGuard)
  @Post('set-paused')
  @ApiOperation({ summary: 'Pause or unpause airdrop' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns transaction details',
  })
  async setPaused(@Body() data: { isPaused: boolean }) {
    return await this.blockchainService.setPaused(data.isPaused);
  }

  @UseGuards(AdminGuard)
  @Post('emergency-withdraw')
  @ApiOperation({ summary: 'Emergency withdraw tokens' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns transaction details',
  })
  async emergencyWithdraw(
    @Body() data: { token: string; to: string; amount: string },
  ) {
    if (!data.token || !data.token.startsWith('0x')) {
      throw new BadRequestException('Invalid token address');
    }
    if (!data.to || !data.to.startsWith('0x')) {
      throw new BadRequestException('Invalid recipient address');
    }
    
    return await this.blockchainService.emergencyWithdraw(
      data.token,
      data.to,
      data.amount,
    );
  }

  @Get('eligibility/:address')
  @ApiOperation({ summary: 'Check if an address is eligible for claiming tokens' })
  @ApiParam({
    name: 'address',
    description: 'Ethereum address to check eligibility',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns eligibility status with details',
    type: EligibilityResponseDto,
  })
  async checkEligibility(@Param('address') address: string): Promise<EligibilityResponseDto> {
    if (!address || !address.startsWith('0x')) {
      throw new BadRequestException('Invalid Ethereum address');
    }
    
    // First check if the address is whitelisted and get its proof
    const whitelistStatus = await this.whitelistService.isWhitelisted(address);
    
    if (!whitelistStatus) {
      return {
        address,
        isEligible: false,
        isWhitelisted: false,
        hasClaimed: false,
        isBlacklisted: false,
        reason: 'Address is not whitelisted',
        proof: null,
        amountPerAddress: '0',
        endTime: ''
      };
    }
    
    // Get the Merkle proof
    const proof = await this.whitelistService.getMerkleProof(address);
    
    // Check full eligibility using blockchain service
    const eligibility = await this.blockchainService.checkEligibility(address, proof);
    
    return {
      ...eligibility,
      reason: !eligibility.isEligible ? this.getEligibilityReason(eligibility) : null
    };
  }
  
  // Helper method to determine the reason why an address is not eligible
  private getEligibilityReason(eligibility: any): string {
    if (!eligibility.isWhitelisted) {
      return 'Address is not whitelisted';
    }
    if (eligibility.hasClaimed) {
      return 'Address has already claimed tokens';
    }
    if (eligibility.isBlacklisted) {
      return 'Address is blacklisted';
    }
    return 'Unknown eligibility issue';
  }

  @Get('claim-events/:address')
  @ApiOperation({ summary: 'Get all claim events for a specific address' })
  @ApiParam({
    name: 'address',
    description: 'Ethereum address to get claim events for',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns array of claim events for the address',
  })
  async getClaimEvents(@Param('address') address: string) {
    if (!address || !address.startsWith('0x')) {
      throw new BadRequestException('Invalid Ethereum address');
    }
    return await this.blockchainService.getClaimEvents(address);
  }

  @Get('allocation/:address')
  @ApiOperation({ summary: 'Get allocation amount for a specific address' })
  @ApiParam({
    name: 'address',
    description: 'Ethereum address to get allocation amount for',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns allocation details for the address',
  })
  async getAllocationAmount(@Param('address') address: string) {
    if (!address || !address.startsWith('0x')) {
      throw new BadRequestException('Invalid Ethereum address');
    }
    
    // Check if address is whitelisted
    const isWhitelisted = await this.whitelistService.isWhitelisted(address);
    if (!isWhitelisted) {
      return {
        address,
        isWhitelisted: false,
        allocation: '0',
        message: 'Address is not whitelisted'
      };
    }
    
    // Get proof, airdrop info, and token info
    const proof = await this.whitelistService.getMerkleProof(address);
    const airdropInfo = await this.blockchainService.getAirdropInfo();
    const claimStatus = await this.blockchainService.getClaimStatus(address);
    const tokenInfo = await this.blockchainService.getTokenInfo();
    
    // Convert raw token amount to decimal-adjusted value
    const tokenDecimals = tokenInfo.decimals || '18';
    const divisor = BigInt(10) ** BigInt(tokenDecimals);
    const rawAllocation = BigInt(airdropInfo.amountPerAddress);
    const formattedAllocation = (rawAllocation / divisor).toString();
    
    return {
      address,
      isWhitelisted: true,
      allocation: formattedAllocation,
      rawAllocation: airdropInfo.amountPerAddress, // Keep raw value for reference
      hasClaimed: claimStatus.hasClaimed,
      endTime: airdropInfo.endTime,
      tokenDecimals,
      tokenSymbol: tokenInfo.symbol,
      proof
    };
  }

  @Get('distribution-progress')
  @ApiOperation({ summary: 'Get overall distribution progress' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns distribution progress statistics',
  })
  async getDistributionProgress() {
    // Get information about total distribution progress
    const airdropInfo = await this.blockchainService.getAirdropInfo();
    const tokenInfo = await this.blockchainService.getTokenInfo();
    const whitelist = await this.whitelistService.getWhitelistedAddresses();
    
    // Get decimals for conversion
    const tokenDecimals = tokenInfo.decimals || '18';
    const divisor = BigInt(10) ** BigInt(tokenDecimals);
    
    // Calculate values
    const totalWhitelisted = whitelist.length;
    const amountPerAddress = BigInt(airdropInfo.amountPerAddress);
    const totalAllocated = (amountPerAddress * BigInt(totalWhitelisted)).toString();
    const totalClaimed = airdropInfo.totalClaimed;
    
    // Calculate percentages
    const claimPercentage = totalAllocated !== '0' 
      ? (Number(totalClaimed) / Number(totalAllocated) * 100).toFixed(2) 
      : '0';
    
    // Convert raw token amounts to decimal-adjusted values
    const formattedAmountPerAddress = (amountPerAddress / divisor).toString();
    const formattedTotalAllocated = (BigInt(totalAllocated) / divisor).toString();
    const formattedTotalClaimed = (BigInt(totalClaimed) / divisor).toString();
    const formattedContractBalance = (BigInt(airdropInfo.contractBalance) / divisor).toString();
    
    return {
      totalWhitelisted,
      amountPerAddress: formattedAmountPerAddress,
      rawAmountPerAddress: airdropInfo.amountPerAddress, // Keep raw value for reference
      tokenName: tokenInfo.name,
      tokenSymbol: tokenInfo.symbol,
      tokenDecimals,
      totalAllocated: formattedTotalAllocated,
      rawTotalAllocated: totalAllocated, // Keep raw value for reference
      totalClaimed: formattedTotalClaimed,
      rawTotalClaimed: totalClaimed, // Keep raw value for reference
      contractBalance: formattedContractBalance,
      rawContractBalance: airdropInfo.contractBalance, // Keep raw value for reference
      claimPercentage,
      isPaused: airdropInfo.isPaused,
      endTime: airdropInfo.endTime,
      remainingTime: airdropInfo.endTimeUnix > Math.floor(Date.now() / 1000) 
        ? airdropInfo.endTimeUnix - Math.floor(Date.now() / 1000) 
        : 0
    };
  }

  @Get('gas-analytics')
  @ApiOperation({ summary: 'Get gas usage analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns gas usage statistics and analytics',
  })
  async getGasAnalytics() {
    return await this.blockchainService.getGasAnalytics();
  }
} 