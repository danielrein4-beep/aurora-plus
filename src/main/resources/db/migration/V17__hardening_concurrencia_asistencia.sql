-- Hardening pre-piloto de asistencia/concurrencia (docs/personal-nomina-contract.md).
-- V13 ya pudo haberse aplicado en alguna base real — nunca se modifica una migración ya
-- ejecutable por Flyway, se agrega una nueva (mismo criterio que el resto del proyecto).
--
-- marcador_entrada_abierta vale empleado_id mientras el registro de asistencia sigue abierto
-- (fecha_hora_salida IS NULL) y NULL en cuanto se cierra. El UNIQUE sobre
-- (tenant_id, marcador_entrada_abierta) es la garantía real a nivel de base de datos contra dos
-- entradas abiertas simultáneas del mismo empleado bajo solicitudes concurrentes: un UNIQUE
-- estándar trata cada NULL como distinto de cualquier otro, así que los registros ya cerrados
-- nunca compiten entre sí. Ver AsistenciaService.registrarEntrada/registrarSalida.
--
-- Orden de pasos obligatorio para no romper una base con datos ya cargados:
-- 1) agregar la columna nullable (no puede fallar, no impone nada todavía);
-- 2) rellenarla SOLO donde hace falta (entradas hoy abiertas) — los registros ya cerrados
--    quedan en NULL a propósito, nunca compiten entre sí bajo el UNIQUE;
-- 3) recién ahí imponer el UNIQUE, cuando los datos existentes ya son compatibles con él.
-- Si dos filas reales ya violaran esta regla (dos entradas abiertas simultáneas del mismo
-- empleado, algo que el código de aplicación nunca debió permitir), el paso 3 fallaría de forma
-- visible en vez de crear el constraint sobre datos inconsistentes — señal correcta para
-- investigar antes de continuar, no algo que este script deba silenciar.

ALTER TABLE personal_registros_asistencia
    ADD COLUMN marcador_entrada_abierta BIGINT;

UPDATE personal_registros_asistencia
    SET marcador_entrada_abierta = empleado_id
    WHERE fecha_hora_salida IS NULL;

ALTER TABLE personal_registros_asistencia
    ADD CONSTRAINT uq_personal_asistencia_entrada_abierta UNIQUE (tenant_id, marcador_entrada_abierta);
