-- Sprint 2: modelo relacional por mecánica (CU-01, CU-03, CU-04, CU-06, CU-08).
--
-- Esta migración DESTRUYE el contenido de aprendizaje anterior (el proyecto
-- no tiene usuarios reales): borra ayudas, intentos, retos, contenido de
-- apoyo, fases y habilidades, porque los enums TemaFase y
-- CategoriaHabilidadSDLC cambian de valores y los retos pasan de JSON a
-- tablas por mecánica. El seed vuelve a crear las 3 fases y los 5 retos.
-- Se conservan estudiantes, rachas, objetos e inventario.
DELETE FROM "uso_ayuda";
DELETE FROM "intento_reto";
DELETE FROM "reto";
DELETE FROM "contenido_apoyo";
DELETE FROM "fase";
DELETE FROM "habilidad_sdlc";
-- El progreso se borró: XP, QP y nivel vuelven a su valor inicial.
UPDATE "estudiante" SET "xpTotal" = 0, "qpTotal" = 0, "nivel" = 1;

-- CreateEnum
CREATE TYPE "Mecanica" AS ENUM ('DIALOGO_STAKEHOLDER', 'ARMADO_PIEZAS', 'TABLERO_MOSCOW', 'INSPECCION_SISTEMA', 'SIMULADOR_ESCENARIOS', 'REPARTO_PRESUPUESTO', 'EXPEDIENTE_PROYECTO', 'LINEA_TIEMPO');

-- CreateEnum
CREATE TYPE "EstadoIntento" AS ENUM ('EN_CURSO', 'CALIFICADO');

-- CreateEnum
CREATE TYPE "TecnicaElicitacion" AS ENUM ('ENTREVISTA', 'CUESTIONARIO', 'OBSERVACION', 'TALLER');

-- CreateEnum
CREATE TYPE "ColumnaMoscow" AS ENUM ('MUST', 'SHOULD', 'COULD', 'WONT');

-- CreateEnum
CREATE TYPE "TipoRequerimiento" AS ENUM ('FUNCIONAL', 'NO_FUNCIONAL');

-- CreateEnum
CREATE TYPE "AtributoCalidad" AS ENUM ('ADECUACION_FUNCIONAL', 'EFICIENCIA_DESEMPENO', 'COMPATIBILIDAD', 'USABILIDAD', 'FIABILIDAD', 'SEGURIDAD', 'MANTENIBILIDAD', 'PORTABILIDAD');

-- CreateEnum
CREATE TYPE "TipoElementoPantalla" AS ENUM ('TITULO', 'TEXTO', 'CAMPO', 'BOTON', 'IMAGEN', 'MENSAJE', 'LISTA');

-- CreateEnum
CREATE TYPE "TipoBloque" AS ENUM ('FASE', 'ACTIVIDAD');

-- CreateEnum
CREATE TYPE "ModeloCicloVida" AS ENUM ('CASCADA', 'MODELO_V', 'INCREMENTAL', 'ESPIRAL', 'PROTOTIPOS', 'AGIL');

-- AlterEnum
BEGIN;
CREATE TYPE "CategoriaHabilidadSDLC_new" AS ENUM ('CICLO_VIDA', 'ELICITACION', 'ATRIBUTOS_CALIDAD');
ALTER TABLE "habilidad_sdlc" ALTER COLUMN "categoria" TYPE "CategoriaHabilidadSDLC_new" USING ("categoria"::text::"CategoriaHabilidadSDLC_new");
ALTER TYPE "CategoriaHabilidadSDLC" RENAME TO "CategoriaHabilidadSDLC_old";
ALTER TYPE "CategoriaHabilidadSDLC_new" RENAME TO "CategoriaHabilidadSDLC";
DROP TYPE "CategoriaHabilidadSDLC_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TemaFase_new" AS ENUM ('CICLO_VIDA', 'ELICITACION', 'ATRIBUTOS_CALIDAD');
ALTER TABLE "fase" ALTER COLUMN "tema" TYPE "TemaFase_new" USING ("tema"::text::"TemaFase_new");
ALTER TYPE "TemaFase" RENAME TO "TemaFase_old";
ALTER TYPE "TemaFase_new" RENAME TO "TemaFase";
DROP TYPE "TemaFase_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "uso_ayuda" DROP CONSTRAINT "uso_ayuda_estudianteId_fkey";

-- DropForeignKey
ALTER TABLE "uso_ayuda" DROP CONSTRAINT "uso_ayuda_intentoId_fkey";

-- DropForeignKey
ALTER TABLE "uso_ayuda" DROP CONSTRAINT "uso_ayuda_retoId_fkey";

-- DropIndex
DROP INDEX "intento_reto_estudianteId_retoId_idx";

