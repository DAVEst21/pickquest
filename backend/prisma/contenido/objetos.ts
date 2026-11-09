import { TemaFase, TipoObjeto } from '@prisma/client';

/**
 * CU-12 Tienda (RF-15). Todos los objetos son ayudas: al usarse producen la
 * pista que define el FA2 del reto donde se usan (RN-10). `tema` nulo = sirve
 * en cualquier reto; con valor, solo en los retos de esa fase.
 */
export interface ObjetoSeed {
  nombre: string;
  tipo: TipoObjeto;
  costoQP: number;
  efecto: string;
  rareza: string;
  tema: TemaFase | null;
}

export const OBJETOS: ObjetoSeed[] = [
  {
    nombre: 'Poción de Sabiduría',
    tipo: 'POCION',
    costoQP: 50,
    efecto: 'Revela la pista del reto. Sirve en cualquier reto.',
    rareza: 'Común',
    tema: null,
  },
  {
    nombre: 'Pergamino del Ciclo de Vida',
    tipo: 'PERGAMINO',
    costoQP: 30,
    efecto: 'Revela la pista del reto. Solo sirve en los retos de Ciclo de vida del software.',
    rareza: 'Poco común',
    tema: 'CICLO_VIDA',
  },
  {
    nombre: 'Pergamino de Claridad',
    tipo: 'PERGAMINO',
    costoQP: 30,
    efecto: 'Revela la pista del reto. Solo sirve en los retos de Elicitación de requerimientos.',
    rareza: 'Poco común',
    tema: 'ELICITACION',
  },
  {
    nombre: 'Pergamino de Calidad',
    tipo: 'PERGAMINO',
    costoQP: 30,
    efecto: 'Revela la pista del reto. Solo sirve en los retos de Atributos de calidad.',
    rareza: 'Poco común',
    tema: 'ATRIBUTOS_CALIDAD',
  },
  {
    nombre: 'Reliquia del Arquitecto',
    tipo: 'RELIQUIA',
    costoQP: 300,
    efecto: 'Revela la pista del reto. Una reliquia épica que sirve en cualquier reto.',
    rareza: 'Épica',
    tema: null,
  },
];
