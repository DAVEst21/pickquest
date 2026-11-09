import { ArmadoPiezasEvaluador } from './armado-piezas/armado-piezas.evaluador';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Mecanica } from '@prisma/client';
import { DialogoStakeholderEvaluador } from './dialogo-stakeholder/dialogo-stakeholder.evaluador';
import { InspeccionSistemaEvaluador } from './inspeccion-sistema/inspeccion-sistema.evaluador';
import { LineaTiempoEvaluador } from './linea-tiempo/linea-tiempo.evaluador';
import { RepartoPresupuestoEvaluador } from './reparto-presupuesto/reparto-presupuesto.evaluador';
import { SimuladorEscenariosEvaluador } from './simulador-escenarios/simulador-escenarios.evaluador';
import { TableroMoscowEvaluador } from './tablero-moscow/tablero-moscow.evaluador';
import { EvaluadorMecanica } from './tipos';

/**
 * Elige el evaluador por `reto.mecanica`.
 */
@Injectable()
export class MecanicasRegistro {
  private readonly porMecanica: Map<Mecanica, EvaluadorMecanica>;

  constructor(
    historias: ArmadoPiezasEvaluador,
    readonly dialogo: DialogoStakeholderEvaluador,
    tablero: TableroMoscowEvaluador,
    inspeccion: InspeccionSistemaEvaluador,
    presupuesto: RepartoPresupuestoEvaluador,
    lineaTiempo: LineaTiempoEvaluador,
    readonly escenarios: SimuladorEscenariosEvaluador,
  ) {
    this.porMecanica = new Map(
      [dialogo, historias, tablero, inspeccion, escenarios, presupuesto, lineaTiempo].map((e) => [e.mecanica, e]),
    );
  }

  obtener(mecanica: Mecanica): EvaluadorMecanica {
    const evaluador = this.porMecanica.get(mecanica);
    if (!evaluador) {
      throw new HttpException(
        `La mecánica ${mecanica} todavía no está disponible`,
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    return evaluador;
  }
}
