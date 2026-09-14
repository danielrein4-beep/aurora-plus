# Contrato del Motor Financiero Compartido — Aurora Plus

**Estado:** Aprobado para Capa 1 + Capa 2 parcial (Horeca, Retail y Repuestos). La contabilidad interna queda en el roadmap, sin implementar.
**Rama:** `feature/finance-core` (worktree aislado, no toca `feature/astra-hero-redesign` ni el trabajo en curso de Antigravity sobre Horeca).
**No incluido en esta fase:** cambios a `Dashboard.tsx`, contabilidad de partida doble y emisión fiscal.

## Changelog de esta revisión (respuesta a la ronda de observaciones)

1. **`DetalleVentaModa` sí se migra en esta fase** — columna `costo_unitario` nullable, se congela solo en ventas nuevas, sin inventar costos para el histórico. Ver §3.1.
2. **Se conectan Horeca, Retail y Repuestos.** Horeca/Retail aportan costo congelado; Repuestos aporta ventas reales desde su kardex, pero cobertura de costo 0% hasta que el movimiento congele el costo histórico.
3. **Partida doble permanece en el roadmap, no se construye ahora.** Primero se valida trazabilidad + KPI con datos reales.
4. **Alcance estrictamente no fiscal:** Aurora Plus puede consolidar notas de entrega y documentos de venta no fiscales con referencia interna, pero no genera facturas fiscales, folios fiscales, libros fiscales ni declaraciones tributarias.
5. **Tenant nunca viaje libre en la URL/query/body.** Todo endpoint nuevo de este contrato saca el tenant de `TenantContext.getCurrentTenant()` (ya resuelto por `TenantInterceptor` desde el JWT verificado — el propio código ya tiene el comentario "YA NO confía en el header X-Tenant-ID que antes el cliente podía mandar con cualquier valor"). Se corrigieron los ejemplos de endpoint de este documento, que originalmente sí aceptaban `?tenantId=` — eso fue un error de esta propuesta, no una práctica del código real. Ver §3.3.
6. **Consolidación de monedas:** no hace falta diseñar nada nuevo — `MovimientoCaja` YA guarda `monto`/`moneda` (lo que físicamente entró, en su moneda real) y `montoEquivalenteBase`/`monedaBaseEquivalente`/`tasaAplicada` (el equivalente congelado con la tasa vigente AL MOMENTO del movimiento, ver `MotorFinancieroService.registrarMovimientoMultiMoneda`). El contrato solo agrega la regla explícita: **ningún reporte de este motor puede reconvertir un movimiento histórico con la tasa de hoy** — siempre se lee `montoEquivalenteBase`/`tasaAplicada` ya guardados, nunca se vuelve a llamar `convertirMoneda` sobre datos pasados. Ver §2.1.
7. **"Utilidad neta" se renombra a "resultado estimado"** en todo el motor de KPI mientras no todos los proveedores tengan costo completo, y cada respuesta trae `cobertura` por vertical (qué % de las ventas de ese módulo tienen costo real conocido, no aproximado ni en cero por defecto). Ver §3.2.
8. **Catálogo de verticales corregido** — el borrador anterior mezclaba 6 verticales públicas con 7 proveedores de costeo. Ver §1.1 para la evidencia y la resolución.
9. **Trazabilidad con porcentaje explícito** de movimientos identificados vs. `MANUAL`/sin referencia — nunca se atribuye un movimiento sin origen a ninguna vertical. Ver §2.2.
10. **Pruebas nuevas**: aislamiento entre tenants, concurrencia, redondeo monetario, períodos sin datos. Ver §8.
11. **Cierre de revisión Codex:** el KPI queda restringido a roles administrativos, solo ejecuta proveedores correspondientes a módulos activos del tenant, excluye `MODA` de la cobertura pública, usa rangos `[desde, hasta + 1 día)` y devuelve únicamente la moneda base congelada por las operaciones; no reconvierte históricos con la tasa vigente.

---

## 0. Por qué este documento existe

