import type {
  AyudaAplicada,
  BorradorGuardado,
  Credenciales,
  DatosRegistro,
  Fase,
  FaseTablon,
  Intento,
  IntentoCalificado,
  IntentoEnCurso,
  Libreta,
  ObjetoEquipado,
  PerfilEstudiante,
  Sesion,
  TecnicaElicitacion,
} from '../types';
import { http } from './http';

// Llamadas reales al backend. El frontend nunca calcula puntajes, estados ni
// recompensas: todo viene del servidor.

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

/** Fases con el estado ya calculado por el backend para el estudiante. */
export function getFases(): Promise<Fase[]> {
  return http('/fases');
}

/** Tablón de la fase: todos sus retos con estado, objetivo y recompensas (RF-18). */
export function getTablon(faseId: number): Promise<FaseTablon> {
  return http(`/fases/${faseId}`);
}

/** Inicia un intento o retoma el que está en curso (FA3). */
export function iniciarIntento(retoId: number): Promise<IntentoEnCurso> {
  return http(`/retos/${retoId}/intentos`, { method: 'POST' });
}

/** Intento propio: EN_CURSO (contenido y borrador) o CALIFICADO (resultado). */
export function getIntento(intentoId: number): Promise<Intento> {
  return http(`/intentos/${intentoId}`);
}

/** RF-01: guarda el avance del intento en el servidor. */
export function guardarBorrador(
  intentoId: number,
  cuerpo: unknown,
  keepalive = false,
): Promise<BorradorGuardado> {
  return http(`/intentos/${intentoId}/borrador`, { method: 'PUT', body: cuerpo, keepalive });
}

/** RF-03, RN-10: usa un objeto equipado como ayuda (máximo 1 por intento). */
export function usarAyuda(intentoId: number, objetoId: number): Promise<AyudaAplicada> {
  return http(`/intentos/${intentoId}/ayuda`, { method: 'POST', body: { objetoId } });
}

export function enviarIntento(intentoId: number): Promise<IntentoCalificado> {
  return http(`/intentos/${intentoId}/enviar`, { method: 'POST' });
}

export function getEquipados(): Promise<ObjetoEquipado[]> {
  return http('/inventario/equipados');
}

export function getLibreta(retoId: number): Promise<Libreta[]> {
  return http(`/retos/${retoId}/libreta`);
}

/** CU-01: registra la técnica; devuelve el estado del diálogo. */
export function elegirTecnica<T>(intentoId: number, tecnica: TecnicaElicitacion): Promise<T> {
  return http(`/intentos/${intentoId}/dialogo/tecnica`, { method: 'POST', body: { tecnica } });
}

/** CU-01: registra un turno; devuelve el estado del diálogo con el turno recién jugado. */
export function registrarTurno<T>(intentoId: number, opcionId: number): Promise<T> {
  return http(`/intentos/${intentoId}/dialogo/turnos`, { method: 'POST', body: { opcionId } });
}
