import { Injectable } from '@nestjs/common';
import { RingApi } from 'ring-client-api';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class RingService {
  private ringApis: Map<string, RingApi> = new Map();

  constructor(private readonly authService: AuthService) {}

  async openDoor(email: string): Promise<boolean> {
    console.log('🔑 Abriendo puerta para el usuario:', email);

    const token = this.authService.getRefreshToken(email);
    if (!token) throw new Error('Usuario no autenticado');

    let ring = this.ringApis.get(email);
    if (!ring) {
      ring = new RingApi({ refreshToken: token });
      this.ringApis.set(email, ring);
    }
    try {
      const devices = await ring.fetchRingDevices();
      console.log('📦 Dispositivos Ring:', devices);

      const intercom = devices.intercoms[0];
      if (!intercom) throw new Error('No hay Ring Intercom');

      await ring.restClient.request({
        method: 'POST',
        url: `https://api.ring.com/intercom/v1/intercoms/${intercom.id}/doorbot_unlock`,
      });

      return true;
    } catch (err) {
      console.error('🚨 Error abriendo la puerta:', err);
      throw err; // Esto lo recoge tu controlador y manda 500
    }
  }
}
