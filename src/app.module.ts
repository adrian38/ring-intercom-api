import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RingService } from './ring/ring.service';
import { RingController } from './ring/ring.controller';
import { AuthService } from './modules/auth/auth.service';
import { AuthController } from './modules/auth/auth.controller';
import { DeviceAuthController } from './modules/device-auth/device-auth.controller';
import { DeviceAuthModule } from './modules/device-auth/device-auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoMonitorService } from './services/mongo-monitor.service';
import {
  RingToken,
  RingTokenSchema,
} from './modules/auth/schema/ring-token.schema';

@Module({
  imports: [
    DeviceAuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: RingToken.name, schema: RingTokenSchema },
    ]),
  ],

  controllers: [
    AppController,
    RingController,
    AuthController,
    DeviceAuthController,
  ],
  providers: [AppService, RingService, AuthService, MongoMonitorService],
})
export class AppModule {}
