-- AlterTable
ALTER TABLE "duelo" ADD COLUMN "avisoCierreVisto" BOOLEAN NOT NULL DEFAULT false;

-- Los duelos que ya estaban cerrados antes de existir el aviso no se avisan de nuevo.
UPDATE "duelo" SET "avisoCierreVisto" = true WHERE "estado" IN ('RECHAZADO', 'EXPIRADO');
