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
  Autoevaluacion,
  Libreta,
  MaterialTema,
  SesionRepaso,
  TemaEstudio,
  CompraRealizada,
  ObjetoDetalle,
  ObjetoInventario,
  Tienda,
  ObjetoEquipado,
  PerfilEstudiante,
  ResultadoSimulacion,
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

/** Con retoId, solo los objetos aplicables a ese reto (RN-10). */
export function getEquipados(retoId?: number): Promise<ObjetoEquipado[]> {
  return http(retoId ? `/inventario/equipados?retoId=${retoId}` : '/inventario/equipados');
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

/** CU-05: ejecuta una simulación del escenario con lo guardado (máximo 5 por intento). */
export function simularEscenario(intentoId: number): Promise<ResultadoSimulacion> {
  return http(`/intentos/${intentoId}/escenario/simular`, { method: 'POST' });
}

/** CU-12: catálogo de la tienda con saldo y unidades del estudiante. */
export function getTienda(): Promise<Tienda> {
  return http('/tienda');
}

export function getObjetoTienda(objetoId: number): Promise<ObjetoDetalle> {
  return http(`/tienda/objetos/${objetoId}`);
}

/** CU-12: compra atómica (descuenta QP y suma unidades). */
export function comprarObjeto(objetoId: number, cantidad: number): Promise<CompraRealizada> {
  return http('/tienda/compras', { method: 'POST', body: { objetoId, cantidad } });
}

export function getInventario(): Promise<ObjetoInventario[]> {
  return http('/inventario');
}

/** CU-12 FA2: con el cinto lleno el backend responde 409 con los equipados. */
export function equiparObjeto(objetoId: number, reemplazaObjetoId?: number): Promise<ObjetoInventario[]> {
  return http(`/inventario/${objetoId}/equipar`, {
    method: 'POST',
    body: reemplazaObjetoId ? { reemplazaObjetoId } : {},
  });
}

export function desequiparObjeto(objetoId: number): Promise<ObjetoInventario[]> {
  return http(`/inventario/${objetoId}/desequipar`, { method: 'POST' });
}

/** CU-09: biblioteca de estudio (un tema por fase). */
export function getTemasEstudio(): Promise<TemaEstudio[]> {
  return http('/estudio/temas');
}

/** CU-09 FE1: 403 si la fase del tema está bloqueada. */
export function getMaterialTema(faseId: number): Promise<MaterialTema> {
  return http(`/estudio/temas/${faseId}`);
}

/** CU-09 FA1: el estudiante cerró el material sin repasar. */
export function registrarConsultaTema(faseId: number): Promise<{ consultaId: number }> {
  return http(`/estudio/temas/${faseId}/consultas`, { method: 'POST' });
}

/** CU-09: inicia el repaso o retoma la sesión pendiente (FA2). */
export function iniciarRepaso(faseId: number): Promise<SesionRepaso> {
  return http(`/estudio/temas/${faseId}/sesiones`, { method: 'POST' });
}

export function getSesionRepaso(sesionId: number): Promise<SesionRepaso> {
  return http(`/estudio/sesiones/${sesionId}`);
}

/** CU-09 RN-24: autoevaluación de la tarjeta; el servidor programa su próxima aparición. */
export function autoevaluarTarjeta(
  sesionId: number,
  tarjetaId: number,
  autoevaluacion: Autoevaluacion,
): Promise<SesionRepaso> {
  return http(`/estudio/sesiones/${sesionId}/tarjetas/${tarjetaId}`, { method: 'POST', body: { autoevaluacion } });
}
