import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Sesion } from '../types';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import {
  enviarIntento,
  getEquipados,
  getFases,
  getIntento,
  getLibreta,
  getPerfil,
  getTablon,
  iniciarIntento,
  iniciarSesion,
  registrar,
  usarAyuda,
} from './api';

export const QUERY_KEYS = {
  perfil: ['perfil'] as const,
  fases: ['fases'] as const,
  tablon: (faseId: number) => ['tablon', faseId] as const,
  intento: (id: number) => ['intento', id] as const,
  equipados: ['equipados'] as const,
  libreta: (retoId: number) => ['libreta', retoId] as const,
};

const esIdValido = (id: number | undefined): id is number =>
  id !== undefined && Number.isInteger(id) && id > 0;

/** Perfil del estudiante autenticado; alimenta el playerStore (ver RutaProtegida). */
export function usePerfil(habilitado = true) {
  return useQuery({ queryKey: QUERY_KEYS.perfil, queryFn: getPerfil, enabled: habilitado });
}

/** Mapa: las N fases que devuelve el backend. */
export function useFases() {
  return useQuery({ queryKey: QUERY_KEYS.fases, queryFn: getFases });
}

/** Tablón de la fase (RF-18). */
export function useTablon(faseId: number | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.tablon(faseId ?? 0),
    queryFn: () => getTablon(faseId!),
    enabled: esIdValido(faseId),
  });
}

/**
 * Un intento. No se refresca solo: el borrador lo lleva la pantalla del reto y
 * se guarda con PUT; así un refetch no pisa lo que el estudiante está haciendo.
 */
export function useIntento(intentoId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.intento(intentoId),
    queryFn: () => getIntento(intentoId),
    enabled: esIdValido(intentoId),
    staleTime: Infinity,
    gcTime: 0,
  });
}

/** Objetos equipados para el cinto de ayudas. */
export function useEquipados() {
  return useQuery({ queryKey: QUERY_KEYS.equipados, queryFn: getEquipados });
}

/** CU-01: requerimientos descubiertos en intentos calificados. */
export function useLibreta(retoId: number | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.libreta(retoId ?? 0),
    queryFn: () => getLibreta(retoId!),
    enabled: esIdValido(retoId),
  });
}

/** Inicia o retoma un intento del reto. */
export function useIniciarIntento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (retoId: number) => iniciarIntento(retoId),
    onSuccess: (intento) => {
      queryClient.setQueryData(QUERY_KEYS.intento(intento.intentoId), intento);
    },
  });
}

/** Usa un objeto equipado como ayuda; refresca las cantidades del cinto. */
export function useUsarAyuda(intentoId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (objetoId: number) => usarAyuda(intentoId, objetoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.equipados }),
  });
}

/**
 * Envía el intento a calificar. Tras la respuesta se vuelven a pedir perfil,
 * fases y tablones: XP/QP/nivel y los estados nunca se calculan en el cliente.
 */
export function useEnviarIntento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (intentoId: number) => enviarIntento(intentoId),
    onSuccess: (intento) => {
      queryClient.setQueryData(QUERY_KEYS.intento(intento.intentoId), intento);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.perfil });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fases });
      queryClient.invalidateQueries({ queryKey: ['tablon'] });
      queryClient.invalidateQueries({ queryKey: ['libreta'] });
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
