import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RingToken, RingTokenDocument } from './schema/ring-token.schema';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  // ✅ Mantenemos el mapa en memoria
  private tokenMap = new Map<string, string>();

  // Temporales del flujo de login
  private otpResolvers = new Map<string, (code: string) => void>();
  private currentProcesses = new Map<string, ChildProcessWithoutNullStreams>();

  constructor(
    @InjectModel(RingToken.name)
    private readonly tokenModel: Model<RingTokenDocument>,
  ) {}

  // 🚀 Al iniciar la app, cargar tokens desde Mongo → tokenMap
  async onModuleInit() {
    try {
      const docs = await this.tokenModel
        .find({}, { email: 1, refreshToken: 1 })
        .lean();
      this.tokenMap.clear();
      for (const d of docs) {
        if (d.email && d.refreshToken)
          this.tokenMap.set(d.email, d.refreshToken);
      }
      this.logger.log(
        `🔄 tokenMap precargado desde Mongo: ${this.tokenMap.size} entradas`,
      );
    } catch (err) {
      this.logger.error(
        `No se pudo precargar tokenMap: ${(err as Error).message}`,
      );
    }
  }

  // Utilidad: forzar recarga manual si lo necesitas
  async reloadTokenMapFromDB() {
    await this.onModuleInit();
  }

  async iniciarLogin(
    email: string,
    password: string,
  ): Promise<'2fa-required' | 'ok' | 'error'> {
    this.logger.log('🔐 Iniciando login con Ring CLI...');
    this.logger.log(`📤 Email: ${email}`);

    return new Promise((resolve) => {
      const isWin = process.platform === 'win32';
      const shell = isWin ? 'cmd' : 'sh';
      const arg = isWin ? '/c' : '-c';
      const cliCommand = 'npx -p ring-client-api ring-auth-cli';

      const child = spawn(shell, [arg, cliCommand]);
      this.currentProcesses.set(email, child);

      let step = 0;
      let espera2FA = false;

      child.stdout.on('data', async (data: Buffer) => {
        const output = data.toString();
        this.logger.debug(`📘 STDOUT: ${output}`);

        if (output.includes('Email:') && step === 0) {
          child.stdin.write(`${email}\n`);
          step = 1;
        } else if (output.includes('Password:') && step === 1) {
          child.stdin.write(`${password}\n`);
        }

        if (output.includes('Please enter the code sent') && !espera2FA) {
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

            // 💾 Guarda/actualiza en Mongo (upsert por email)
            await this.tokenModel.updateOne(
              { email },
              {
                $set: {
                  email,
                  refreshToken, // (si usas cifrado, cifra/descifra aquí)
                  updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
              },
              { upsert: true },
            );

            // 🧠 Actualiza el mapa en memoria
            this.tokenMap.set(email, refreshToken);

            this.otpResolvers.delete(email);
            this.logger.log(`✅ Token guardado en DB y tokenMap para ${email}`);

            // Si no hubo 2FA (caso raro), resuelve 'ok' ahora
            if (!espera2FA) {
              resolve('ok');
            }
          }
        }
      });

      child.stderr.on('data', (err: Buffer) => {
        // Evita loggear el token por accidente; aquí solo mensajes técnicos
        this.logger.warn(`❌ STDERR: ${err.toString()}`);
      });

      child.on('exit', () => {
        this.logger.log('👋 CLI cerrado');
        this.currentProcesses.delete(email);
      });
    });
  }

  enviarCodigo2FA(email: string, code: string) {
    const resolver = this.otpResolvers.get(email);
    if (resolver) {
      resolver(code);
    } else {
      this.logger.warn(`⚠️ No se encontró otpResolver para ${email}`);
    }
  }

  // === Métodos que usan el tokenMap (rápidos) y sincronizan con DB cuando aplique ===

  getRefreshToken(email: string): string | null {
    return this.tokenMap.get(email) ?? null;
  }

  isAutenticado(email: string): boolean {
    return this.tokenMap.has(email);
  }

  async deleteToken(email: string): Promise<void> {
    await this.tokenModel.deleteOne({ email });
    this.tokenMap.delete(email);
    this.logger.log(`🗑️ Token eliminado en DB y tokenMap para ${email}`);
  }

  // (Opcional) exposición para administración/diagnóstico
  getTokenMapSnapshot(): Record<string, string> {
    // ⚠️ No expongas en prod; solo útil para debug interno
    return Object.fromEntries(this.tokenMap.entries());
  }
}
