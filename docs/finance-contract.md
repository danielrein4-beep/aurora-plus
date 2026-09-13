# Contrato del Motor Financiero Compartido — Aurora Plus

**Estado:** Propuesta para revisión. Nada de esto está implementado todavía.
**Rama:** `feature/finance-core` (worktree aislado, no toca `feature/astra-hero-redesign` ni el trabajo en curso de Antigravity sobre Horeca).
**No incluido en esta fase:** cambios a `Dashboard.tsx` ni a ningún contrato de API que ya consuma el Hub.

---

## 0. Por qué este documento existe

Le pediste a Claude un diagnóstico honesto de KPIs/libros/costos/balances/facturación/estados de resultado (ver auditoría previa) y la respuesta fue: **no hay un motor contable central**. Lo financiero real vive partido en tres sitios:

1. `core.financiero` — caja multi-moneda simple (`MovimientoCaja`, `Turno`, `TasaCambio`). Funciona, pero es de partida simple, no de partida doble, y **no sabe qué vertical/venta generó cada movimiento**.
2. Lógica de costeo **duplicada y no convergente** en 3 lugares distintos (`Articulo.costoUnitario` en core, `ProductoModa.costoUnitario` en Moda, `RepuestoItem.costoUnitario` en Repuestos), más un cuarto modelo completamente distinto en Horeca (`EscandalloReceta`/`DetalleReceta`, el más sofisticado de todos) y un quinto ad-hoc en Ganadería (`CostosGanaderiaController`, solo compra+sanidad).
3. Un único módulo legado (`tamanacocomercial`, la mina de carbón) que sí tiene algo parecido a un ERP contable real: `Factura` con numeración correlativa, IVA/IGTF/retenciones, y `RentabilidadRestController` con P&L semanal real — pero hardcodeado para ese tenant, no reutilizable.

Este documento define el contrato para construir **un solo motor** que las 6 verticales alimenten de la misma forma, sin obligar a reescribir de golpe Moda/Repuestos/Ganadería (eso sería un proyecto aparte, más grande y más riesgoso que lo que se propone aquí).

---

## 1. Principio rector: capas, no reemplazo

No se propone borrar ni migrar de un tirón `ProductoModa.costoUnitario`, `RepuestoItem.costoUnitario` ni el Kardex propio de Repuestos. Migrar eso de golpe es el tipo de cambio que rompe ventas en producción sin necesidad. En su lugar:

- **Capa 1 — Trazabilidad de origen** (aditiva, bajo riesgo): cada `MovimientoCaja` sabe qué lo generó.
- **Capa 2 — Motor de KPI de empresa** (solo lectura, agrega lo que ya existe): un servicio que consulta las fuentes de datos actuales de cada vertical vía un **adaptador de costeo** común, sin tocar sus tablas.
- **Capa 3 — Libros fiscales** (indexación, no duplicación): tablas nuevas que *referencian* las ventas/compras ya existentes de cada vertical y les agregan los campos fiscales que faltan (folio, RIF, base imponible, IVA), en vez de duplicar los datos operativos.
- **Capa 4 — Contabilidad de partida doble** (la más grande, la más valiosa, la más invasiva): plan de cuentas + asientos automáticos generados desde las capas 1-3.

Cada capa es útil por sí sola y no depende de que la siguiente exista. Se puede parar después de la Capa 2 y ya se resolvió "no tengo KPIs de mi empresa completa" sin haber tocado contabilidad de verdad.

---

## 2. Capa 1 — Trazabilidad de movimientos financieros

### Problema exacto
`MovimientoCaja` (`core/financiero/entities/MovimientoCaja.java`) no tiene ninguna columna que diga de dónde vino. `CobroConsulta` (Salud) sí guarda `movimientoCajaId` hacia `MovimientoCaja`, pero la relación no existe en sentido inverso — desde `MovimientoCaja` no se puede preguntar "¿qué venta generó esto?".

### Cambio propuesto
Agregar a `MovimientoCaja` (migración aditiva, sin romper nada existente):

```java
@Column(name = "modulo_origen")
private String moduloOrigen; // "GANADERIA" | "HORECA" | "SALUD" | "RETAIL" | "MODA" | "REPUESTOS" | "MINERIA" | "MANUAL"

@Column(name = "referencia_tipo")
private String referenciaTipo; // ej. "VentaAnimal" | "CobroConsulta" | "VentaMineral" | "DetalleVentaModa"

@Column(name = "referencia_id")
private Long referenciaId; // FK lógica (no física, porque apunta a tablas distintas según moduloOrigen)
```

No es una FK física (no se puede, apunta a tablas distintas según el módulo) — es una referencia polimórfica simple, igual al patrón que ya usa `DetalleReceta.ingredienteSku` para apuntar a `Articulo` sin FK real. Cada vertical, al llamar a `MotorFinancieroService.registrarMovimientoMultiMoneda(...)`, pasa estos tres datos nuevos (parámetros opcionales, con default `null`/`"MANUAL"` para no romper llamadas existentes).

