import { puedeVerReferencia } from './referencia';
import { Db } from './tipos';

/** Base simulada: solo responde el conteo de intentos calificados no aprobados. */
const dbConNoAprobados = (n: number): Db =>
  ({ intentoReto: { count: jest.fn().mockResolvedValue(n) } }) as unknown as Db;

describe('RN-31: puedeVerReferencia', () => {
  it('un intento aprobado siempre ve la referencia (sin consultar la base)', async () => {
    const db = dbConNoAprobados(0);
    expect(await puedeVerReferencia(db, 1, 1, { aprobado: true })).toBe(true);
    expect(db.intentoReto.count).not.toHaveBeenCalled();
  });

  it('con 0, 1 o 2 intentos no aprobados no ve la referencia', async () => {
    for (const n of [0, 1, 2]) {
      expect(await puedeVerReferencia(dbConNoAprobados(n), 1, 1, { aprobado: false })).toBe(false);
    }
  });

  it('con 3 o más intentos no aprobados sí la ve', async () => {
    for (const n of [3, 4, 10]) {
      expect(await puedeVerReferencia(dbConNoAprobados(n), 1, 1, { aprobado: false })).toBe(true);
    }
  });

  it('cuenta solo intentos CALIFICADO no aprobados del estudiante en ese reto', async () => {
    const db = dbConNoAprobados(3);
    await puedeVerReferencia(db, 7, 9, { aprobado: false });
    expect(db.intentoReto.count).toHaveBeenCalledWith({
      where: { estudianteId: 7, retoId: 9, estado: 'CALIFICADO', aprobado: false },
    });
  });
});
