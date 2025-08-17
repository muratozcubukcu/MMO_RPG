import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { MarketResolver } from './market.resolver';
import { OrderProcessor } from './order.processor';
import { EscrowService } from './escrow.service';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: 'market-orders',
    }),
  ],
  controllers: [MarketController],
  providers: [MarketService, MarketResolver, OrderProcessor, EscrowService],
  exports: [MarketService, EscrowService],
})
export class MarketModule {}
