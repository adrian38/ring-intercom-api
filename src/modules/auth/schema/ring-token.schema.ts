import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RingTokenDocument = RingToken & Document;

@Schema({ timestamps: true, collection: 'ring_tokens' })
export class RingToken {
  @Prop({ required: true, unique: true, index: true })
  email!: string;

  // Guarda el refresh token. Si usas cifrado opcional, puedes renombrar a "refreshTokenEnc".
  @Prop({ required: true })
  refreshToken!: string;
}

export const RingTokenSchema = SchemaFactory.createForClass(RingToken);