Le pediste a Claude un diagnóstico honesto de KPIs/libros/costos/balances/facturación/estados de resultado (ver auditoría previa) y la respuesta fue: **no hay un motor contable central**. Lo financiero real vive partido en tres sitios:

1. `core.financiero` — caja multi-moneda simple (`MovimientoCaja`, `Turno`, `TasaCambio`). Funciona, pero es de partida simple, no de partida doble, y **no sabe qué vertical/venta generó cada movimiento**.
2. Lógica de costeo **duplicada y no convergente** en 3 lugares distintos (`Articulo.costoUnitario` en core, `ProductoModa.costoUnitario` en Moda, `RepuestoItem.costoUnitario` en Repuestos), más un cuarto modelo completamente distinto en Horeca (`EscandalloReceta`/`DetalleReceta`, el más sofisticado de todos) y un quinto ad-hoc en Ganadería (`CostosGanaderiaController`, solo compra+sanidad).
3. Un único módulo legado (`tamanacocomercial`, la mina de carbón) contiene estructuras tributarias hardcodeadas para ese tenant. Se documentan como evidencia histórica, pero **no se reutilizan ni forman parte del motor genérico**.

Este documento define el contrato para construir **un solo motor** que las 6 verticales alimenten de la misma forma, sin obligar a reescribir de golpe Moda/Repuestos/Ganadería (eso sería un proyecto aparte, más grande y más riesgoso que lo que se propone aquí).

---

## 1. Principio rector: capas, no reemplazo

No se propone borrar ni migrar de un tirón `ProductoModa.costoUnitario`, `RepuestoItem.costoUnitario` ni el Kardex propio de Repuestos. Migrar eso de golpe es el tipo de cambio que rompe ventas en producción sin necesidad. En su lugar:

- **Capa 1 — Trazabilidad de origen** (aditiva, bajo riesgo): cada `MovimientoCaja` sabe qué lo generó.
- **Capa 2 — Motor de KPI de empresa** (solo lectura, agrega lo que ya existe): un servicio que consulta las fuentes de datos actuales de cada vertical vía un **adaptador de costeo** común, sin tocar sus tablas.
- **Capa 3 — Registro comercial no fiscal**: índice de notas de entrega y documentos de venta no fiscales, siempre con referencia interna y aviso visible `DOCUMENTO NO FISCAL`.
- **Capa 4 — Contabilidad interna de partida doble**: plan de cuentas + asientos automáticos para gestión interna; no convierte los documentos comerciales en comprobantes fiscales.

Cada capa es útil por sí sola y no depende de que la siguiente exista. Se puede parar después de la Capa 2 y ya se resolvió "no tengo KPIs de mi empresa completa" sin haber tocado contabilidad de verdad.

---

## 1.1 Catálogo de verticales — corrección

El borrador anterior decía "6 verticales" pero enumeraba 7 `CosteoProvider` (GANADERIA, HORECA, RETAIL, MODA, REPUESTOS, MINERIA, SALUD). Evidencia real del código:

- La página pública `Industrias.tsx` muestra exactamente 6 tarjetas: **Clínicas Médicas, Ferretería, Minería, Restaurantes, Control de Fincas, Retail.**
- `LicenciaService.NIVEL_REQUERIDO_POR_MODULO` (backend, fuente de verdad de qué vertical puede contratar un tenant) define estos identificadores de módulo: `minero`, `horeca`, `repuestos`, `farmacia`, `ferreteria`, `moda`, `ganaderia`, `salud`, `tamanaco-comercial`.
- `moda` **no aparece en la página pública** — es una vertical real, con módulo Java completo (`modules/moda`, boutique: variantes, gift cards, fidelización), pero no forma parte de "las seis" que el negocio comercializa hoy. Es la 7ª vertical que colaba el borrador anterior.
- `retail` (paquete `modules/retail`, tabla `items_venta_retail`) y `repuestos` (paquete `modules/repuestos`, tabla `movimientos_repuesto`) son **dos implementaciones de backend genuinamente separadas y sin solape de tablas** — no hay riesgo de sumar la misma venta dos veces si cada `CosteoProvider` lee solo su propia tabla (ver regla explícita en §3).

