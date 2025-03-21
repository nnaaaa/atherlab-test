import { Module, forwardRef } from '@nestjs/common';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { WhitelistController } from './whitelist.controller';
import { WhitelistService } from './whitelist.service';

@Module({
  imports: [forwardRef(() => BlockchainModule)],
  controllers: [WhitelistController],
  providers: [WhitelistService],
  exports: [WhitelistService],
})
export class WhitelistModule {}
