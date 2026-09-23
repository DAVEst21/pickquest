-- CreateEnum
CREATE TYPE "TemaFase" AS ENUM ('ELICITACION', 'ATRIBUTOS_CALIDAD', 'CODIGO_PRUEBAS');

-- CreateEnum
CREATE TYPE "TipoObjeto" AS ENUM ('CONSUMIBLE');

-- CreateTable
CREATE TABLE "Estudiante" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombreAventurero" TEXT NOT NULL,
    "avatar" TEXT,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "xpTotal" INTEGER NOT NULL DEFAULT 0,
    "qpTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estudiante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RachaEstudio" (
    "estudianteId" INTEGER NOT NULL,
    "diasActuales" INTEGER NOT NULL DEFAULT 0,
    "diasRecord" INTEGER NOT NULL DEFAULT 0,
    "multiplicadorQP" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RachaEstudio_pkey" PRIMARY KEY ("estudianteId")
);

-- CreateTable
CREATE TABLE "Fase" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tema" "TemaFase" NOT NULL,
    "dificultad" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reto" (
    "id" SERIAL NOT NULL,
    "faseId" INTEGER NOT NULL,
    "criteriosAceptacion" TEXT NOT NULL,
    "calificacionMinima" DECIMAL(3,2) NOT NULL,
    "claveRespuestas" JSONB NOT NULL,
    "recompensaXp" INTEGER NOT NULL DEFAULT 0,
    "recompensaQp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentoReto" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "retoId" INTEGER NOT NULL,
    "porcentaje" INTEGER NOT NULL,
    "calificacionEstrellas" INTEGER NOT NULL,
    "xpGanado" INTEGER NOT NULL DEFAULT 0,
    "qpGanado" INTEGER NOT NULL DEFAULT 0,
    "aprobado" BOOLEAN NOT NULL,
    "usoAyuda" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentoReto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsoAyuda" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "retoId" INTEGER NOT NULL,
    "intentoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsoAyuda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objeto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoObjeto" NOT NULL,
    "costoQP" INTEGER NOT NULL,
    "efecto" TEXT NOT NULL,
    "rareza" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventarioObjeto" (
    "estudianteId" INTEGER NOT NULL,
    "objetoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "equipado" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventarioObjeto_pkey" PRIMARY KEY ("estudianteId","objetoId")
);

-- CreateTable
CREATE TABLE "Logro" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "condicionDesbloqueo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Logro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogroEstudiante" (
    "estudianteId" INTEGER NOT NULL,
    "logroId" INTEGER NOT NULL,
    "fechaObtenido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogroEstudiante_pkey" PRIMARY KEY ("estudianteId","logroId")
);

-- CreateTable
CREATE TABLE "HabilidadSDLC" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "categoria" "TemaFase" NOT NULL,
    "nivelAlcanzado" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabilidadSDLC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContenidoApoyo" (
    "id" SERIAL NOT NULL,
    "faseId" INTEGER NOT NULL,
    "contenidoTeorico" TEXT NOT NULL,
    "ejemplos" TEXT NOT NULL,
    "glosario" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContenidoApoyo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Estudiante_email_key" ON "Estudiante"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Estudiante_nombreAventurero_key" ON "Estudiante"("nombreAventurero");

-- CreateIndex
CREATE UNIQUE INDEX "Fase_orden_key" ON "Fase"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "Reto_faseId_key" ON "Reto"("faseId");

-- CreateIndex
CREATE INDEX "IntentoReto_estudianteId_retoId_idx" ON "IntentoReto"("estudianteId", "retoId");

-- CreateIndex
CREATE INDEX "UsoAyuda_estudianteId_retoId_intentoId_idx" ON "UsoAyuda"("estudianteId", "retoId", "intentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Objeto_nombre_key" ON "Objeto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Logro_nombre_key" ON "Logro"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "HabilidadSDLC_estudianteId_categoria_key" ON "HabilidadSDLC"("estudianteId", "categoria");

-- CreateIndex
CREATE INDEX "ContenidoApoyo_faseId_idx" ON "ContenidoApoyo"("faseId");

-- AddForeignKey
ALTER TABLE "RachaEstudio" ADD CONSTRAINT "RachaEstudio_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reto" ADD CONSTRAINT "Reto_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "Fase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentoReto" ADD CONSTRAINT "IntentoReto_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentoReto" ADD CONSTRAINT "IntentoReto_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "Reto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoAyuda" ADD CONSTRAINT "UsoAyuda_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoAyuda" ADD CONSTRAINT "UsoAyuda_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "Reto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoAyuda" ADD CONSTRAINT "UsoAyuda_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "IntentoReto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioObjeto" ADD CONSTRAINT "InventarioObjeto_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioObjeto" ADD CONSTRAINT "InventarioObjeto_objetoId_fkey" FOREIGN KEY ("objetoId") REFERENCES "Objeto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogroEstudiante" ADD CONSTRAINT "LogroEstudiante_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogroEstudiante" ADD CONSTRAINT "LogroEstudiante_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "Logro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabilidadSDLC" ADD CONSTRAINT "HabilidadSDLC_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContenidoApoyo" ADD CONSTRAINT "ContenidoApoyo_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "Fase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restricciones CHECK (escritas a mano: Prisma no las expresa en schema.prisma).
-- (Corrección b) porcentaje 0-100 y calificacionEstrellas 0-3.
ALTER TABLE "IntentoReto" ADD CONSTRAINT "IntentoReto_porcentaje_rango" CHECK ("porcentaje" BETWEEN 0 AND 100);
ALTER TABLE "IntentoReto" ADD CONSTRAINT "IntentoReto_calificacionEstrellas_rango" CHECK ("calificacionEstrellas" BETWEEN 0 AND 3);
ALTER TABLE "IntentoReto" ADD CONSTRAINT "IntentoReto_recompensas_no_negativas" CHECK ("xpGanado" >= 0 AND "qpGanado" >= 0);

-- (Corrección c) calificacionMinima es una fracción 0.0-1.0.
ALTER TABLE "Reto" ADD CONSTRAINT "Reto_calificacionMinima_rango" CHECK ("calificacionMinima" BETWEEN 0 AND 1);
ALTER TABLE "Reto" ADD CONSTRAINT "Reto_recompensas_no_negativas" CHECK ("recompensaXp" >= 0 AND "recompensaQp" >= 0);

ALTER TABLE "InventarioObjeto" ADD CONSTRAINT "InventarioObjeto_cantidad_no_negativa" CHECK ("cantidad" >= 0);
ALTER TABLE "Objeto" ADD CONSTRAINT "Objeto_costoQP_no_negativo" CHECK ("costoQP" >= 0);
ALTER TABLE "HabilidadSDLC" ADD CONSTRAINT "HabilidadSDLC_nivelAlcanzado_no_negativo" CHECK ("nivelAlcanzado" >= 0);
