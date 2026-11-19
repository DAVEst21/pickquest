import React, { useState } from 'react';
import { PantallaCarga, PantallaError } from '../../components/EstadoPantalla';
import { ModalConfirmar } from '../../components/ModalConfirmar';
import { Pagina } from '../../components/Pagina';
import { Toast } from '../../components/Toast';
import { ApiError, esRecuperable, mensajeDeError } from '../../services/errores';
import {
  useComprarObjeto,
  useEquiparObjeto,
  useObjetoTienda,
  useTienda,
} from '../../services/queries';
import type { CompraRealizada, ObjetoInventario, ObjetoTienda } from '../../types';

const ICONO_TIPO: Record<ObjetoTienda['tipo'], string> = {
  POCION: 'science',
  PERGAMINO: 'description',
  RELIQUIA: 'diamond',
};

const ESTILO_RAREZA: Record<string, string> = {
  COMUN: 'text-on-surface-variant border-outline-variant/40',
  RARA: 'text-secondary border-secondary/40',
  EPICA: 'text-tertiary border-tertiary/40',
};

const NOMBRE_RAREZA: Record<string, string> = { COMUN: 'Común', RARA: 'Rara', EPICA: 'Épica' };

/** Tienda de objetos (CU-12, RF-15): comprar con QP, equipar y reemplazar en el cinto. */
export const TiendaPage: React.FC = () => {
  const { data, isPending, isError, error, refetch, isFetching } = useTienda();
  const comprar = useComprarObjeto();
  const equipar = useEquiparObjeto();
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [errorCompra, setErrorCompra] = useState<string | null>(null);
  const [compra, setCompra] = useState<CompraRealizada | null>(null);
  const [aEquipar, setAEquipar] = useState<number | null>(null);
  const [cintoLleno, setCintoLleno] = useState<ObjetoInventario[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const detalle = useObjetoTienda(seleccion ?? undefined);

  const avisar = (mensaje: string) => {
    setAviso(mensaje);
    window.setTimeout(() => setAviso(null), 3500);
  };

  if (isPending) {
    return (
      <Pagina>
        <PantallaCarga mensaje="Abriendo la tienda..." />
      </Pagina>
    );
  }
  if (isError) {
    return (
      <Pagina>
        <PantallaError
          titulo="No se pudo abrir la tienda"
          mensaje={mensajeDeError(error)}
          onReintentar={esRecuperable(error) ? () => void refetch() : undefined}
          reintentando={isFetching}
        />
      </Pagina>
    );
  }

  const elegido = data.catalogo.find((o) => o.objetoId === seleccion) ?? null;
  const maxComprable = elegido ? Math.max(0, data.maxUnidadesPorObjeto - elegido.unidades) : 0;
  const total = elegido ? elegido.costoQP * cantidad : 0;
  const faltan = elegido ? Math.max(0, total - data.saldoQP) : 0;

  const abrir = (objeto: ObjetoTienda) => {
    setSeleccion(objeto.objetoId);
    setCantidad(1);
    setErrorCompra(null);
  };

  const confirmarCompra = () => {
    if (!elegido) return;
    setErrorCompra(null);
    comprar.mutate(
      { objetoId: elegido.objetoId, cantidad },
      {
        onSuccess: (resultado) => setCompra(resultado),
        // FE1 (saldo) y FE2 (límite): el mensaje ya trae el detalle del servidor.
        onError: (e) => setErrorCompra(mensajeDeError(e)),
      },
    );
  };

  const intentarEquipar = (objetoId: number, reemplazaObjetoId?: number) => {
    equipar.mutate(
      { objetoId, reemplazaObjetoId },
      {
        onSuccess: () => {
          setCompra(null);
          setAEquipar(null);
          setCintoLleno(null);
          setSeleccion(null);
          avisar('Objeto equipado en tu cinto');
        },
        onError: (e) => {
          // FA2: cinto lleno → elegir cuál reemplazar.
          if (e instanceof ApiError && e.status === 409 && Array.isArray(e.datos.equipados)) {
            setAEquipar(objetoId);
            setCintoLleno(e.datos.equipados as ObjetoInventario[]);
            return;
          }
          avisar(mensajeDeError(e));
        },
      },
    );
  };

  return (
    <Pagina>
      <div className="max-w-7xl mx-auto px-gutter py-space-xl flex flex-col gap-space-lg">
        <div className="flex flex-wrap items-end justify-between gap-space-md">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">Tienda del Gremio</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Cambia tus puntos de recompensa por objetos que te ayudan en los retos.
            </p>
          </div>
          <div
            className="flex items-center gap-space-xs bg-surface-container-low px-space-lg py-space-sm rounded-full"
            aria-label="Saldo de QP"
          >
            <span className="material-symbols-outlined text-primary">toll</span>
            <span className="font-title-md text-title-md text-primary font-bold" id="tienda-saldo">
              {data.saldoQP.toLocaleString()} QP
            </span>
          </div>
        </div>

        <ul className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-3" aria-label="Catálogo de objetos">
          {data.catalogo.map((o) => (
            <li key={o.objetoId}>
              <button
                type="button"
                onClick={() => abrir(o)}
                className={`w-full h-full text-left bg-surface-container-low hover:bg-surface-container rounded-xl p-space-lg border flex flex-col gap-space-sm transition-colors ${
                  ESTILO_RAREZA[o.rareza] ?? 'border-outline-variant/40'
                }`}
              >
                <div className="flex items-center justify-between gap-space-sm">
                  <span className="material-symbols-outlined text-headline-sm">{ICONO_TIPO[o.tipo]}</span>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest">
                    {NOMBRE_RAREZA[o.rareza] ?? o.rareza}
                  </span>
                </div>
                <h2 className="font-title-md text-title-md text-on-surface">{o.nombre}</h2>
                <p className="font-body-md text-body-md text-on-surface-variant flex-1">{o.efecto}</p>
                <p className="font-label-md text-label-md text-on-surface-variant">{o.dondeSeUsa}</p>
                <div className="flex items-center justify-between">
                  <span className="font-title-md text-title-md text-primary font-bold">{o.costoQP} QP</span>
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    Tienes {o.unidades}
                    {o.equipado ? ' · equipado' : ''}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {elegido && !compra && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-surface-container-lowest/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="objeto-titulo"
          onClick={() => setSeleccion(null)}
        >
          <div
            className="bg-surface-container max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-2xl p-space-xl shadow-2xl border border-primary-container/40 flex flex-col gap-space-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-space-sm">
              <h2 id="objeto-titulo" className="font-headline-sm text-headline-sm text-on-surface">
                {elegido.nombre}
              </h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setSeleccion(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">{elegido.efecto}</p>
            <dl className="grid grid-cols-2 gap-space-sm font-label-md text-label-md">
              <dt className="text-on-surface-variant">Rareza</dt>
              <dd className="text-on-surface">{NOMBRE_RAREZA[elegido.rareza] ?? elegido.rareza}</dd>
              <dt className="text-on-surface-variant">Dónde se usa</dt>
              <dd className="text-on-surface">{elegido.dondeSeUsa}</dd>
              <dt className="text-on-surface-variant">Precio unitario</dt>
              <dd className="text-primary font-bold">{elegido.costoQP} QP</dd>
              <dt className="text-on-surface-variant">Ya tienes</dt>
              <dd className="text-on-surface">
                {elegido.unidades} de {data.maxUnidadesPorObjeto}
              </dd>
            </dl>

            <div>
              <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest mb-space-xs">
                Retos donde puedes usarlo
              </h3>
              {detalle.isPending ? (
                <p className="font-body-md text-on-surface-variant">Cargando retos...</p>
              ) : detalle.isError ? (
                <p className="font-body-md text-error">No se pudo cargar la lista de retos.</p>
              ) : (
                <ul className="flex flex-wrap gap-space-xs">
                  {detalle.data.retos.map((r) => (
                    <li
                      key={r.retoId}
                      title={r.fase}
                      className="px-space-sm py-1 rounded-full bg-surface-container-high font-label-sm text-label-sm text-on-surface"
                    >
                      {r.titulo}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center gap-space-sm">
              <label htmlFor="cantidad" className="font-label-md text-label-md text-on-surface-variant">
                Cantidad
              </label>
              <input
                id="cantidad"
                type="number"
                min={1}
                max={data.maxUnidadesPorObjeto}
                step={1}
                value={cantidad}
                onChange={(e) => {
                  setCantidad(Math.max(1, Math.min(data.maxUnidadesPorObjeto, Math.floor(Number(e.target.value)) || 1)));
                  setErrorCompra(null);
                }}
                className="w-20 bg-surface-container-high rounded-lg px-space-sm py-space-xs text-on-surface font-code-md"
              />
              <span className="font-title-md text-title-md text-primary font-bold ml-auto">Total: {total} QP</span>
            </div>

            {maxComprable === 0 && (
              <p className="font-body-md text-body-md text-error" role="alert">
                Ya tienes el máximo de {data.maxUnidadesPorObjeto} unidades de este objeto.
              </p>
            )}
            {maxComprable > 0 && cantidad > maxComprable && (
              <p className="font-body-md text-body-md text-error" role="alert">
                Solo puedes comprar {maxComprable} más (máximo {data.maxUnidadesPorObjeto} en el inventario).
              </p>
            )}
            {faltan > 0 && (
              <p className="font-body-md text-body-md text-error" role="alert">
                Te faltan {faltan} QP para esta compra.
              </p>
            )}
            {errorCompra && (
              <p className="font-body-md text-body-md text-error" role="alert">
                {errorCompra}
              </p>
            )}

            <div className="flex justify-end gap-space-sm">
              <button
                type="button"
                onClick={() => setSeleccion(null)}
                className="px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-title-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarCompra}
                disabled={comprar.isPending || maxComprable === 0 || cantidad > maxComprable}
                className="px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary disabled:opacity-50 text-on-primary-container font-title-md text-title-md font-bold"
              >
                {comprar.isPending ? 'Comprando...' : 'Comprar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {compra && !cintoLleno && (
        <ModalConfirmar
          titulo="¡Compra realizada!"
          icono="shopping_bag"
          mensaje={
            <>
              Compraste {compra.cantidad} × {compra.nombre} por {compra.qpPagados} QP. Te quedan{' '}
              <strong>{compra.saldoQP} QP</strong> y tienes {compra.unidades} unidades.
              {!compra.equipado && ' ¿Quieres equiparlo en tu cinto ahora?'}
            </>
          }
          textoConfirmar={compra.equipado ? 'Entendido' : 'Equipar'}
          textoCancelar={compra.equipado ? 'Cerrar' : 'Ahora no'}
          cargando={equipar.isPending}
          onConfirmar={() => (compra.equipado ? (setCompra(null), setSeleccion(null)) : intentarEquipar(compra.objetoId))}
          onCancelar={() => {
            setCompra(null);
            setSeleccion(null);
          }}
        />
      )}

      {cintoLleno && aEquipar !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-surface-container-lowest/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reemplazo-titulo"
        >
          <div className="bg-surface-container max-w-md w-full rounded-2xl p-space-xl shadow-2xl border border-primary-container/40 flex flex-col gap-space-md">
            <h2 id="reemplazo-titulo" className="font-headline-sm text-headline-sm text-on-surface">
              Tu cinto está lleno
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Solo puedes llevar {data.maxEquipados} objetos equipados. Elige cuál reemplazar; volverá a tu inventario.
            </p>
            <ul className="flex flex-col gap-space-xs">
              {cintoLleno.map((o) => (
                <li key={o.objetoId}>
                  <button
                    type="button"
                    disabled={equipar.isPending}
                    onClick={() => intentarEquipar(aEquipar, o.objetoId)}
                    className="w-full text-left px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-title-md disabled:opacity-60"
                  >
                    Reemplazar {o.nombre}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                setCintoLleno(null);
                setAEquipar(null);
                setCompra(null);
                setSeleccion(null);
              }}
              className="self-end px-space-md py-space-sm rounded-lg text-on-surface-variant hover:text-on-surface font-title-md text-title-md"
            >
              Ahora no
            </button>
          </div>
        </div>
      )}

      <Toast visible={aviso !== null} message={aviso ?? ''} />
    </Pagina>
  );
};
