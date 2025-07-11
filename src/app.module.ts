import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RingService } from './ring/ring.service';
import { RingController } from './ring/ring.controller';

@Module({
  imports: [],
  controllers: [AppController, RingController],
  providers: [AppService, RingService],
})
export class AppModule {}
