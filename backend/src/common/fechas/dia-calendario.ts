/**
 * Día calendario en la zona horaria del centro de México (America/Mexico_City).
 * Única función compartida para RN-12 (reto diario), RN-13 (racha) y RN-25
 * (XP de repaso una vez al día). Un "día" va de 00:00 a 23:59 de esa zona,
 * sin importar la zona horaria del servidor ni la del navegador.
 *
 * Un día se representa como texto "AAAA-MM-DD" (se ordena y compara como texto).
 */
export const ZONA_MX = 'America/Mexico_City';

const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_MX,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const formatoHora = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA_MX,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** Día calendario MX de un instante, como "AAAA-MM-DD". */
export function diaCalendarioMx(fecha: Date = new Date()): string {
  return formato.format(fecha);
}

/** Suma (o resta) días a un día "AAAA-MM-DD". Aritmética de calendario, sin husos horarios. */
export function sumarDias(dia: string, dias: number): string {
  const [a, m, d] = dia.split('-').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d + dias));
  return fecha.toISOString().slice(0, 10);
}

/** Día anterior a un día calendario. */
export function diaAnterior(dia: string): string {
  return sumarDias(dia, -1);
}

/** Valor para una columna `@db.Date` de Prisma: la medianoche UTC de ese día. */
export function diaADate(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}

/** Día "AAAA-MM-DD" de una columna `@db.Date` leída por Prisma. */
export function dateADia(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Segundos que faltan para las 00:00 del día siguiente (hora MX); sirve para «el siguiente reto en…». */
export function segundosHastaMedianoche(ahora: Date = new Date()): number {
  const [h, m, s] = formatoHora.format(ahora).split(':').map(Number);
  return 24 * 3600 - (h * 3600 + m * 60 + s);
}
