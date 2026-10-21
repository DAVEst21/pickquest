import { ArmadoPiezasEvaluador } from './mecanicas/armado-piezas/armado-piezas.evaluador';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EconomiaModule } from '../economia/economia.module';
import { ProgresoModule } from '../progreso/progreso.module';
import { AprendizajeController } from './aprendizaje.controller';
import { AprendizajeService } from './aprendizaje.service';
import { DialogoStakeholderEvaluador } from './mecanicas/dialogo-stakeholder/dialogo-stakeholder.evaluador';
import { InspeccionSistemaEvaluador } from './mecanicas/inspeccion-sistema/inspeccion-sistema.evaluador';
import { LineaTiempoEvaluador } from './mecanicas/linea-tiempo/linea-tiempo.evaluador';
import { MecanicasRegistro } from './mecanicas/mecanicas.registro';
import { RepartoPresupuestoEvaluador } from './mecanicas/reparto-presupuesto/reparto-presupuesto.evaluador';
import { TableroMoscowEvaluador } from './mecanicas/tablero-moscow/tablero-moscow.evaluador';

@Module({
  imports: [AuthModule, ProgresoModule, EconomiaModule],
  controllers: [AprendizajeController],
  providers: [
    AprendizajeService,
    MecanicasRegistro,
    ArmadoPiezasEvaluador,
    DialogoStakeholderEvaluador,
    TableroMoscowEvaluador,
    InspeccionSistemaEvaluador,
    RepartoPresupuestoEvaluador,
    LineaTiempoEvaluador,
  ],
})
export class AprendizajeModule {}
