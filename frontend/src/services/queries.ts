import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RespuestaPregunta, Sesion } from '../types';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import {
  enviarIntento,
  getFaseDetalle,
  getFases,
  getIntento,
  getPerfil,
  getProgreso,
  iniciarSesion,
  registrar,
  registrarAyuda,
} from './api';

export const QUERY_KEYS = {
  perfil: ['perfil'] as const,
  progreso: ['progreso'] as const,
  fases: ['fases'] as const,
  faseDetalle: (id: number) => ['fase', id] as const,
  intento: (id: number) => ['intento', id] as const,
};

const esIdValido = (id: number) => Number.isInteger(id) && id > 0;

/** Perfil del estudiante autenticado; alimenta el playerStore (ver RutaProtegida). */
export function usePerfil(habilitado = true) {
  return useQuery({
    queryKey: QUERY_KEYS.perfil,
    queryFn: getPerfil,
    enabled: habilitado,
  });
}

/** Listado de fases con su estado para el estudiante (CU-01). */
export function useFases() {
  return useQuery({
    queryKey: QUERY_KEYS.fases,
    queryFn: getFases,
  });
}

/** Detalle de una fase con su reto (CU-02). */
export function useFaseDetalle(faseId: number | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.faseDetalle(faseId ?? 0),
    queryFn: () => getFaseDetalle(faseId!),
    enabled: faseId !== undefined && esIdValido(faseId),
  });
}

/** Resultado de un intento (CU-04). */
export function useIntento(intentoId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.intento(intentoId),
    queryFn: () => getIntento(intentoId),
    enabled: esIdValido(intentoId),
  });
}

/** Registrar el uso de una ayuda antes de enviar el intento. */
export function useRegistrarAyuda() {
  return useMutation({ mutationFn: (retoId: number) => registrarAyuda(retoId) });
}

/**
 * Enviar la solución de un reto (CU-03). Tras la respuesta se vuelven a pedir
 * perfil y fases al backend: XP/QP/nivel y el estado de las fases nunca se
 * calculan en el cliente.
 */
export function useEnviarIntento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ retoId, respuestas }: { retoId: number; respuestas: RespuestaPregunta[] }) =>
      enviarIntento(retoId, respuestas),
    onSuccess: (intento) => {
      queryClient.setQueryData(QUERY_KEYS.intento(intento.id), intento);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.perfil });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.progreso });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fases });
      queryClient.invalidateQueries({ queryKey: ['fase'] });
    },
  });
}

function useAbrirSesion() {
  const iniciar = useAuthStore((s) => s.iniciarSesion);
  const setPerfil = usePlayerStore((s) => s.setPerfil);
  const queryClient = useQueryClient();
  return (sesion: Sesion) => {
    iniciar(sesion.accessToken);
    queryClient.setQueryData(QUERY_KEYS.perfil, sesion.estudiante);
    setPerfil(sesion.estudiante);
  };
}

export function useLogin() {
  const abrirSesion = useAbrirSesion();
  return useMutation({ mutationFn: iniciarSesion, onSuccess: abrirSesion });
}

export function useRegistro() {
  const abrirSesion = useAbrirSesion();
  return useMutation({ mutationFn: registrar, onSuccess: abrirSesion });
}

export function useProgreso() {
  return useQuery({ queryKey: QUERY_KEYS.progreso, queryFn: getProgreso });
}
