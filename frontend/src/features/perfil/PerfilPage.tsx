import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { Pagina } from '../../components/Pagina';
import { Estrellas } from '../../components/Estrellas';
import { ApiError, esRecuperable, mensajeDeError } from '../../services/errores';
import {
  useActualizarPerfil,
  useDesequiparObjeto,
  useEquiparObjeto,
  usePerfilCompleto,
} from '../../services/queries';
import type { ObjetoInventario, PerfilCompleto } from '../../types';
import { ActividadItem } from '../plan/ActividadItem';

const Dato: React.FC<{ etiqueta: string; valor: React.ReactNode; id?: string }> = ({ etiqueta, valor, id }) => (
  <div className="bg-surface-container-low rounded-xl p-space-md">
    <dt className="font-label-md text-label-md text-on-surface-variant">{etiqueta}</dt>
    <dd id={id} className="font-headline-sm text-headline-sm text-primary">
      {valor}
    </dd>
  </div>
);

/** Formulario para cambiar el nombre de aventurero y el avatar (RF-19). */
const EditarIdentidad: React.FC<{ perfil: PerfilCompleto; alTerminar: () => void }> = ({ perfil, alTerminar }) => {
  const actualizar = useActualizarPerfil();
  const [nombre, setNombre] = useState(perfil.nombreAventurero);
  const [avatar, setAvatar] = useState(perfil.avatar ?? '');
  return (
    <form
      className="flex flex-col gap-space-sm"
      onSubmit={(e) => {
        e.preventDefault();
        actualizar.mutate({ nombreAventurero: nombre.trim(), avatar: avatar.trim() }, { onSuccess: alTerminar });
      }}
    >
      <label className="flex flex-col gap-space-xs font-label-md text-label-md text-on-surface-variant">
        Nombre de aventurero
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          minLength={3}
          maxLength={30}
          required
          className="bg-surface-container-high rounded-lg px-space-md py-space-sm text-on-surface font-body-md"
        />
      </label>
      <label className="flex flex-col gap-space-xs font-label-md text-label-md text-on-surface-variant">
        Avatar (URL de una imagen, vacío para quitarlo)
        <input
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="https://..."
          className="bg-surface-container-high rounded-lg px-space-md py-space-sm text-on-surface font-body-md"
        />
      </label>
      {actualizar.isError && (
        <p className="font-body-md text-body-md text-error" role="alert">
          {mensajeDeError(actualizar.error)}
        </p>
      )}
      <div className="flex gap-space-sm">
        <button
          type="submit"
          disabled={actualizar.isPending}
          className="px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary disabled:opacity-60 text-on-primary-container font-title-md font-bold"
        >
          {actualizar.isPending ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={alTerminar} className="px-space-md py-space-sm rounded-lg bg-surface-container-high text-on-surface font-title-md">
          Cancelar
        </button>
      </div>
    </form>
  );
};

/** Inventario con equipar y desequipar; con el cinto lleno se elige cuál reemplazar (RN-10). */
const Inventario: React.FC<{ perfil: PerfilCompleto }> = ({ perfil }) => {
  const equipar = useEquiparObjeto();
  const desequipar = useDesequiparObjeto();
  const [reemplazo, setReemplazo] = useState<{ objetoId: number; equipados: ObjetoInventario[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const equipados = perfil.inventario.filter((o) => o.equipado).length;

  const intentar = (objetoId: number, reemplazaObjetoId?: number) => {
    setError(null);
    equipar.mutate(
      { objetoId, reemplazaObjetoId },
      {
        onSuccess: () => setReemplazo(null),
        onError: (e) => {
          if (e instanceof ApiError && e.status === 409 && Array.isArray(e.datos.equipados)) {
            setReemplazo({ objetoId, equipados: e.datos.equipados as ObjetoInventario[] });
          } else {
            setError(mensajeDeError(e));
          }
        },
      },
    );
  };

  return (
    <section aria-labelledby="inventario" className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between gap-space-md">
        <h2 id="inventario" className="font-title-md text-title-md text-primary">
          Inventario
        </h2>
        <span className="font-label-md text-label-md text-on-surface-variant">
          Equipados: {equipados} de {perfil.maxEquipados}
        </span>
      </div>
      {perfil.inventario.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Aún no tienes objetos. Compra algunos en la <Link to="/tienda" className="text-primary underline">tienda</Link>.
        </p>
      ) : (
        <ul className="grid gap-space-sm sm:grid-cols-2">
          {perfil.inventario.map((o) => (
            <li key={o.objetoId} className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-xs">
              <p className="font-title-md text-title-md text-on-surface">
                {o.nombre} <span className="font-label-md text-on-surface-variant">× {o.cantidad}</span>
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">{o.efecto}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{o.dondeSeUsa}</p>
              <button
                type="button"
                disabled={equipar.isPending || desequipar.isPending}
                onClick={() => (o.equipado ? desequipar.mutate(o.objetoId) : intentar(o.objetoId))}
                aria-pressed={o.equipado}
                className={`self-start px-space-md py-space-xs rounded-lg font-title-md text-title-md ${
                  o.equipado ? 'bg-tertiary-container/30 text-tertiary' : 'bg-primary-container text-on-primary-container'
                }`}
              >
                {o.equipado ? 'Desequipar' : 'Equipar'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="font-body-md text-body-md text-error" role="alert">
          {error}
        </p>
      )}
      {reemplazo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-surface-container-lowest/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reemplazo-perfil"
        >
          <div className="bg-surface-container max-w-md w-full rounded-2xl p-space-xl flex flex-col gap-space-md border border-primary-container/40">
            <h2 id="reemplazo-perfil" className="font-headline-sm text-headline-sm text-on-surface">
              Tu cinto está lleno
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Elige cuál objeto reemplazar; volverá a tu inventario.</p>
            <ul className="flex flex-col gap-space-xs">
              {reemplazo.equipados.map((o) => (
                <li key={o.objetoId}>
                  <button
                    type="button"
                    onClick={() => intentar(reemplazo.objetoId, o.objetoId)}
                    className="w-full text-left px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md"
                  >
                    Reemplazar {o.nombre}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setReemplazo(null)} className="self-end px-space-md py-space-sm text-on-surface-variant font-title-md">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

/** Perfil completo (RF-19): nivel, XP, QP, racha, estrellas por fase, inventario, identidad y plan activo. */
export const PerfilPage: React.FC = () => {
  const { data: perfil, isPending, isError, error, refetch, isFetching } = usePerfilCompleto();
  const [editando, setEditando] = useState(false);

  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Abriendo tu perfil..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError
          titulo="No se pudo cargar tu perfil"
          mensaje={mensajeDeError(error)}
          onReintentar={esRecuperable(error) ? () => void refetch() : undefined}
          reintentando={isFetching}
        />
      </Pagina>
    );
  }

  const progresoNivel = Math.min(
    100,
    Math.round(((perfil.xpTotal - perfil.xpNivelActual) / Math.max(1, perfil.xpSiguienteNivel - perfil.xpNivelActual)) * 100),
  );
  return (
    <Pagina>
      <div className="max-w-4xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <section aria-labelledby="identidad" className="bg-surface-container-low rounded-xl p-space-lg flex flex-wrap items-start gap-space-lg">
          {perfil.avatar ? (
            <img src={perfil.avatar} alt="Tu avatar" className="w-20 h-20 rounded-full object-cover ring-2 ring-primary/40" />
          ) : (
            <div aria-hidden="true" className="w-20 h-20 rounded-full bg-surface-container-high ring-2 ring-primary/40 flex items-center justify-center font-headline-md text-primary uppercase">
              {perfil.nombreAventurero.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-[14rem]">
            {editando ? (
              <EditarIdentidad perfil={perfil} alTerminar={() => setEditando(false)} />
            ) : (
              <>
                <h1 id="identidad" className="font-headline-md text-headline-md text-on-surface">
                  {perfil.nombreAventurero}
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant">{perfil.email}</p>
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="mt-space-sm px-space-md py-space-xs rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-title-md"
                >
                  Editar nombre y avatar
                </button>
              </>
            )}
          </div>
        </section>

        <dl className="grid grid-cols-2 gap-space-md sm:grid-cols-4">
          <Dato etiqueta="Nivel" valor={perfil.nivel} id="perfil-nivel" />
          <Dato etiqueta="XP" valor={perfil.xpTotal.toLocaleString()} id="perfil-xp" />
          <Dato etiqueta="QP" valor={perfil.qpTotal.toLocaleString()} id="perfil-qp" />
          <Dato etiqueta="Estrellas" valor={perfil.estrellasTotales} id="perfil-estrellas" />
        </dl>
        <div>
          <div className="flex justify-between font-label-md text-label-md text-on-surface-variant">
            <span>Hacia el nivel {perfil.nivel + 1}</span>
            <span>
              {perfil.xpTotal} / {perfil.xpSiguienteNivel} XP
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden mt-space-xs" role="progressbar" aria-valuenow={progresoNivel} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-gradient-to-r from-tertiary to-secondary" style={{ width: `${progresoNivel}%` }} />
          </div>
        </div>

        <section aria-labelledby="racha" className="bg-surface-container-low rounded-xl p-space-lg">
          <h2 id="racha" className="font-title-md text-title-md text-primary">
            Racha
          </h2>
          <p className="font-body-md text-body-md text-on-surface" id="perfil-racha">
            {perfil.racha.diasActuales} {perfil.racha.diasActuales === 1 ? 'día' : 'días'} seguidos · multiplicador de QP ×
            {perfil.racha.multiplicadorQP.toFixed(1)} · récord {perfil.racha.diasRecord}.{' '}
            <Link to="/reto-diario" className="text-primary underline">
              Ir al reto diario
            </Link>
          </p>
        </section>

        <section aria-labelledby="estrellas" className="flex flex-col gap-space-sm">
          <h2 id="estrellas" className="font-title-md text-title-md text-primary">
            Estrellas por fase
          </h2>
          <ul className="grid gap-space-sm sm:grid-cols-3">
            {perfil.estrellasPorFase.map((f) => (
              <li key={f.faseId} className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-xs">
                <p className="font-title-md text-title-md text-on-surface">{f.nombre}</p>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {f.retosAprobados} de {f.totalRetos} retos aprobados
                </p>
                <div className="flex items-center gap-space-xs">
                  {f.calificacionEstrellasFase !== null && <Estrellas cantidad={f.calificacionEstrellasFase} />}
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    {f.estrellas} de {f.estrellasMaximas} estrellas
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <Inventario perfil={perfil} />

        <section aria-labelledby="plan" className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between gap-space-md">
            <h2 id="plan" className="font-title-md text-title-md text-primary">
              Plan de estudio activo
            </h2>
            <Link to="/plan" className="font-label-md text-label-md text-primary underline">
              {perfil.planActivo ? 'Administrar plan' : 'Obtener plan de estudio'}
            </Link>
          </div>
          {perfil.planActivo ? (
            <>
              <p className="font-label-md text-label-md text-on-surface-variant" id="perfil-avance-plan">
                {perfil.planActivo.avance.hechas} de {perfil.planActivo.avance.total} actividades · {perfil.planActivo.avance.porcentaje} %
              </p>
              <ol className="flex flex-col gap-space-sm">
                {perfil.planActivo.actividades.map((a) => (
                  <ActividadItem key={a.actividadId} actividad={a} />
                ))}
              </ol>
            </>
          ) : (
            <p className="font-body-md text-body-md text-on-surface-variant">Todavía no tienes un plan activo.</p>
          )}
        </section>
      </div>
    </Pagina>
  );
};