-- AlterTable
ALTER TABLE "fase" ADD COLUMN     "descripcion" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "intento_reto" DROP COLUMN "respuesta",
ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "calificadoEn" TIMESTAMP(3),
ADD COLUMN     "estado" "EstadoIntento" NOT NULL DEFAULT 'EN_CURSO',
ALTER COLUMN "porcentaje" DROP NOT NULL,
ALTER COLUMN "porcentaje" DROP DEFAULT,
ALTER COLUMN "calificacionEstrellas" DROP NOT NULL,
ALTER COLUMN "calificacionEstrellas" DROP DEFAULT;

-- AlterTable
ALTER TABLE "reto" DROP COLUMN "calificacionMinima",
DROP COLUMN "contenido",
DROP COLUMN "criteriosAceptacion",
DROP COLUMN "modo",
ADD COLUMN     "contexto" TEXT NOT NULL,
ADD COLUMN     "mecanica" "Mecanica" NOT NULL,
ADD COLUMN     "objetivo" TEXT NOT NULL,
ADD COLUMN     "titulo" TEXT NOT NULL,
ALTER COLUMN "recompensaXp" DROP DEFAULT,
ALTER COLUMN "recompensaQp" DROP DEFAULT;

-- AlterTable
ALTER TABLE "uso_ayuda" DROP COLUMN "estudianteId",
DROP COLUMN "retoId",
ALTER COLUMN "intentoId" SET NOT NULL;

-- DropEnum
DROP TYPE "ModoRespuesta";

-- CreateTable
CREATE TABLE "stakeholder" (
    "retoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "retrato" TEXT NOT NULL,
    "tecnicaCorrecta" "TecnicaElicitacion" NOT NULL,
    "turnosMaximos" INTEGER NOT NULL,

    CONSTRAINT "stakeholder_pkey" PRIMARY KEY ("retoId")
);

