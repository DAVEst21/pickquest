import { ArmadoPiezasEvaluador } from './mecanicas/armado-piezas/armado-piezas.evaluador';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EconomiaModule } from '../economia/economia.module';
import { ProgresoModule } from '../progreso/progreso.module';
import { AprendizajeController } from './aprendizaje.controller';
import { AprendizajeService } from './aprendizaje.service';
import { PlanController } from './plan/plan.controller';
import { PlanService } from './plan/plan.service';
import { EstudioController } from './estudio/estudio.controller';
import { EstudioService } from './estudio/estudio.service';
import { DialogoStakeholderEvaluador } from './mecanicas/dialogo-stakeholder/dialogo-stakeholder.evaluador';
import { ExpedienteProyectoEvaluador } from './mecanicas/expediente-proyecto/expediente-proyecto.evaluador';
import { InspeccionSistemaEvaluador } from './mecanicas/inspeccion-sistema/inspeccion-sistema.evaluador';
import { LineaTiempoEvaluador } from './mecanicas/linea-tiempo/linea-tiempo.evaluador';
import { MecanicasRegistro } from './mecanicas/mecanicas.registro';
import { RepartoPresupuestoEvaluador } from './mecanicas/reparto-presupuesto/reparto-presupuesto.evaluador';
import { SimuladorEscenariosEvaluador } from './mecanicas/simulador-escenarios/simulador-escenarios.evaluador';
import { TableroMoscowEvaluador } from './mecanicas/tablero-moscow/tablero-moscow.evaluador';

@Module({
  imports: [AuthModule, ProgresoModule, EconomiaModule],
  controllers: [AprendizajeController, EstudioController, PlanController],
  providers: [
    AprendizajeService,
    EstudioService,
    PlanService,
    MecanicasRegistro,
    ArmadoPiezasEvaluador,
    DialogoStakeholderEvaluador,
    TableroMoscowEvaluador,
    InspeccionSistemaEvaluador,
    RepartoPresupuestoEvaluador,
    LineaTiempoEvaluador,
    SimuladorEscenariosEvaluador,
    ExpedienteProyectoEvaluador,
  ],
})
export class AprendizajeModule {}