**Resolución — identificadores canónicos de vertical para este motor (los mismos 6 de la página pública):**

| ID canónico | Nombre público | Paquete(s) backend |
|---|---|---|
| `GANADERIA` | Control de Fincas | `modules/ganaderia` |
| `HORECA` | Restaurantes | `modules/horeca` |
| `RETAIL` | Retail | `modules/retail` (también sirve a `farmacia`) |
| `REPUESTOS` | Ferretería | `modules/repuestos` (licencias `repuestos`/`ferreteria`) |
| `MINERIA` | Minería | `modules/minero` |
| `SALUD` | Clínicas Médicas | `modules/salud` |

`MODA` se documenta aparte como **vertical adicional, no pública todavía**: su `CosteoProvider` se diseña con la misma interfaz, pero no se cuenta entre "las seis" en ningún reporte agregado hasta que el negocio decida lanzarla públicamente. `tamanaco-comercial` no entra en este catálogo — es el módulo legado de un solo tenant, fuera de alcance de este motor genérico.

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

### Alcance real de esta fase (importante)
Se agregan las 3 columnas a `MovimientoCaja` y un nuevo overload de `MotorFinancieroService.registrarMovimientoMultiMoneda`/`registrarMovimientoEnMoneda` que las acepta — **pero no se modifican los ~12 call-sites existentes** en Ganadería/Horeca/Retail/Moda/Salud/Minería que ya llaman a estos métodos hoy. Eso es intencional: tocar cada punto de cobro de cada vertical es un cambio de mucha más superficie que "agregar 3 columnas aditivas", y no fue lo aprobado en este mensaje. El mecanismo queda construido y probado (§8); conectar cada vertical (empezando por Horeca y Retail, que son las que se conectan en Capa 2) es el siguiente paso, no parte de este.

**Consecuencia honesta:** hasta que se conecten los call-sites, el `%` de trazabilidad de `/api/empresa/kpis` (§2.2) va a mostrar un número bajo — eso es correcto, no un bug. Es preferible reportar "10% trazado" real a fingir 100%.

### 2.1 Regla de consolidación de monedas — no hay que construir nada nuevo

`MovimientoCaja` ya resuelve esto correctamente desde antes de este documento:

- `monto` / `moneda` — lo que **físicamente entró a la caja**, en la moneda real en que entró (USD, VES, COP). Nunca se toca.
- `montoEquivalenteBase` / `monedaBaseEquivalente` / `tasaAplicada` — el equivalente en la moneda base del negocio, calculado **una sola vez, con la tasa vigente en el momento del movimiento** (`MotorFinancieroService.registrarMovimientoMultiMoneda`, línea que hace `tasaAplicada = montoEnMonedaCobro.divide(montoBase, 6, HALF_UP)`). Quedan `null` si el movimiento ya estaba en la moneda base.

**Regla que sí agrega este contrato, porque no estaba escrita en ningún lado:** todo reporte construido sobre esta capa (KPI de empresa, registro comercial no fiscal y contabilidad interna futura) **lee `montoEquivalenteBase`/`tasaAplicada` ya guardados — nunca vuelve a llamar `convertirMoneda(...)` con la tasa de hoy sobre un movimiento pasado.** Reconvertir históricos con la tasa actual falsificaría cualquier comparación entre períodos (un mes "creció" solo porque el bolívar se devaluó, no porque vendió más). `EmpresaKpiService` (§3) sigue esta regla explícitamente.

### 2.2 Trazabilidad con porcentaje explícito

`moduloOrigen` puede ser `null` (movimiento legado, antes de esta migración) o `"MANUAL"` (un ingreso/egreso de caja sin vertical asociada, ej. un retiro del dueño). Ninguno de los dos casos se atribuye a ninguna vertical en ningún reporte — ni por defecto, ni por heurística sobre el texto de `concepto`. `EmpresaKpiService` reporta:

