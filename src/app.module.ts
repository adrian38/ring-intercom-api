import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RingService } from './ring/ring.service';
import { RingController } from './ring/ring.controller';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { DeviceAuthController } from './modules/device-auth/device-auth.controller';
import { DeviceAuthModule } from './modules/device-auth/device-auth.module';

@Module({
  imports: [DeviceAuthModule],
  controllers: [
    AppController,
    RingController,
    AuthController,
    DeviceAuthController,
  ],
  providers: [AppService, RingService, AuthService],
})
export class AppModule {}
