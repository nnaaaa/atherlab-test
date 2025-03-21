import { ApiProperty } from '@nestjs/swagger';

export class EligibilityResponseDto {
  @ApiProperty({ description: 'Ethereum address' })
  address: string;

  @ApiProperty({ description: 'Whether the address is whitelisted' })
  isWhitelisted: boolean;

  @ApiProperty({ description: 'Whether the address has already claimed tokens' })
  hasClaimed: boolean;

  @ApiProperty({ description: 'Whether the address is blacklisted' })
  isBlacklisted: boolean;

  @ApiProperty({ description: 'Overall eligibility status for claiming tokens' })
  isEligible: boolean;

  @ApiProperty({ description: 'Merkle proof for the address' })
  proof: string[];

  @ApiProperty({ description: 'Amount of tokens to be received' })
  amountPerAddress: string;

  @ApiProperty({ description: 'End time of the airdrop' })
  endTime: string;

  @ApiProperty({ description: 'Reason for ineligibility, if not eligible', required: false })
  reason?: string;
} 