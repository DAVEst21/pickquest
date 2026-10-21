-- Fase 1 de la corrección de feature/db-sync-scs: revierte 4 problemas que
-- introdujo esa sincronización.

-- (2) calificacionMinima vuelve a ser fracción 0.0-1.0 (era escala 0-100).
-- Los valores existentes se dividen entre 100 (80.00 -> 0.80) ANTES de
-- angostar el tipo a Decimal(3,2), que no tendría espacio para 80.00.
UPDATE "reto" SET "calificacionMinima" = "calificacionMinima" / 100;
ALTER TABLE "reto" ALTER COLUMN "calificacionMinima" SET DATA TYPE DECIMAL(3,2);

-- (3) calificacionEstrellas vuelve a ser entero 0-3 (era Float).
ALTER TABLE "intento_reto" ALTER COLUMN "calificacionEstrellas" SET DEFAULT 0,
ALTER COLUMN "calificacionEstrellas" SET DATA TYPE INTEGER USING ROUND("calificacionEstrellas")::INTEGER;

-- (4) multiplicadorQP vuelve a ser Decimal (era Float).
ALTER TABLE "racha_estudio" ALTER COLUMN "multiplicadorQP" SET DATA TYPE DECIMAL(4,2);

-- (6) Reto y Objeto: los FKs que los referencian vuelven a Restrict (no se
-- puede borrar un Reto/Objeto con historial dependiente).
ALTER TABLE "intento_reto" DROP CONSTRAINT "intento_reto_retoId_fkey";
ALTER TABLE "intento_reto" ADD CONSTRAINT "intento_reto_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "uso_ayuda" DROP CONSTRAINT "uso_ayuda_retoId_fkey";
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "uso_ayuda" DROP CONSTRAINT "uso_ayuda_objetoId_fkey";
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_objetoId_fkey" FOREIGN KEY ("objetoId") REFERENCES "objeto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventario_objeto" DROP CONSTRAINT "inventario_objeto_objetoId_fkey";
ALTER TABLE "inventario_objeto" ADD CONSTRAINT "inventario_objeto_objetoId_fkey" FOREIGN KEY ("objetoId") REFERENCES "objeto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Índice perdido en el DROP/CREATE de la sync SCS (hallazgo de la Fase 0):
-- es la consulta que se dispara en cada GET /fases y en cada envío de intento.
CREATE INDEX "intento_reto_estudianteId_retoId_idx" ON "intento_reto"("estudianteId", "retoId");

-- (5) Restricciones CHECK (Prisma no las expresa en schema.prisma), con los
-- rangos ya corregidos.
ALTER TABLE "reto" ADD CONSTRAINT "reto_calificacionMinima_rango" CHECK ("calificacionMinima" BETWEEN 0 AND 1);
ALTER TABLE "reto" ADD CONSTRAINT "reto_recompensas_no_negativas" CHECK ("recompensaXp" >= 0 AND "recompensaQp" >= 0);

ALTER TABLE "intento_reto" ADD CONSTRAINT "intento_reto_porcentaje_rango" CHECK ("porcentaje" BETWEEN 0 AND 100);
ALTER TABLE "intento_reto" ADD CONSTRAINT "intento_reto_calificacionEstrellas_rango" CHECK ("calificacionEstrellas" BETWEEN 0 AND 3);
ALTER TABLE "intento_reto" ADD CONSTRAINT "intento_reto_recompensas_no_negativas" CHECK ("xpGanado" >= 0 AND "qpGanado" >= 0);

ALTER TABLE "inventario_objeto" ADD CONSTRAINT "inventario_objeto_cantidad_no_negativa" CHECK ("cantidad" >= 0);
ALTER TABLE "objeto" ADD CONSTRAINT "objeto_costoQP_no_negativo" CHECK ("costoQP" >= 0);
ALTER TABLE "habilidad_sdlc" ADD CONSTRAINT "habilidad_sdlc_nivelAlcanzado_no_negativo" CHECK ("nivelAlcanzado" >= 0);
ALTER TABLE "racha_estudio" ADD CONSTRAINT "racha_estudio_multiplicadorQP_no_negativo" CHECK ("multiplicadorQP" >= 0);
