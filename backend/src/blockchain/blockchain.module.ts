import { Module, forwardRef } from '@nestjs/common';
import { WhitelistModule } from '../whitelist/whitelist.module';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';

@Module({
  imports: [forwardRef(() => WhitelistModule)],
  providers: [BlockchainService],
  controllers: [BlockchainController],
  exports: [BlockchainService],
})
export class BlockchainModule {}