```json
"trazabilidad": {
  "movimientosTotales": 340,
  "movimientosIdentificados": 210,
  "porcentajeIdentificado": 61.8
}
```

Este número es informativo sobre la calidad del dato de caja — no bloquea ni ajusta el cálculo de `ventasBrutas`/`costoVentas` por vertical, que se lee directo de las tablas de cada módulo (Horeca: `ItemComanda`+`Comanda`; Retail: `ItemVentaRetail`+`VentaRetail`), no de `MovimientoCaja`. Son dos señales distintas a propósito: una mide "qué tan buena es mi vertical de costeo" (cobertura, §3.2), la otra mide "qué tan bien etiquetado está mi flujo de caja" (trazabilidad).

---

## 3. Capa 2 — Motor de KPI de empresa

### Problema exacto
Cada vertical calcula "su" rentabilidad a su manera (o no la calcula). No existe `GET /api/empresa/kpis` que sume Ganadería + Horeca + Retail + Repuestos + Minería + Salud de un tenant en un solo número de "ventas totales del mes".

### Diseño: adaptador de costeo, no migración de datos

```java
package com.auroraplus.core.costeo;

public interface CosteoProvider {
    String moduloId(); // "GANADERIA", "HORECA", "RETAIL", "REPUESTOS", "MINERIA", "SALUD", "MODA"
    ResumenVentasCostos resumenPeriodo(Long tenantId, LocalDate desde, LocalDate hasta);
}

public record ResumenVentasCostos(
    BigDecimal ventasBrutas,
    BigDecimal costoVentas,        // COGS del período, solo la porción con costo real conocido
    BigDecimal gastosOperativos,   // si el módulo los distingue (ej. GastoMinero); si no, BigDecimal.ZERO
    BigDecimal ventasConCostoConocido, // subconjunto de ventasBrutas cuyo costoUnitario NO es null/aproximado
    String moneda
) {
    // cobertura = ventasConCostoConocido / ventasBrutas — ver §3.2. Vive acá y no en el DTO de
    // salida porque cada CosteoProvider es quien sabe de verdad qué parte de SU venta tiene costo real.
}
```

Esta fase **implementa de verdad** dos proveedores (los que ya tienen costo congelado en la venta, sin aproximar nada):

- `HorecaCosteoProvider`: lee `ItemComanda` (join `Comanda`, `estado = PAGADA`, por `fechaCierre`) — `costoUnitario` ya está congelado por venta (`EscandalloService.recalcularCosto` lo fija al vender). Items sin escandallo (cargos manuales tipo "Cover") tienen `costoUnitario = null`: cuentan en `ventasBrutas` pero no en `ventasConCostoConocido` — la cobertura de Horeca normalmente no será 100% por esto, y eso es correcto reportarlo así, no forzarlo a cero.
- `RetailCosteoProvider`: lee `ItemVentaRetail` (join `VentaRetail`, por `fechaRegistro`) — `costoUnitario` es `NOT NULL` en esa tabla (siempre se congela), así que su cobertura es 100% por diseño de esquema.
- `RepuestosCosteoProvider`: lee ventas de `MovimientoRepuesto` por `fechaRegistro`. Suma el `total` real de venta, pero reporta costo y cobertura en 0% porque esa tabla todavía no congela el costo unitario histórico; nunca usa el costo actual del catálogo para reconstruir el pasado.

Las demás verticales quedan con la **interfaz diseñada pero sin bean registrado todavía** (no se crean implementaciones vacías que nadie usa):

