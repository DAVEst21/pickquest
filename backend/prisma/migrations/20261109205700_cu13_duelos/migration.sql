-- CreateEnum
CREATE TYPE "EstadoDuelo" AS ENUM ('PENDIENTE', 'ACEPTADO', 'TERMINADO', 'RECHAZADO', 'EXPIRADO');

-- CreateTable
CREATE TABLE "duelo" (
    "id" SERIAL NOT NULL,
    "retadorId" INTEGER NOT NULL,
    "retadoId" INTEGER NOT NULL,
    "tema" "TemaFase" NOT NULL,
    "estado" "EstadoDuelo" NOT NULL DEFAULT 'PENDIENTE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "ganadorId" INTEGER,
    "empate" BOOLEAN NOT NULL DEFAULT false,
    "terminadoEn" TIMESTAMP(3),

    CONSTRAINT "duelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pregunta_duelo" (
    "dueloId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "preguntaId" INTEGER NOT NULL,

    CONSTRAINT "pregunta_duelo_pkey" PRIMARY KEY ("dueloId","numero")
);

-- CreateTable
CREATE TABLE "respuesta_duelo" (
    "dueloId" INTEGER NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "entregadaEn" TIMESTAMP(3) NOT NULL,
    "respondidaEn" TIMESTAMP(3),
    "opcionId" INTEGER,
    "correcta" BOOLEAN NOT NULL DEFAULT false,
    "segundos" DECIMAL(5,2) NOT NULL DEFAULT 20,

    CONSTRAINT "respuesta_duelo_pkey" PRIMARY KEY ("dueloId","estudianteId","numero")
);

-- CreateTable
CREATE TABLE "resultado_duelo" (
    "dueloId" INTEGER NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "porcentaje" INTEGER NOT NULL,
    "segundosTotales" DECIMAL(6,2) NOT NULL,
    "xpOtorgada" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "resultado_duelo_pkey" PRIMARY KEY ("dueloId","estudianteId")
);

-- CreateIndex
CREATE INDEX "duelo_retadorId_estado_idx" ON "duelo"("retadorId", "estado");

-- CreateIndex
CREATE INDEX "duelo_retadoId_estado_idx" ON "duelo"("retadoId", "estado");

-- CreateIndex
CREATE INDEX "duelo_estado_expiraEn_idx" ON "duelo"("estado", "expiraEn");

-- AddForeignKey
ALTER TABLE "duelo" ADD CONSTRAINT "duelo_retadorId_fkey" FOREIGN KEY ("retadorId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duelo" ADD CONSTRAINT "duelo_retadoId_fkey" FOREIGN KEY ("retadoId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duelo" ADD CONSTRAINT "duelo_ganadorId_fkey" FOREIGN KEY ("ganadorId") REFERENCES "estudiante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregunta_duelo" ADD CONSTRAINT "pregunta_duelo_dueloId_fkey" FOREIGN KEY ("dueloId") REFERENCES "duelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregunta_duelo" ADD CONSTRAINT "pregunta_duelo_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "pregunta_banco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_duelo" ADD CONSTRAINT "respuesta_duelo_dueloId_fkey" FOREIGN KEY ("dueloId") REFERENCES "duelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_duelo" ADD CONSTRAINT "respuesta_duelo_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_duelo" ADD CONSTRAINT "respuesta_duelo_opcionId_fkey" FOREIGN KEY ("opcionId") REFERENCES "opcion_pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado_duelo" ADD CONSTRAINT "resultado_duelo_dueloId_fkey" FOREIGN KEY ("dueloId") REFERENCES "duelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado_duelo" ADD CONSTRAINT "resultado_duelo_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;
