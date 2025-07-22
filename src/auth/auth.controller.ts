import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const result = await this.authService.iniciarLogin(
      body.email,
      body.password,
    );
    return { status: result };
  }

  @Post('2fa')
  async enviarCodigo(@Body() body: { email: string; code: string }) {
    this.authService.enviarCodigo2FA(body.email, body.code);
    return { status: '2fa-submitted' };
  }
}