| Vertical | Por qué no se conecta aún |
|---|---|
| `GANADERIA` | Costeo hoy vive en `CostosGanaderiaController` (solo compra+sanidad, no ventas) — falta decidir cómo mapea a `ResumenVentasCostos` antes de escribir el adaptador. |
| `REPUESTOS` | Conectado parcialmente: ventas reales desde `MovimientoRepuesto`; costo histórico pendiente, cobertura 0%. |
| `MINERIA` | Tiene ventas y gastos (`VentaMineral`/`GastoMinero`) pero sin costo de producción detallado — el propio `RentabilidadRestController` de `tamanacocomercial` ya resuelve esto para un tenant a mano; falta generalizarlo. |
| `SALUD` | No existe costeo de insumos por consulta todavía — conectar hoy significaría reportar costo `ZERO` siempre, lo cual el punto 7 de este contrato prohíbe presentar como "resultado" real. |
| `MODA` | Recién en esta fase se le agrega congelamiento de costo a ventas *nuevas* (§3.1) — su historial sigue sin costo real hasta que se acumulen suficientes ventas nuevas. Se conecta cuando ese dato exista en volumen suficiente. |

`EmpresaKpiService` recibe `List<CosteoProvider>` por inyección de Spring — agregar una vertical más adelante es agregar un bean, no tocar el servicio.

### 3.1 Decisión: `DetalleVentaModa` sí se migra en esta fase

Se aprueba agregar `costo_unitario NUMERIC(18,4) NULL` a `detalles_venta_moda` (ver migración en §7). Reglas:
- **Nullable, sin backfill.** Las ventas ya existentes quedan con `costo_unitario = NULL` — no se inventa un costo retroactivo con el costo actual del producto, porque eso falsificaría el margen histórico con un número que no es real (exactamente el error que este contrato busca evitar en el punto 7).
- **Ventas nuevas** (a partir del deploy de esta migración): `ModaVentaService.registrarVenta` congela `variante.getProducto().getCostoUnitario()` en cada `DetalleVentaModa` al momento de vender, mismo criterio que `ItemVentaRetail`/`ItemComanda`.
- Esto NO conecta `ModaCosteoProvider` todavía (tabla §3, fila MODA) — solo prepara el dato para cuando se conecte.

### 3.2 "Resultado estimado", no "utilidad neta" — y cobertura obligatoria

Mientras cualquier vertical conectada tenga cobertura menor al 100% (Horeca, por los cargos manuales sin escandallo), el consolidado de la empresa **no puede llamarse "utilidad neta"** — ese nombre implica que el costo está completo, y no lo está. Se usa **"resultado estimado"** hasta que todos los módulos activos reporten cobertura 100%, y cada fila trae su propia cobertura para que el usuario sepa cuánto confiar en el número:

```json
{
  "periodo": { "desde": "2026-09-01", "hasta": "2026-09-30" },
  "moneda": "USD",
  "consolidado": {
    "ventasBrutas": 14100.50,
    "costoVentas": 6400.00,
    "margenBruto": 7700.50,
    "margenBrutoPct": 54.6,
    "gastosOperativos": 0,
    "resultadoEstimado": 7700.50,
    "coberturaPromedioPonderada": 91.2
  },
  "porModulo": [
    { "modulo": "HORECA", "ventasBrutas": 8900.50, "costoVentas": 4200.00, "margenBruto": 4700.50, "coberturaPct": 84.3 },
    { "modulo": "RETAIL", "ventasBrutas": 5200.00, "costoVentas": 2200.00, "margenBruto": 3000.00, "coberturaPct": 100.0 }
  ],
  "verticalesNoConectadas": ["GANADERIA", "MINERIA", "SALUD"],
  "trazabilidad": { "movimientosTotales": 340, "movimientosIdentificados": 62, "porcentajeIdentificado": 18.2 }
}
```

`verticalesNoConectadas` incluye únicamente verticales activas del tenant que todavía no tienen `CosteoProvider`. No muestra verticales que el negocio no contrató ni `MODA`, que aún no forma parte del catálogo público.

**Este endpoint es nuevo y aditivo.** No reemplaza `/api/financiero/tesoreria/resumen-periodo-abierto` ni `/api/financiero/movimientos` — el Hub sigue funcionando exactamente igual hasta que alguien decida conectarlo (fuera de alcance de esta fase, `Dashboard.tsx` no se toca).

### 3.3 El tenant nunca viaja en la URL

```
GET /api/empresa/kpis?desde=2026-09-01&hasta=2026-09-30
```

