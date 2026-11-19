import React from 'react';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { esRecuperable, mensajeDeError } from '../../services/errores';
import { useClasificacion } from '../../services/queries';

/** Tabla de clasificación (RF-20, RN-30): solo nombre de aventurero, nivel, XP y estrellas. */
export const ClasificacionPage: React.FC = () => {
  const { data, isPending, isError, error, refetch, isFetching } = useClasificacion();

  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Calculando la clasificación..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError
          titulo="No se pudo cargar la clasificación"
          mensaje={mensajeDeError(error)}
          onReintentar={esRecuperable(error) ? () => void refetch() : undefined}
          reintentando={isFetching}
        />
      </Pagina>
    );
  }

  return (
    <Pagina>
      <div className="max-w-3xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Clasificación</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Ordenada por XP total; en empate, por estrellas totales y después por quien alcanzó antes esa XP. Tu posición:{' '}
            <strong className="text-primary" id="mi-posicion">
              {data.miPosicion}
            </strong>{' '}
            de {data.totalEstudiantes}.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
          <table className="w-full text-left" aria-label="Tabla de clasificación">
            <thead className="bg-surface-container-high font-label-md text-label-md text-on-surface-variant">
              <tr>
                <th scope="col" className="px-space-md py-space-sm">#</th>
                <th scope="col" className="px-space-md py-space-sm">Aventurero</th>
                <th scope="col" className="px-space-md py-space-sm">Nivel</th>
                <th scope="col" className="px-space-md py-space-sm text-right">XP</th>
                <th scope="col" className="px-space-md py-space-sm text-right">Estrellas</th>
              </tr>
            </thead>
            <tbody>
              {data.filas.map((f) => (
                <tr
                  key={f.posicion}
                  aria-current={f.esYo ? 'true' : undefined}
                  className={`font-body-md text-body-md border-t border-outline-variant/20 ${
                    f.esYo ? 'bg-primary-container/25 text-on-surface font-bold' : 'text-on-surface'
                  }`}
                >
                  <td className="px-space-md py-space-sm">{f.posicion}</td>
                  <td className="px-space-md py-space-sm">
                    {f.nombreAventurero}
                    {f.esYo && <span className="ml-space-xs font-label-sm text-primary">(tú)</span>}
                  </td>
                  <td className="px-space-md py-space-sm">{f.nivel}</td>
                  <td className="px-space-md py-space-sm text-right">{f.xpTotal.toLocaleString()}</td>
                  <td className="px-space-md py-space-sm text-right">{f.estrellas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Calculada el {new Date(data.calculadaEn).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}.
        </p>
      </div>
    </Pagina>
  );
};
