// Cliente API real hacia el backend Spring Boot — reemplaza los datos
// simulados que había en AuthContext/Dashboard. Todo pasa por /api, que
// vite.config.ts redirige a localhost:8080 en desarrollo (evita CORS).

const TOKEN_KEY = "aurora_token";

export interface SesionAurora {
  token: string;
  rol: string;
  username: string;
  tenantId: number;
}

export function guardarSesion(sesion: SesionAurora) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(sesion));
}

export function leerSesion(): SesionAurora | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function borrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {}

const SESSION_USER_KEY = "aurora_session_user";

// Sesión vencida o inválida (401 de TenantInterceptor): antes esto solo se
// mostraba como un texto rojo suelto en el formulario donde tocara, sin
// avisar que había que volver a iniciar sesión — quien no leyera el detalle
// del error se quedaba dando vueltas pensando que la app estaba rota.
// Limpia la sesión y manda al login de una, en cualquier pantalla.
function manejarSesionVencida() {
  borrarSesion();
  try { localStorage.removeItem(SESSION_USER_KEY); } catch {}
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
    window.location.href = "/auth";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const sesion = leerSesion();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (sesion?.token) {
    headers["Authorization"] = `Bearer ${sesion.token}`;
  }

  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    manejarSesionVencida();
    throw new ApiError("Sesión vencida — redirigiendo al login");
  }
  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const body = await res.json();
      mensaje = body.message || body.error || mensaje;
    } catch {
      // el backend a veces responde texto plano en errores no controlados
    }
    throw new ApiError(mensaje);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Para endpoints que devuelven texto plano (ej. GET .../moneda-base responde
// "USD" sin comillas, Content-Type text/plain) — request() con .json() falla
// a parsear eso y el error queda silenciado por el try/catch del llamador.
async function requestText(path: string, options: RequestInit = {}): Promise<string> {
  const sesion = leerSesion();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  if (sesion?.token) {
    headers["Authorization"] = `Bearer ${sesion.token}`;
  }
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    manejarSesionVencida();
    throw new ApiError("Sesión vencida — redirigiendo al login");
  }
  if (!res.ok) throw new ApiError(`Error ${res.status}`);
  return res.text();
}

// --- Autenticación ---

export interface RegistroNegocio {
  nombreEmpresa: string;
  moduloPrincipal: string;
  emailContacto: string;
  telefonoContacto?: string;
  username: string;
  password: string;
}

export async function registrarNegocio(datos: RegistroNegocio): Promise<SesionAurora> {
  const data = await request<{ token: string; rol: string; username: string; tenantId: number }>(
    "/api/auth/registro-negocio",
    { method: "POST", body: JSON.stringify(datos) },
  );
  const sesion: SesionAurora = { token: data.token, rol: data.rol, username: data.username, tenantId: data.tenantId };
  guardarSesion(sesion);
  return sesion;
}

export async function loginDirecto(username: string, password: string): Promise<SesionAurora> {
  const data = await request<{ token: string; rol: string; username: string; tenantId: number }>(
    "/api/auth/login-directo",
    { method: "POST", body: JSON.stringify({ username, password }) },
  );
  const sesion: SesionAurora = { token: data.token, rol: data.rol, username: data.username, tenantId: data.tenantId };
  guardarSesion(sesion);
  return sesion;
}

export interface MiNegocio {
  nombreEmpresa: string;
  moduloPrincipal: string;
  logoBase64: string | null;
  hierroBase64: string | null;
}

export function obtenerMiNegocio(): Promise<MiNegocio> {
  return request("/api/config/mi-negocio/marca");
}

// --- Salud / Mediclinic Pro ---

export interface Paciente {
  id: number;
  nombreCompleto: string;
  identificacion: string;
  nombres?: string;
  apellidos?: string;
  edad: number | null;
  fechaNacimiento?: string | null;
  telefono: string | null;
  email?: string | null;
  direccion?: string | null;
  genero?: string;
  tipoOrigen?: string | null;
  origen?: string | null;
  ciudadOrigen?: string | null;
}

export function listarPacientes(tenantId: number): Promise<Paciente[]> {
  return request(`/api/salud/pacientes?tenantId=${tenantId}`);
}

export interface NuevoPaciente {
  identificacion: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  fechaNacimiento?: string;
  direccion?: string;
  genero?: string;
  tipoOrigen?: string;
  origen?: string;
  ciudadOrigen?: string;
}

