-- La pista de la ayuda se guarda de forma relacional (tipo + referencia al
-- elemento de contenido al que apunta) para volver a dibujarla al retomar el
-- intento. tipoPista es nulo solo en ayudas registradas antes de este cambio.

-- CreateEnum
CREATE TYPE "TipoPista" AS ENUM ('OPCION_DIALOGO', 'COLUMNA_TARJETA', 'PANTALLA', 'RESTRICCION', 'DEPENDENCIA');

-- AlterTable
ALTER TABLE "uso_ayuda" ADD COLUMN     "atributoEscenarioId" INTEGER,
ADD COLUMN     "bloqueId" INTEGER,
ADD COLUMN     "opcionId" INTEGER,
ADD COLUMN     "pantallaId" INTEGER,
ADD COLUMN     "requiereId" INTEGER,
ADD COLUMN     "tarjetaId" INTEGER,
ADD COLUMN     "tipoPista" "TipoPista";

-- AddForeignKey
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_opcionId_fkey" FOREIGN KEY ("opcionId") REFERENCES "opcion_dialogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_tarjetaId_fkey" FOREIGN KEY ("tarjetaId") REFERENCES "tarjeta_requerimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_pantallaId_fkey" FOREIGN KEY ("pantallaId") REFERENCES "pantalla_simulada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_atributoEscenarioId_fkey" FOREIGN KEY ("atributoEscenarioId") REFERENCES "atributo_escenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_bloqueId_fkey" FOREIGN KEY ("bloqueId") REFERENCES "bloque_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_requiereId_fkey" FOREIGN KEY ("requiereId") REFERENCES "bloque_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