**Sin `tenantId` ni moneda destino como parámetros.** El controlador resuelve `Long tenantId = TenantContext.getCurrentTenant();` desde el JWT verificado. `desde`/`hasta` son obligatorios y el resultado se expresa en la moneda base en la que cada vertical congeló precios y costos al registrar la operación. Esta fase no reconvierte períodos históricos con la tasa vigente. El endpoint queda restringido a `DUENO_ADMIN` y al rol `MEDICO` que hoy recibe el propietario inicial de una cuenta de Salud.

---

## 4. Capa 3 — Registro comercial no fiscal

Cada vertical conserva sus operaciones reales y el Centro Financiero puede indexarlas sin duplicar el detalle. Los únicos documentos de salida permitidos son:

- notas de entrega;
- documentos de venta no fiscales;
- referencias internas no correlativas fiscalmente.

Todo documento debe mostrar de forma visible `DOCUMENTO NO FISCAL`. Aurora Plus no asigna números de factura fiscal, no calcula libros fiscales, no declara IVA y no presenta estos registros como documentos autorizados por el SENIAT.

Una futura tabla índice, si se implementa, solo podrá guardar `tenantId`, fecha, módulo y referencia interna hacia la operación original. Su finalidad será búsqueda, auditoría operativa y exportación administrativa interna; nunca certificación tributaria.

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

## 7. Mapa de archivos

Esta vez se marca explícitamente **qué se crea en esta fase** (Capa 1 + esqueleto probado de Capa 2) vs. **qué queda propuesto para después** (Capas 3-4 y las 5 verticales sin conectar).

### Se crea ahora — `core.costeo` (Capa 2, Horeca + Retail reales)
```
src/main/java/com/auroraplus/core/costeo/CosteoProvider.java
src/main/java/com/auroraplus/core/costeo/ResumenVentasCostos.java
src/main/java/com/auroraplus/core/costeo/impl/HorecaCosteoProvider.java
src/main/java/com/auroraplus/core/costeo/impl/RetailCosteoProvider.java
src/main/java/com/auroraplus/core/costeo/impl/RepuestosCosteoProvider.java
```
Las demás (`GanaderiaCosteoProvider`, `RepuestosCosteoProvider`, `MineriaCosteoProvider`, `SaludCosteoProvider`, `ModaCosteoProvider`) **no se crean todavía** — solo la interfaz que las va a recibir el día que se conecten (tabla en §3).

### Se crea ahora — `core.kpi` (Capa 2)
```
src/main/java/com/auroraplus/core/kpi/controllers/EmpresaKpiController.java
src/main/java/com/auroraplus/core/kpi/services/EmpresaKpiService.java
src/main/java/com/auroraplus/core/kpi/dto/EmpresaKpiDTO.java
```

### Se modifica ahora — `core.financiero` (Capa 1, aditivo)
```
src/main/java/com/auroraplus/core/financiero/entities/MovimientoCaja.java          (+3 columnas)
src/main/java/com/auroraplus/core/financiero/services/MotorFinancieroService.java  (+overload con moduloOrigen/referenciaTipo/referenciaId)
src/main/resources/db/migration/V12__trazabilidad_movimiento_caja_y_costo_moda.sql
```

### Se modifica ahora — Moda (§3.1)
```
src/main/java/com/auroraplus/modules/moda/entities/DetalleVentaModa.java   (+costoUnitario nullable)
src/main/java/com/auroraplus/modules/moda/services/ModaVentaService.java  (congela costo en ventas nuevas)
```
(migración en el mismo `V12__...sql` de arriba)

### Se crea ahora — pruebas (§8)
```
src/test/java/com/auroraplus/core/financiero/MovimientoCajaTrazabilidadTest.java
src/test/java/com/auroraplus/core/kpi/EmpresaKpiServiceTest.java
```

