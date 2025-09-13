import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { RingToken, RingTokenSchema } from './schema/ring-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RingToken.name, schema: RingTokenSchema },
    ]),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
