-- CreateTable
CREATE TABLE "reto_diario" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "dia" DATE NOT NULL,
    "multiplicador" DECIMAL(3,2) NOT NULL,
    "aciertos" INTEGER,
    "xpOtorgada" INTEGER NOT NULL DEFAULT 0,
    "qpOtorgado" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminadoEn" TIMESTAMP(3),

    CONSTRAINT "reto_diario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pregunta_reto_diario" (
    "retoDiarioId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "preguntaId" INTEGER NOT NULL,
    "entregadaEn" TIMESTAMP(3),
    "opcionId" INTEGER,
    "correcta" BOOLEAN,

    CONSTRAINT "pregunta_reto_diario_pkey" PRIMARY KEY ("retoDiarioId","numero")
);

-- CreateIndex
CREATE UNIQUE INDEX "reto_diario_estudianteId_dia_key" ON "reto_diario"("estudianteId", "dia");

-- AddForeignKey
ALTER TABLE "reto_diario" ADD CONSTRAINT "reto_diario_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregunta_reto_diario" ADD CONSTRAINT "pregunta_reto_diario_retoDiarioId_fkey" FOREIGN KEY ("retoDiarioId") REFERENCES "reto_diario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregunta_reto_diario" ADD CONSTRAINT "pregunta_reto_diario_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "pregunta_banco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregunta_reto_diario" ADD CONSTRAINT "pregunta_reto_diario_opcionId_fkey" FOREIGN KEY ("opcionId") REFERENCES "opcion_pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
