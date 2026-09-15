# Contrato — Núcleo de Personal y Aurora Nómina

**Estado:** Primera entrega — núcleo backend + pruebas. Verticales NO conectadas todavía.
**Rama:** `feature/personal-nomina-core`, base exacta `feature/finance-integration` @ `7f6dc47`.
**No incluido en esta fase:** frontend, `Dashboard.tsx`, cambios a servicios internos de Horeca/Ganadería/Salud, configuración de despliegue, integraciones SENIAT/IVSS/FAOV/INCES, generación de pagos o declaraciones gubernamentales.

---

## 0. Principio rector

Este módulo es infraestructura **compartida y genérica** (vive en `core.personal`, igual jerarquía que `core.financiero`), no un feature de una vertical. Ninguna entidad referencia `Comanda`, `VentaRetail`, `Animal`, `Paciente`, etc. — la conexión con cada vertical (qué `AsignacionEmpleado` corresponde a qué mesero/veterinario/enfermera) es trabajo de una fase posterior, explícitamente fuera de alcance aquí.

Todo lo que toca dinero (nómina, deducciones, aportes) sigue exactamente el mismo patrón ya establecido en `core.financiero`: **congelar, nunca recalcular**. Todo lo que toca reglas legales (porcentajes, días de vacaciones, fórmulas) es **configurable con vigencia**, nunca una constante en Java — porque las leyes laborales cambian y varían por país, y este sistema no puede afirmar que las conoce todas.

---

## 1. Aislamiento y control de acceso

### 1.1 Tenant
Todo controlador nuevo resuelve `Long tenantId = TenantContext.getCurrentTenant()`. Ningún endpoint acepta `tenantId` como parámetro — mismo criterio ya aplicado en `EmpresaKpiController` y documentado en `finance-contract.md §3.3`.

### 1.2 Roles del módulo — decisión de diseño explícita
El `Usuario.Rol` global (`DUENO_ADMIN, CAJERO_VENDEDOR, ENCARGADO_INVENTARIO, MEDICO, RECEPCIONISTA`) es un rol **operativo por vertical**, no un rol de RR. HH. Añadir `RRHH`/`NOMINA`/`AUDITOR` ahí mezclaría dos sistemas de permisos distintos y tocaría el auth compartido de toda la app — que este encargo pide explícitamente no tocar.

En su lugar: un `RolPersonal` (enum: `RRHH, NOMINA, SUPERVISOR, EMPLEADO, AUDITOR`) y una tabla `permisos_personal` que asigna `usuarioId -> RolPersonal` **dentro de este módulo únicamente**. `DUENO_ADMIN` (rol global) tiene acceso total a Personal/Nómina sin necesitar un `PermisoPersonal` — es el dueño del negocio. Todos los demás roles necesitan un permiso explícito asignado.

| RolPersonal | Puede |
|---|---|
| `RRHH` | Gestionar empleados, cargos, asignaciones, turnos, asistencia, metas. No ve montos de nómina calculada. |
| `NOMINA` | Todo lo de RRHH + conceptos, reglas, calcular/aprobar/pagar/reversar nómina. |
| `SUPERVISOR` | Solo lectura de asistencia y metas de su equipo (fuera de alcance de esta fase definir "su equipo" — placeholder para cuando se conecten verticales). |
| `EMPLEADO` | Solo lectura de su propio recibo de nómina y su propia asistencia. |
| `AUDITOR` | Solo lectura de todo, incluida la bitácora de auditoría. Nunca escribe. |

### 1.3 Feature flags por tenant
Se reutiliza la tabla `modulos_tenant` que ya existe (`ModuloTenant`/`LicenciaService`) — el mismo mecanismo que gobierna si un tenant tiene Horeca o Minería contratada. Nombres de módulo nuevos: `personal`, `asistencia`, `metas`, `nomina-avanzada`.

