package com.auroraplus.core.costeo;

import java.time.LocalDate;

/**
 * Adaptador de costeo por vertical — docs/finance-contract.md §3. Cada implementación
 * envuelve las tablas de SU vertical (no las duplica ni las migra); EmpresaKpiService
 * recibe todas las implementaciones registradas como bean y agrega lo que ya existe.
 *
 * Conectar una vertical nueva es agregar una implementación con @Component — no requiere
 * tocar EmpresaKpiService. Ver la tabla de verticales pendientes en el contrato: solo
 * Horeca y Retail tienen implementación en esta fase.
 */
public interface CosteoProvider {

    /** Identificador canónico de vertical — ver docs/finance-contract.md §1.1 (GANADERIA, HORECA, RETAIL, REPUESTOS, MINERIA, SALUD, MODA). */
    String moduloId();

    /** tenantId siempre resuelto por el llamador desde TenantContext — nunca se recibe del cliente. */
    ResumenVentasCostos resumenPeriodo(Long tenantId, LocalDate desde, LocalDate hasta);
}
