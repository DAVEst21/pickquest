-- CreateEnum
CREATE TYPE "TipoDocumentoExpediente" AS ENUM ('MINUTA', 'CORREO', 'FICHA_TECNICA', 'PRESUPUESTO');

-- AlterEnum
ALTER TYPE "TipoPista" ADD VALUE 'DOCUMENTO';

-- AlterTable
ALTER TABLE "uso_ayuda" ADD COLUMN     "documentoId" INTEGER;

-- CreateTable
CREATE TABLE "expediente" (
    "retoId" INTEGER NOT NULL,
    "nombreProyecto" TEXT NOT NULL,
    "modeloCorrecto" "ModeloCicloVida" NOT NULL,
    "explicacion" TEXT NOT NULL,

    CONSTRAINT "expediente_pkey" PRIMARY KEY ("retoId")
);

-- CreateTable
CREATE TABLE "documento_expediente" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" "TipoDocumentoExpediente" NOT NULL,
    "titulo" TEXT NOT NULL,

    CONSTRAINT "documento_expediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caracteristica_proyecto" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "caracteristica_proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fragmento_documento" (
    "id" SERIAL NOT NULL,
    "documentoId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "caracteristicaCorrectaId" INTEGER,
    "respaldaModelo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fragmento_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencia_seleccionada" (
    "intentoId" INTEGER NOT NULL,
    "fragmentoId" INTEGER NOT NULL,
    "caracteristicaId" INTEGER,

    CONSTRAINT "evidencia_seleccionada_pkey" PRIMARY KEY ("intentoId","fragmentoId")
);

-- CreateTable
CREATE TABLE "eleccion_modelo" (
    "intentoId" INTEGER NOT NULL,
    "modelo" "ModeloCicloVida" NOT NULL,

    CONSTRAINT "eleccion_modelo_pkey" PRIMARY KEY ("intentoId")
);

-- CreateTable
CREATE TABLE "vinculo_evidencia" (
    "intentoId" INTEGER NOT NULL,
    "fragmentoId" INTEGER NOT NULL,

    CONSTRAINT "vinculo_evidencia_pkey" PRIMARY KEY ("intentoId","fragmentoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "documento_expediente_retoId_orden_key" ON "documento_expediente"("retoId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "fragmento_documento_documentoId_orden_key" ON "fragmento_documento"("documentoId", "orden");

-- AddForeignKey
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documento_expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expediente" ADD CONSTRAINT "expediente_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_expediente" ADD CONSTRAINT "documento_expediente_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caracteristica_proyecto" ADD CONSTRAINT "caracteristica_proyecto_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fragmento_documento" ADD CONSTRAINT "fragmento_documento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documento_expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fragmento_documento" ADD CONSTRAINT "fragmento_documento_caracteristicaCorrectaId_fkey" FOREIGN KEY ("caracteristicaCorrectaId") REFERENCES "caracteristica_proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia_seleccionada" ADD CONSTRAINT "evidencia_seleccionada_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia_seleccionada" ADD CONSTRAINT "evidencia_seleccionada_fragmentoId_fkey" FOREIGN KEY ("fragmentoId") REFERENCES "fragmento_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia_seleccionada" ADD CONSTRAINT "evidencia_seleccionada_caracteristicaId_fkey" FOREIGN KEY ("caracteristicaId") REFERENCES "caracteristica_proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_modelo" ADD CONSTRAINT "eleccion_modelo_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculo_evidencia" ADD CONSTRAINT "vinculo_evidencia_intentoId_fragmentoId_fkey" FOREIGN KEY ("intentoId", "fragmentoId") REFERENCES "evidencia_seleccionada"("intentoId", "fragmentoId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Orden de los retos de la fase 1 (Sprint 3): Expediente (CU-07, nuevo) → Línea de tiempo.
-- La línea de tiempo pasa de la posición 1 a la 2 sin tocar sus intentos (la clave del reto no cambia).
UPDATE "reto" SET "orden" = 2
WHERE "mecanica" = 'LINEA_TIEMPO'
  AND "orden" = 1
  AND "faseId" = (SELECT "id" FROM "fase" WHERE "orden" = 1);
