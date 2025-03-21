import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEthereumAddress, IsNotEmpty } from 'class-validator';

export class RemoveAddressesDto {
  @ApiProperty({
    description: 'Array of Ethereum addresses to remove from the whitelist',
    example: [
      '0x1234567890123456789012345678901234567890',
      '0xabcdef0123456789abcdef0123456789abcdef01',
    ],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsEthereumAddress({ each: true })
  addresses: string[];
}