export function crearPaciente(tenantId: number, datos: NuevoPaciente): Promise<Paciente> {
  return request(`/api/salud/pacientes?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function eliminarPaciente(id: number): Promise<void> {
  return request(`/api/salud/pacientes/${id}`, { method: "DELETE" });
}

export interface CitaMedica {
  id: number;
  paciente: Paciente;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo: string;
  especialidad: string | null;
  estado: string;
}

export function listarCitasDelDia(tenantId: number, fecha: string): Promise<CitaMedica[]> {
  return request(`/api/salud/agenda?tenantId=${tenantId}&fecha=${fecha}`);
}

export interface NuevaCita {
  pacienteId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
  especialidad?: string;
  estado?: string;
}

export function agendarCita(tenantId: number, datos: NuevaCita): Promise<CitaMedica> {
  return request(`/api/salud/agenda/citas?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({
      paciente: { id: datos.pacienteId },
      fecha: datos.fecha,
      horaInicio: datos.horaInicio,
      horaFin: datos.horaFin,
      motivo: datos.motivo,
      especialidad: datos.especialidad,
      estado: datos.estado || "PROGRAMADA",
    }),
  });
}

export interface CobroConsulta {
  id: number;
  montoTotal: number;
  monedaCobrada: string;
  estado: string;
}

export function listarCobrosDelDia(inicioIso: string, finIso: string): Promise<CobroConsulta[]> {
  return request(`/api/salud/cobros/reporte?inicio=${inicioIso}&fin=${finIso}`);
}

export interface SalaEsperaEntrada {
  id: number;
  paciente: Paciente;
  consultorio: string | null;
  estado: string;
  horaLlegada: string;
}

export function listarSalaEspera(): Promise<SalaEsperaEntrada[]> {
  return request(`/api/salud/sala-espera`);
}

