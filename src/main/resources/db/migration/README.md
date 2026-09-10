# Migraciones de esquema (Flyway)

Antes de esto, `spring.jpa.hibernate.ddl-auto=update` dejaba que Hibernate
improvisara el esquema solo en cada arranque — sin ningún registro de qué
cambió ni cuándo, y sin forma de revisar un cambio de esquema antes de que
llegara a producción. Ya no. Ahora:

- `ddl-auto=validate` — Hibernate **nunca** vuelve a tocar el esquema. Solo
  compara las entidades contra la base real y falla el arranque si no
  coinciden.
- **Flyway** es quien aplica cambios de esquema, leyendo los scripts `.sql`
  de esta carpeta, en orden, antes de que Hibernate arranque.

## Cómo agregar una columna/tabla nueva de ahora en adelante

1. Modifica la entidad Java como siempre (`@Column`, nuevo campo, etc.).
2. Escribe el `ALTER TABLE` / `CREATE TABLE` correspondiente a mano en un
   archivo nuevo en esta carpeta, nombrado `V<N>__descripcion_corta.sql`
   (el número siguiente al más alto que exista; guiones bajos entre
   palabras, doble guion bajo antes de la descripción — es la convención de
   Flyway, no es opcional).
3. Arranca el backend en local: Flyway aplica el script y Hibernate valida
   que coincide con la entidad. Si no coincide, el arranque falla con un
   mensaje claro de qué campo no cuadra — corrígelo ahí, no reactivando
   `ddl-auto=update`.
4. Commit el script `.sql` junto con el cambio de la entidad, en el mismo
   PR/commit — nunca por separado.

**Nunca edites un script `V<N>__...sql` que ya fue commiteado** (mucho menos
uno que ya corrió en producción) — Flyway detecta el cambio por checksum y
falla el arranque en cualquier base donde ya se haya aplicado. Si te
equivocaste, agrega un script *nuevo* que corrija lo anterior.

## La primera vez que esto corre contra una base existente

Cada base (tu entorno local, el del resto del equipo, producción) ya tiene
tablas creadas por el viejo `ddl-auto=update` — sin ningún registro de
versión. La primera vez que el backend arranca con Flyway habilitado contra
esa base, `baseline-on-migrate=true` la marca automáticamente como
"versión 1, ya aplicada" **sin ejecutar nada** — Flyway no reconstruye ni
verifica el esquema existente, solo empieza a llevar registro de ahí en
adelante. Es automático, no requiere ningún paso manual.

Importante: si tu base local y la de otro miembro del equipo divergieron
antes de este cambio (por ejemplo, a alguien le falta una columna que aquí sí
existe), Flyway **no lo detecta** — cada base se marca como versión 1 tal
como está. Si ves un error de `ddl-auto=validate` al arrancar por primera vez
con esto, es señal de esa divergencia previa: hay que corregir el esquema a
mano esa vez (el error dice exactamente qué columna/tabla no cuadra), no
volver a `ddl-auto=update`.
