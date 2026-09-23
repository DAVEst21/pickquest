import React from 'react';

/*
 * Interfaz del reto de clasificación ISO 25010 + trade-off (fase 3 del seed).
 * El enunciado vive aquí porque el backend todavía no guarda el contenido de
 * las preguntas (solo la clave de respuestas); los preguntaId deben coincidir
 * con Reto.preguntas (ver retoIso25010.ts).
 */

const ATRIBUTOS = [
  { valor: 'seguridad', etiqueta: 'Seguridad', activo: 'bg-primary text-on-primary' },
  { valor: 'desempeno', etiqueta: 'Desempeño', activo: 'bg-tertiary text-on-tertiary' },
  { valor: 'usabilidad', etiqueta: 'Usabilidad', activo: 'bg-secondary text-on-secondary' },
];

const REQUERIMIENTOS = [
  {
    id: 'req-1',
    numero: '01',
    icono: 'lock',
    texto: 'Cifrado simétrico AES-256 en reposo y rotación continua de claves bancarias.',
  },
  {
    id: 'req-2',
    numero: '02',
    icono: 'speed',
    texto: 'Respuesta bajo carga pico de 25,000 transacciones concurrentes por segundo.',
  },
  {
    id: 'req-3',
    numero: '03',
    icono: 'touch_app',
    texto: 'Flujo de autorización en 1-clic con biometría sin fricción cognitiva para el usuario.',
  },
];

const OPCIONES_TRADEOFF = [
  {
    valor: 'A',
    titulo: 'Terminación TLS en Ingress Controller con Service Mesh mTLS en Hardware Dedicado',
    descripcion:
      'Descarga la carga criptográfica en gateways perimetrales con chips criptográficos dedicados y delega la seguridad este-oeste al proxy Envoy sin degradar la CPU de las aplicaciones.',
    etiquetas: ['Desempeño +99.4%', 'Zero-Trust Válido'],
  },
  {
    valor: 'B',
    titulo: 'Deshabilitar Cifrado Este-Oeste en Subredes Privadas (VPC Trust)',
    descripcion:
      'Eliminar el handshake criptográfico entre microservicios confiando en el firewall de red perimetral para recuperar latencia inmediata a expensas de la superficie de ataque interno.',
    etiquetas: ['Violación PCI-DSS', 'Alta Deuda Técnica'],
  },
];

interface EjercicioProps {
  respuestas: Record<string, string>;
  onResponder: (preguntaId: string, respuesta: string) => void;
  opcionDescartada: string | null;
}

export const EjercicioIso25010: React.FC<EjercicioProps> = ({ respuestas, onResponder, opcionDescartada }) => (
  <>
    {/* Escenario */}
    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl border border-surface-container-high/40">
      <div className="flex items-center gap-space-sm mb-space-xs">
        <span className="material-symbols-outlined text-primary text-title-md">terminal</span>
        <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold">
          Caso Crítico · Microservicios Financieros
        </span>
      </div>
      <p className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-relaxed">
        “El sistema bancario necesita{' '}
        <span className="text-tertiary font-bold underline decoration-tertiary/40">alta disponibilidad</span> y{' '}
        <span className="text-primary font-bold underline decoration-primary/40">cifrado de extremo a extremo</span>, pero
        tiene <span className="text-error font-bold underline decoration-error/40">restricciones severas de latencia</span>{' '}
        (&lt;120ms p99).”
      </p>
    </div>

    {/* Clasificación ISO 25010 */}
    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl flex flex-col gap-space-md border border-surface-container-high/40">
      <div>
        <h3 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-tertiary text-title-lg">category</span>
          Mapeo de Atributos de Calidad (ISO/IEC 25010)
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Asigna cada requerimiento táctico a su dominio canónico correspondiente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {REQUERIMIENTOS.map((req) => (
          <div
            key={req.id}
            className="bg-surface-container-high rounded-xl p-space-md flex flex-col justify-between shadow-md border border-surface-container-highest/40"
          >
            <div>
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-bold">
                  Req #{req.numero}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-title-md">{req.icono}</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface font-semibold mb-space-md">{req.texto}</p>
            </div>
            <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label={`Atributo Req ${req.numero}`}>
              {ATRIBUTOS.map((atributo) => {
                const elegido = respuestas[req.id] === atributo.valor;
                return (
                  <button
                    key={atributo.valor}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    data-pregunta={req.id}
                    data-valor={atributo.valor}
                    onClick={() => onResponder(req.id, atributo.valor)}
                    className={`px-2 py-1.5 rounded text-center font-label-sm text-[11px] font-bold transition-all ${
                      elegido
                        ? `${atributo.activo} shadow-sm`
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                    }`}
                  >
                    {atributo.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Trade-off A / B */}
    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-xl flex flex-col gap-space-md border border-surface-container-high/40">
      <div className="flex items-center gap-space-sm">
        <span className="px-space-xs py-0.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold">
          Decisión Táctica
        </span>
        <h3 className="font-title-lg text-title-lg text-on-surface font-bold">Trade-Off de Rendimiento vs Confidencialidad</h3>
      </div>
      <p className="font-body-lg text-body-lg text-on-surface">
        ¿Qué patrón resuelve la sobrecarga de re-encriptación interna garantizando a la vez la auditoría bancaria?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md" role="radiogroup" aria-label="Opciones de Trade-off">
        {OPCIONES_TRADEOFF.map((opcion) => {
          const elegida = respuestas.tradeoff === opcion.valor;
          const descartada = opcionDescartada === opcion.valor;
          return (
            <button
              key={opcion.valor}
              type="button"
              role="radio"
              aria-checked={elegida}
              disabled={descartada}
              data-pregunta="tradeoff"
              data-valor={opcion.valor}
              onClick={() => onResponder('tradeoff', opcion.valor)}
              className={`group text-left p-space-lg rounded-xl bg-surface-container-high transition-all flex flex-col justify-between border ${
                descartada
                  ? 'opacity-30 grayscale cursor-not-allowed border-surface-container-highest/20'
                  : 'hover:bg-surface-bright/80 cursor-pointer shadow-md'
              } ${elegida ? 'border-primary/80 ring-1 ring-primary/40' : 'border-surface-container-highest/50'}`}
            >
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <span className="w-8 h-8 rounded-lg bg-surface-container-lowest text-primary font-headline-sm flex items-center justify-center font-bold shadow-sm">
                    {opcion.valor}
                  </span>
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      elegida ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                  </span>
                </div>
                <h4 className="font-title-md text-title-md text-on-surface font-bold mb-space-xs">{opcion.titulo}</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{opcion.descripcion}</p>
              </div>
              <div className="mt-space-md pt-space-sm flex items-center gap-space-xs border-t border-surface-container/60">
                {opcion.etiquetas.map((etiqueta) => (
                  <span
                    key={etiqueta}
                    className="font-label-sm text-[10px] text-on-surface-variant bg-surface-container/40 px-2 py-0.5 rounded uppercase font-semibold"
                  >
                    {etiqueta}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  </>
);