- `personal` habilita Empleado/Cargo/AsignacionEmpleado — es el mínimo para que el módulo exista.
- `asistencia` habilita Turno/RegistroAsistencia.
- `metas` habilita MetaPersonal/SeguimientoMeta.
- `nomina-avanzada` habilita todo el motor de cálculo (ConceptoNomina en adelante). **Apagado por defecto para todo tenant** — activarlo es una decisión consciente del negocio, no algo que venga incluido.

Ningún endpoint de este módulo responde si su flag correspondiente está apagado — se rechaza con un mensaje claro, no con una lista vacía silenciosa (que podría leerse como "no tienes empleados" en vez de "no tienes el módulo").

### 1.4 Auditoría
Tabla `auditoria_personal`: quién (`usuarioId`), qué acción, sobre qué entidad/id, cuándo. El campo `detalle` describe **qué cambió estructuralmente** ("cambió cargo de Mesero a Supervisor", "aprobó período Quincena 1 Enero") — **nunca incluye montos ni datos salariales**, ni aparece en ningún log de aplicación (`Logger`). Se registra en cada creación/edición de `Empleado`, `AsignacionEmpleado`, `ReglaNominaVersionada`, y en cada transición de estado de `PeriodoNomina`/`NominaEmpleado`.

---

## 2. Modelo de datos

### 2.1 Personal (flag `personal`)

```
Empleado
  tenantId, nombreCompleto, documentoIdentidad, fechaIngreso, fechaEgreso (null=activo),
  usuarioId (NULLABLE — un empleado puede no tener acceso al sistema; ver §2.1.1)

Cargo
  tenantId, nombre, descripcion

AsignacionEmpleado
  tenantId, empleadoId, cargoId,
  moduloOrigen (nullable, texto libre: "HORECA"|"GANADERIA"|"SALUD"|null — solo una etiqueta para
    cuando se conecte esa vertical más adelante, NO una FK real a ninguna tabla de vertical)
  tipoSalario (FIJO_MENSUAL | DIARIO | POR_HORA | POR_JORNADA)
  salarioPactado, monedaSalario
  vigenciaDesde, vigenciaHasta (null = asignación activa — nunca se edita una fila existente para
    "cambiar de cargo": se cierra vigenciaHasta de la actual y se crea una fila nueva, mismo
    patrón de histórico append-only que TasaCambio)
```

#### 2.1.1 Empleado ≠ Usuario
`Empleado.usuarioId` es una FK **opcional** a `Usuario`. Un peón de finca, un ayudante de cocina o un empleado de limpieza puede existir en nómina sin jamás iniciar sesión en Aurora — obligarlo a tener credenciales sería forzar una cuenta que nadie va a usar. Cuando `usuarioId` es null, el `EMPLEADO` correspondiente simplemente no puede consultar su propio recibo desde la app (alguien de RRHH se lo entrega aparte); todo lo demás del módulo funciona igual.

### 2.2 Asistencia (flag `asistencia`)

```
TurnoPersonal
  tenantId, empleadoId, fecha, horaInicio, horaFin

RegistroAsistencia
  tenantId, empleadoId, turnoId (nullable — puede registrar asistencia sin turno planificado),
  fechaHoraEntrada, fechaHoraSalida (nullable mientras el turno está en curso), origen (MANUAL)
```

### 2.3 Metas (flag `metas`)

```
MetaPersonal
  tenantId, empleadoId, nombre, descripcion, valorObjetivo, unidad, periodoDesde, periodoHasta

SeguimientoMeta
  tenantId, metaId, fecha, valorAlcanzado, nota
```

### 2.4 Nómina (flag `nomina-avanzada`)

