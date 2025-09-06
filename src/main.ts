console.log('👉 Iniciando main.ts');
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  process.env.PUBLIC_BASE_URL = (await app.getUrl()).replace(/\/+$/, '');
  console.log(`🚀 Aplicación corriendo en http://localhost:${port}`);
}
bootstrap();
