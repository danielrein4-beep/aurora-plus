# Despliegue de Aurora+

Guía operativa del servidor. Dos entornos en la misma máquina, nunca uno solo:
**pruebas** (staging) recibe cada cambio primero, **producción** solo recibe lo
que ya pasó por pruebas. Así nunca se empuja código sin probar contra datos
reales de clientes.

```
internet ──▶ Caddy (80/443, HTTPS automático)
                ├─ tudominio.com         ──▶ web (SPA React)  +  /api/* ──▶ app (Spring Boot) ──▶ db prod
                └─ staging.tudominio.com ──▶ web/app del stack de pruebas   ──▶ db pruebas
```

- `web`: bundle de Vite ya compilado, servido como archivos estáticos.
- `app`: el JAR de Spring Boot. Solo responde bajo `/api/*`.
- `db`: Postgres 16, sin puerto publicado — solo alcanzable dentro del stack.
- `backup`: `pg_dump` automático cada 24h a `./backups` del host.
- `caddy`: único contenedor expuesto a internet; corre **solo en producción**.

---

## 1. Provisión (la hace el usuario, no Claude)

1. VPS en Hetzner Cloud, **CX22** (2 vCPU / 4GB / ~€4-5 al mes), Ubuntu 24.04.
2. Registro DNS **A** de `tudominio.com` y de `staging.tudominio.com` apuntando
   a la IP del servidor. Esto va **antes** de levantar el stack: Caddy pide el
   certificado al arrancar y falla si el DNS todavía no resuelve.
3. Clave SSH propia (con passphrase) y acceso entregado a quien despliegue.
4. Firewall de Hetzner: abrir **22, 80 y 443**. Nada más.

## 2. Preparación del servidor (una sola vez)

```bash
# Docker + Compose
curl -fsSL https://get.docker.com | sh

# Las dos carpetas: pruebas y producción, cada una con su copia del repo
mkdir -p /opt/aurora
git clone <url-del-repo> /opt/aurora/production
git clone <url-del-repo> /opt/aurora/staging

# Red compartida por ambos stacks (deploy.sh también la crea si falta)
docker network create aurora_edge
```

## 3. Secretos

En **cada** carpeta: `cp .env.example .env` y llenarlo. Producción y pruebas
llevan contraseñas **distintas** — si pruebas se filtra, producción no cae.

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 24   # DB_PASSWORD
openssl rand -base64 18   # SUPER_ADMIN_PASSWORD
```

Diferencias entre los dos `.env`:

| Variable | producción | pruebas |
|---|---|---|
| `STACK_NAME` | `aurora-prod` | `aurora-staging` |
| `DOMAIN` | `tudominio.com` | (vacío — no levanta Caddy) |
| `STAGING_DOMAIN` | `staging.tudominio.com` | (vacío) |
| `FRONTEND_URL` | `https://tudominio.com` | `https://staging.tudominio.com` |
| `SENTRY_ENVIRONMENT` | `production` | `staging` |

Cada secreto generado se le pasa al usuario **uno por uno y etiquetado**, para
que lo guarde en su gestor de contraseñas. No quedan escritos en ningún otro
lado del repo.

## 4. Primer arranque — pruebas primero

```bash
cd /opt/aurora/staging && ./deploy.sh
cd /opt/aurora/production && ./deploy.sh
```

`deploy.sh` respalda la base, trae el código, construye, levanta y **espera a
que el backend quede sano**; si Flyway o el arranque fallan, corta y muestra el
log en vez de dejar el stack a medias.

Prueba de humo antes de dar por buena cualquier subida (en staging, con datos
falsos):

- [ ] Entra el super-admin y crea un tenant de cada vertical piloto
      (Ganadería, Mediclinic, Retail, Horeca, Ferretería).
- [ ] Un flujo completo por vertical: crear, guardar, listar, imprimir/exportar.
- [ ] Recargar una ruta profunda (`/dashboard`, un catálogo público) con F5 —
      valida el fallback de SPA.
- [ ] **Correo real**: "olvidé mi clave" y confirmar que llega y que el link
      apunta al dominio, no a localhost. En Windows esto fallaba por firewall
      en el handshake TLS; en el VPS Linux debe funcionar.
- [ ] Catálogo público / QR desde un teléfono, fuera de la red local.
- [ ] Simulacro de restauración (sección 6) — hacerlo, no saltarlo.

## 5. Actualizaciones

Una sola orden, primero pruebas y luego producción:

```bash
cd /opt/aurora/staging    && ./deploy.sh --rama main
# ...verificar en staging.tudominio.com...
cd /opt/aurora/production && ./deploy.sh --rama main
```

Volver atrás:

```bash
git checkout <commit-bueno-anterior>
./deploy.sh --no-pull
```

Ojo: revertir el código **no** revierte una migración de Flyway ya aplicada. Si
la migración cambió el esquema de forma incompatible, hay que restaurar el
respaldo `pre-deploy_*.sql.gz` que `deploy.sh` dejó antes de subir.

## 6. Respaldos

- Automáticos cada 24h en `./backups` del host (no en un volumen de Docker:
  sobreviven a un `docker compose down -v`). Se conservan 14 días.
- `deploy.sh` agrega uno extra justo antes de cada despliegue.
- **Copia fuera del servidor** — un respaldo que vive en el mismo disco que la
  base no es un respaldo. Desde la máquina local:

```bash
rsync -avz root@<ip>:/opt/aurora/production/backups/ ~/respaldos-aurora/
```

Simulacro de restauración (hacerlo en **staging**, nunca de primera en
producción):

```bash
cd /opt/aurora/staging
./docker/backup/restore.sh backups/auroraplus_<fecha>.sql.gz
docker compose logs -f app
```

## 7. Operación diaria

```bash
docker compose ps                    # estado y salud de cada servicio
docker compose logs -f app           # log del backend en vivo
docker compose logs --tail 50 caddy  # certificados / tráfico
docker compose exec db psql -U postgres -d auroraplus_db
df -h                                # disco: la causa #1 de caídas en VPS chicos
```

Los logs están limitados a 10MB × 3 archivos por servicio, así que no pueden
llenar el disco solos.

## 8. Lo que queda pendiente

- `SENTRY_DSN` real (hoy vacío = sin monitoreo de errores en el servidor).
- Endpoint de salud propio (`/actuator/health`): hoy el healthcheck solo
  confirma que Tomcat acepta conexiones, no que la base responda.
- `spring.flyway.validate-on-migrate` sigue desactivado desde el parche del
  commit 3dc4ef6; conviene reactivarlo antes de tener datos reales.
- El bundle del frontend pesa ~4MB (1MB gzip) en un solo chunk: funciona, pero
  la primera carga en conexión móvil lenta se siente.
