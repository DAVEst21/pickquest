-- HabilidadSDLC.categoria deja de reutilizar TemaFase y pasa a su propio enum
-- CategoriaHabilidadSDLC (mismos tres valores).
-- Escrito a mano: Prisma proponía DROP COLUMN + ADD COLUMN, que perdería los
-- datos existentes. Se convierte el tipo pasando por texto, y el índice único
-- (estudianteId, categoria) se conserva.

-- CreateEnum
CREATE TYPE "CategoriaHabilidadSDLC" AS ENUM ('ELICITACION', 'ATRIBUTOS_CALIDAD', 'CODIGO_PRUEBAS');

-- AlterTable
ALTER TABLE "HabilidadSDLC"
  ALTER COLUMN "categoria" TYPE "CategoriaHabilidadSDLC"
  USING ("categoria"::text::"CategoriaHabilidadSDLC");

-- Estudiante.nivel pasa a derivarse de xpTotal (src/modules/progreso/nivel.ts):
-- nivel = floor(xpTotal / 500) + 1. Recalcula los niveles ya guardados.
UPDATE "Estudiante" SET "nivel" = ("xpTotal" / 500) + 1;
