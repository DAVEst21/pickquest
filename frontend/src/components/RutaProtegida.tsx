import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { mensajeDeError } from '../services/errores';
import { usePerfil } from '../services/queries';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import { PantallaCarga, PantallaError } from './EstadoPantalla';

/**
 * Protege las pantallas del juego: sin token redirige a /login, y con token
 * valida la sesión contra GET /auth/perfil antes de mostrar nada (un token
 * vencido responde 401, http.ts cierra la sesión y se redirige). El perfil que
 * devuelve el backend es la única fuente del playerStore.
 */
export const RutaProtegida: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  const perfil = usePerfil(token !== null);
  const setPerfil = usePlayerStore((s) => s.setPerfil);

  useEffect(() => {
    if (perfil.data) setPerfil(perfil.data);
  }, [perfil.data, setPerfil]);

  if (!token) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }
  if (perfil.isPending) {
    return (
      <div className="bg-background min-h-screen">
        <PantallaCarga mensaje="Validando sesión..." />
      </div>
    );
  }
  if (perfil.isError) {
    return (
      <div className="bg-background min-h-screen">
        <PantallaError
          titulo="No se pudo cargar tu perfil"
          mensaje={mensajeDeError(perfil.error)}
          accion={
            <button
              onClick={() => perfil.refetch()}
              className="px-space-lg py-space-sm rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-title-md text-title-md"
            >
              Reintentar
            </button>
          }
        />
      </div>
    );
  }
  return <Outlet />;
};