```
ConceptoNomina
  tenantId, codigo, nombre, tipo (ASIGNACION | DEDUCCION | APORTE_PATRONAL), activo

ReglaNominaVersionada
  tenantId, conceptoId (nullable — algunas reglas son generales, ej. "días de vacaciones/año"),
  tipoRegla (texto: ej. "PORCENTAJE_DEDUCCION", "DIAS_VACACIONES_ANUAL", "FORMULA_HORA_EXTRA"...),
  valorNumerico, moneda (nullable),
  vigenciaDesde, vigenciaHasta (nullable = vigente)
  — INMUTABLE una vez creada. "Editar una regla" = crear una fila nueva con vigenciaDesde = hoy
  y cerrar vigenciaHasta de la anterior. Nunca se hace UPDATE sobre valorNumerico de una fila
  existente — eso es precisamente lo que permitiría que un período histórico "cambie solo".

PeriodoNomina
  tenantId, nombre, fechaInicio, fechaFin, fechaPagoPlanificada, moneda,
  estado (BORRADOR | CALCULADA | EN_REVISION | APROBADA | PAGADA | REVERSADA)

NominaEmpleado
  tenantId, periodoId, empleadoId, asignacionEmpleadoId (snapshot de qué asignación se usó),
  totalAsignaciones, totalDeducciones, totalAportesPatronales, netoAPagar,
  moneda, montoEquivalenteBase, monedaBaseEquivalente, tasaAplicada (mismo patrón MovimientoCaja
  — congelado al calcular, nunca se vuelve a convertir con la tasa de hoy)
  estado (espeja el ciclo de vida, pero permite reversar una fila individual sin reversar
  todo el período)

DetalleNomina
  tenantId, nominaEmpleadoId, conceptoId, reglaAplicadaId (FK exacta a la fila de
  ReglaNominaVersionada usada — la prueba de qué regla vigente aplicó, ver §3),
  cantidad (horas/días, si aplica), montoUnitario, montoTotal, moneda

AjusteNomina
  tenantId, nominaEmpleadoId, tipo (CORRECCION | REVERSO), motivo, montoAjuste, moneda,
  creadoPor, fecha, nominaEmpleadoReemplazoId (nullable — la nómina nueva creada tras un reverso)
```

---

## 3. Motor de cálculo — snapshot y no-recálculo histórico

Al calcular un `PeriodoNomina` (`POST /calcular`), por cada `Empleado` con `AsignacionEmpleado` vigente en ese rango de fechas:

1. Se resuelve la `AsignacionEmpleado` vigente **a la fecha del período** (no la actual) — snapshot en `NominaEmpleado.asignacionEmpleadoId`.
2. Por cada `ConceptoNomina` activo, se busca la `ReglaNominaVersionada` vigente **a la fecha de inicio del período** (`vigenciaDesde <= fechaInicio AND (vigenciaHasta IS NULL OR vigenciaHasta >= fechaInicio)`) — nunca "la más reciente sin importar fecha".
3. El resultado del cálculo (`montoTotal` en `DetalleNomina`) guarda `reglaAplicadaId` apuntando a la fila exacta usada. Si mañana alguien crea una nueva versión de esa regla, este `DetalleNomina` sigue apuntando a la vieja — el período ya calculado **no cambia**.
4. Si el período se paga en una moneda distinta a la moneda base del tenant, se usa `MotorFinancieroService.convertirMoneda(...)` **una sola vez**, en el momento del cálculo, y el resultado (`montoEquivalenteBase`/`tasaAplicada`) queda congelado en `NominaEmpleado` — igual regla que `finance-contract.md §2.1`: ningún reporte posterior reconvierte con la tasa vigente.

### Tipos de salario soportados (motor mínimo)
- `FIJO_MENSUAL` → `salarioPactado / díasDelPeriodo * díasTrabajadosSegúnAsistencia`.
- `DIARIO` → `salarioPactado * díasTrabajadosSegúnAsistencia`.
- `POR_HORA` → `salarioPactado * horasTrabajadasSegúnAsistencia` (de `RegistroAsistencia`).
- `POR_JORNADA` → `salarioPactado * cantidadDeJornadasCompletas`.

