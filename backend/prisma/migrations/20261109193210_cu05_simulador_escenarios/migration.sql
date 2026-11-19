-- CreateEnum
CREATE TYPE "ParteEscenario" AS ENUM ('FUENTE', 'ESTIMULO', 'ARTEFACTO', 'ENTORNO', 'RESPUESTA');

-- AlterEnum
ALTER TYPE "TipoPista" ADD VALUE 'RANGO_ESCENARIO';

-- CreateTable
CREATE TABLE "escenario_calidad" (
    "retoId" INTEGER NOT NULL,
    "necesidadVaga" TEXT NOT NULL,
    "contextoApp" TEXT NOT NULL,
    "nombreMetrica" TEXT NOT NULL,
    "nombreCarga" TEXT NOT NULL,
    "unidadCorrectaId" INTEGER,
    "valorMinSlider" DECIMAL(10,2) NOT NULL,
    "valorMaxSlider" DECIMAL(10,2) NOT NULL,
    "pasoSlider" DECIMAL(10,2) NOT NULL,
    "cargaMinSlider" INTEGER NOT NULL,
    "cargaMaxSlider" INTEGER NOT NULL,
    "pasoCarga" INTEGER NOT NULL,
    "valorMinAceptable" DECIMAL(10,2) NOT NULL,
    "valorMaxAceptable" DECIMAL(10,2) NOT NULL,
    "cargaMinAceptable" INTEGER NOT NULL,
    "cargaMaxAceptable" INTEGER NOT NULL,
    "simBase" DECIMAL(10,4) NOT NULL,
    "simPendiente" DECIMAL(10,6) NOT NULL,

    CONSTRAINT "escenario_calidad_pkey" PRIMARY KEY ("retoId")
);

-- CreateTable
CREATE TABLE "unidad_escenario" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "unidad_escenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opcion_parte_escenario" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "parte" "ParteEscenario" NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "correcta" BOOLEAN NOT NULL,

    CONSTRAINT "opcion_parte_escenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuesta_escenario" (
    "intentoId" INTEGER NOT NULL,
    "valor" DECIMAL(10,2),
    "unidadId" INTEGER,
    "carga" INTEGER,

    CONSTRAINT "respuesta_escenario_pkey" PRIMARY KEY ("intentoId")
);

-- CreateTable
CREATE TABLE "eleccion_parte_escenario" (
    "intentoId" INTEGER NOT NULL,
    "parte" "ParteEscenario" NOT NULL,
    "opcionId" INTEGER NOT NULL,

    CONSTRAINT "eleccion_parte_escenario_pkey" PRIMARY KEY ("intentoId","parte")
);

-- CreateTable
CREATE TABLE "simulacion_escenario" (
    "id" SERIAL NOT NULL,
    "intentoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "carga" INTEGER NOT NULL,
    "valorApp" DECIMAL(10,2) NOT NULL,
    "cumple" BOOLEAN NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulacion_escenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "escenario_calidad_unidadCorrectaId_key" ON "escenario_calidad"("unidadCorrectaId");

-- CreateIndex
CREATE UNIQUE INDEX "opcion_parte_escenario_retoId_parte_orden_key" ON "opcion_parte_escenario"("retoId", "parte", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "simulacion_escenario_intentoId_numero_key" ON "simulacion_escenario"("intentoId", "numero");

-- AddForeignKey
ALTER TABLE "escenario_calidad" ADD CONSTRAINT "escenario_calidad_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escenario_calidad" ADD CONSTRAINT "escenario_calidad_unidadCorrectaId_fkey" FOREIGN KEY ("unidadCorrectaId") REFERENCES "unidad_escenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidad_escenario" ADD CONSTRAINT "unidad_escenario_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_parte_escenario" ADD CONSTRAINT "opcion_parte_escenario_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_escenario" ADD CONSTRAINT "respuesta_escenario_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_escenario" ADD CONSTRAINT "respuesta_escenario_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidad_escenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_parte_escenario" ADD CONSTRAINT "eleccion_parte_escenario_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_parte_escenario" ADD CONSTRAINT "eleccion_parte_escenario_opcionId_fkey" FOREIGN KEY ("opcionId") REFERENCES "opcion_parte_escenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulacion_escenario" ADD CONSTRAINT "simulacion_escenario_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Orden de los retos de la fase 3 (Sprint 3): Inspección → Simulador (CU-05, nuevo) → Presupuesto.
-- El reto de presupuesto pasa de la posición 2 a la 3 sin tocar sus intentos (la clave del reto no cambia).
UPDATE "reto" SET "orden" = 3
WHERE "mecanica" = 'REPARTO_PRESUPUESTO'
  AND "orden" = 2
  AND "faseId" = (SELECT "id" FROM "fase" WHERE "orden" = 3);
