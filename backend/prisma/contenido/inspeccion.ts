import { InspeccionSeed } from './tipos';

/**
 * CU-04 (fase 3, reto 1). App ficticia "SaludYa" (citas médicas) con 3
 * pantallas de 7 elementos cada una y 6 fallas de calidad que cubren 5
 * atributos ISO/IEC 25010 distintos (seguridad, usabilidad, eficiencia de
 * desempeño, adecuación funcional y fiabilidad). Hay 15 elementos sin falla.
 */
export const INSPECCION: InspeccionSeed = {
  titulo: 'Inspecciona la app SaludYa',
  objetivo:
    'Recorre las pantallas de una app de citas médicas, marca los elementos defectuosos y di qué atributo de calidad ISO 25010 afectan.',
  contexto:
    'SaludYa es una aplicación para agendar citas médicas que saldrá a producción la próxima semana. Te contrataron como inspector de calidad: ' +
    'recorre cada pantalla, haz clic en los elementos que tengan una falla y elige el atributo de calidad de la norma ISO/IEC 25010 ' +
    'que se ve afectado (seguridad, usabilidad, eficiencia de desempeño, fiabilidad...). Ojo: tienes un número limitado de marcas y ' +
    'marcar un elemento que está bien te resta puntos.',
  recompensaXp: 250,
  recompensaQp: 180,
  nombreAplicacion: 'SaludYa',
  maxMarcas: 9,
  pantallas: [
    {
      titulo: 'Inicio de sesión',
      elementos: [
        { tipo: 'IMAGEN', etiqueta: 'Logotipo de SaludYa', variante: 'logo' },
        { tipo: 'TITULO', etiqueta: 'Bienvenido a SaludYa' },
        { tipo: 'CAMPO', etiqueta: 'Correo electrónico', contenido: 'paciente@correo.com' },
        {
          tipo: 'CAMPO',
          etiqueta: 'Contraseña',
          contenido: 'MiClave2024',
          variante: 'texto-plano',
          falla: {
            atributo: 'SEGURIDAD',
            explicacion:
              'La contraseña se muestra en texto plano mientras se escribe, sin opción de ocultarla. Cualquiera que mire la pantalla puede leerla: se afecta la confidencialidad (seguridad).',
          },
        },
        { tipo: 'BOTON', etiqueta: 'Iniciar sesión', variante: 'principal' },
        {
          tipo: 'TEXTO',
          etiqueta: '¿Olvidaste tu contraseña?',
          variante: 'contraste-bajo',
          falla: {
            atributo: 'USABILIDAD',
            explicacion:
              'El enlace está en gris muy claro sobre fondo blanco: casi no se distingue. El bajo contraste afecta la accesibilidad, que es parte de la usabilidad.',
          },
        },
        { tipo: 'TEXTO', etiqueta: 'Al continuar aceptas los términos y condiciones del servicio.', variante: 'pie' },
      ],
    },
    {
      titulo: 'Agendar cita',
      elementos: [
        { tipo: 'TITULO', etiqueta: 'Agenda tu cita' },
        { tipo: 'LISTA', etiqueta: 'Especialidad', contenido: 'Medicina general\nPediatría\nCardiología' },
        { tipo: 'CAMPO', etiqueta: 'Fecha de la cita', contenido: '12/11/2026' },
        {
          tipo: 'MENSAJE',
          etiqueta: 'Estado de la búsqueda',
          contenido: 'Cargando horarios disponibles... 12 segundos',
          variante: 'carga-lenta',
          falla: {
            atributo: 'EFICIENCIA_DESEMPENO',
            explicacion:
              'Consultar los horarios tarda 12 segundos. Un tiempo de respuesta tan largo afecta la eficiencia de desempeño (comportamiento temporal).',
          },
        },
        {
          tipo: 'BOTON',
          etiqueta: 'Confirmar cita',
          variante: 'sin-feedback',
          falla: {
            atributo: 'USABILIDAD',
            explicacion:
              'Al pulsar el botón no ocurre nada visible: ni mensaje, ni indicador de carga, ni confirmación. El usuario no sabe si su cita quedó agendada; falta retroalimentación (usabilidad).',
          },
        },
        { tipo: 'BOTON', etiqueta: 'Cancelar', variante: 'secundario' },
        { tipo: 'TEXTO', etiqueta: 'Atención de lunes a viernes, de 8:00 a 17:00 horas.', variante: 'pie' },
      ],
    },
    {
      titulo: 'Mis citas',
      elementos: [
        { tipo: 'TITULO', etiqueta: 'Mis citas' },
        {
          tipo: 'LISTA',
          etiqueta: 'Próximas citas',
          contenido: '12/11 · 10:00 · Pediatría · Dr. Pérez\n12/11 · 10:00 · Pediatría · Dr. Pérez',
          variante: 'duplicado',
          falla: {
            atributo: 'ADECUACION_FUNCIONAL',
            explicacion:
              'La misma cita aparece registrada dos veces, a la misma hora y con el mismo médico. El sistema no hace correctamente lo que debe (corrección funcional).',
          },
        },
        {
          tipo: 'MENSAJE',
          etiqueta: 'Aviso del sistema',
          contenido: 'La aplicación se cerró inesperadamente 3 veces hoy. Es posible que algunos cambios no se hayan guardado.',
          variante: 'alerta-fallos',
          falla: {
            atributo: 'FIABILIDAD',
            explicacion:
              'La aplicación se cierra sola de forma repetida y puede perder información. Una falla recurrente afecta la fiabilidad (madurez y tolerancia a fallos).',
          },
        },
        { tipo: 'BOTON', etiqueta: 'Cancelar cita', variante: 'secundario' },
        { tipo: 'BOTON', etiqueta: 'Agendar otra cita', variante: 'principal' },
        { tipo: 'TEXTO', etiqueta: 'Recuerda llegar 10 minutos antes de tu cita.', variante: 'pie' },
        { tipo: 'IMAGEN', etiqueta: 'Foto de perfil del paciente', variante: 'avatar' },
      ],
    },
  ],
};
