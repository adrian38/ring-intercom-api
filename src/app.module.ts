import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RingService } from './ring/ring.service';
import { RingController } from './ring/ring.controller';
import { DeviceAuthController } from './modules/device-auth/device-auth.controller';
import { DeviceAuthModule } from './modules/device-auth/device-auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoMonitorService } from './services/mongo-monitor.service';
import { AuthModule } from './modules/auth/auth.module';
import { RingModule } from './ring/ring.module';

@Module({
  imports: [
    DeviceAuthModule,
    AuthModule,
    RingModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
      }),
    }),
  ],

  controllers: [AppController, RingController, DeviceAuthController],
  providers: [AppService, MongoMonitorService],
})
export class AppModule {}
