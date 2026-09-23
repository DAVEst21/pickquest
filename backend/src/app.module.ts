import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validarEntorno } from './common/config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';
import { AprendizajeModule } from './modules/aprendizaje/aprendizaje.module';
import { AuthModule } from './modules/auth/auth.module';
import { EconomiaModule } from './modules/economia/economia.module';
import { ProgresoModule } from './modules/progreso/progreso.module';
import { SocialModule } from './modules/social/social.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }),
    PrismaModule,
    AuthModule,
    AprendizajeModule,
    ProgresoModule,
    EconomiaModule,
    SocialModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
