-- Sincroniza el esquema con la SCS v2.3 (nombres de tabla en snake_case,
-- Reto 1:N con Fase, UsoAyuda con objetoId, etc.).
--
-- REESCRITA (Fase 1 de la corrección posterior): la versión original de esta
-- migración generada por `prisma migrate dev` hacía DROP TABLE + CREATE TABLE
-- de las 12 tablas, lo que borra todos los datos si se aplica sobre una base
-- con información real (así se perdió un usuario en desarrollo). Esta versión
-- usa ALTER TABLE / RENAME para llegar exactamente al mismo esquema final sin
-- destruir filas existentes. Ya estaba aplicada en este entorno con el SQL
-- viejo; el archivo se corrigió con `prisma migrate resolve --applied` (ver
-- commit de la Fase 1) para que quede documentada de forma segura hacia
-- adelante, sin volver a ejecutarse aquí. Las correcciones de tipos/CHECK/
-- onDelete de la Fase 1 van en una migración aparte, posterior a esta.

-- CreateEnum
CREATE TYPE "ModoRespuesta" AS ENUM ('OPCION_MULTIPLE', 'DRAG_AND_DROP', 'CODIGO', 'COMPUESTO');

-- AlterEnum: TipoObjeto pasa de un único valor genérico (CONSUMIBLE) a
-- POCION/PERGAMINO/RELIQUIA. Los objetos existentes con el valor viejo se
-- mapean a POCION (el más parecido a "consumible genérico").
BEGIN;
CREATE TYPE "TipoObjeto_new" AS ENUM ('POCION', 'PERGAMINO', 'RELIQUIA');
ALTER TABLE "Objeto" ALTER COLUMN "tipo" TYPE "TipoObjeto_new" USING (
  CASE WHEN "tipo"::text = 'CONSUMIBLE' THEN 'POCION' ELSE "tipo"::text END::"TipoObjeto_new"
);
ALTER TYPE "TipoObjeto" RENAME TO "TipoObjeto_old";
ALTER TYPE "TipoObjeto_new" RENAME TO "TipoObjeto";
DROP TYPE "TipoObjeto_old";
COMMIT;

-- RenameTable: preserva filas, FKs e índices (Postgres los sigue por OID, no
-- por nombre).
ALTER TABLE "Estudiante" RENAME TO "estudiante";
ALTER TABLE "RachaEstudio" RENAME TO "racha_estudio";
ALTER TABLE "Fase" RENAME TO "fase";
ALTER TABLE "Reto" RENAME TO "reto";
ALTER TABLE "ContenidoApoyo" RENAME TO "contenido_apoyo";
ALTER TABLE "IntentoReto" RENAME TO "intento_reto";
ALTER TABLE "UsoAyuda" RENAME TO "uso_ayuda";
ALTER TABLE "Objeto" RENAME TO "objeto";
ALTER TABLE "InventarioObjeto" RENAME TO "inventario_objeto";
ALTER TABLE "Logro" RENAME TO "logro";
ALTER TABLE "LogroEstudiante" RENAME TO "logro_estudiante";
ALTER TABLE "HabilidadSDLC" RENAME TO "habilidad_sdlc";

-- RenamePrimaryKey: nombres que Prisma generaría para las tablas ya
-- renombradas (evita drift contra schema.prisma).
ALTER TABLE "estudiante" RENAME CONSTRAINT "Estudiante_pkey" TO "estudiante_pkey";
ALTER TABLE "racha_estudio" RENAME CONSTRAINT "RachaEstudio_pkey" TO "racha_estudio_pkey";
ALTER TABLE "fase" RENAME CONSTRAINT "Fase_pkey" TO "fase_pkey";
ALTER TABLE "reto" RENAME CONSTRAINT "Reto_pkey" TO "reto_pkey";
ALTER TABLE "contenido_apoyo" RENAME CONSTRAINT "ContenidoApoyo_pkey" TO "contenido_apoyo_pkey";
ALTER TABLE "intento_reto" RENAME CONSTRAINT "IntentoReto_pkey" TO "intento_reto_pkey";
ALTER TABLE "uso_ayuda" RENAME CONSTRAINT "UsoAyuda_pkey" TO "uso_ayuda_pkey";
ALTER TABLE "objeto" RENAME CONSTRAINT "Objeto_pkey" TO "objeto_pkey";
ALTER TABLE "inventario_objeto" RENAME CONSTRAINT "InventarioObjeto_pkey" TO "inventario_objeto_pkey";
ALTER TABLE "logro" RENAME CONSTRAINT "Logro_pkey" TO "logro_pkey";
ALTER TABLE "logro_estudiante" RENAME CONSTRAINT "LogroEstudiante_pkey" TO "logro_estudiante_pkey";
ALTER TABLE "habilidad_sdlc" RENAME CONSTRAINT "HabilidadSDLC_pkey" TO "habilidad_sdlc_pkey";

