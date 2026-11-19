-- CreateEnum
CREATE TYPE "Autoevaluacion" AS ENUM ('LO_SABIA', 'DUDE', 'NO_LO_SABIA');

-- CreateTable
CREATE TABLE "material_tema" (
    "faseId" INTEGER NOT NULL,
    "explicacion" TEXT NOT NULL,

    CONSTRAINT "material_tema_pkey" PRIMARY KEY ("faseId")
);

-- CreateTable
CREATE TABLE "ejemplo_tema" (
    "id" SERIAL NOT NULL,
    "faseId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "ejemplo_tema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "termino_glosario" (
    "id" SERIAL NOT NULL,
    "faseId" INTEGER NOT NULL,
    "termino" TEXT NOT NULL,
    "definicion" TEXT NOT NULL,

    CONSTRAINT "termino_glosario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarjeta" (
    "id" SERIAL NOT NULL,
    "faseId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "frente" TEXT NOT NULL,
    "reverso" TEXT NOT NULL,

    CONSTRAINT "tarjeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progreso_tarjeta" (
    "estudianteId" INTEGER NOT NULL,
    "tarjetaId" INTEGER NOT NULL,
    "proximoRepaso" DATE NOT NULL,
    "ultimaAutoeval" "Autoevaluacion" NOT NULL,

    CONSTRAINT "progreso_tarjeta_pkey" PRIMARY KEY ("estudianteId","tarjetaId")
);

-- CreateTable
CREATE TABLE "consulta_tema" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "faseId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consulta_tema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion_repaso" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "faseId" INTEGER NOT NULL,
    "iniciadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminadaEn" TIMESTAMP(3),
    "diaTerminada" DATE,
    "xpOtorgada" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sesion_repaso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarjeta_sesion" (
    "sesionId" INTEGER NOT NULL,
    "tarjetaId" INTEGER NOT NULL,
    "posicion" INTEGER NOT NULL,
    "primeraAutoevaluacion" "Autoevaluacion",
    "autoevaluacion" "Autoevaluacion",
    "completada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tarjeta_sesion_pkey" PRIMARY KEY ("sesionId","tarjetaId")
);

-- CreateTable
CREATE TABLE "dominio_tema" (
    "estudianteId" INTEGER NOT NULL,
    "tema" "TemaFase" NOT NULL,
    "porcentaje" INTEGER NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dominio_tema_pkey" PRIMARY KEY ("estudianteId","tema")
);

-- CreateIndex
CREATE UNIQUE INDEX "ejemplo_tema_faseId_orden_key" ON "ejemplo_tema"("faseId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "termino_glosario_faseId_termino_key" ON "termino_glosario"("faseId", "termino");

-- CreateIndex
CREATE UNIQUE INDEX "tarjeta_faseId_orden_key" ON "tarjeta"("faseId", "orden");

-- CreateIndex
CREATE INDEX "consulta_tema_estudianteId_faseId_idx" ON "consulta_tema"("estudianteId", "faseId");

-- CreateIndex
CREATE INDEX "sesion_repaso_estudianteId_faseId_terminadaEn_idx" ON "sesion_repaso"("estudianteId", "faseId", "terminadaEn");

-- AddForeignKey
ALTER TABLE "material_tema" ADD CONSTRAINT "material_tema_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "fase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ejemplo_tema" ADD CONSTRAINT "ejemplo_tema_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "fase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "termino_glosario" ADD CONSTRAINT "termino_glosario_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "fase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarjeta" ADD CONSTRAINT "tarjeta_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "fase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso_tarjeta" ADD CONSTRAINT "progreso_tarjeta_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso_tarjeta" ADD CONSTRAINT "progreso_tarjeta_tarjetaId_fkey" FOREIGN KEY ("tarjetaId") REFERENCES "tarjeta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta_tema" ADD CONSTRAINT "consulta_tema_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta_tema" ADD CONSTRAINT "consulta_tema_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "fase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_repaso" ADD CONSTRAINT "sesion_repaso_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_repaso" ADD CONSTRAINT "sesion_repaso_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "fase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarjeta_sesion" ADD CONSTRAINT "tarjeta_sesion_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesion_repaso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarjeta_sesion" ADD CONSTRAINT "tarjeta_sesion_tarjetaId_fkey" FOREIGN KEY ("tarjetaId") REFERENCES "tarjeta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dominio_tema" ADD CONSTRAINT "dominio_tema_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;
