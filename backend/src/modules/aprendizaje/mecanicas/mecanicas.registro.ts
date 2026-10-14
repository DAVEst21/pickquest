import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Mecanica } from '@prisma/client';
import { DialogoStakeholderEvaluador } from './dialogo-stakeholder/dialogo-stakeholder.evaluador';
import { InspeccionSistemaEvaluador } from './inspeccion-sistema/inspeccion-sistema.evaluador';
import { LineaTiempoEvaluador } from './linea-tiempo/linea-tiempo.evaluador';
import { RepartoPresupuestoEvaluador } from './reparto-presupuesto/reparto-presupuesto.evaluador';
import { TableroMoscowEvaluador } from './tablero-moscow/tablero-moscow.evaluador';
import { EvaluadorMecanica } from './tipos';

/**
 * Elige el evaluador por `reto.mecanica`. Las mecánicas del Sprint 3
 * (ARMADO_PIEZAS, SIMULADOR_ESCENARIOS y EXPEDIENTE_PROYECTO) todavía no
 * tienen evaluador.
 */
@Injectable()
export class MecanicasRegistro {
  private readonly porMecanica: Map<Mecanica, EvaluadorMecanica>;

  constructor(
    readonly dialogo: DialogoStakeholderEvaluador,
    tablero: TableroMoscowEvaluador,
    inspeccion: InspeccionSistemaEvaluador,
    presupuesto: RepartoPresupuestoEvaluador,
    lineaTiempo: LineaTiempoEvaluador,
  ) {
    this.porMecanica = new Map(
      [dialogo, tablero, inspeccion, presupuesto, lineaTiempo].map((e) => [e.mecanica, e]),
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