-- RenameIndex
ALTER INDEX "Estudiante_email_key" RENAME TO "estudiante_email_key";
ALTER INDEX "Estudiante_nombreAventurero_key" RENAME TO "estudiante_nombreAventurero_key";
ALTER INDEX "Fase_orden_key" RENAME TO "fase_orden_key";
ALTER INDEX "Objeto_nombre_key" RENAME TO "objeto_nombre_key";
ALTER INDEX "Logro_nombre_key" RENAME TO "logro_nombre_key";
ALTER INDEX "HabilidadSDLC_estudianteId_categoria_key" RENAME TO "habilidad_sdlc_estudianteId_categoria_key";
-- Reto_faseId_key desaparece porque Reto deja de ser único por fase.
-- IntentoReto_estudianteId_retoId_idx y
-- UsoAyuda_estudianteId_retoId_intentoId_idx se quitan aquí (así quedó tras
-- el DROP/CREATE original); IntentoReto la restaura la migración de la Fase 1.
DROP INDEX "Reto_faseId_key";
DROP INDEX "IntentoReto_estudianteId_retoId_idx";
DROP INDEX "UsoAyuda_estudianteId_retoId_intentoId_idx";

-- RenameForeignKey
ALTER TABLE "racha_estudio" RENAME CONSTRAINT "RachaEstudio_estudianteId_fkey" TO "racha_estudio_estudianteId_fkey";
ALTER TABLE "contenido_apoyo" RENAME CONSTRAINT "ContenidoApoyo_faseId_fkey" TO "contenido_apoyo_faseId_fkey";
ALTER TABLE "intento_reto" RENAME CONSTRAINT "IntentoReto_estudianteId_fkey" TO "intento_reto_estudianteId_fkey";
ALTER TABLE "uso_ayuda" RENAME CONSTRAINT "UsoAyuda_estudianteId_fkey" TO "uso_ayuda_estudianteId_fkey";
ALTER TABLE "inventario_objeto" RENAME CONSTRAINT "InventarioObjeto_estudianteId_fkey" TO "inventario_objeto_estudianteId_fkey";
ALTER TABLE "logro_estudiante" RENAME CONSTRAINT "LogroEstudiante_estudianteId_fkey" TO "logro_estudiante_estudianteId_fkey";
ALTER TABLE "habilidad_sdlc" RENAME CONSTRAINT "HabilidadSDLC_estudianteId_fkey" TO "habilidad_sdlc_estudianteId_fkey";
-- Estas cambian de onDelete además de nombre: se sueltan aquí y se vuelven a
-- crear más abajo con la regla nueva (no se puede RENAME + cambiar regla).
ALTER TABLE "reto" DROP CONSTRAINT "Reto_faseId_fkey";
ALTER TABLE "intento_reto" DROP CONSTRAINT "IntentoReto_retoId_fkey";
ALTER TABLE "uso_ayuda" DROP CONSTRAINT "UsoAyuda_retoId_fkey";
ALTER TABLE "uso_ayuda" DROP CONSTRAINT "UsoAyuda_intentoId_fkey";
ALTER TABLE "inventario_objeto" DROP CONSTRAINT "InventarioObjeto_objetoId_fkey";
ALTER TABLE "logro_estudiante" DROP CONSTRAINT "LogroEstudiante_logroId_fkey";

-- Las restricciones CHECK de la migración init asumían los rangos viejos
-- (calificacionMinima fracción 0-1, estrellas entero 0-3): se sueltan aquí
-- porque los datos van a cambiar de escala/tipo. Se vuelven a crear,
-- correctas para el modelo nuevo, en la migración de la Fase 1.
ALTER TABLE "intento_reto" DROP CONSTRAINT IF EXISTS "IntentoReto_porcentaje_rango";
ALTER TABLE "intento_reto" DROP CONSTRAINT IF EXISTS "IntentoReto_calificacionEstrellas_rango";
ALTER TABLE "intento_reto" DROP CONSTRAINT IF EXISTS "IntentoReto_recompensas_no_negativas";
ALTER TABLE "reto" DROP CONSTRAINT IF EXISTS "Reto_calificacionMinima_rango";
ALTER TABLE "reto" DROP CONSTRAINT IF EXISTS "Reto_recompensas_no_negativas";
ALTER TABLE "inventario_objeto" DROP CONSTRAINT IF EXISTS "InventarioObjeto_cantidad_no_negativa";
ALTER TABLE "objeto" DROP CONSTRAINT IF EXISTS "Objeto_costoQP_no_negativo";
ALTER TABLE "habilidad_sdlc" DROP CONSTRAINT IF EXISTS "HabilidadSDLC_nivelAlcanzado_no_negativo";

