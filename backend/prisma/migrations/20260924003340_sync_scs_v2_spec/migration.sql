/*
  Warnings:

  - The values [CONSUMIBLE] on the enum `TipoObjeto` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `ContenidoApoyo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Estudiante` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Fase` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HabilidadSDLC` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IntentoReto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventarioObjeto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Logro` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LogroEstudiante` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Objeto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RachaEstudio` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Reto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UsoAyuda` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ModoRespuesta" AS ENUM ('OPCION_MULTIPLE', 'DRAG_AND_DROP', 'CODIGO', 'COMPUESTO');

-- AlterEnum
BEGIN;
CREATE TYPE "TipoObjeto_new" AS ENUM ('POCION', 'PERGAMINO', 'RELIQUIA');
ALTER TABLE "Objeto" ALTER COLUMN "tipo" TYPE "TipoObjeto_new" USING ("tipo"::text::"TipoObjeto_new");
ALTER TYPE "TipoObjeto" RENAME TO "TipoObjeto_old";
ALTER TYPE "TipoObjeto_new" RENAME TO "TipoObjeto";
DROP TYPE "TipoObjeto_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ContenidoApoyo" DROP CONSTRAINT "ContenidoApoyo_faseId_fkey";

-- DropForeignKey
ALTER TABLE "HabilidadSDLC" DROP CONSTRAINT "HabilidadSDLC_estudianteId_fkey";

-- DropForeignKey
ALTER TABLE "IntentoReto" DROP CONSTRAINT "IntentoReto_estudianteId_fkey";

-- DropForeignKey
ALTER TABLE "IntentoReto" DROP CONSTRAINT "IntentoReto_retoId_fkey";

-- DropForeignKey
ALTER TABLE "InventarioObjeto" DROP CONSTRAINT "InventarioObjeto_estudianteId_fkey";

-- DropForeignKey
ALTER TABLE "InventarioObjeto" DROP CONSTRAINT "InventarioObjeto_objetoId_fkey";

-- DropForeignKey
ALTER TABLE "LogroEstudiante" DROP CONSTRAINT "LogroEstudiante_estudianteId_fkey";

-- DropForeignKey
ALTER TABLE "LogroEstudiante" DROP CONSTRAINT "LogroEstudiante_logroId_fkey";

-- DropForeignKey
ALTER TABLE "RachaEstudio" DROP CONSTRAINT "RachaEstudio_estudianteId_fkey";

-- DropForeignKey
ALTER TABLE "Reto" DROP CONSTRAINT "Reto_faseId_fkey";

-- DropForeignKey
ALTER TABLE "UsoAyuda" DROP CONSTRAINT "UsoAyuda_estudianteId_fkey";

-- DropForeignKey
ALTER TABLE "UsoAyuda" DROP CONSTRAINT "UsoAyuda_intentoId_fkey";

-- DropForeignKey
ALTER TABLE "UsoAyuda" DROP CONSTRAINT "UsoAyuda_retoId_fkey";

-- DropTable
DROP TABLE "ContenidoApoyo";

-- DropTable
DROP TABLE "Estudiante";

-- DropTable
DROP TABLE "Fase";

-- DropTable
DROP TABLE "HabilidadSDLC";

-- DropTable
DROP TABLE "IntentoReto";

-- DropTable
DROP TABLE "InventarioObjeto";

-- DropTable
DROP TABLE "Logro";

-- DropTable
DROP TABLE "LogroEstudiante";

-- DropTable
DROP TABLE "Objeto";

-- DropTable
DROP TABLE "RachaEstudio";

-- DropTable
DROP TABLE "Reto";

-- DropTable
DROP TABLE "UsoAyuda";

-- CreateTable
CREATE TABLE "estudiante" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombreAventurero" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "xpTotal" INTEGER NOT NULL DEFAULT 0,
    "qpTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "estudiante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "racha_estudio" (
    "estudianteId" INTEGER NOT NULL,
    "diasActuales" INTEGER NOT NULL DEFAULT 0,
    "diasRecord" INTEGER NOT NULL DEFAULT 0,
    "multiplicadorQP" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "ultimaActividad" DATE,

    CONSTRAINT "racha_estudio_pkey" PRIMARY KEY ("estudianteId")
);

-- CreateTable
CREATE TABLE "fase" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tema" "TemaFase" NOT NULL,
    "dificultad" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "fase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reto" (
    "id" SERIAL NOT NULL,
    "faseId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "modo" "ModoRespuesta" NOT NULL,
    "contenido" JSONB NOT NULL,
    "criteriosAceptacion" TEXT,
    "calificacionMinima" DECIMAL(5,2) NOT NULL,
    "recompensaXp" INTEGER NOT NULL DEFAULT 0,
    "recompensaQp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contenido_apoyo" (
    "id" SERIAL NOT NULL,
    "faseId" INTEGER NOT NULL,
    "contenidoTeorico" TEXT NOT NULL,
    "ejemplos" TEXT NOT NULL,
    "glosario" TEXT NOT NULL,

    CONSTRAINT "contenido_apoyo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intento_reto" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "retoId" INTEGER NOT NULL,
    "respuesta" JSONB NOT NULL,
    "porcentaje" INTEGER NOT NULL DEFAULT 0,
    "calificacionEstrellas" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "xpGanado" INTEGER NOT NULL DEFAULT 0,
    "qpGanado" INTEGER NOT NULL DEFAULT 0,
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "usoAyuda" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intento_reto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uso_ayuda" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "retoId" INTEGER NOT NULL,
    "objetoId" INTEGER NOT NULL,
    "intentoId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uso_ayuda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objeto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoObjeto" NOT NULL,
    "costoQP" INTEGER NOT NULL,
    "efecto" TEXT NOT NULL,
    "rareza" TEXT NOT NULL,

    CONSTRAINT "objeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_objeto" (
    "estudianteId" INTEGER NOT NULL,
    "objetoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "equipado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "inventario_objeto_pkey" PRIMARY KEY ("estudianteId","objetoId")
);

-- CreateTable
CREATE TABLE "logro" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "condicionDesbloqueo" TEXT NOT NULL,

    CONSTRAINT "logro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logro_estudiante" (
    "estudianteId" INTEGER NOT NULL,
    "logroId" INTEGER NOT NULL,
    "fechaObtenido" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logro_estudiante_pkey" PRIMARY KEY ("estudianteId","logroId")
);

-- CreateTable
CREATE TABLE "habilidad_sdlc" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "categoria" "CategoriaHabilidadSDLC" NOT NULL,
    "nivelAlcanzado" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "habilidad_sdlc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estudiante_email_key" ON "estudiante"("email");

-- CreateIndex
CREATE UNIQUE INDEX "estudiante_nombreAventurero_key" ON "estudiante"("nombreAventurero");

-- CreateIndex
CREATE UNIQUE INDEX "fase_orden_key" ON "fase"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "contenido_apoyo_faseId_key" ON "contenido_apoyo"("faseId");

-- CreateIndex
CREATE UNIQUE INDEX "objeto_nombre_key" ON "objeto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "logro_nombre_key" ON "logro"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "habilidad_sdlc_estudianteId_categoria_key" ON "habilidad_sdlc"("estudianteId", "categoria");

-- AddForeignKey
ALTER TABLE "racha_estudio" ADD CONSTRAINT "racha_estudio_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reto" ADD CONSTRAINT "reto_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "fase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contenido_apoyo" ADD CONSTRAINT "contenido_apoyo_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "fase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intento_reto" ADD CONSTRAINT "intento_reto_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intento_reto" ADD CONSTRAINT "intento_reto_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_objetoId_fkey" FOREIGN KEY ("objetoId") REFERENCES "objeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_objeto" ADD CONSTRAINT "inventario_objeto_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_objeto" ADD CONSTRAINT "inventario_objeto_objetoId_fkey" FOREIGN KEY ("objetoId") REFERENCES "objeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logro_estudiante" ADD CONSTRAINT "logro_estudiante_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logro_estudiante" ADD CONSTRAINT "logro_estudiante_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "logro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habilidad_sdlc" ADD CONSTRAINT "habilidad_sdlc_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;
