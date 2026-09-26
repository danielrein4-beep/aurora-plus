// Ensayo de punta a punta del Mercado Ganadero: dos fincas publican, ofertan, aceptan, anulan,
// confirman el pago y reciben el animal, contra un backend de PRUEBA con su propia base.
// Nunca contra auroraplus_db ni producción: siembra verificaciones directo en la base.
//
// Uso (base vacía creada con docker/db-init/01_esquema_base.sql y backend arrancado sobre ella):
//   AURORA_URL=http://localhost:8092 PRUEBA_DB=auroraplus_ensayo node scripts/pruebas/mercado_e2e.js
const { execFileSync } = require('child_process');
const B = process.env.AURORA_URL || 'http://localhost:8092';
const PSQL = process.env.PSQL || 'C:/Program Files/PostgreSQL/18/bin/psql.exe';
const DB = process.env.PRUEBA_DB || 'auroraplus_ensayo';
if (DB === 'auroraplus_db') throw new Error('Este ensayo no se corre contra la base compartida');
let fallos = 0;

function sql(q) {
  return execFileSync(PSQL, ['-U', process.env.PGUSER || 'postgres', '-d', DB, '-t', '-A', '-c', q], { env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || '1234' } }).toString().trim();
}
async function api(token, metodo, ruta, cuerpo) {
  const r = await fetch(B + ruta, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; }
  return { ok: r.ok, status: r.status, d };
}
function check(nombre, cond, extra) {
  console.log((cond ? 'OK   ' : 'FALLA') + ' ' + nombre + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 160) : ''));
  if (!cond) fallos++;
}
async function registrar(user, empresa) {
  const r = await api(null, 'POST', '/api/auth/registro-negocio', { username: user, password: 'prueba123', nombreEmpresa: empresa, moduloPrincipal: 'ganaderia', telefonoContacto: '04140000000', nombreCompleto: 'Prueba', aceptaTerminos: true, versionTerminos: '1' });
  if (!r.ok) throw new Error('registro ' + JSON.stringify(r.d));
  return r.d;
}
function verificar(tenantId) {
  sql(`INSERT INTO fincas_ganaderia (tenant_id, nombre, latitud, longitud) VALUES (${tenantId}, 'Finca ${tenantId}', 8.5, -71.2)`);
  for (const tipo of ['CEDULA', 'HIERRO']) {
    sql(`INSERT INTO mercado_documentos_verificacion (tenant_id, tipo, estado, tipo_contenido, contenido_cifrado, vector_inicial, tamano_bytes) VALUES (${tenantId}, '${tipo}', 'APROBADO', 'image/png', '\\x00', '\\x00', 1)`);
  }
}
const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