Bonos, comisiones, horas extra, anticipos/préstamos, deducciones y aportes se modelan como `ConceptoNomina` con su `ReglaNominaVersionada` — el motor no tiene fórmulas de estos hardcodeadas, lee `tipoRegla` + `valorNumerico` de la regla vigente. Vacaciones, utilidades, prestaciones y liquidaciones se calculan igual: una `ReglaNominaVersionada` con `tipoRegla` propio (`DIAS_VACACIONES_ANUAL`, `DIAS_UTILIDADES_ANUAL`, `FORMULA_PRESTACIONES`) que el tenant configura — **el sistema no asume ningún porcentaje o número de días por ley de ningún país**.

---

## 4. Ciclo de vida e inmutabilidad

```
BORRADOR → CALCULADA → EN_REVISION → APROBADA → PAGADA
                                         ↓
                                     REVERSADA (vía AjusteNomina)
```

Una `NominaEmpleado`/`PeriodoNomina` en `APROBADA` o `PAGADA` **nunca se edita directamente** — cualquier intento de `PUT` sobre sus montos se rechaza. La única vía de corrección es `AjusteNomina`:
- `CORRECCION`: agrega un ajuste sobre la nómina existente (ej. un bono olvidado), sin tocar las filas ya calculadas.
- `REVERSO`: marca la `NominaEmpleado` como `REVERSADA` y, si aplica, crea una `NominaEmpleado` de reemplazo en `BORRADOR` — el histórico de la reversada queda intacto para auditoría.

---

## 5. Mapa de archivos (todo nuevo, paquete `core.personal`)

```
src/main/java/com/auroraplus/core/personal/entities/
  Empleado.java, Cargo.java, AsignacionEmpleado.java, TurnoPersonal.java,
  RegistroAsistencia.java, MetaPersonal.java, SeguimientoMeta.java,
  ConceptoNomina.java, ReglaNominaVersionada.java, PeriodoNomina.java,
  NominaEmpleado.java, DetalleNomina.java, AjusteNomina.java,
  PermisoPersonal.java, AuditoriaPersonal.java

src/main/java/com/auroraplus/core/personal/repositories/  (una por entidad)

src/main/java/com/auroraplus/core/personal/services/
  PersonalAccessService.java   (flags + RolPersonal, punto único de control de acceso)
  EmpleadoService.java, AsignacionEmpleadoService.java, AsistenciaService.java,
  MetaPersonalService.java, ReglaNominaService.java, MotorNominaService.java,
  AjusteNominaService.java, AuditoriaPersonalService.java

src/main/java/com/auroraplus/core/personal/controllers/
  EmpleadoController.java, CargoController.java, AsignacionEmpleadoController.java,
  AsistenciaController.java, MetaPersonalController.java,
  ConceptoNominaController.java, ReglaNominaController.java,
  PeriodoNominaController.java, NominaEmpleadoController.java, AjusteNominaController.java

src/main/resources/db/migration/V16__nucleo_personal_y_nomina.sql

src/test/java/com/auroraplus/core/personal/  (ver §7)
```

---

## 6. Decisiones abiertas (no bloquean esta entrega, se documentan para revisión conjunta)

