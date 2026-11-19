-- CreateTable
CREATE TABLE "compra_objeto" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "objetoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "qpPagados" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compra_objeto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compra_objeto_estudianteId_creadoEn_idx" ON "compra_objeto"("estudianteId", "creadoEn");

-- AddForeignKey
ALTER TABLE "compra_objeto" ADD CONSTRAINT "compra_objeto_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "estudiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_objeto" ADD CONSTRAINT "compra_objeto_objetoId_fkey" FOREIGN KEY ("objetoId") REFERENCES "objeto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