export function registrarLlegadaSalaEspera(tenantId: number, pacienteId: number, consultorio?: string): Promise<SalaEsperaEntrada> {
  return request(`/api/salud/sala-espera/check-in?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ paciente: { id: pacienteId }, consultorio }),
  });
}

export function finalizarAtencionSalaEspera(id: number): Promise<SalaEsperaEntrada> {
  return request(`/api/salud/sala-espera/${id}/finalizar`, { method: "POST" });
}

export interface ProcedimientoMedico {
  id: number;
  nombre: string;
  descripcion: string | null;
  costo: number;
  moneda: string;
  duracionMinutos: number | null;
}

export function listarProcedimientos(): Promise<ProcedimientoMedico[]> {
  return request(`/api/salud/procedimientos`);
}

export function crearProcedimiento(tenantId: number, datos: Omit<ProcedimientoMedico, "id">): Promise<ProcedimientoMedico> {
  return request(`/api/salud/procedimientos?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export interface ConsultaMedica {
  id: number;
  motivoConsulta: string;
  descripcionDiagnostico?: string;
  planTratamiento?: string;
  fechaHora?: string;
}

export function historialConsultasPaciente(pacienteId: number): Promise<ConsultaMedica[]> {
  return request(`/api/salud/consultas/paciente/${pacienteId}`);
}

export function registrarConsulta(tenantId: number, pacienteId: number, datos: Partial<ConsultaMedica>): Promise<ConsultaMedica> {
  return request(`/api/salud/consultas?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ paciente: { id: pacienteId }, ...datos }),
  });
}

// --- Horeca / Restaurantes ---

export interface Mesa {
  id: number;
  tenantId: number;
  numero: number;
  capacidad: number | null;
  zona: string | null;
  posX: number | null;
  posY: number | null;
  ancho: number | null;
  alto: number | null;
  forma: string;
}

export type EstadoComanda = "ABIERTA" | "PAGADA" | "ANULADA";

export interface Comanda {
  id: number;
  tenantId: number;
  numeroMesa: number | null;
  mesero: string;
  canal: string;
  nombreCliente: string | null;
  telefonoCliente: string | null;
  direccionEntrega: string | null;
  mensajero: string | null;
  estado: EstadoComanda;
  totalConsumo: number;
  fechaApertura: string;
  metodoPago: string | null;
  fechaCierre: string | null;
}

export interface MapaMesaEntrada {
  mesa: Mesa;
  estado: "LIBRE" | "OCUPADA";
  comandaAbierta: Comanda | null;
}

export type EstadoItemComanda = "PENDIENTE" | "PREPARANDO" | "LISTO" | "ENTREGADO";

export interface ItemComanda {
  id: number;
  tenantId: number;
  nombrePlato: string;
  estacionCocina: string;
  estadoItem: EstadoItemComanda;
  cantidad: number;
  precioUnitario: number;
}

export function listarMesas(): Promise<Mesa[]> {
  return request(`/api/horeca/mesas-fisicas`);
}

export function crearMesa(tenantId: number, datos: { numero: number; capacidad?: number; zona?: string }): Promise<Mesa> {
  return request(`/api/horeca/mesas-fisicas?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function actualizarPosicionMesa(tenantId: number, mesaId: number, datos: { posX: number; posY: number; ancho?: number; alto?: number; forma?: string }): Promise<Mesa> {
  return request(`/api/horeca/mesas-fisicas/${mesaId}/posicion?tenantId=${tenantId}`, { method: "PUT", body: JSON.stringify(datos) });
}

export function mapaDeMesas(): Promise<MapaMesaEntrada[]> {
  return request(`/api/horeca/mesas-fisicas/mapa`);
}

export function abrirComanda(tenantId: number, datos: {
  numeroMesa?: number; mesero: string; canal?: string; nombreCliente?: string;
  telefonoCliente?: string; direccionEntrega?: string; mensajero?: string;
}): Promise<Comanda> {
  const params = new URLSearchParams({ tenantId: String(tenantId), mesero: datos.mesero });
  if (datos.numeroMesa != null) params.set("numeroMesa", String(datos.numeroMesa));
  if (datos.canal) params.set("canal", datos.canal);
  if (datos.nombreCliente) params.set("nombreCliente", datos.nombreCliente);
  if (datos.telefonoCliente) params.set("telefonoCliente", datos.telefonoCliente);
  if (datos.direccionEntrega) params.set("direccionEntrega", datos.direccionEntrega);
  if (datos.mensajero) params.set("mensajero", datos.mensajero);
  return request(`/api/horeca/mesas/comandas/abrir?${params}`, { method: "POST" });
}

export function agregarItemComanda(tenantId: number, comandaId: number, datos: {
  escandalloId?: number; nombrePlato?: string; estacionCocina?: string; cantidad: number; precioUnitario?: number;
}): Promise<ItemComanda> {
  const params = new URLSearchParams({ tenantId: String(tenantId), cantidad: String(datos.cantidad) });
  if (datos.escandalloId != null) params.set("escandalloId", String(datos.escandalloId));
  if (datos.nombrePlato) params.set("nombrePlato", datos.nombrePlato);
  if (datos.estacionCocina) params.set("estacionCocina", datos.estacionCocina);
  if (datos.precioUnitario != null) params.set("precioUnitario", String(datos.precioUnitario));
  return request(`/api/horeca/mesas/comandas/${comandaId}/items?${params}`, { method: "POST" });
}

export function actualizarEstadoItem(tenantId: number, itemId: number, nuevoEstado: EstadoItemComanda): Promise<ItemComanda> {
  return request(`/api/horeca/mesas/items/${itemId}/estado?tenantId=${tenantId}&nuevoEstado=${nuevoEstado}`, { method: "PATCH" });
}

export function obtenerTableroKds(estacionCocina: string): Promise<ItemComanda[]> {
  return request(`/api/horeca/mesas/kds/${encodeURIComponent(estacionCocina)}`);
}

export function dividirCuenta(tenantId: number, comandaId: number, numeroPersonas: number): Promise<number[]> {
  return request(`/api/horeca/mesas/comandas/${comandaId}/dividir?tenantId=${tenantId}&numeroPersonas=${numeroPersonas}`, { method: "POST" });
}

export function cerrarComanda(tenantId: number, comandaId: number, datos: {
  metodoPago: string; monedaPago?: string; montoRecibido?: number;
}): Promise<Comanda> {
  const params = new URLSearchParams({ tenantId: String(tenantId), metodoPago: datos.metodoPago });
  if (datos.monedaPago) params.set("monedaPago", datos.monedaPago);
  if (datos.montoRecibido != null) params.set("montoRecibido", String(datos.montoRecibido));
  return request(`/api/horeca/mesas/comandas/${comandaId}/cerrar?${params}`, { method: "POST" });
}

export interface EscandalloReceta {
  id: number;
  tenantId: number;
  nombrePlato: string;
  costoTotalProduccion: number;
  estacionCocina: string;
  precioVenta: number;
}

export interface DetalleReceta {
  id: number;
  tenantId: number;
  ingredienteSku: string | null;
  subReceta: EscandalloReceta | null;
  cantidadRequerida: number;
  pesoNeto: number | null;
  porcentajeMerma: number | null;
}

export function listarEscandallos(): Promise<EscandalloReceta[]> {
  return request(`/api/horeca/escandallos`);
}

export function crearEscandallo(tenantId: number, datos: { nombrePlato: string; estacionCocina?: string; precioVenta: number }): Promise<EscandalloReceta> {
  return request(`/api/horeca/escandallos?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function agregarIngredienteEscandallo(tenantId: number, escandalloId: number, datos: {
  ingredienteSku?: string; subEscandalloId?: number; cantidadRequerida?: number; pesoNeto?: number; porcentajeMerma?: number;
}): Promise<EscandalloReceta> {
  return request(`/api/horeca/escandallos/${escandalloId}/ingredientes?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function listarIngredientesEscandallo(escandalloId: number): Promise<DetalleReceta[]> {
  return request(`/api/horeca/escandallos/${escandalloId}/ingredientes`);
}

export interface FastBarTrago {
  id: number;
  tenantId: number;
  nombreTrago: string;
  botellaSku: string | null;
  mililitrosPorTrago: number | null;
  precioVenta: number;
}

export function listarFastBar(tenantId: number): Promise<FastBarTrago[]> {
  return request(`/api/horeca/fastbar?tenantId=${tenantId}`);
}

export function crearTragoFastBar(tenantId: number, datos: { nombreTrago: string; botellaSku?: string; mililitrosPorTrago?: number; precioVenta: number }): Promise<FastBarTrago> {
  return request(`/api/horeca/fastbar?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function venderTragoRapido(tenantId: number, fastBarTragoId: number, cantidadTragos: number): Promise<number> {
  return request(`/api/horeca/fastbar/vender?tenantId=${tenantId}&fastBarTragoId=${fastBarTragoId}&cantidadTragos=${cantidadTragos}`, { method: "POST" });
}

export interface ProveedorHoreca {
  id: number;
  tenantId: number;
  nombre: string;
  rif: string | null;
  telefono: string | null;
  contacto: string | null;
  direccion: string | null;
  activo: boolean;
}

export function listarProveedoresHoreca(): Promise<ProveedorHoreca[]> {
  return request(`/api/horeca/proveedores`);
}

export function crearProveedorHoreca(tenantId: number, datos: { nombre: string; rif?: string; telefono?: string; contacto?: string; direccion?: string }): Promise<ProveedorHoreca> {
  return request(`/api/horeca/proveedores?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

// --- Inventario: artículos, compras y vencimientos ---

export interface Articulo {
  id: number;
  tenantId: number;
  sku: string;
  nombre: string;
  unidadMedida: string | null;
  categoria: string | null;
  stockActual: number;
  costoUnitario: number;
  stockMinimo: number | null;
}

export function listarArticulos(): Promise<Articulo[]> {
  return request(`/api/inventario/articulos`);
}

export function crearArticulo(tenantId: number, datos: { sku: string; nombre: string; unidadMedida?: string; categoria?: string; costoUnitario?: number; stockMinimo?: number }): Promise<Articulo> {
  return request(`/api/inventario/articulos?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function entradaArticulo(tenantId: number, articuloId: number, datos: { cantidad: number; costoUnitario?: number; motivo?: string; fechaVencimiento?: string }): Promise<unknown> {
  return request(`/api/inventario/articulos/${articuloId}/entrada?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export interface ItemCompraInsumo {
  articuloId: number;
  cantidad: number;
  costoUnitario: number;
  presentacionId?: number;
  fechaVencimiento?: string; // yyyy-MM-dd — si viene, crea un lote rastreable para alertas
}

export function registrarCompraInsumo(tenantId: number, datos: { proveedorId: number; numeroFactura: string; items: ItemCompraInsumo[] }): Promise<CompraInsumoHoreca> {
  return request(`/api/horeca/compras-insumo?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export interface CompraInsumoHoreca {
  id: number;
  tenantId: number;
  proveedor: ProveedorHoreca;
  numeroFactura: string | null;
  fechaCompra: string;
  total: number;
}

export function listarComprasInsumo(): Promise<CompraInsumoHoreca[]> {
  return request(`/api/horeca/compras-insumo`);
}

export interface LoteArticulo {
  id: number;
  tenantId: number;
  articulo: Articulo;
  cantidadIngresada: number;
  costoUnitario: number;
  fechaVencimiento: string; // yyyy-MM-dd
  referenciaCompra: string | null;
  fechaIngreso: string;
}

export function alertasVencimiento(tenantId: number, diasAnticipacion = 7): Promise<LoteArticulo[]> {
  return request(`/api/inventario/lotes/alertas-vencimiento?tenantId=${tenantId}&diasAnticipacion=${diasAnticipacion}`);
}

// --- Comandas: historial e ítems (antes solo se podía crear/modificar, no consultar) ---

export function listarComandas(tenantId: number, estado?: EstadoComanda): Promise<Comanda[]> {
  const params = new URLSearchParams({ tenantId: String(tenantId) });
  if (estado) params.set("estado", estado);
  return request(`/api/horeca/comandas?${params}`);
}

export function obtenerComanda(tenantId: number, comandaId: number): Promise<Comanda> {
  return request(`/api/horeca/comandas/${comandaId}?tenantId=${tenantId}`);
}

export function obtenerItemsComanda(tenantId: number, comandaId: number): Promise<ItemComanda[]> {
  return request(`/api/horeca/comandas/${comandaId}/items?tenantId=${tenantId}`);
}

// --- Tesorería (genérico, cualquier vertical) ---

export interface ResumenPeriodoAbierto {
  desde: string;
  hasta: string;
  totalIngresos: number;
  totalEgresos: number;
  montoEsperadoEnCaja: number;
  cantidadMovimientos: number;
}

export function resumenPeriodoAbierto(tenantId: number, moneda: string): Promise<ResumenPeriodoAbierto> {
  return request(`/api/financiero/tesoreria/resumen-periodo-abierto?tenantId=${tenantId}&moneda=${moneda}`);
}

export interface ArqueoCaja {
  id: number;
  tenantId: number;
  idCajero: string;
  moneda: string;
  montoDeclarado: number;
  montoEsperado: number;
  diferencia: number;
  fechaArqueo: string;
}

export function cerrarCaja(tenantId: number, datos: { idCajero: string; montoDeclarado: number; moneda: string }): Promise<ArqueoCaja> {
  const params = new URLSearchParams({ tenantId: String(tenantId), idCajero: datos.idCajero, montoDeclarado: String(datos.montoDeclarado), moneda: datos.moneda });
  return request(`/api/financiero/tesoreria/cerrar-caja?${params}`, { method: "POST" });
}

export function historialCierres(): Promise<ArqueoCaja[]> {
  return request(`/api/financiero/tesoreria/historial-cierres`);
}

// Descarga el PDF del cierre autenticado (no puede ser un <a href> plano — necesita el Bearer token).
export async function descargarCierrePdf(tenantId: number, arqueoId: number): Promise<Blob> {
  const sesion = leerSesion();
  const headers: Record<string, string> = {};
  if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;
  const res = await fetch(`/api/financiero/tesoreria/cierre/${arqueoId}/pdf?tenantId=${tenantId}`, { headers });
  if (res.status === 401) {
    manejarSesionVencida();
    throw new ApiError("Sesión vencida — redirigiendo al login");
  }
  if (!res.ok) throw new ApiError(`Error ${res.status}`);
  return res.blob();
}

export function monedaBase(tenantId: number): Promise<string> {
  return requestText(`/api/financiero/tasas/moneda-base?tenantId=${tenantId}`);
}

export interface TasaCambio {
  id: number;
  tenantId: number;
  monedaOrigen: string;
  monedaDestino: string;
  tasa: number;
  origen: string;
  fechaActualizacion: string;
}

export function tasaVigente(tenantId: number, monedaOrigen: string, monedaDestino: string): Promise<TasaCambio> {
  return request(`/api/financiero/tasas/vigente?tenantId=${tenantId}&monedaOrigen=${monedaOrigen}&monedaDestino=${monedaDestino}`);
}

export function actualizarTasa(tenantId: number, datos: { monedaOrigen: string; monedaDestino: string; tasa: number; origen?: string }): Promise<TasaCambio> {
  return request(`/api/financiero/tasas?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export type TipoMovimientoCaja = "INGRESO" | "EGRESO" | "CXC" | "CXP";

export interface MovimientoCaja {
  id: number;
  tenantId: number;
  tipo: TipoMovimientoCaja;
  monto: number;
  moneda: string;
  concepto: string;
  fechaRegistro: string;
}

export function registrarMovimiento(tenantId: number, datos: { tipo: "INGRESO" | "EGRESO"; monto: number; moneda: string; concepto: string }): Promise<MovimientoCaja> {
  return request(`/api/financiero/movimientos?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function listarMovimientos(tenantId: number, tipo?: TipoMovimientoCaja): Promise<MovimientoCaja[]> {
  const params = new URLSearchParams({ tenantId: String(tenantId) });
  if (tipo) params.set("tipo", tipo);
  return request(`/api/financiero/movimientos?${params}`);
}

// --- Licenciamiento: contratar una vertical adicional sobre el mismo tenant ---

export function agregarModulo(moduloNombre: string): Promise<{ moduloNombre: string; activo: boolean }> {
  return request(`/api/config/mi-negocio/agregar-modulo`, { method: "POST", body: JSON.stringify({ moduloNombre }) });
}
