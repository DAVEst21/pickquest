import { ModeloCicloVida, TipoDocumentoExpediente } from '@prisma/client';
import { RetoBase } from './tipos';

/**
 * CU-07 Expediente del proyecto (RF-10, RN-22). Fase 1, reto 1.
 *
 * Proyecto: app de citas de una clínica con requisitos que el cliente cambia
 * seguido, entregas tempranas, cliente disponible, riesgo técnico bajo y equipo
 * pequeño → modelo correcto: ÁGIL.
 * 4 documentos de 4 a 5 fragmentos; 10 fragmentos relevantes (7 de respaldo) y
 * 9 irrelevantes; 6 características.
 */
export interface FragmentoSeed {
  texto: string;
  /** Nombre de la característica que revela; sin valor = fragmento irrelevante. */
  caracteristica?: string;
  /** Relevante para justificar el modelo correcto. */
  respalda?: boolean;
}
export interface DocumentoSeed {
  tipo: TipoDocumentoExpediente;
  titulo: string;
  fragmentos: FragmentoSeed[];
}
export interface ExpedienteSeed extends RetoBase {
  nombreProyecto: string;
  modeloCorrecto: ModeloCicloVida;
  explicacion: string;
  caracteristicas: string[];
  documentos: DocumentoSeed[];
}

const REQ = 'Requisitos que cambian';
const CLIENTE = 'Cliente disponible para dar retroalimentación';
const ENTREGAS = 'Necesita entregas tempranas y frecuentes';
const RIESGO = 'Riesgo técnico bajo';
const EQUIPO = 'Equipo pequeño que trabaja junto';
const ETAPAS = 'Presupuesto y plazo flexibles por etapas';

export const EXPEDIENTE: ExpedienteSeed = {
  titulo: 'Elige el ciclo de vida para VidaCita',
  objetivo:
    'Investiga el expediente de un proyecto, reúne las evidencias que revelan sus características y elige el modelo de ciclo de vida que mejor las respalda.',
  contexto:
    'La clínica Vida quiere una aplicación para agendar citas, «VidaCita». Tu equipo debe decidir con qué modelo de ciclo de vida se va a trabajar. ' +
    'Revisa los cuatro documentos del expediente: abre cada uno y selecciona los fragmentos que revelan una característica del proyecto (no todos sirven). ' +
    'Para cada evidencia indica qué característica revela. Después elige el modelo de ciclo de vida y vincula, como respaldo, al menos dos evidencias.',
  recompensaXp: 130,
  recompensaQp: 90,
  nombreProyecto: 'VidaCita (agenda de citas de la clínica Vida)',
  modeloCorrecto: 'AGIL',
  explicacion:
    'El expediente muestra requisitos que el cliente todavía no tiene claros y que cambian cada mes, un cliente disponible cada semana, ganas de ver algo funcionando pronto, ' +
    'un equipo pequeño que trabaja junto y un riesgo técnico bajo. Un modelo ágil permite entregar versiones pequeñas, recibir retroalimentación y ajustar el rumbo. ' +
    'Cascada y modelo en V suponen requisitos estables desde el inicio; espiral se justifica cuando hay riesgos altos; prototipos sirve cuando lo que no se sabe es cómo debe verse o comportarse la interfaz.',
  caracteristicas: [REQ, CLIENTE, ENTREGAS, RIESGO, EQUIPO, ETAPAS],
  documentos: [
    {
      tipo: 'MINUTA',
      titulo: 'Minuta de la reunión inicial',
      fragmentos: [
        {
          texto: 'El doctor Ramírez adelantó que todavía no está seguro de cómo quiere el módulo de recetas: «lo iremos viendo conforme usemos la app».',
          caracteristica: REQ,
          respalda: true,
        },
        {
          texto: 'Se acordó una reunión de revisión cada viernes con la directora de la clínica.',
          caracteristica: CLIENTE,
          respalda: true,
        },
        { texto: 'La reunión empezó a las 9:00 y terminó a las 10:30 en la sala de juntas.' },
        { texto: 'Asistieron la directora, el doctor Ramírez y dos recepcionistas.' },
        {
          texto: 'La recepción pidió poder agendar citas lo antes posible, aunque todavía no existan las recetas ni los pagos.',
          caracteristica: ENTREGAS,
          respalda: true,
        },
      ],
    },
    {
      tipo: 'CORREO',
      titulo: 'Correo de la directora',
      fragmentos: [
        { texto: 'Saludos cordiales de parte de toda la clínica; esperamos trabajar con ustedes.' },
        {
          texto: 'Nuestras reglas de agenda cambian cada mes, así que necesitamos poder ajustar la app sin empezar de nuevo.',
          caracteristica: REQ,
          respalda: true,
        },
        {
          texto: 'Prefiero ver algo funcionando en tres semanas, aunque sea sencillo, y después pedir mejoras.',
          caracteristica: ENTREGAS,
          respalda: true,
        },
        { texto: 'Mi asistente se llama Lucía y atiende los correos de lunes a viernes.' },
        {
          texto: 'Me interesa que la app crezca por etapas, conforme veamos que le sirve a los pacientes.',
          caracteristica: ETAPAS,
        },
      ],
    },
    {
      tipo: 'FICHA_TECNICA',
      titulo: 'Ficha técnica del proyecto',
      fragmentos: [
        {
          texto: 'Tecnología: aplicación web con un servidor y una base de datos de uso común, que el equipo ya ha usado en otros proyectos.',
          caracteristica: RIESGO,
        },
        {
          texto: 'Equipo: cuatro personas desarrolladoras que trabajan en la misma oficina.',
          caracteristica: EQUIPO,
          respalda: true,
        },
        { texto: 'Nombre comercial de la aplicación: «VidaCita».' },
        { texto: 'Versión del documento 1.0, elaborada por el área de proyectos.' },
      ],
    },
    {
      tipo: 'PRESUPUESTO',
      titulo: 'Presupuesto y calendario',
      fragmentos: [
        {
          texto: 'El presupuesto se aprueba por etapas: se libera el dinero de cada entrega cuando la clínica la revisa y la aprueba.',
          caracteristica: ETAPAS,
          respalda: true,
        },
        {
          texto: 'No hay fecha de entrega rígida; se decidirá la siguiente entrega después de revisar la anterior.',
          caracteristica: ETAPAS,
        },
        { texto: 'El dominio de internet cuesta 350 pesos al año.' },
        { texto: 'Los pagos al equipo se hacen por transferencia el día 5 de cada mes.' },
        { texto: 'Los colores de la clínica son azul y verde.' },
      ],
    },
  ],
};
