import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Configuración compartida por main.ts y las pruebas e2e, para que ambas
 * ejerciten la aplicación con los mismos pipes y el mismo CORS.
 */
export function configurarApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:5173'),
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
