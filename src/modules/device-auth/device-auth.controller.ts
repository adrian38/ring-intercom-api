import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { DeviceAuthService } from './device-auth.service';

@Controller()
export class DeviceAuthController {
  constructor(private readonly deviceAuth: DeviceAuthService) {}

  /** Wear OS: inicia el flujo device code */
  @Post('device/start')
  start(@Req() req: any) {
    const base =
      `${req.headers['x-forwarded-proto'] ?? req.protocol}://${req.headers['x-forwarded-host'] ?? req.headers.host}`.replace(
        /\/+$/,
        '',
      );
    const res = this.deviceAuth.start();
    const auth_url = `${base}/pair?code=${encodeURIComponent(res.user_code)}`;
    return { ...res, auth_url };
  }

  /** Wear OS: polling */
  @Get('device/poll')
  poll(@Query('device_code') deviceCode: string) {
    if (!deviceCode) return { status: 'error', message: 'missing_device_code' };
    return this.deviceAuth.poll(deviceCode);
  }

  /**
   * Llamado desde la página web del móvil cuando el login/2FA fue correcto.
   * La propia página, con JS, hace fetch a /auth/login y /auth/2fa; si resultan OK,
   * llama a /device/authorize con user_code + email (+ token si aplica).
   */
  @Post('device/authorize')
  authorize(@Body() body: any) {
    const userCode = (body?.user_code ?? '').toString().trim().toUpperCase();
    const email = (body?.email ?? '').toString().trim();
    const token = body?.token ? String(body.token) : null;

    if (!userCode || !email) return { ok: false, error: 'missing_params' };

    const res = this.deviceAuth.authorizeByUserCode(userCode, email, token);
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true };
  }

  /** Página sencilla para el login desde el móvil (sin app compañera) */
  @Get('pair')
  pairPage(@Res() res: Response, @Query('code') code?: string) {
    const userCode = (code ?? '').toString().toUpperCase();
    res.type('html').send(this.renderPairHtml(userCode));
  }

  /** HTML con JS que llama a /auth/login, /auth/2fa y finalmente /device/authorize */
  private renderPairHtml(prefillUserCode = ''): string {
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Vincular reloj - Login</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 20px; }
    .card { max-width: 520px; margin: 0 auto; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; }
    h1 { margin: 0 0 12px; font-size: 20px; }
    label { display:block; margin: 10px 0 4px; font-weight: 600; }
    input { width:100%; padding:10px; border:1px solid #d1d5db; border-radius:8px; }
    button { margin-top: 14px; padding: 10px 14px; border:0; border-radius:10px; background:#111827; color:white; cursor:pointer; }
    .row { display:grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .ok { color: #165e2b; }
    .err { color: #b91c1c; }
    small { color:#6b7280; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Inicia sesión para vincular el reloj</h1>
    <p><small>Introduzca sus credenciales. Si se solicita 2FA, introduzca el código y pulse Continuar.</small></p>

    <label>Código del reloj</label>
    <input id="user_code" placeholder="AAAA-11" value="${prefillUserCode}" />

    <div class="row">
      <div>
        <label>Email</label>
        <input id="email" type="email" placeholder="correo@dominio.com" />
      </div>
      <div>
        <label>Password</label>
        <input id="password" type="password" placeholder="••••••••" />
      </div>
    </div>

    <label>Código 2FA (si se solicita)</label>
    <input id="code2fa" placeholder="123456" />

    <button id="btn">Continuar</button>
    <p id="msg"></p>
  </div>

  <script>
    const $ = (id) => document.getElementById(id);
    const msg = (t, cls) => { const el = $('msg'); el.textContent = t; el.className = cls || ''; };

    async function postJson(url, data) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { raw: text }; }
      return { ok: res.ok, json };
    }

    let status = 'none'; // 'none', '2fa-required', 'ok'

    $('btn').addEventListener('click', async () => {
      const email = $('email').value.trim();
      const password = $('password').value.trim();
      const code2fa = $('code2fa').value.trim();
      const user_code = $('user_code').value.trim().toUpperCase();

      if (!email || !password || !user_code) {
        msg('Complete email, password y código del reloj.', 'err');
        return;
      }

      if (status === '2fa-required') {
        if (!code2fa) {
          msg('Se requiere 2FA. Introduzca el código.', 'err');
          return;
        }

        msg('Verificando 2FA…');
        let r2 = await postJson('/auth/2fa', { email, code: code2fa });
        if (!r2.ok) {
          msg('2FA incorrecto', 'err');
          return;
        }

        msg('2FA correcto. Autorizando reloj…');
        let r3 = await postJson('/device/authorize', { user_code, email });
        if (!r3.ok || !r3.json.ok) {
          msg('No se pudo autorizar el reloj', 'err');
          return;
        }

        msg('¡Listo! Puede volver al reloj.', 'ok');
        status = 'none';
        return;
      }

      msg('Verificando credenciales…');
      let r = await postJson('/auth/login', { email, password });
      if (!r.ok) {
        msg('Login fallido', 'err');
        return;
      }

      status = (r.json && r.json.status) || 'error';

      if (status === '2fa-required') {
        msg('2FA requerido. Introduzca el código y pulse Continuar.');
        return;
      }

      if (status !== 'ok') {
        msg('Credenciales inválidas', 'err');
        return;
      }

      // Login ok sin 2FA
      let r3 = await postJson('/device/authorize', { user_code, email });
      if (!r3.ok || !r3.json.ok) {
        msg('No se pudo autorizar el reloj', 'err');
        return;
      }

      msg('¡Listo! Puede volver al reloj.', 'ok');
      status = 'none';
    });
  </script>
</body>
</html>`;
  }
}
