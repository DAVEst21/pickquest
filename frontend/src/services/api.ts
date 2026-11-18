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
  AvisoDuelo,
  Autoevaluacion,
  Clasificacion,
  Duelo,
  ListaDuelos,
  PerfilCompleto,
  Rival,
  RespuestaDuelo,
  EstadoRetoDiario,
  HoyRetoDiario,
  PreguntaCronometrada,
  RespuestaRetoDiario,
  DiagnosticoIniciado,
  DiagnosticoTerminado,
  PlanEstudio,
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

/** CU-10: crea un diagnóstico de 9 preguntas (sin la opción correcta). */
export function iniciarDiagnostico(): Promise<DiagnosticoIniciado> {
  return http('/plan/diagnosticos', { method: 'POST' });
}

export function getDiagnostico(diagnosticoId: number): Promise<DiagnosticoIniciado> {
  return http(`/plan/diagnosticos/${diagnosticoId}`);
}

/** CU-10 FE1: 400 con `pendientes` si falta alguna respuesta. */
export function responderDiagnostico(
  diagnosticoId: number,
  respuestas: { preguntaId: number; opcionId: number }[],
): Promise<DiagnosticoTerminado> {
  return http(`/plan/diagnosticos/${diagnosticoId}/respuestas`, { method: 'POST', body: { respuestas } });
}

export function getPlanActivo(): Promise<{ plan: PlanEstudio | null }> {
  return http('/plan/activo');
}

export function getPlan(planId: number): Promise<PlanEstudio> {
  return http(`/plan/${planId}`);
}

/** CU-10 FA1: las actividades conservadas, en el orden elegido. */
export function aceptarPlan(planId: number, actividadIds: number[]): Promise<PlanEstudio> {
  return http(`/plan/${planId}/aceptar`, { method: 'POST', body: { actividadIds } });
}

/** CU-11: racha, multiplicador, reglas y estado del reto de hoy. */
export function getRetoDiarioHoy(): Promise<HoyRetoDiario> {
  return http('/reto-diario/hoy');
}

/** CU-11: inicia (o retoma) el reto del día. FE1: 409 con el resultado si ya lo hizo. */
export function iniciarRetoDiario(): Promise<EstadoRetoDiario> {
  return http('/reto-diario', { method: 'POST' });
}

/** CU-11: el servidor habilita la pregunta y arranca su reloj. */
export function entregarPreguntaDiaria(retoId: number, numero: number): Promise<PreguntaCronometrada> {
  return http(`/reto-diario/${retoId}/preguntas/${numero}/entregar`, { method: 'POST' });
}

/** CU-11: `opcionId = null` significa que se agotó el tiempo (FA1). */
export function responderPreguntaDiaria(
  retoId: number,
  numero: number,
  opcionId: number | null,
): Promise<RespuestaRetoDiario> {
  return http(`/reto-diario/${retoId}/preguntas/${numero}/respuesta`, { method: 'POST', body: { opcionId } });
}

/** CU-11 FA2. */
export function abandonarRetoDiario(retoId: number): Promise<EstadoRetoDiario> {
  return http(`/reto-diario/${retoId}/abandonar`, { method: 'POST' });
}

// ---------- CU-13 Duelos ----------

export function getRivales(): Promise<Rival[]> {
  return http('/duelos/rivales');
}

export function getDuelos(): Promise<ListaDuelos> {
  return http('/duelos');
}

/** Duelos pendientes en los que soy el retado: el aviso al iniciar sesión. */
export function getAvisosDuelos(): Promise<AvisoDuelo[]> {
  return http('/duelos/avisos');
}

/** El rival se identifica por su nombre de aventurero (nunca se exponen correos ni ids). */
export function crearDuelo(rival: string, tema: string): Promise<Duelo> {
  return http('/duelos', { method: 'POST', body: { rival, tema } });
}

export function getDuelo(dueloId: number): Promise<Duelo> {
  return http(`/duelos/${dueloId}`);
}

export function aceptarDuelo(dueloId: number): Promise<Duelo> {
  return http(`/duelos/${dueloId}/aceptar`, { method: 'POST' });
}

export function rechazarDuelo(dueloId: number): Promise<Duelo> {
  return http(`/duelos/${dueloId}/rechazar`, { method: 'POST' });
}

/** D-001: el retador cierra el aviso de un duelo rechazado o expirado. */
export function marcarAvisoDueloVisto(dueloId: number): Promise<void> {
  return http(`/duelos/${dueloId}/aviso-visto`, { method: 'POST' });
}

export function entregarPreguntaDuelo(dueloId: number, numero: number): Promise<PreguntaCronometrada> {
  return http(`/duelos/${dueloId}/preguntas/${numero}/entregar`, { method: 'POST' });
}

export function responderPreguntaDuelo(
  dueloId: number,
  numero: number,
  opcionId: number | null,
): Promise<RespuestaDuelo> {
  return http(`/duelos/${dueloId}/preguntas/${numero}/respuesta`, { method: 'POST', body: { opcionId } });
}

// ---------- RF-20 Clasificación y RF-19 Perfil ----------

export function getClasificacion(): Promise<Clasificacion> {
  return http('/clasificacion');
}

export function getPerfilCompleto(): Promise<PerfilCompleto> {
  return http('/perfil');
}

export function actualizarPerfil(cambios: { nombreAventurero?: string; avatar?: string }): Promise<PerfilCompleto> {
  return http('/perfil', { method: 'PATCH', body: cambios });
}