### Por qué primero esto
Sin esto, la Capa 2 (KPI de empresa) no puede saber "¿cuánto de mi caja de hoy vino de Ganadería vs. de Horeca?" — tendría que adivinar por `concepto` (texto libre), que es fragil.

---

## 3. Capa 2 — Motor de KPI de empresa

### Problema exacto
Cada vertical calcula "su" rentabilidad a su manera (o no la calcula). No existe `GET /api/empresa/kpis` que sume Ganadería + Horeca + Retail + Moda + Repuestos + Minería + Salud de un tenant en un solo número de "ventas totales del mes" o "utilidad neta".

### Diseño: adaptador de costeo, no migración de datos

```java
package com.auroraplus.core.costeo;

public interface CosteoProvider {
    String moduloId(); // "GANADERIA", "HORECA", "RETAIL", "MODA", "REPUESTOS", "MINERIA", "SALUD"
    ResumenVentasCostos resumenPeriodo(Long tenantId, LocalDate desde, LocalDate hasta);
}

public record ResumenVentasCostos(
    BigDecimal ventasBrutas,
    BigDecimal costoVentas,      // COGS del período, calculado como cada vertical ya sabe calcularlo
    BigDecimal gastosOperativos, // si el módulo los distingue (ej. GastoMinero); si no, BigDecimal.ZERO
    String moneda
) {}
```

Cada vertical implementa **un solo método** sobre lo que YA tiene:
- `GanaderiaCosteoProvider`: envuelve `CostosGanaderiaController`/`GanaderiaVentaService` existentes.
- `HorecaCosteoProvider`: envuelve `EscandalloService` (ya calcula costo real por venta).
- `RetailCosteoProvider`: suma `ItemVentaRetail.costoUnitario` (ya congelado en la venta — el único módulo que ya lo hace bien).
- `ModaCosteoProvider`: usa `ProductoModa.costoUnitario` actual como aproximación (con nota de que el margen histórico no es exacto — ver Capa 1.5 abajo).
- `RepuestosCosteoProvider`: envuelve `RepuestoItem`/`MovimientoRepuesto`.
- `MineriaCosteoProvider`: suma `VentaMineral` - `GastoMinero` (sin costo de producción detallado todavía, igual que hoy).
- `SaludCosteoProvider`: solo ventas (`CobroConsulta.montoTotal`), costo en `ZERO` hasta que exista costeo de insumos por consulta (gap ya documentado, fuera de alcance de esta fase).

### Nuevo endpoint

```
GET /api/empresa/kpis?tenantId=&desde=&hasta=&moneda=USD
```

```json
{
  "periodo": { "desde": "2026-09-01", "hasta": "2026-09-30" },
  "moneda": "USD",
  "consolidado": {
    "ventasBrutas": 18420.50,
    "costoVentas": 9200.00,
    "margenBruto": 9220.50,
    "margenBrutoPct": 50.05,
    "gastosOperativos": 2100.00,
    "utilidadNeta": 7120.50
  },
  "porModulo": [
    { "modulo": "GANADERIA", "ventasBrutas": 5200.00, "costoVentas": 3100.00, "margenBruto": 2100.00 },
    { "modulo": "HORECA", "ventasBrutas": 8900.50, "costoVentas": 4200.00, "margenBruto": 4700.50 }
  ],
  "cajaYFlujo": {
    "montoEsperadoEnCaja": 12400.00,
    "cxcPendiente": 1800.00,
    "cxpPendiente": 950.00
  }
}
```

`cajaYFlujo` se llena **reusando** `TesoreriaController` / `resumen-periodo-abierto` y `listarMovimientos(tipo=CXC/CXP)` ya existentes — no se duplica esa lógica, se agrega como sub-objeto del nuevo endpoint.

**Este endpoint es nuevo y aditivo.** No reemplaza `/api/financiero/tesoreria/resumen-periodo-abierto` ni `/api/financiero/movimientos` — el Hub sigue funcionando exactamente igual hasta que alguien decida conectarlo al nuevo endpoint (fuera de alcance de esta fase, `Dashboard.tsx` no se toca).

### Capa 1.5 — nota sobre Moda
`DetalleVentaModa` no congela `costoUnitario` al vender (a diferencia de `ItemVentaRetail`). Esto significa que el margen histórico de ventas pasadas de Moda, calculado por `ModaCosteoProvider`, es una **aproximación con el costo actual**, no el costo real del momento de la venta. Se documenta como limitación conocida; el fix real (agregar columna `costoUnitario` a `DetalleVentaModa`, igual que Retail) es una migración de una línea, se puede hacer en esta misma fase si el usuario lo aprueba — **queda como pregunta abierta en la sección 8**.

