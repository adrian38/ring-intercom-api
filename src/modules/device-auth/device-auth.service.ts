import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

type Status = 'pending' | 'ok' | 'expired';

interface Session {
  deviceCode: string;
  userCode: string;
  status: Status;
  email?: string;
  token?: string | null;
  createdAt: number; // ms
  expiresAt: number; // ms
  intervalSec: number; // sugerencia de polling
}

@Injectable()
export class DeviceAuthService {
  private byDevice = new Map<string, Session>();
  private byUser = new Map<string, string>(); // userCode -> deviceCode

  // Config por defecto (ajusta a tu gusto o carga de .env)
  private DEFAULT_EXPIRES_SEC = Number(process.env.DEVICE_EXPIRES_SEC ?? 180);
  private DEFAULT_INTERVAL_SEC = Number(process.env.DEVICE_INTERVAL_SEC ?? 3);
  private PUBLIC_BASE_URL = (
    process.env.PUBLIC_BASE_URL ?? 'https://ringaping.ddns.net'
  ).replace(/\/+$/, '');

  private genUserCode(): string {
    // AAAA-11 (simple, legible). Puedes hacerlo más robusto si quieres.
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const pick = (n: number) =>
      Array.from(
        { length: n },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join('');
    return `${pick(4)}-${pick(2)}`;
  }

  start(): {
    device_code: string;
    user_code: string;
    auth_url: string;
    expires_in: number;
    interval: number;
  } {
    this.gc();

    const deviceCode = randomUUID();
    let userCode = this.genUserCode();
    while (this.byUser.has(userCode)) userCode = this.genUserCode();

    const now = Date.now();
    const expiresInSec = this.DEFAULT_EXPIRES_SEC;
    const expiresAt = now + expiresInSec * 1000;

    const session: Session = {
      deviceCode,
      userCode,
      status: 'pending',
      createdAt: now,
      expiresAt,
      intervalSec: this.DEFAULT_INTERVAL_SEC,
    };

    this.byDevice.set(deviceCode, session);
    this.byUser.set(userCode, deviceCode);

    const authUrl = `${this.PUBLIC_BASE_URL}/pair?code=${encodeURIComponent(userCode)}`;

    return {
      device_code: deviceCode,
      user_code: userCode,
      auth_url: authUrl,
      expires_in: expiresInSec,
      interval: session.intervalSec,
    };
  }

  poll(deviceCode: string) {
    this.gc();
    const s = this.byDevice.get(deviceCode);
    if (!s) return { status: 'error', message: 'not_found' };
    if (Date.now() > s.expiresAt && s.status !== 'ok') {
      s.status = 'expired';
      return { status: 'error', message: 'expired' };
    }
    if (s.status === 'pending') return { status: 'pending' };
    if (s.status === 'ok')
      return { status: 'ok', email: s.email ?? '', token: s.token ?? null };
    return { status: 'error', message: s.status };
  }

  authorizeByUserCode(
    userCode: string,
    email: string,
    token?: string | null,
  ): { ok: true } | { ok: false; error: string } {
    this.gc();
    const deviceCode = this.byUser.get(userCode);
    if (!deviceCode) return { ok: false, error: 'invalid_code' };
    const s = this.byDevice.get(deviceCode);
    if (!s) return { ok: false, error: 'invalid_code' };
    if (Date.now() > s.expiresAt) return { ok: false, error: 'expired' };
    if (s.status === 'ok') return { ok: true }; // idempotente

    s.status = 'ok';
    s.email = email;
    s.token = token ?? null;

    return { ok: true };
  }

  /** Limpia sesiones expiradas para no crecer en memoria */
  private gc() {
    const now = Date.now();
    for (const [dc, s] of this.byDevice.entries()) {
      if (now > s.expiresAt && s.status !== 'ok') {
        this.byDevice.delete(dc);
        this.byUser.delete(s.userCode);
      }
    }
  }
}
