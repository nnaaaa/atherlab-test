import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BlockchainModule } from './blockchain/blockchain.module';
import { WhitelistModule } from './whitelist/whitelist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get('CACHE_TTL', 60) * 1000, // milliseconds
        max: configService.get('CACHE_MAX_ITEMS', 100),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          throttlers: [
            {
              ttl: config.get<number>('THROTTLE_TTL', 60),
              limit: config.get<number>('THROTTLE_LIMIT', 10),
            },
          ],
        };
      },
    }),
    BlockchainModule,
    WhitelistModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
