-- CreateEnum
CREATE TYPE "TipoPiezaHistoria" AS ENUM ('ROL', 'FUNCIONALIDAD', 'BENEFICIO', 'DADO', 'CUANDO', 'ENTONCES');

-- AlterEnum
ALTER TYPE "TipoPista" ADD VALUE 'DISTRACTORES_RETIRADOS';

-- CreateTable
CREATE TABLE "historia_usuario" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "necesidad" TEXT NOT NULL,

    CONSTRAINT "historia_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pieza_historia" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "tipo" "TipoPiezaHistoria" NOT NULL,
    "texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "pieza_historia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "casilla_historia" (
    "id" SERIAL NOT NULL,
    "historiaId" INTEGER NOT NULL,
    "tipo" "TipoPiezaHistoria" NOT NULL,
    "piezaCorrectaId" INTEGER NOT NULL,

    CONSTRAINT "casilla_historia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuesta_casilla" (
    "intentoId" INTEGER NOT NULL,
    "casillaId" INTEGER NOT NULL,
    "piezaId" INTEGER NOT NULL,

    CONSTRAINT "respuesta_casilla_pkey" PRIMARY KEY ("intentoId","casillaId")
);

-- CreateTable
CREATE TABLE "distractor_retirado" (
    "usoAyudaId" INTEGER NOT NULL,
    "piezaId" INTEGER NOT NULL,

    CONSTRAINT "distractor_retirado_pkey" PRIMARY KEY ("usoAyudaId","piezaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "historia_usuario_retoId_orden_key" ON "historia_usuario"("retoId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "pieza_historia_retoId_orden_key" ON "pieza_historia"("retoId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "casilla_historia_historiaId_tipo_key" ON "casilla_historia"("historiaId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "respuesta_casilla_intentoId_piezaId_key" ON "respuesta_casilla"("intentoId", "piezaId");

-- AddForeignKey
ALTER TABLE "historia_usuario" ADD CONSTRAINT "historia_usuario_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieza_historia" ADD CONSTRAINT "pieza_historia_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casilla_historia" ADD CONSTRAINT "casilla_historia_historiaId_fkey" FOREIGN KEY ("historiaId") REFERENCES "historia_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casilla_historia" ADD CONSTRAINT "casilla_historia_piezaCorrectaId_fkey" FOREIGN KEY ("piezaCorrectaId") REFERENCES "pieza_historia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_casilla" ADD CONSTRAINT "respuesta_casilla_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_casilla" ADD CONSTRAINT "respuesta_casilla_casillaId_fkey" FOREIGN KEY ("casillaId") REFERENCES "casilla_historia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_casilla" ADD CONSTRAINT "respuesta_casilla_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "pieza_historia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distractor_retirado" ADD CONSTRAINT "distractor_retirado_usoAyudaId_fkey" FOREIGN KEY ("usoAyudaId") REFERENCES "uso_ayuda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distractor_retirado" ADD CONSTRAINT "distractor_retirado_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "pieza_historia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Inserción pedagógica de CU-02: preservar el ID y todo el historial de MoSCoW.
UPDATE "reto" AS r SET "orden" = 3
FROM "fase" AS f
WHERE r."faseId" = f.id AND f.tema = 'ELICITACION'
  AND r.mecanica = 'TABLERO_MOSCOW' AND r.orden = 2;