-- RenameSequence: RENAME TABLE no renombra la secuencia SERIAL implícita.
ALTER SEQUENCE "ContenidoApoyo_id_seq" RENAME TO "contenido_apoyo_id_seq";
ALTER SEQUENCE "Estudiante_id_seq" RENAME TO "estudiante_id_seq";
ALTER SEQUENCE "Fase_id_seq" RENAME TO "fase_id_seq";
ALTER SEQUENCE "HabilidadSDLC_id_seq" RENAME TO "habilidad_sdlc_id_seq";
ALTER SEQUENCE "IntentoReto_id_seq" RENAME TO "intento_reto_id_seq";
ALTER SEQUENCE "Logro_id_seq" RENAME TO "logro_id_seq";
ALTER SEQUENCE "Objeto_id_seq" RENAME TO "objeto_id_seq";
ALTER SEQUENCE "Reto_id_seq" RENAME TO "reto_id_seq";
ALTER SEQUENCE "UsoAyuda_id_seq" RENAME TO "uso_ayuda_id_seq";

-- estudiante: avatar pasa a NOT NULL (se rellenan los NULL existentes con '').
UPDATE "estudiante" SET "avatar" = '' WHERE "avatar" IS NULL;
ALTER TABLE "estudiante" ALTER COLUMN "avatar" SET NOT NULL;
ALTER TABLE "estudiante" DROP COLUMN "createdAt";
ALTER TABLE "estudiante" DROP COLUMN "updatedAt";

-- racha_estudio: multiplicadorQP a double precision; nueva columna ultimaActividad.
ALTER TABLE "racha_estudio" ALTER COLUMN "multiplicadorQP" DROP DEFAULT;
ALTER TABLE "racha_estudio" ALTER COLUMN "multiplicadorQP" TYPE DOUBLE PRECISION USING "multiplicadorQP"::double precision;
ALTER TABLE "racha_estudio" ALTER COLUMN "multiplicadorQP" SET DEFAULT 1.0;
ALTER TABLE "racha_estudio" ADD COLUMN "ultimaActividad" DATE;
ALTER TABLE "racha_estudio" DROP COLUMN "updatedAt";

-- fase: sin columnas nuevas, solo se quitan timestamps.
ALTER TABLE "fase" DROP COLUMN "createdAt";
ALTER TABLE "fase" DROP COLUMN "updatedAt";

-- contenido_apoyo: solo se quitan timestamps. faseId pasa de índice normal a
-- único (1 contenido de apoyo por fase).
ALTER TABLE "contenido_apoyo" DROP COLUMN "createdAt";
ALTER TABLE "contenido_apoyo" DROP COLUMN "updatedAt";
DROP INDEX "ContenidoApoyo_faseId_idx";
CREATE UNIQUE INDEX "contenido_apoyo_faseId_key" ON "contenido_apoyo"("faseId");

