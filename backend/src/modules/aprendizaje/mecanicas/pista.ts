import { ColumnaMoscow, TipoPista } from '@prisma/client';
import { PistaDto } from './tipos';

/**
 * Persistencia relacional de la pista de la ayuda (sin JSON): UsoAyuda guarda
 * el tipo de pista y el id del elemento de contenido al que apunta, y de ahí se
 * reconstruye la pista al retomar el intento. Funciones puras.
 */
export interface ColumnasPista {
  tipoPista: TipoPista | null;
  opcionId: number | null;
  tarjetaId: number | null;
  pantallaId: number | null;
  atributoEscenarioId: number | null;
  bloqueId: number | null;
  requiereId: number | null;
}

const VACIAS: ColumnasPista = {
  tipoPista: null,
  opcionId: null,
  tarjetaId: null,
  pantallaId: null,
  atributoEscenarioId: null,
  bloqueId: null,
  requiereId: null,
};

const id = (v: unknown): number | null => (typeof v === 'number' ? v : null);

/** Pista que devuelve la mecánica → columnas de UsoAyuda. */
export function pistaAColumnas(pista: PistaDto): ColumnasPista {
  switch (pista.tipo) {
    case 'OPCION_DIALOGO':
      return { ...VACIAS, tipoPista: 'OPCION_DIALOGO', opcionId: id(pista.opcionId) };
    case 'COLUMNA_TARJETA':
      return { ...VACIAS, tipoPista: 'COLUMNA_TARJETA', tarjetaId: id(pista.tarjetaId) };
    case 'PANTALLA':
      return { ...VACIAS, tipoPista: 'PANTALLA', pantallaId: id(pista.pantallaId) };
    case 'RESTRICCION':
      return {
        ...VACIAS,
        tipoPista: 'RESTRICCION',
        atributoEscenarioId: id(pista.atributoEscenarioId),
      };
    case 'DEPENDENCIA':
      return {
        ...VACIAS,
        tipoPista: 'DEPENDENCIA',
        bloqueId: id(pista.bloqueId),
        requiereId: id(pista.requiereId),
      };
    default:
      return VACIAS;
  }
}

export interface UsoAyudaConReferencias extends ColumnasPista {
  tarjeta?: { columnaCorrecta: ColumnaMoscow } | null;
  atributoEscenario?: { minimoObligatorio: number | null } | null;
}

/** Columnas de UsoAyuda (con sus referencias) → pista; null si la ayuda no guardó pista. */
export function columnasAPista(uso: UsoAyudaConReferencias | null): PistaDto | null {
  if (!uso?.tipoPista) return null;
  switch (uso.tipoPista) {
    case 'OPCION_DIALOGO':
      return { tipo: 'OPCION_DIALOGO', opcionId: uso.opcionId };
    case 'COLUMNA_TARJETA':
      return {
        tipo: 'COLUMNA_TARJETA',
        tarjetaId: uso.tarjetaId,
        columna: uso.tarjeta?.columnaCorrecta ?? null,
      };
    case 'PANTALLA':
      return { tipo: 'PANTALLA', pantallaId: uso.pantallaId };
    case 'RESTRICCION':
      return {
        tipo: 'RESTRICCION',
        atributoEscenarioId: uso.atributoEscenarioId,
        minimo: uso.atributoEscenario?.minimoObligatorio ?? null,
      };
    case 'DEPENDENCIA':
      return { tipo: 'DEPENDENCIA', bloqueId: uso.bloqueId, requiereId: uso.requiereId };
  }
}
