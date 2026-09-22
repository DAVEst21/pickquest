import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  enviarIntento,
  getEstudiante,
  getFaseDetalle,
  getFases,
  getIntento,
  type PayloadIntento,
} from './api';
import { usePlayerStore } from '../store/playerStore';

export const QUERY_KEYS = {
  fases: ['fases'] as const,
  faseDetalle: (id: number) => ['fase', id] as const,
  intento: (id: number) => ['intento', id] as const,
  estudiante: ['estudiante'] as const,
};

/**
 * Hook para consultar el listado de fases (CU-01)
 */
export function useFases() {
  return useQuery({
    queryKey: QUERY_KEYS.fases,
    queryFn: getFases,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para consultar detalle de una fase y sus objetivos (CU-02)
 */
export function useFaseDetalle(faseId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.faseDetalle(faseId),
    queryFn: () => getFaseDetalle(faseId),
    enabled: !isNaN(faseId),
  });
}

/**
 * Hook para consultar el resultado de un intento específico (CU-04)
 */
export function useIntento(intentoId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.intento(intentoId),
    queryFn: () => getIntento(intentoId),
    enabled: !isNaN(intentoId),
  });
}

/**
 * Hook para consultar los datos del estudiante
 */
export function useEstudiante() {
  return useQuery({
    queryKey: QUERY_KEYS.estudiante,
    queryFn: getEstudiante,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para enviar la resolución de un reto (CU-03)
 */
export function useEnviarIntento() {
  const queryClient = useQueryClient();
  const actualizarDesdeIntento = usePlayerStore((state) => state.actualizarDesdeIntento);

  return useMutation({
    mutationFn: ({
      faseId,
      retoId,
      payload,
    }: {
      faseId: number;
      retoId: number;
      payload: PayloadIntento;
    }) => enviarIntento(faseId, retoId, payload),
    onSuccess: (nuevoIntento) => {
      // Actualizar estado del jugador en tiempo real si aprobó
      if (nuevoIntento.aprobado) {
        actualizarDesdeIntento(nuevoIntento);
      }
      // Invalidar consultas relevantes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fases });
      queryClient.setQueryData(QUERY_KEYS.intento(nuevoIntento.id), nuevoIntento);
    },
  });
}
