import { Module } from '@nestjs/common';
import { RingService } from './ring.service';
import { RingController } from './ring.controller';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [RingService],
  controllers: [RingController],
  exports: [RingService],
})
export class RingModule {}
