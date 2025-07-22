import { Injectable } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

@Injectable()
export class AuthService {
  private tokenMap = new Map<string, string>();
  private otpResolvers = new Map<string, (code: string) => void>();
  private currentProcesses = new Map<string, ChildProcessWithoutNullStreams>();

  async iniciarLogin(
    email: string,
    password: string,
  ): Promise<'2fa-required' | 'ok' | 'error'> {
    console.log('🔐 Iniciando login con Ring CLI...');
    console.log('📤 Email:', email);

    return new Promise((resolve, reject) => {
      const child = spawn('cmd', [
        '/c',
        'npx -p ring-client-api ring-auth-cli',
      ]);
      this.currentProcesses.set(email, child);

      let step = 0;
      let espera2FA = false;

      child.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log('📘 STDOUT:', output);

        if (output.includes('Email:') && step === 0) {
          child.stdin.write(`${email}\n`);
          step = 1;
        } else if (output.includes('Password:') && step === 1) {
          child.stdin.write(`${password}\n`);
        }

        if (output.includes('Please enter the code sent')) {
          espera2FA = true;
          this.otpResolvers.set(email, (code: string) => {
            child.stdin.write(`${code}\n`);
          });
          resolve('2fa-required');
        }

        if (output.includes('"refreshToken":')) {
          const match = output.match(/"refreshToken":\s*"([^"]+)"/);
          if (match) {
            const refreshToken = match[1];
            this.tokenMap.set(email, refreshToken);
            this.otpResolvers.delete(email);
            console.log(`✅ Token guardado para ${email}`);
            if (!espera2FA) {
              resolve('ok');
            }
          }
        }
      });

      child.stderr.on('data', (err: Buffer) => {
        console.error('❌ STDERR:', err.toString());
      });

      child.on('exit', () => {
        console.log('👋 CLI cerrado');
        this.currentProcesses.delete(email);
      });
    });
  }

  enviarCodigo2FA(email: string, code: string) {
    const resolver = this.otpResolvers.get(email);
    if (resolver) {
      resolver(code);
    } else {
      console.warn(`⚠️ No se encontró otpResolver para ${email}`);
    }
  }

  getRefreshToken(email: string): string | null {
    return this.tokenMap.get(email) || null;
  }

  isAutenticado(email: string): boolean {
    return this.tokenMap.has(email);
  }
}
