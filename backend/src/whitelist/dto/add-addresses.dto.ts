import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEthereumAddress, IsNotEmpty } from 'class-validator';

export class AddAddressesDto {
  @ApiProperty({
    description: 'Array of Ethereum addresses to add to the whitelist',
    example: [
      '0x1234567890123456789012345678901234567890',
      '0xabcdef0123456789abc',
    ],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsEthereumAddress({ each: true })
  addresses: string[];
}