-- reto: pasa de "1 reto por fase" a 1:N, con orden y modo. claveRespuestas se
-- renombra a contenido (evaluacion.ts sigue leyendo un array plano igual que
-- antes). calificacionMinima pasa de fracción (0.80) a escala 0-100 (80.00),
-- igual que espera el seed de este commit.
ALTER TABLE "reto" ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "reto" ADD COLUMN "modo" "ModoRespuesta" NOT NULL DEFAULT 'OPCION_MULTIPLE';
ALTER TABLE "reto" ALTER COLUMN "orden" DROP DEFAULT;
ALTER TABLE "reto" ALTER COLUMN "modo" DROP DEFAULT;
ALTER TABLE "reto" RENAME COLUMN "claveRespuestas" TO "contenido";
ALTER TABLE "reto" ALTER COLUMN "criteriosAceptacion" DROP NOT NULL;
ALTER TABLE "reto" ALTER COLUMN "calificacionMinima" TYPE DECIMAL(5,2) USING ("calificacionMinima" * 100);
ALTER TABLE "reto" DROP COLUMN "createdAt";
ALTER TABLE "reto" DROP COLUMN "updatedAt";
ALTER TABLE "reto" ADD CONSTRAINT "reto_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "fase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- intento_reto: respuesta (nueva, se rellena con [] para filas existentes),
-- calificacionEstrellas a double precision, createdAt -> creadoEn.
ALTER TABLE "intento_reto" ADD COLUMN "respuesta" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "intento_reto" ALTER COLUMN "respuesta" DROP DEFAULT;
ALTER TABLE "intento_reto" ALTER COLUMN "calificacionEstrellas" DROP DEFAULT;
ALTER TABLE "intento_reto" ALTER COLUMN "calificacionEstrellas" TYPE DOUBLE PRECISION USING "calificacionEstrellas"::double precision;
ALTER TABLE "intento_reto" ALTER COLUMN "calificacionEstrellas" SET DEFAULT 0.0;
ALTER TABLE "intento_reto" ALTER COLUMN "porcentaje" SET DEFAULT 0;
ALTER TABLE "intento_reto" ALTER COLUMN "aprobado" SET DEFAULT false;
ALTER TABLE "intento_reto" RENAME COLUMN "createdAt" TO "creadoEn";
ALTER TABLE "intento_reto" ADD CONSTRAINT "intento_reto_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- objeto: se quitan timestamps (antes de insertar el objeto de respaldo de
-- abajo, para no tener que rellenarlos).
ALTER TABLE "objeto" DROP COLUMN "createdAt";
ALTER TABLE "objeto" DROP COLUMN "updatedAt";

-- uso_ayuda: objetoId nueva y NOT NULL. Se crea un objeto de respaldo para
-- filas existentes sin objeto asociado (el flujo viejo no registraba
-- objetoId), createdAt -> creadoEn.
INSERT INTO "objeto" ("nombre", "tipo", "costoQP", "efecto", "rareza")
SELECT 'Ayuda genérica (migración)', 'POCION', 0, 'Objeto de respaldo para ayudas registradas antes de que UsoAyuda tuviera objetoId.', 'Común'
WHERE NOT EXISTS (SELECT 1 FROM "objeto" WHERE "nombre" = 'Ayuda genérica (migración)')
  AND EXISTS (SELECT 1 FROM "uso_ayuda");

ALTER TABLE "uso_ayuda" ADD COLUMN "objetoId" INTEGER;
UPDATE "uso_ayuda" SET "objetoId" = (SELECT "id" FROM "objeto" ORDER BY "id" LIMIT 1) WHERE "objetoId" IS NULL;
ALTER TABLE "uso_ayuda" ALTER COLUMN "objetoId" SET NOT NULL;
ALTER TABLE "uso_ayuda" RENAME COLUMN "createdAt" TO "creadoEn";
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_objetoId_fkey" FOREIGN KEY ("objetoId") REFERENCES "objeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- inventario_objeto: se quita el timestamp; cantidad pasa de default 0 a 1;
-- su FK a objeto pasa de Restrict a Cascade (así quedó en este commit; la
-- Fase 1 la vuelve a poner en Restrict).
ALTER TABLE "inventario_objeto" DROP COLUMN "updatedAt";
ALTER TABLE "inventario_objeto" ALTER COLUMN "cantidad" SET DEFAULT 1;
ALTER TABLE "inventario_objeto" ADD CONSTRAINT "inventario_objeto_objetoId_fkey" FOREIGN KEY ("objetoId") REFERENCES "objeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- logro: se quitan timestamps.
ALTER TABLE "logro" DROP COLUMN "createdAt";
ALTER TABLE "logro" DROP COLUMN "updatedAt";

-- logro_estudiante: fechaObtenido pasa de timestamp a date; su FK a logro
-- pasa de Restrict a Cascade (fuera del alcance de la Fase 1, no se revierte).
ALTER TABLE "logro_estudiante" ALTER COLUMN "fechaObtenido" TYPE DATE;
ALTER TABLE "logro_estudiante" ADD CONSTRAINT "logro_estudiante_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "logro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- habilidad_sdlc: se quitan timestamps; nivelAlcanzado pasa de default 0 a 1.
ALTER TABLE "habilidad_sdlc" DROP COLUMN "createdAt";
ALTER TABLE "habilidad_sdlc" DROP COLUMN "updatedAt";
ALTER TABLE "habilidad_sdlc" ALTER COLUMN "nivelAlcanzado" SET DEFAULT 1;
