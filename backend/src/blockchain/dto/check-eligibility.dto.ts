import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEthereumAddress, IsString } from 'class-validator';

export class CheckEligibilityDto {
  @ApiProperty({ description: 'Ethereum address to check eligibility' })
  @IsEthereumAddress()
  address: string;

  @ApiProperty({ description: 'Merkle proof for the address', type: [String] })
  @IsArray()
  @IsString({ each: true })
  proof: string[];
} 