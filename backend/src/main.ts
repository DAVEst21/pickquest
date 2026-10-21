import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configurarApp(app);

  const documento = new DocumentBuilder()
    .setTitle('PickQuest API')
    .setDescription('Backend de PickQuest: Auth y Aprendizaje')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, documento),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
