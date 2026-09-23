import type {
  AyudaRegistrada,
  Credenciales,
  DatosRegistro,
  Fase,
  FaseDetalle,
  IntentoReto,
  PerfilEstudiante,
  RespuestaPregunta,
  Sesion,
} from '../types';
import { http } from './http';

// Llamadas reales al backend. Los mocks de services/mocks/ ya no se usan en
// ningún flujo; quedan solo como referencia.

export function registrar(datos: DatosRegistro): Promise<Sesion> {
  return http('/auth/registro', { method: 'POST', body: datos });
}

export function iniciarSesion(credenciales: Credenciales): Promise<Sesion> {
  return http('/auth/login', { method: 'POST', body: credenciales });
}

/** Perfil del estudiante autenticado (nivel, XP, QP, racha). */
export function getPerfil(): Promise<PerfilEstudiante> {
  return http('/auth/perfil');
}

/** Fases con el estado ya calculado por el backend para el estudiante (CU-01). */
export function getFases(): Promise<Fase[]> {
  return http('/fases');
}

/** Detalle de una fase con su reto y su contenido de apoyo (CU-02). */
export function getFaseDetalle(faseId: number): Promise<FaseDetalle> {
  return http(`/fases/${faseId}`);
}

/** Registra el uso de una ayuda; el backend marca con usoAyuda el próximo intento. */
export function registrarAyuda(retoId: number): Promise<AyudaRegistrada> {
  return http(`/retos/${retoId}/ayuda`, { method: 'POST' });
}

/**
 * Envía la solución de un reto (CU-03). Solo viaja la respuesta: porcentaje,
 * estrellas, aprobación, recompensas y usoAyuda los calcula el backend.
 */
export function enviarIntento(retoId: number, respuestas: RespuestaPregunta[]): Promise<IntentoReto> {
  return http(`/retos/${retoId}/intentos`, { method: 'POST', body: { respuestas } });
}

/** Resultado de un intento propio (CU-04). 404 si no existe. */
export function getIntento(intentoId: number): Promise<IntentoReto> {
  return http(`/intentos/${intentoId}`);
}