-- CreateTable
CREATE TABLE "requerimiento_oculto" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "requerimiento_oculto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nodo_dialogo" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "intervencion" TEXT NOT NULL,
    "esInicial" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "nodo_dialogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opcion_dialogo" (
    "id" SERIAL NOT NULL,
    "nodoId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuestaStakeholder" TEXT NOT NULL,
    "productiva" BOOLEAN NOT NULL,
    "requerimientoId" INTEGER,
    "siguienteNodoId" INTEGER,

    CONSTRAINT "opcion_dialogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuesta_dialogo" (
    "intentoId" INTEGER NOT NULL,
    "tecnicaElegida" "TecnicaElicitacion",

    CONSTRAINT "respuesta_dialogo_pkey" PRIMARY KEY ("intentoId")
);

-- CreateTable
CREATE TABLE "turno_dialogo" (
    "intentoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "opcionId" INTEGER NOT NULL,

    CONSTRAINT "turno_dialogo_pkey" PRIMARY KEY ("intentoId","numero")
);

-- CreateTable
CREATE TABLE "tablero_priorizacion" (
    "retoId" INTEGER NOT NULL,
    "capacidad" INTEGER NOT NULL,

    CONSTRAINT "tablero_priorizacion_pkey" PRIMARY KEY ("retoId")
);

-- CreateTable
CREATE TABLE "tarjeta_requerimiento" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL,
    "columnaCorrecta" "ColumnaMoscow" NOT NULL,
    "tipoCorrecto" "TipoRequerimiento" NOT NULL,
    "ordenMustReferencia" INTEGER,

    CONSTRAINT "tarjeta_requerimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuesta_tarjeta" (
    "intentoId" INTEGER NOT NULL,
    "tarjetaId" INTEGER NOT NULL,
    "columna" "ColumnaMoscow",
    "tipo" "TipoRequerimiento",
    "ordenMust" INTEGER,

    CONSTRAINT "respuesta_tarjeta_pkey" PRIMARY KEY ("intentoId","tarjetaId")
);

-- CreateTable
CREATE TABLE "sistema_inspeccion" (
    "retoId" INTEGER NOT NULL,
    "nombreAplicacion" TEXT NOT NULL,
    "maxMarcas" INTEGER NOT NULL,

    CONSTRAINT "sistema_inspeccion_pkey" PRIMARY KEY ("retoId")
);

-- CreateTable
CREATE TABLE "pantalla_simulada" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,

    CONSTRAINT "pantalla_simulada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elemento_pantalla" (
    "id" SERIAL NOT NULL,
    "pantallaId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" "TipoElementoPantalla" NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "contenido" TEXT,
    "variante" TEXT,

    CONSTRAINT "elemento_pantalla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "falla_calidad" (
    "id" SERIAL NOT NULL,
    "elementoId" INTEGER NOT NULL,
    "atributo" "AtributoCalidad" NOT NULL,
    "explicacion" TEXT NOT NULL,

    CONSTRAINT "falla_calidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marca_inspeccion" (
    "intentoId" INTEGER NOT NULL,
    "elementoId" INTEGER NOT NULL,
    "atributo" "AtributoCalidad",

    CONSTRAINT "marca_inspeccion_pkey" PRIMARY KEY ("intentoId","elementoId")
);

-- CreateTable
CREATE TABLE "escenario_presupuesto" (
    "retoId" INTEGER NOT NULL,
    "presupuesto" INTEGER NOT NULL,

    CONSTRAINT "escenario_presupuesto_pkey" PRIMARY KEY ("retoId")
);

-- CreateTable
CREATE TABLE "atributo_escenario" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "atributo" "AtributoCalidad" NOT NULL,
    "valorBase" INTEGER NOT NULL,
    "ganancia" DECIMAL(4,2) NOT NULL,
    "minimoObligatorio" INTEGER,
    "asignacionReferencia" INTEGER NOT NULL,

    CONSTRAINT "atributo_escenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "efecto_cruzado" (
    "origenId" INTEGER NOT NULL,
    "destinoId" INTEGER NOT NULL,
    "factor" DECIMAL(4,2) NOT NULL,

    CONSTRAINT "efecto_cruzado_pkey" PRIMARY KEY ("origenId","destinoId")
);

-- CreateTable
CREATE TABLE "opcion_justificacion" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "correcta" BOOLEAN NOT NULL,

    CONSTRAINT "opcion_justificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignacion_puntos" (
    "intentoId" INTEGER NOT NULL,
    "atributoEscenarioId" INTEGER NOT NULL,
    "puntos" INTEGER NOT NULL,

    CONSTRAINT "asignacion_puntos_pkey" PRIMARY KEY ("intentoId","atributoEscenarioId")
);

-- CreateTable
CREATE TABLE "respuesta_presupuesto" (
    "intentoId" INTEGER NOT NULL,
    "justificacionId" INTEGER,

    CONSTRAINT "respuesta_presupuesto_pkey" PRIMARY KEY ("intentoId")
);

-- CreateTable
CREATE TABLE "plan_proyecto" (
    "retoId" INTEGER NOT NULL,
    "modelo" "ModeloCicloVida" NOT NULL,
    "duracionMaximaSemanas" INTEGER NOT NULL,

    CONSTRAINT "plan_proyecto_pkey" PRIMARY KEY ("retoId")
);

-- CreateTable
CREATE TABLE "bloque_plan" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "tipo" "TipoBloque" NOT NULL,
    "nombre" TEXT NOT NULL,
    "duracionSemanas" INTEGER NOT NULL,
    "inicioReferencia" INTEGER NOT NULL,

    CONSTRAINT "bloque_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependencia_bloque" (
    "bloqueId" INTEGER NOT NULL,
    "requiereId" INTEGER NOT NULL,

    CONSTRAINT "dependencia_bloque_pkey" PRIMARY KEY ("bloqueId","requiereId")
);

-- CreateTable
CREATE TABLE "entregable_plan" (
    "id" SERIAL NOT NULL,
    "retoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "faseCorrectaId" INTEGER NOT NULL,

    CONSTRAINT "entregable_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posicion_bloque" (
    "intentoId" INTEGER NOT NULL,
    "bloqueId" INTEGER NOT NULL,
    "inicioSemana" INTEGER NOT NULL,

    CONSTRAINT "posicion_bloque_pkey" PRIMARY KEY ("intentoId","bloqueId")
);

-- CreateTable
CREATE TABLE "asociacion_entregable" (
    "intentoId" INTEGER NOT NULL,
    "entregableId" INTEGER NOT NULL,
    "faseBloqueId" INTEGER NOT NULL,

    CONSTRAINT "asociacion_entregable_pkey" PRIMARY KEY ("intentoId","entregableId")
);

-- CreateIndex
CREATE UNIQUE INDEX "requerimiento_oculto_retoId_codigo_key" ON "requerimiento_oculto"("retoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "turno_dialogo_intentoId_opcionId_key" ON "turno_dialogo"("intentoId", "opcionId");

-- CreateIndex
CREATE UNIQUE INDEX "falla_calidad_elementoId_key" ON "falla_calidad"("elementoId");

-- CreateIndex
CREATE UNIQUE INDEX "atributo_escenario_retoId_atributo_key" ON "atributo_escenario"("retoId", "atributo");

-- CreateIndex
CREATE INDEX "intento_reto_estudianteId_retoId_estado_idx" ON "intento_reto"("estudianteId", "retoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "reto_faseId_orden_key" ON "reto"("faseId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "uso_ayuda_intentoId_key" ON "uso_ayuda"("intentoId");

-- AddForeignKey
ALTER TABLE "uso_ayuda" ADD CONSTRAINT "uso_ayuda_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stakeholder" ADD CONSTRAINT "stakeholder_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimiento_oculto" ADD CONSTRAINT "requerimiento_oculto_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodo_dialogo" ADD CONSTRAINT "nodo_dialogo_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_dialogo" ADD CONSTRAINT "opcion_dialogo_nodoId_fkey" FOREIGN KEY ("nodoId") REFERENCES "nodo_dialogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_dialogo" ADD CONSTRAINT "opcion_dialogo_requerimientoId_fkey" FOREIGN KEY ("requerimientoId") REFERENCES "requerimiento_oculto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_dialogo" ADD CONSTRAINT "opcion_dialogo_siguienteNodoId_fkey" FOREIGN KEY ("siguienteNodoId") REFERENCES "nodo_dialogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_dialogo" ADD CONSTRAINT "respuesta_dialogo_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_dialogo" ADD CONSTRAINT "turno_dialogo_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_dialogo" ADD CONSTRAINT "turno_dialogo_opcionId_fkey" FOREIGN KEY ("opcionId") REFERENCES "opcion_dialogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tablero_priorizacion" ADD CONSTRAINT "tablero_priorizacion_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarjeta_requerimiento" ADD CONSTRAINT "tarjeta_requerimiento_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_tarjeta" ADD CONSTRAINT "respuesta_tarjeta_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_tarjeta" ADD CONSTRAINT "respuesta_tarjeta_tarjetaId_fkey" FOREIGN KEY ("tarjetaId") REFERENCES "tarjeta_requerimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sistema_inspeccion" ADD CONSTRAINT "sistema_inspeccion_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pantalla_simulada" ADD CONSTRAINT "pantalla_simulada_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elemento_pantalla" ADD CONSTRAINT "elemento_pantalla_pantallaId_fkey" FOREIGN KEY ("pantallaId") REFERENCES "pantalla_simulada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "falla_calidad" ADD CONSTRAINT "falla_calidad_elementoId_fkey" FOREIGN KEY ("elementoId") REFERENCES "elemento_pantalla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marca_inspeccion" ADD CONSTRAINT "marca_inspeccion_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marca_inspeccion" ADD CONSTRAINT "marca_inspeccion_elementoId_fkey" FOREIGN KEY ("elementoId") REFERENCES "elemento_pantalla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escenario_presupuesto" ADD CONSTRAINT "escenario_presupuesto_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atributo_escenario" ADD CONSTRAINT "atributo_escenario_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "efecto_cruzado" ADD CONSTRAINT "efecto_cruzado_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES "atributo_escenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "efecto_cruzado" ADD CONSTRAINT "efecto_cruzado_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "atributo_escenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion_justificacion" ADD CONSTRAINT "opcion_justificacion_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_puntos" ADD CONSTRAINT "asignacion_puntos_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_puntos" ADD CONSTRAINT "asignacion_puntos_atributoEscenarioId_fkey" FOREIGN KEY ("atributoEscenarioId") REFERENCES "atributo_escenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_presupuesto" ADD CONSTRAINT "respuesta_presupuesto_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuesta_presupuesto" ADD CONSTRAINT "respuesta_presupuesto_justificacionId_fkey" FOREIGN KEY ("justificacionId") REFERENCES "opcion_justificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_proyecto" ADD CONSTRAINT "plan_proyecto_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloque_plan" ADD CONSTRAINT "bloque_plan_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencia_bloque" ADD CONSTRAINT "dependencia_bloque_bloqueId_fkey" FOREIGN KEY ("bloqueId") REFERENCES "bloque_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencia_bloque" ADD CONSTRAINT "dependencia_bloque_requiereId_fkey" FOREIGN KEY ("requiereId") REFERENCES "bloque_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregable_plan" ADD CONSTRAINT "entregable_plan_retoId_fkey" FOREIGN KEY ("retoId") REFERENCES "reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregable_plan" ADD CONSTRAINT "entregable_plan_faseCorrectaId_fkey" FOREIGN KEY ("faseCorrectaId") REFERENCES "bloque_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posicion_bloque" ADD CONSTRAINT "posicion_bloque_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posicion_bloque" ADD CONSTRAINT "posicion_bloque_bloqueId_fkey" FOREIGN KEY ("bloqueId") REFERENCES "bloque_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asociacion_entregable" ADD CONSTRAINT "asociacion_entregable_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intento_reto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asociacion_entregable" ADD CONSTRAINT "asociacion_entregable_entregableId_fkey" FOREIGN KEY ("entregableId") REFERENCES "entregable_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asociacion_entregable" ADD CONSTRAINT "asociacion_entregable_faseBloqueId_fkey" FOREIGN KEY ("faseBloqueId") REFERENCES "bloque_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