(async () => {
  const v = await registrar('ens_vendedor', 'Finca Vendedora');
  const c = await registrar('ens_comprador', 'Finca Compradora');
  const V = v.token, C = c.token;
  verificar(v.tenantId); verificar(c.tenantId);
  await api(V, 'POST', '/api/ganaderia/mercado/condiciones/aceptar');
  await api(C, 'POST', '/api/ganaderia/mercado/condiciones/aceptar');

  const animal = await api(V, 'POST', '/api/ganaderia/animales', { arete: 'ENS-100', sexo: 'MACHO', raza: 'Brahman', tipoAnimal: 'NOVILLO', pesoActual: 380 });
  check('crear animal del vendedor', animal.ok, animal.d);
  const animalId = animal.d.id;

  const pub = await api(V, 'POST', '/api/ganaderia/mercado/publicaciones', { animalId, categoria: 'CEBA', titulo: 'Novillo de ensayo', precio: 900, tipoPrecio: 'POR_CABEZA', estadoRegion: 'Tachira', negociable: true, fotos: [FOTO] });
  check('publicar', pub.ok, pub.d);
  const pubId = pub.d.id;

  // --- Trato 1: se acepta y se anula ---
  let of = await api(C, 'POST', `/api/ganaderia/mercado/publicaciones/${pubId}/ofertas`, { monto: 850 });
  check('comprador oferta 850', of.ok, of.d);
  let ofertaId = Number(sql(`SELECT max(id) FROM ofertas_compra WHERE publicacion_id = ${pubId}`));
  let r = await api(V, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/aceptar`);
  check('vendedor acepta', r.ok, r.d);
  check('animal queda VENDIDO', sql(`SELECT estado FROM animales WHERE id = ${animalId}`) === 'VENDIDO');
  check('se crea la CXC del vendedor', sql(`SELECT count(*) FROM movimientos_caja WHERE referencia_tipo='MERCADO_OFERTA' AND referencia_id=${ofertaId} AND tipo='CXC'`) === '1');
  check('se registran 2 comisiones', sql(`SELECT count(*) FROM comisiones_plataforma WHERE referencia_id=${ofertaId}`) === '2');

  r = await api(C, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/recibir`);
  check('recibir SIN pago confirmado se rechaza', !r.ok && String(r.d.message).includes('confirma'), r.d);

  r = await api(C, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/anular`, { motivo: 'no' });
  check('anular con motivo muy corto se rechaza', !r.ok, r.d);
  r = await api(C, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/anular`, { motivo: 'No consegui el transporte' });
  check('comprador anula el trato', r.ok, r.d);
  check('oferta queda ANULADA', sql(`SELECT estado FROM ofertas_compra WHERE id=${ofertaId}`) === 'ANULADA');
  check('animal vuelve a ACTIVO', sql(`SELECT estado FROM animales WHERE id = ${animalId}`) === 'ACTIVO');
  check('publicacion vuelve a ACTIVA', sql(`SELECT estado FROM publicaciones_venta WHERE id = ${pubId}`) === 'ACTIVA');
  check('comisiones pendientes eliminadas', sql(`SELECT count(*) FROM comisiones_plataforma WHERE referencia_id=${ofertaId}`) === '0');
  check('CXC anulada con saldo 0', sql(`SELECT estado || ':' || saldo_pendiente FROM movimientos_caja WHERE referencia_tipo='MERCADO_OFERTA' AND referencia_id=${ofertaId} AND tipo='CXC'`) === 'ANULADO:0.00');
  r = await api(V, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/anular`, { motivo: 'Segundo intento de anular' });
  check('anular dos veces se rechaza', !r.ok, r.d);

  // --- Trato 2: se acepta, se confirma el pago y se recibe ---
  of = await api(C, 'POST', `/api/ganaderia/mercado/publicaciones/${pubId}/ofertas`, { monto: 880 });
  check('comprador vuelve a ofertar 880', of.ok, of.d);
  ofertaId = Number(sql(`SELECT max(id) FROM ofertas_compra WHERE publicacion_id = ${pubId}`));
  r = await api(V, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/aceptar`);
  check('vendedor acepta la nueva oferta', r.ok, r.d);
  r = await api(C, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/confirmar-pago`);
  check('el comprador NO puede confirmar el pago', !r.ok, r.d);
  r = await api(V, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/confirmar-pago`);
  check('vendedor confirma el pago', r.ok, r.d);
  check('CXC del vendedor saldada', sql(`SELECT saldo_pendiente FROM movimientos_caja WHERE referencia_tipo='MERCADO_OFERTA' AND referencia_id=${ofertaId} AND tipo='CXC'`) === '0.00');
  check('ingreso en la caja del vendedor', Number(sql(`SELECT count(*) FROM movimientos_caja WHERE tenant_id=${v.tenantId} AND tipo='INGRESO'`)) >= 1);
  r = await api(V, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/confirmar-pago`);
  check('confirmar el pago dos veces se rechaza', !r.ok, r.d);
  r = await api(V, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/anular`, { motivo: 'Me arrepenti de vender' });
  check('anular con pago confirmado se rechaza', !r.ok && String(r.d.message).includes('pago ya se confirm'), r.d);

  const [r1, r2] = await Promise.all([
    api(C, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/recibir`),
    api(C, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/recibir`),
  ]);
  check('recibir dos veces a la vez: solo uno entra', [r1, r2].filter((x) => x.ok).length === 1, [r1.status, r2.status]);
  check('el comprador tiene exactamente 1 animal ENS-100', sql(`SELECT count(*) FROM animales WHERE tenant_id=${c.tenantId} AND arete='ENS-100'`) === '1');
  check('CXP del comprador creada y saldada', sql(`SELECT count(*) || ':' || coalesce(sum(saldo_pendiente),-1) FROM movimientos_caja WHERE tenant_id=${c.tenantId} AND tipo='CXP' AND referencia_id=${ofertaId}`) === '1:0.00');
  r = await api(C, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/anular`, { motivo: 'Ya no lo quiero despues' });
  check('anular despues de recibir se rechaza', !r.ok, r.d);

  // --- Una finca ajena no puede tocar el trato ---
  const x = await registrar('ens_ajeno', 'Finca Ajena');
  r = await api(x.token, 'POST', `/api/ganaderia/mercado/ofertas/${ofertaId}/anular`, { motivo: 'Intento de una finca ajena' });
  check('finca ajena no puede anular', !r.ok, r.d);

  console.log(fallos === 0 ? '\nTODO BIEN' : `\n${fallos} FALLAS`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
