import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongoMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoMonitorService.name);
  private intervalId: NodeJS.Timeout | null = null;

  // Mongoose readyState:
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  private stateMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit() {
    // Revisión cada 60 segundos
    this.intervalId = setInterval(() => {
      this.checkConnection();
    }, 60_000);

    // Primer chequeo inmediato al arrancar
    this.checkConnection();
  }

  onModuleDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async checkConnection() {
    const state = this.connection.readyState;
    const stateText = this.stateMap[state] ?? `unknown(${state})`;

    if (state === 1) {
      // Opcional: ping real para asegurarnos que no es un "connected" zombie
      try {
        // `db.admin().ping()` devuelve { ok: 1 } si hay respuesta
        const result = await this.connection.db?.admin().ping();
        if ((result as any)?.ok === 1) {
          this.logger.log(
            '✅ Conectado a MongoDB (ping ok) — chequeo cada 1 min',
          );
        } else {
          this.logger.warn(
            '⚠️ Conectado pero ping devolvió un resultado inesperado',
          );
        }
      } catch (err) {
        this.logger.error(
          `❌ Error haciendo ping a MongoDB: ${(err as Error).message}`,
        );
      }
    } else {
      this.logger.warn(`⚠️ Estado de conexión MongoDB: ${stateText}`);
    }
  }
}