---

## 4. Capa 3 — Libro de compras y libro de ventas (fiscal)

### Problema exacto
Cada vertical ya registra sus ventas y compras operativas (`VentaAnimal`, `DetalleVentaModa`, `CompraRepuesto`, etc.), pero ninguna tiene folio correlativo, período fiscal, ni desglose de base imponible / crédito-débito fiscal de IVA — lo que un libro de compras/ventas formal exige.

### Diseño: tabla índice, no tabla espejo

```java
@Entity @Table(name = "libro_ventas_fiscal")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class AsientoLibroVenta {
    Long id;
    Long tenantId;
    Integer folio;              // correlativo por tenant, se asigna al crear (no reutilizable ni editable)
    LocalDate fecha;
    String moduloOrigen;        // igual patrón que Capa 1
    String referenciaTipo;
    Long referenciaId;
    String rifCompradorOpcional; // null si no lo dio (RIF sigue siendo opcional, decisión ya tomada antes)
    BigDecimal baseImponible;
    BigDecimal montoIva;        // 0 si no aplica (igual que hoy con las notas de entrega sin factura fiscal)
    BigDecimal montoTotal;
    String moneda;
}
```

Estructura simétrica para `AsientoLibroCompra`. **No se duplica el detalle de items** — el libro apunta a la venta/compra real vía `referenciaTipo`+`referenciaId`; si alguien necesita el detalle línea por línea, lo consulta en la tabla original de la vertical.

### Cuándo se crea un folio
Un `AsientoLibroVenta` se crea automáticamente cuando cualquier vertical registra una venta **con RIF y razón social cargados** en la ficha fiscal del tenant (`LicenciaTenant.rif`/`razonSocial`, ya existen). Si el tenant no llenó esos datos opcionales, la venta se registra igual (como hoy) pero no genera folio — porque un libro de ventas sin RIF del emisor no tiene sentido fiscal. Esto es consistente con la decisión ya tomada de que el RIF es opcional en todo el sistema.

### Endpoints nuevos
```
GET /api/contabilidad/libro-ventas?tenantId=&desde=&hasta=&formato=json|pdf
GET /api/contabilidad/libro-compras?tenantId=&desde=&hasta=&formato=json|pdf
```

---

## 5. Capa 4 — Contabilidad de partida doble (la fase grande)

### Modelo mínimo viable
```
PlanCuenta       — catálogo de cuentas (código, nombre, tipo: ACTIVO/PASIVO/PATRIMONIO/INGRESO/GASTO, cuentaPadre para jerarquía)
Asiento          — cabecera (fecha, concepto, moduloOrigen/referenciaId igual que Capa 1, estado BORRADOR/CONFIRMADO)
AsientoLinea     — detalle (cuenta, debe, haber) — la suma de debe = suma de haber, validado al confirmar
```

### Automatización — el punto que hace esto usable sin ser contador
El usuario de Aurora (dueño de finca/restaurante/tienda) **no debe tener que crear asientos a mano**. Se propone un motor de "reglas de asiento automático" por tipo de evento:

| Evento | Asiento automático |
|---|---|
| Venta al contado (cualquier vertical) | Debe: Caja/Banco · Haber: Ventas |
| Venta a crédito (CXC) | Debe: Cuentas por Cobrar · Haber: Ventas |
| Registro de costo de venta (desde `CosteoProvider`) | Debe: Costo de Ventas · Haber: Inventario |
| Compra a proveedor | Debe: Inventario · Haber: Cuentas por Pagar / Caja |
| Gasto operativo (`GastoMinero`, gasto administrativo Tamanaco, etc.) | Debe: Gasto correspondiente · Haber: Caja |

Esto se dispara desde el mismo punto donde ya se llama `MotorFinancieroService.registrarMovimientoMultiMoneda` (Capa 1) — un solo hook, no hay que tocar cada controller de venta de cada vertical.

### Reportes (calculados, no almacenados)
```
GET /api/contabilidad/balance-general?tenantId=&fecha=
GET /api/contabilidad/estado-resultado?tenantId=&desde=&hasta=
```
Ambos son consultas de agregación sobre `AsientoLinea` agrupadas por `PlanCuenta.tipo` — no son tablas nuevas, son reportes.

**Esta capa es significativamente más grande que las anteriores** y toca la forma en que CADA venta/compra/gasto del sistema se registra. Se recomienda explícitamente no arrancarla hasta tener las Capas 1-3 en producción y validadas.

---

## 6. Multi-tenant — regla no negociable

Toda entidad nueva de este documento lleva:
```java
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
```
más columna `tenant_id NOT NULL`. `TenantInterceptor` + `TenantFilterAspect` ya activan el filtro automáticamente en cualquier repositorio (`core/config/TenantFilterAspect.java`, se ejecuta `@Before` de todo `com.auroraplus..repositories.*`) — no hace falta código adicional por controlador, es la razón por la que ese aspecto existe.

