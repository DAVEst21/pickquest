-- AlterTable
ALTER TABLE "estudiante" ADD COLUMN     "xpAlcanzadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "objeto" ADD COLUMN     "tema" "TemaFase";