### Propuesto, NO se crea en esta fase — Capas 3 y 4
```
src/main/java/com/auroraplus/core/financiero/entities/DocumentoComercialNoFiscal.java
src/main/java/com/auroraplus/core/contabilidad/entities/PlanCuenta.java
src/main/java/com/auroraplus/core/contabilidad/entities/Asiento.java
src/main/java/com/auroraplus/core/contabilidad/entities/AsientoLinea.java
src/main/java/com/auroraplus/core/financiero/services/RegistroComercialNoFiscalService.java
src/main/java/com/auroraplus/core/contabilidad/services/AsientoAutomaticoService.java
src/main/java/com/auroraplus/core/contabilidad/services/EstadosFinancierosService.java
src/main/java/com/auroraplus/core/financiero/controllers/DocumentosComercialesController.java
src/main/java/com/auroraplus/core/contabilidad/controllers/PlanCuentaController.java
src/main/java/com/auroraplus/core/contabilidad/controllers/EstadosFinancierosController.java
src/main/resources/db/migration/V##__plan_cuentas_y_asientos.sql
src/main/resources/db/migration/V##__documentos_comerciales_no_fiscales.sql
```

### Frontend — nada en esta fase
`Dashboard.tsx` no se toca (instrucción explícita). Conectar el Hub a `/api/empresa/kpis` es una tarea aparte y pequeña (una función en `api.ts` + un tab nuevo) que se planifica después de que este backend esté probado y en uso.

---

## 8. Pruebas

Backend ya trae `spring-boot-starter-test` + H2 en modo PostgreSQL (`src/test/resources/application-test.properties`), con el pool de conexiones ya ampliado a 30 específicamente para pruebas de concurrencia — se usa esa infraestructura, no se agrega ninguna nueva.

1. **Aislamiento entre tenants** (`MovimientoCajaTrazabilidadTest`): se crean movimientos con `moduloOrigen`/`referenciaId` para dos tenants distintos y se confirma que `findByTenantId` (nunca `findAll`, mismo criterio de todo el código existente) de uno no devuelve filas del otro, incluidas las nuevas columnas.
2. **Redondeo monetario** (`MovimientoCajaTrazabilidadTest`): se registra un movimiento multi-moneda, se verifica que `tasaAplicada` quede con escala 6 y `montoEquivalenteBase` con escala 2 (mismo `RoundingMode.HALF_UP` que ya usa `MotorFinancieroService`), y que **cambiar la `TasaCambio` después no altere el movimiento ya guardado** — prueba directa de la regla del §2.1.
3. **Concurrencia** (`EmpresaKpiServiceTest`): N hilos registran ventas simultáneas del mismo tenant (Horeca y Retail) contra el pool de 30 conexiones; se verifica que la suma que reporta `EmpresaKpiService` sea exactamente la suma de lo insertado — sin ventas perdidas ni duplicadas por condición de carrera.
4. **Período sin datos** (`EmpresaKpiServiceTest`): tenant válido, rango de fechas sin ninguna venta — el servicio responde `ventasBrutas=0`, `costoVentas=0`, sin excepción y sin división por cero en `coberturaPct`/`margenBrutoPct` (se define `0` cuando `ventasBrutas` es cero, no `NaN` ni error 500).

---

## 9. Preguntas que siguen abiertas

Las 4 preguntas originales de esta sección ya se resolvieron con la aprobación de este mensaje (ver Changelog al inicio del documento). Quedan estas, que solo se pueden responder con más información o cuando se llegue a esa fase:

1. **Cuando se acumule suficiente volumen de ventas nuevas de Moda con costo congelado (§3.1), ¿qué umbral define "suficiente" para conectar `ModaCosteoProvider`** (ej. % de ventas del período con costo conocido, o simplemente una fecha de corte)?
2. **Ganadería/Minería/Salud** siguen sin un plan concreto de qué forma tomaría su `CosteoProvider` — eso requiere revisar cada uno por separado, cuando llegue su turno.
3. **Repuestos:** ¿en qué cambio futuro se congelará el costo unitario dentro de `MovimientoRepuesto`? Hasta entonces el proveedor seguirá mostrando ventas reales con cobertura de costos 0%, sin estimar con el costo actual.
