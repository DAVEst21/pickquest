import { Module } from '@nestjs/common';
import { AprendizajeModule } from '../aprendizaje/aprendizaje.module';
import { AuthModule } from '../auth/auth.module';
import { EconomiaModule } from '../economia/economia.module';
import { ProgresoModule } from '../progreso/progreso.module';
import { ClasificacionController } from './clasificacion/clasificacion.controller';
import { ClasificacionService } from './clasificacion/clasificacion.service';
import { DuelosController } from './duelos/duelos.controller';
import { DuelosService } from './duelos/duelos.service';
import { PerfilController } from './perfil/perfil.controller';
import { PerfilService } from './perfil/perfil.service';

/** Parte social del juego: duelos (CU-13), clasificación (RF-20) y perfil (RF-19). */
@Module({
  imports: [AuthModule, ProgresoModule, EconomiaModule, AprendizajeModule],
  controllers: [DuelosController, ClasificacionController, PerfilController],
  providers: [DuelosService, ClasificacionService, PerfilService],
})
export class SocialModule {}
