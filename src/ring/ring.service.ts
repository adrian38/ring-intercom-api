import { Injectable } from '@nestjs/common';
import { RingApi } from 'ring-client-api';
import { AuthService } from '../modules/auth/auth.service';

@Injectable()
export class RingService {
  private ringApis: Map<string, RingApi> = new Map();

  constructor(private readonly authService: AuthService) {}

  async openDoor(email: string): Promise<boolean> {
    // Log esencial solo para depuración de errores
    const token = this.authService.getRefreshToken(email);
    if (!token) throw new Error('Usuario no autenticado');

    let ring = this.ringApis.get(email);
    if (!ring) {
      ring = new RingApi({ refreshToken: token });
      this.ringApis.set(email, ring);
    }

    try {
      // No logs de dispositivos ni locations, solo errores
      const locations = await ring.getLocations();
      const intercom = locations[0]?.intercoms?.[0];
      if (!intercom) throw new Error('No hay Ring Intercom');

      await intercom.unlock();
      // Solo log en caso de éxito real (opcional)
      // console.log(`✅ Puerta abierta correctamente para ${email}`);
      return true;
    } catch (err) {
      if (
        err?.response?.status === 401 ||
        (err?.message && err.message.includes('Unauthorized'))
      ) {
        // Limpia el token y la instancia RingApi para este usuario
        this.authService.deleteToken(email); // debes crear este método en AuthService
        this.ringApis.delete(email);
        throw new Error(
          'Sesión expirada o token inválido. Por favor, inicia sesión de nuevo.',
        );
      }
      // Solo loguea el mensaje del error
      console.error(`❌ Error al abrir la puerta (${email}):`, err.message);
      throw err;
    }
  }
}
