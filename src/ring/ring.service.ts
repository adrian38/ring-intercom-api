import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RingApi } from 'ring-client-api';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class RingService implements OnModuleInit {
  private ringApi: RingApi;
  private readonly logger = new Logger(RingService.name);

  async onModuleInit() {
    console.log('⏳ Inicializando RingApi desde onModuleInit...');

    const refreshToken = process.env.RING_REFRESH_TOKEN;
    if (!refreshToken) {
      throw new Error('❌ Falta RING_REFRESH_TOKEN en el archivo .env');
    }

    try {
      this.ringApi = new RingApi({
        refreshToken,
        cameraStatusPollingSeconds: 20,
        debug: false,
      });

      // 👉 Forzar inicialización y validar conexión
      console.log('✅ RingApi inicializandose.');
      await this.ringApi.getLocations();

      console.log('✅ RingApi inicializado correctamente.');
    } catch (error) {
      console.error('❌ Error al inicializar RingApi:', error);
    }
  }

  async openDoor(): Promise<boolean> {
    try {
      console.log('🚪 Ejecutando openDoor...');
      const locations = await this.ringApi.getLocations();
      const intercom = locations[0]?.intercoms?.[0];
      if (!intercom) {
        throw new Error('❌ No se encontró ningún Ring Intercom en tu cuenta.');
      }
      await intercom.unlock();
      this.logger.log('✅ Puerta abierta correctamente.');
      return true;
    } catch (error) {
      this.logger.error(`❌ Error al abrir la puerta: ${error.message}`);
      throw error;
    }
  }
}