1. **`RolPersonal` como sistema de permisos separado del `Usuario.Rol` global** — descrito en §1.2. Alternativa sería extender el enum global; se descartó por invadir código compartido de todas las verticales sin que se pidiera.
2. **`moduloOrigen` en `AsignacionEmpleado` es texto libre, no una FK real** — cuando se conecte una vertical (fase futura, fuera de este alcance), probablemente se necesite una tabla puente real (`AsignacionEmpleado` ↔ `MeseroHoreca`/`VeterinarioGanaderia`) en vez de un string.
3. **Definición de "supervisor de quién"** — el rol `SUPERVISOR` hoy solo existe como permiso, sin jerarquía de equipo real (no hay tabla `empleadoId -> supervisorId`). Se deja para cuando haya un caso de uso concreto.
4. **`ConceptoNomina` por tenant, no un catálogo global** — cada negocio define sus propios conceptos desde cero. Alternativa: un catálogo "sugerido" de conceptos comunes (sueldo básico, HCM, etc.) que el tenant clona y ajusta. No implementado aquí, es una mejora de UX para la fase de frontend.
5. **Formato de `valorNumerico` en `ReglaNominaVersionada`** — hoy es un solo `BigDecimal`, suficiente para porcentajes y valores fijos simples. Una fórmula más compleja (ej. escalas progresivas de ISLR) necesitaría un campo adicional (JSON de tramos) — no incluido en el modelo mínimo pedido.
6. **`AsignacionEmpleado.monedaSalario` debe coincidir con `PeriodoNomina.moneda`** — el motor mínimo no convierte automáticamente entre la moneda pactada del empleado y la moneda del período (rechaza con un error claro si no coinciden), para no arriesgar una conversión doble junto con la que ya congela `NominaEmpleado.montoEquivalenteBase`. Si hace falta, es una mejora acotada de `MotorNominaService.calcularSueldoBase`.
7. **Hallazgo real durante la integración — `core.rrhh` ya existe en esta base y colisiona.** Al integrar este módulo se encontró un paquete `core.rrhh` (`Empleado`, `RegistroAsistencia`, `RelojChecadorController/Service`) ya presente en `feature/finance-integration @ 7f6dc47`, con:
   - `core.rrhh.entities.Empleado` (JPA `"EmpleadoRrhh"`) y `core.rrhh.entities.RegistroAsistencia` apuntando a tablas físicas `empleados`/`registros_asistencia` — **los mismos nombres de tabla que este módulo iba a usar**. Se resolvió renombrando las tablas propias a `personal_empleados`/`personal_registros_asistencia` y dando nombre explícito a las entidades/repositorios/controladores en conflicto (mismo criterio que `TesoreriaController`).
   - `core.rrhh` **no tiene ninguna migración de Flyway que cree esas tablas** — con `ddl-auto=validate` en producción, esto sugiere que ese módulo nunca llegó a arrancar contra una base real, o asume una tabla `empleados` heredada del esquema pre-Flyway (la misma "V1 sin script" documentada en `finance-contract.md`). No se tocó ni se intentó arreglar `core.rrhh` — está fuera del alcance de este encargo, pero **alguien debe decidir qué pasa con él**: ¿se abandona en favor de `core.personal`, se migra su lógica de "reloj checador" (que sí tiene una idea útil: `tipoControl` POR_HORA/SALARIO_FIJO/SOLO_CONTROL) hacia `AsistenciaService`, o coexisten temporalmente? Este documento no decide eso por su cuenta.

---

## 7. Pruebas mínimas (mapeadas 1 a 1 con lo pedido)

| Prueba | Qué demuestra |
|---|---|
| Aislamiento entre tenants | Un tenant no ve empleados/nóminas de otro |
| Empleado sin usuario | `Empleado.usuarioId = null` es válido y el resto del módulo opera igual |
| Permisos por rol | `RRHH` no puede aprobar nómina; `EMPLEADO` solo lee la suya; `AUDITOR` no puede escribir |
| Regla por fecha de vigencia | Dos reglas del mismo `tipoRegla` con vigencias distintas — se aplica la correcta según la fecha del período, no la más reciente |
| Histórico no cambia al editar regla | Se calcula un período, se crea una nueva versión de la regla, se re-lee el período ya calculado: sigue igual |
| Nómina aprobada inmutable | Intentar modificar montos de una `NominaEmpleado` `APROBADA` falla |
| Reverso y ajuste | Reversar una nómina pagada la marca `REVERSADA` y dispara un `AjusteNomina` |
| Concurrencia al calcular un período | N hilos calculando el mismo período no duplican `NominaEmpleado` por empleado |
| Multimoneda con tasa congelada | Se calcula en VES, luego cambia la tasa del tenant, se relee la nómina: el monto base no cambia |
| Feature flag desactivado | Tenant sin `nomina-avanzada` activo recibe rechazo explícito, no una lista vacía |

