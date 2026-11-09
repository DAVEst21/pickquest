-- CreateEnum
CREATE TYPE "EstadoPlan" AS ENUM ('PROPUESTO', 'ACTIVO', 'REEMPLAZADO');

-- CreateEnum
CREATE TYPE "TipoActividad" AS ENUM ('RETO', 'REPASO', 'DUELO');

-- CreateTable
CREATE TABLE "pregunta_banco" (
    "id" SERIAL NOT NULL,
    "tema" "TemaFase" NOT NULL,
    "enunciado" TEXT NOT NULL,
    "explicacion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pregunta_banco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opcion_pregunta" (
    "id" SERIAL NOT NULL,
    "preguntaId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "correcta" BOOLEAN NOT NULL,

    CONSTRAINT "opcion_pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostico" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminadoEn" TIMESTAMP(3),

    CONSTRAINT "diagnostico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pregunta_diagnostico" (
    "diagnosticoId" INTEGER NOT NULL,
    "preguntaId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "pregunta_diagnostico_pkey" PRIMARY KEY ("diagnosticoId","preguntaId")
);

-- CreateTable
CREATE TABLE "respuesta_diagnostico" (
    "diagnosticoId" INTEGER NOT NULL,
    "preguntaId" INTEGER NOT NULL,
    "opcionId" INTEGER NOT NULL,
    "correcta" BOOLEAN NOT NULL,

    CONSTRAINT "respuesta_diagnostico_pkey" PRIMARY KEY ("diagnosticoId","preguntaId")
);

-- CreateTable
CREATE TABLE "resultado_diagnostico_tema" (
    "diagnosticoId" INTEGER NOT NULL,
    "tema" "TemaFase" NOT NULL,
    "porcentaje" INTEGER NOT NULL,

    CONSTRAINT "resultado_diagnostico_tema_pkey" PRIMARY KEY ("diagnosticoId","tema")
);

-- CreateTable
CREATE TABLE "plan_estudio" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "diagnosticoId" INTEGER NOT NULL,
    "estado" "EstadoPlan" NOT NULL,
    "esPlanMejora" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aceptadoEn" TIMESTAMP(3),

    CONSTRAINT "plan_estudio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividad_plan" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" "TipoActividad" NOT NULL,
    "tema" "TemaFase" NOT NULL,
    "retoId" INTEGER,
    "motivo" TEXT NOT NULL,

    CONSTRAINT "actividad_plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pregunta_banco_tema_activa_idx" ON "pregunta_banco"("tema", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "pregunta_banco_tema_enunciado_key" ON "pregunta_banco"("tema", "enunciado");

-- CreateIndex
CREATE UNIQUE INDEX "opcion_pregunta_preguntaId_orden_key" ON "opcion_pregunta"("preguntaId", "orden");

-- CreateIndex
CREATE INDEX "diagnostico_estudianteId_terminadoEn_idx" ON "diagnostico"("estudianteId", "terminadoEn");

-- CreateIndex
CREATE INDEX "plan_estudio_estudianteId_estado_idx" ON "plan_estudio"("estudianteId", "estado");

-- CreateIndex
CREATE INDEX "actividad_plan_planId_orden_idx" ON "actividad_plan"("planId", "orden");

-- AddForeignKey
ALTER TABLE "opcion_pregunta" ADD CONSTRAINT "opcion_pregunta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "pregunta_banco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostico" ADD CONSTRAINT "diagnostico_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregunta_diagnostico" ADD CONSTRAINT "pregunta_diagnostico_diagnosticoId_fkey" FOREIGN KEY ("diagnosticoId") REFERENCES "diagnostico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregunta_diagnostico" ADD CONSTRAINT "pregunta_diagnostico_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "pregunta_banco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_diagnostico" ADD CONSTRAINT "respuesta_diagnostico_diagnosticoId_fkey" FOREIGN KEY ("diagnosticoId") REFERENCES "diagnostico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_diagnostico" ADD CONSTRAINT "respuesta_diagnostico_opcionId_fkey" FOREIGN KEY ("opcionId") REFERENCES "opcion_pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado_diagnostico_tema" ADD CONSTRAINT "resultado_diagnostico_tema_diagnosticoId_fkey" FOREIGN KEY ("diagnosticoId") REFERENCES "diagnostico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_estudio" ADD CONSTRAINT "plan_estudio_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_estudio" ADD CONSTRAINT "plan_estudio_diagnosticoId_fkey" FOREIGN KEY ("diagnosticoId") REFERENCES "diagnostico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad_plan" ADD CONSTRAINT "actividad_plan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plan_estudio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad_plan" ADD CONSTRAINT "actividad_plan_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
