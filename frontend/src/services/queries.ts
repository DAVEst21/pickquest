import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Autoevaluacion, Sesion } from '../types';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import {
  abandonarRetoDiario,
  aceptarPlan,
  autoevaluarTarjeta,
  comprarObjeto,
  desequiparObjeto,
  enviarIntento,
  equiparObjeto,
  getEquipados,
  getFases,
  getDiagnostico,
  getIntento,
  getRetoDiarioHoy,
  iniciarRetoDiario,
  getPlan,
  getPlanActivo,
  iniciarDiagnostico,
  responderDiagnostico,
  getMaterialTema,
  getSesionRepaso,
  getTemasEstudio,
  iniciarRepaso,
  registrarConsultaTema,
  getInventario,
  getObjetoTienda,
  getTienda,
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
  equipados: (retoId?: number) => ['equipados', retoId ?? 0] as const,
  libreta: (retoId: number) => ['libreta', retoId] as const,
  tienda: ['tienda'] as const,
  retoDiarioHoy: ['reto-diario', 'hoy'] as const,
  planActivo: ['plan', 'activo'] as const,
  plan: (id: number) => ['plan', id] as const,
  diagnostico: (id: number) => ['plan', 'diagnostico', id] as const,
  temasEstudio: ['estudio', 'temas'] as const,
  materialTema: (faseId: number) => ['estudio', 'material', faseId] as const,
  sesionRepaso: (id: number) => ['estudio', 'sesion', id] as const,
  inventario: ['inventario'] as const,
  objetoTienda: (id: number) => ['tienda', 'objeto', id] as const,
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
export function useEquipados(retoId?: number) {
  return useQuery({ queryKey: QUERY_KEYS.equipados(retoId), queryFn: () => getEquipados(retoId) });
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipados'] }),
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

/** CU-12: catálogo, saldo y unidades. */
export function useTienda() {
  return useQuery({ queryKey: QUERY_KEYS.tienda, queryFn: getTienda });
}

export function useObjetoTienda(objetoId: number | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.objetoTienda(objetoId ?? 0),
    queryFn: () => getObjetoTienda(objetoId!),
    enabled: esIdValido(objetoId),
  });
}

export function useInventario() {
  return useQuery({ queryKey: QUERY_KEYS.inventario, queryFn: getInventario });
}

/** Tras comprar o equipar se vuelven a pedir saldo, tienda, inventario y cinto del servidor. */
function useRefrescarEconomia() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tienda });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventario });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.perfil });
    queryClient.invalidateQueries({ queryKey: ['equipados'] });
  };
}

export function useComprarObjeto() {
  const refrescar = useRefrescarEconomia();
  return useMutation({
    mutationFn: ({ objetoId, cantidad }: { objetoId: number; cantidad: number }) => comprarObjeto(objetoId, cantidad),
    onSuccess: refrescar,
  });
}

export function useEquiparObjeto() {
  const refrescar = useRefrescarEconomia();
  return useMutation({
    mutationFn: ({ objetoId, reemplazaObjetoId }: { objetoId: number; reemplazaObjetoId?: number }) =>
      equiparObjeto(objetoId, reemplazaObjetoId),
    onSuccess: refrescar,
  });
}

export function useDesequiparObjeto() {
  const refrescar = useRefrescarEconomia();
  return useMutation({ mutationFn: (objetoId: number) => desequiparObjeto(objetoId), onSuccess: refrescar });
}

/** CU-09: biblioteca de estudio. */
export function useTemasEstudio() {
  return useQuery({ queryKey: QUERY_KEYS.temasEstudio, queryFn: getTemasEstudio });
}

/** CU-09: material del tema; 403 si la fase está bloqueada (FE1). */
export function useMaterialTema(faseId: number | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.materialTema(faseId ?? 0),
    queryFn: () => getMaterialTema(faseId!),
    enabled: esIdValido(faseId),
    retry: false,
  });
}

export function useSesionRepaso(sesionId: number | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.sesionRepaso(sesionId ?? 0),
    queryFn: () => getSesionRepaso(sesionId!),
    enabled: esIdValido(sesionId),
    staleTime: Infinity,
    retry: false,
  });
}

export function useRegistrarConsulta() {
  return useMutation({ mutationFn: (faseId: number) => registrarConsultaTema(faseId) });
}

export function useIniciarRepaso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (faseId: number) => iniciarRepaso(faseId),
    onSuccess: (sesion) => {
      queryClient.setQueryData(QUERY_KEYS.sesionRepaso(sesion.sesionId), sesion);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.temasEstudio });
    },
  });
}

/** Autoevalúa una tarjeta; al terminar la sesión se refrescan el perfil (XP) y la biblioteca. */
export function useAutoevaluarTarjeta(sesionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tarjetaId, autoevaluacion }: { tarjetaId: number; autoevaluacion: Autoevaluacion }) =>
      autoevaluarTarjeta(sesionId, tarjetaId, autoevaluacion),
    onSuccess: (sesion) => {
      queryClient.setQueryData(QUERY_KEYS.sesionRepaso(sesion.sesionId), sesion);
      if (sesion.terminada) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.perfil });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.temasEstudio });
      }
    },
  });
}

/** CU-10: plan activo con su avance (null si no tiene). */
export function usePlanActivo() {
  return useQuery({ queryKey: QUERY_KEYS.planActivo, queryFn: getPlanActivo });
}

export function usePlan(planId: number | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.plan(planId ?? 0),
    queryFn: () => getPlan(planId!),
    enabled: esIdValido(planId),
    retry: false,
  });
}

export function useDiagnostico(diagnosticoId: number | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.diagnostico(diagnosticoId ?? 0),
    queryFn: () => getDiagnostico(diagnosticoId!),
    enabled: esIdValido(diagnosticoId),
    staleTime: Infinity,
    retry: false,
  });
}

export function useIniciarDiagnostico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: iniciarDiagnostico,
    onSuccess: (d) => queryClient.setQueryData(QUERY_KEYS.diagnostico(d.diagnosticoId), d),
  });
}

export function useResponderDiagnostico(diagnosticoId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (respuestas: { preguntaId: number; opcionId: number }[]) =>
      responderDiagnostico(diagnosticoId, respuestas),
    onSuccess: (resultado) => {
      queryClient.setQueryData(QUERY_KEYS.plan(resultado.plan.planId), resultado.plan);
    },
  });
}

export function useAceptarPlan(planId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actividadIds: number[]) => aceptarPlan(planId, actividadIds),
    onSuccess: (plan) => {
      queryClient.setQueryData(QUERY_KEYS.plan(plan.planId), plan);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.planActivo });
    },
  });
}

/** CU-11: racha, reglas y estado del reto de hoy; también alimenta el indicador del encabezado. */
export function useRetoDiarioHoy() {
  return useQuery({ queryKey: QUERY_KEYS.retoDiarioHoy, queryFn: getRetoDiarioHoy });
}

/** Tras iniciar, abandonar o terminar el reto se vuelven a pedir el estado del día y el perfil (XP, QP, racha). */
export function useRefrescarRetoDiario() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.retoDiarioHoy });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.perfil });
  };
}

export function useIniciarRetoDiario() {
  const refrescar = useRefrescarRetoDiario();
  return useMutation({ mutationFn: iniciarRetoDiario, onSuccess: refrescar });
}

export function useAbandonarRetoDiario() {
  const refrescar = useRefrescarRetoDiario();
  return useMutation({ mutationFn: (retoId: number) => abandonarRetoDiario(retoId), onSuccess: refrescar });
}
