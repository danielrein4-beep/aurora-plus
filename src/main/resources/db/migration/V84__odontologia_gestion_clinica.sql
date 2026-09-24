-- V84: Odontologia - gestion de la clinica
-- (V82 y V83 quedan reservadas para renumerar multi_almacen y facturacion_fiscal.)
-- 1. Kits de insumos enlazados a articulos reales del inventario y reconocidos
--    por palabras clave del procedimiento (antes solo por nombre exacto).
-- 2. Cuotas de pago para planes de tratamiento largos.

-- 1. Kits
ALTER TABLE salud_odontologia_kits_procedimientos
    ADD COLUMN IF NOT EXISTS palabras_clave TEXT NOT NULL DEFAULT '';

UPDATE salud_odontologia_kits_procedimientos SET palabras_clave = 'resina,restauracion,obturacion'
WHERE procedimiento_clave = 'RESINA_SIMPLE' AND palabras_clave = '';
UPDATE salud_odontologia_kits_procedimientos SET palabras_clave = 'endodoncia,conducto'
WHERE procedimiento_clave = 'ENDODONCIA_UNIRRADICULAR' AND palabras_clave = '';
UPDATE salud_odontologia_kits_procedimientos SET palabras_clave = 'exodoncia,extraccion'
WHERE procedimiento_clave = 'EXODONCIA_SIMPLE' AND palabras_clave = '';
UPDATE salud_odontologia_kits_procedimientos SET palabras_clave = 'profilaxis,tartrectomia,limpieza'
WHERE procedimiento_clave = 'PROFILAXIS_DESTARTRAJE' AND palabras_clave = '';

-- Detalle de lo que se desconto (o no) del inventario al realizar cada procedimiento.
ALTER TABLE salud_odontologia_plan_items
    ADD COLUMN IF NOT EXISTS detalle_insumos TEXT;

-- 2. Cuotas. Se financia el saldo pendiente al momento de crear las cuotas;
--    pagado_al_financiar_usd guarda lo ya pagado entonces, para que esos abonos
--    previos no se cuenten tambien contra las cuotas.
ALTER TABLE salud_odontologia_planes_tratamiento
    ADD COLUMN IF NOT EXISTS pagado_al_financiar_usd NUMERIC(12, 2);

CREATE TABLE IF NOT EXISTS salud_odontologia_plan_cuotas (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    plan_id BIGINT NOT NULL REFERENCES salud_odontologia_planes_tratamiento(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    monto_usd NUMERIC(12, 2) NOT NULL,
    CONSTRAINT uq_plan_cuota_numero UNIQUE (plan_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_plan_cuotas_tenant_vencimiento
ON salud_odontologia_plan_cuotas (tenant_id, fecha_vencimiento);
