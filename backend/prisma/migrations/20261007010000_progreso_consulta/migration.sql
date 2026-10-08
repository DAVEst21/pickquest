-- Ampliación aditiva: conserva las categorías e historiales del sprint 1.
ALTER TYPE "CategoriaHabilidadSDLC" ADD VALUE 'PLANIFICACION';
ALTER TYPE "CategoriaHabilidadSDLC" ADD VALUE 'ANALISIS';
ALTER TYPE "CategoriaHabilidadSDLC" ADD VALUE 'DISENO';
ALTER TYPE "CategoriaHabilidadSDLC" ADD VALUE 'IMPLEMENTACION';
ALTER TYPE "CategoriaHabilidadSDLC" ADD VALUE 'TESTING';
ALTER TYPE "CategoriaHabilidadSDLC" ADD VALUE 'DESPLIEGUE';
ALTER TYPE "CategoriaHabilidadSDLC" ADD VALUE 'MANTENIMIENTO';
CREATE TYPE "RarezaLogro" AS ENUM ('BRONCE', 'PLATA', 'ORO');
ALTER TABLE "logro" ADD COLUMN "rareza" "RarezaLogro";
CREATE TABLE "fase_habilidad" (
  "faseId" INTEGER NOT NULL,
  "categoria" "CategoriaHabilidadSDLC" NOT NULL,
  CONSTRAINT "fase_habilidad_pkey" PRIMARY KEY ("faseId", "categoria"),
  CONSTRAINT "fase_habilidad_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "fase"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
