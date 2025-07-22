import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RingService } from './ring/ring.service';
import { RingController } from './ring/ring.controller';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';

@Module({
  imports: [],
  controllers: [AppController, RingController, AuthController],
  providers: [AppService, RingService, AuthService],
})
export class AppModule {}