---

## 7. Mapa de archivos propuesto (nada de esto se crea todavía)

### Backend — nuevo paquete `core.costeo` (Capa 2)
```
src/main/java/com/auroraplus/core/costeo/CosteoProvider.java
src/main/java/com/auroraplus/core/costeo/ResumenVentasCostos.java
src/main/java/com/auroraplus/core/costeo/impl/GanaderiaCosteoProvider.java
src/main/java/com/auroraplus/core/costeo/impl/HorecaCosteoProvider.java
src/main/java/com/auroraplus/core/costeo/impl/RetailCosteoProvider.java
src/main/java/com/auroraplus/core/costeo/impl/ModaCosteoProvider.java
src/main/java/com/auroraplus/core/costeo/impl/RepuestosCosteoProvider.java
src/main/java/com/auroraplus/core/costeo/impl/MineriaCosteoProvider.java
src/main/java/com/auroraplus/core/costeo/impl/SaludCosteoProvider.java
```

### Backend — nuevo paquete `core.kpi` (Capa 2)
```
src/main/java/com/auroraplus/core/kpi/controllers/EmpresaKpiController.java
src/main/java/com/auroraplus/core/kpi/services/EmpresaKpiService.java
src/main/java/com/auroraplus/core/kpi/dto/EmpresaKpiDTO.java
```

### Backend — cambios aditivos a `core.financiero` (Capa 1)
```
src/main/java/com/auroraplus/core/financiero/entities/MovimientoCaja.java   (agregar 3 columnas)
src/main/java/com/auroraplus/core/financiero/services/MotorFinancieroService.java  (agregar parámetros opcionales)
src/main/resources/db/migration/V##__movimiento_caja_origen.sql
```

### Backend — nuevo paquete `core.contabilidad` (Capas 3 y 4)
```
src/main/java/com/auroraplus/core/contabilidad/entities/AsientoLibroVenta.java
src/main/java/com/auroraplus/core/contabilidad/entities/AsientoLibroCompra.java
src/main/java/com/auroraplus/core/contabilidad/entities/PlanCuenta.java
src/main/java/com/auroraplus/core/contabilidad/entities/Asiento.java
src/main/java/com/auroraplus/core/contabilidad/entities/AsientoLinea.java
src/main/java/com/auroraplus/core/contabilidad/services/LibroFiscalService.java
src/main/java/com/auroraplus/core/contabilidad/services/AsientoAutomaticoService.java
src/main/java/com/auroraplus/core/contabilidad/services/EstadosFinancierosService.java
src/main/java/com/auroraplus/core/contabilidad/controllers/LibroComprasController.java
src/main/java/com/auroraplus/core/contabilidad/controllers/LibroVentasController.java
src/main/java/com/auroraplus/core/contabilidad/controllers/PlanCuentaController.java
src/main/java/com/auroraplus/core/contabilidad/controllers/EstadosFinancierosController.java
src/main/resources/db/migration/V##__plan_cuentas_y_asientos.sql
src/main/resources/db/migration/V##__libros_fiscales.sql
```

### Frontend — nada en esta fase
No se propone ningún archivo de frontend todavía. `Dashboard.tsx` no se toca (instrucción explícita). Cuando se apruebe conectar el Hub al nuevo `/api/empresa/kpis`, eso es una tarea aparte y pequeña (una función nueva en `api.ts` + un tab nuevo en el Hub) que se planifica después de que el backend de la Capa 2 esté probado.

---

## 8. Preguntas abiertas para la revisión conjunta

1. **¿Migramos `DetalleVentaModa` para que congele `costoUnitario`** (como ya hace Retail) dentro de esta misma fase, ya que es un cambio de una columna, o lo dejamos como limitación documentada de la Capa 2?
2. **¿Orden de las verticales para conectar `CosteoProvider`?** Se recomienda empezar por Horeca y Retail (ya tienen costeo real/congelado) para tener el KPI de empresa funcionando rápido con datos confiables, y dejar Ganadería/Moda/Repuestos/Minería/Salud para una segunda pasada.
3. **¿La Capa 4 (contabilidad de partida doble) es un objetivo real del producto,** o el KPI de empresa (Capa 2) + libros fiscales (Capa 3) ya resuelven lo que un cliente típico va a pedir? Es la parte más cara de construir y la que más mantenimiento pide después (cualquier bug en las reglas de asiento automático descuadra un balance).
4. **¿RIF opcional en libro de ventas es aceptable fiscalmente para tu mercado**, o en la práctica un libro de ventas sin RIF del tenant no le sirve a nadie y deberíamos exigirlo antes de activar la Capa 3 para ese tenant?