---

## 8. Changelog — corrección de hallazgos de revisión (post `02f1a6d`)

Revisión externa sobre `02f1a6d` encontró 6 bloqueantes de seguridad/cálculo. Corregidos en este commit, sin merge, sin tocar frontend/`core.rrhh`/verticales:

1. **RBAC real en lecturas.** `NominaEmpleadoService.obtener` ahora exige `FLAG_NOMINA_AVANZADA` (antes faltaba por completo) y usa `PersonalAccessService.exigirVerNominaDe` (nuevo): RRHH ya no ve montos de nómina de nadie, EMPLEADO solo ve la propia (matcheada por `PermisoPersonal.empleadoId`), y un usuario sin fila en `PermisoPersonal` es rechazado explícitamente. `exigirVerDirectorioPersonal`/`exigirVerMontosDeNominaEnGeneral` (nuevos) separan "ver el directorio" de "ver montos de cualquiera".
2. **`exigirNoAuditor` eliminado.** Reemplazado en todos sus usos por `exigirRol` con `EnumSet` positivos explícitos (`CargoController.crear`, `NominaEmpleadoService.editarManualmente`, `AjusteNominaService`). El bug real: antes solo bloqueaba `AUDITOR`, dejando pasar a cualquier usuario sin rol asignado.
3. **Inmutabilidad + concurrencia.** `AjusteNominaService.corregir` ya nunca muta `netoAPagar`/`montoEquivalenteBase`/`tasaAplicada` de una `NominaEmpleado` — las correcciones son filas `AjusteNomina` aparte; el "neto efectivo" se calcula al vuelo (`calcularNetoEfectivo`, endpoint nuevo `GET /{id}/neto-efectivo`). `NominaEmpleado` ganó `@Version` y `reversar` hace `saveAndFlush` antes de insertar el ajuste, para que un segundo reverso concurrente choque con `ObjectOptimisticLockingFailureException` en vez de duplicar el reverso.
4. **Versionado de reglas por `tenantId + conceptoId + tipoRegla`.** `ReglaNominaVersionadaRepository.buscarVigenteAbiertaPorConceptoYTipo` (reemplaza la búsqueda por solo `tipoRegla`) impide que crear una regla para un concepto cierre por error la regla vigente de otro concepto con el mismo `tipoRegla`. Reforzado también con un índice único parcial en V13 (`COALESCE(concepto_id, 0)`, no ejercitado por los tests H2 — Flyway está deshabilitado en el perfil `test`, solo aplica contra Postgres real).
5. **Conceptos `ASIGNACION` procesados.** `MotorNominaService` ahora calcula bonos/comisiones en una primera pasada (fija el bruto) y solo después deducciones/aportes (sobre ese bruto ya completo) — antes se saltaban con un `continue`. Un `tipoRegla` no reconocido revienta con `RuntimeException` en vez de devolver `BigDecimal.ZERO` en silencio.
6. **Integridad referencial + validación de tenant antes de relacionar.** V13 ganó `REFERENCES` reales en las 15 tablas. Además, a nivel de servicio (una FK de base de datos no sabe de `tenant_id`): `EmpleadoService.asignarCargo` valida que el `Cargo` sea del tenant, `AsistenciaService.registrarEntrada` valida que el `Empleado` y (si aplica) el `TurnoPersonal` sean del tenant y que el turno pertenezca al mismo empleado, `MetaPersonalService.crear` valida el `Empleado`, y `ReglaNominaService.crearNuevaVersion` valida el `ConceptoNomina`. Se agregó `TurnoPersonalService`/`TurnoPersonalController` (faltaban por completo — la entidad no tenía ninguna vía de creación).
7. **Pruebas de regresión.** `SeguridadYCalculoRegresionTest` (17 pruebas nuevas, una o más por cada punto de arriba) + las 13 ya existentes — 30/30 pasan.
