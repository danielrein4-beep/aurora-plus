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

export class ApiError extends Error {
  /** Código HTTP real de la respuesta del backend. Si es `undefined`, el backend NUNCA respondió
   * (fetch falló a nivel de red/DNS/CORS/502 de un proxy) — eso es lo único que distingue un
   * "no hay conexión" real de un rechazo legítimo del backend (credenciales inválidas, validación,
   * etc.), que siempre trae un status. No usar el texto del mensaje para adivinar esto: es frágil
   * (un mensaje de negocio real podría contener casualmente palabras como "servidor").
   */
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

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
    // Un 401 en un endpoint de /api/auth/ (ej. login con credenciales incorrectas) es un rechazo
    // normal del intento de autenticación, no una sesión vencida — no debe forzar la redirección a
    // /auth (ya estamos ahí) ni pisar el mensaje real con uno genérico de "sesión vencida".
    if (!path.includes("/api/auth/")) {
      manejarSesionVencida();
      throw new ApiError("Sesión vencida — redirigiendo al login", 401);
    }
    throw new ApiError("Usuario o contraseña incorrectos", 401);
  }
  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const body = await res.json();
      mensaje = body.message || body.error || mensaje;
    } catch {
      // el backend a veces responde texto plano en errores no controlados
    }
    throw new ApiError(mensaje, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Formulario público de "Contáctanos" (Nosotros.tsx) — antes solo hacía
// setEnviado(true) sin llamar a ningún lado, así que "te contactaremos en
// 24h" era falso.
export async function enviarContacto(datos: {
  nombre: string;
  empresa?: string;
  email: string;
  industria?: string;
  mensaje?: string;
}): Promise<{ message: string }> {
  return request<{ message: string }>("/api/public/contacto", {
    method: "POST",
    body: JSON.stringify(datos),
  });
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

/** Solicita el correo de recuperación de contraseña — el backend siempre responde éxito genérico
 * (exista o no la cuenta) para no revelar qué correos están registrados. */
export function solicitarRecuperacionClave(email: string): Promise<{ message: string }> {
  return request(`/api/auth/olvide-clave`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetearClave(token: string, nuevaClave: string): Promise<{ message: string }> {
  return request(`/api/auth/resetear-clave`, {
    method: "POST",
    body: JSON.stringify({ token, nuevaClave }),
  });
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

/** Moneda principal del negocio (USD/VES/COP) — la usa todo el motor financiero (tasas, conversiones, caja) como base de precios. Solo el Dueño/Administrador la puede cambiar. */
export function obtenerMonedaBaseNegocio(): Promise<{ monedaBase: string }> {
  return request("/api/config/mi-negocio/moneda-base");
}

export function actualizarMonedaBaseNegocio(monedaBase: string): Promise<{ monedaBase: string }> {
  return request("/api/config/mi-negocio/moneda-base", { method: "PUT", body: JSON.stringify({ monedaBase }) });
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
  grupoSanguineo?: string | null;
  alergias?: string | null;
  antecedentesPatologicos?: string | null;
  antecedentesQuirurgicos?: string | null;
  antecedentesFamiliares?: string | null;
  contactoEmergenciaNombre?: string | null;
  contactoEmergenciaTelefono?: string | null;
}

export async function listarPacientes(tenantId: number): Promise<Paciente[]> {
  return request<Paciente[]>(`/api/salud/pacientes?tenantId=${tenantId}`);
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
  grupoSanguineo?: string;
  alergias?: string;
  antecedentesPatologicos?: string;
  antecedentesQuirurgicos?: string;
  antecedentesFamiliares?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
}

export async function crearPaciente(tenantId: number, datos: NuevoPaciente): Promise<Paciente> {
  return request<Paciente>(`/api/salud/pacientes?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function actualizarPaciente(tenantId: number, id: number, datos: NuevoPaciente): Promise<Paciente> {
  return request<Paciente>(`/api/salud/pacientes/${id}?tenantId=${tenantId}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export async function buscarPacientePorIdentificacion(tenantId: number, identificacion: string): Promise<Paciente | null> {
  try {
    return await request<Paciente>(`/api/salud/pacientes/identificacion/${encodeURIComponent(identificacion)}?tenantId=${tenantId}`);
  } catch (err) {
    if (err instanceof ApiError && /404/.test(err.message)) return null;
    throw err;
  }
}

export async function eliminarPaciente(id: number): Promise<void> {
  await request(`/api/salud/pacientes/${id}`, { method: "DELETE" });
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

export async function listarCitasDelDia(tenantId: number, fecha: string): Promise<CitaMedica[]> {
  return request<CitaMedica[]>(`/api/salud/agenda?tenantId=${tenantId}&fecha=${fecha}`);
}

/** Citas de un rango de fechas (ej. el mes visible en el calendario) — una sola llamada en vez de una por día. */
export async function listarCitasPorRango(tenantId: number, fechaInicio: string, fechaFin: string): Promise<CitaMedica[]> {
  return request<CitaMedica[]>(`/api/salud/agenda?tenantId=${tenantId}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
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

export async function agendarCita(tenantId: number, datos: NuevaCita): Promise<CitaMedica> {
  return request<CitaMedica>(`/api/salud/agenda/citas?tenantId=${tenantId}`, {
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

/** Cambia el estado de una cita (ej. CANCELADA, ATENDIDA, NO_ASISTIO) — la agenda nunca borra una cita, la marca. */
export function actualizarEstadoCita(id: number, estado: string): Promise<CitaMedica> {
  return request<CitaMedica>(`/api/salud/agenda/citas/${id}/estado?estado=${estado}`, { method: "PATCH" });
}

/** Mueve una cita a otra fecha/hora, con la misma validación de solapamiento que agendar una nueva. */
export function reprogramarCita(id: number, fecha: string, horaInicio: string, horaFin: string): Promise<CitaMedica> {
  return request<CitaMedica>(`/api/salud/agenda/citas/${id}/reprogramar`, {
    method: "PATCH",
    body: JSON.stringify({ fecha, horaInicio, horaFin }),
  });
}

export interface BloqueoAgenda {
  id: number;
  medicoId: number;
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string | null;
  horaFin: string | null;
  motivo: string;
}

/** Bloquea un día (o rango) completo de la agenda de un médico — ej. día no laborable, feriado, congreso. */
export function registrarBloqueoAgenda(tenantId: number, datos: { fechaInicio: string; fechaFin: string; motivo: string }): Promise<BloqueoAgenda> {
  return request<BloqueoAgenda>(`/api/salud/agenda/bloqueos?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function listarBloqueosAgenda(medicoId: number): Promise<BloqueoAgenda[]> {
  return request<BloqueoAgenda[]>(`/api/salud/agenda/bloqueos/medico/${medicoId}`);
}

export function eliminarBloqueoAgenda(id: number): Promise<void> {
  return request<void>(`/api/salud/agenda/bloqueos/${id}`, { method: "DELETE" });
}

export interface CobroConsulta {
  id: number;
  montoTotal: number;
  monedaCobrada: string;
  estado: string;
}

export async function listarCobrosDelDia(inicioIso: string, finIso: string): Promise<CobroConsulta[]> {
  try {
    return await request(`/api/salud/cobros/reporte?inicio=${inicioIso}&fin=${finIso}`);
  } catch {
    return [];
  }
}

export interface NuevoCobro {
  pacienteId?: number;
  concepto: string;
  montoTotal: number;
  monedaCobrada: string;
  montoRecibido: number;
  monedaPago: string;
  metodoPago: "EFECTIVO" | "TRANSFERENCIA" | "PUNTO_VENTA" | "PAGO_MOVIL" | "ZELLE" | "OTRO";
  referenciaPago?: string;
}

function generarClaveIdempotencia(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `cobro-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Registra un cobro real en el backend (tabla salud_cobros_consulta) — idempotente: reintentar
 * con la misma claveIdempotencia (generada una vez por intento de cobro, no por request) nunca
 * duplica el movimiento de caja. */
export function procesarCobro(tenantId: number, datos: NuevoCobro, claveIdempotencia?: string): Promise<CobroConsulta> {
  return request<CobroConsulta>(`/api/salud/cobros?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({
      claveIdempotencia: claveIdempotencia || generarClaveIdempotencia(),
      pacienteId: datos.pacienteId,
      concepto: datos.concepto,
      montoTotal: datos.montoTotal,
      monedaCobrada: datos.monedaCobrada,
      montoRecibido: datos.montoRecibido,
      monedaPago: datos.monedaPago,
      metodoPago: datos.metodoPago,
      referenciaPago: datos.referenciaPago,
    }),
  });
}

export interface CierreCajaRegistro {
  id: number;
  fecha: string;
  horaCierre: string;
  responsableNombre?: string;
  tasaBCV?: number;
  tasaCOP?: number;
  totalUSD: number;
  totalVES: number;
  totalCOP?: number;
  totalPacientes: number;
  observaciones?: string;
}

export function listarCierresCaja(): Promise<CierreCajaRegistro[]> {
  return request<CierreCajaRegistro[]>(`/api/salud/cierres-caja`);
}

export function registrarCierreCaja(tenantId: number, datos: Omit<CierreCajaRegistro, "id">): Promise<CierreCajaRegistro> {
  return request<CierreCajaRegistro>(`/api/salud/cierres-caja?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function eliminarCierreCaja(id: number): Promise<void> {
  return request<void>(`/api/salud/cierres-caja/${id}`, { method: "DELETE" });
}

export interface SalaEsperaEntrada {
  id: number;
  paciente: Paciente;
  consultorio: string | null;
  estado: string;
  horaLlegada: string;
}

export async function listarSalaEspera(tenantId: number = 1): Promise<SalaEsperaEntrada[]> {
  return request<SalaEsperaEntrada[]>(`/api/salud/sala-espera?tenantId=${tenantId}`);
}

export async function registrarLlegadaSalaEspera(
  tenantId: number,
  pacienteId: number,
  consultorio?: string
): Promise<SalaEsperaEntrada> {
  return request<SalaEsperaEntrada>(`/api/salud/sala-espera/check-in?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ paciente: { id: pacienteId }, consultorio }),
  });
}

export async function finalizarAtencionSalaEspera(id: number, tenantId: number = 1): Promise<SalaEsperaEntrada> {
  return request(`/api/salud/sala-espera/${id}/finalizar?tenantId=${tenantId}`, { method: "POST" });
}

export interface ProcedimientoMedico {
  id: number;
  nombre: string;
  descripcion: string | null;
  costo: number;
  moneda: string;
  duracionMinutos: number | null;
}

export async function listarProcedimientos(tenantId: number = 1): Promise<ProcedimientoMedico[]> {
  return request<ProcedimientoMedico[]>(`/api/salud/procedimientos?tenantId=${tenantId}`);
}

export async function crearProcedimiento(
  tenantId: number,
  datos: Omit<ProcedimientoMedico, "id">
): Promise<ProcedimientoMedico> {
  return request<ProcedimientoMedico>(`/api/salud/procedimientos?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export interface CotizacionMedicaApi {
  id: number;
  paciente: Paciente;
  procedimientoNombre: string;
  descripcion: string | null;
  costoUSD: number;
  costoVES: number | null;
  costoCOP: number | null;
  tasaBCV: number | null;
  tasaCOP: number | null;
  estado: "COTIZADA" | "PLANIFICADA" | "REALIZADA" | "CANCELADA";
  fecha: string;
  fechaPlanificada: string | null;
}

export interface NuevaCotizacion {
  pacienteId: number;
  procedimientoNombre: string;
  descripcion?: string;
  costoUSD: number;
  costoVES?: number;
  costoCOP?: number;
  tasaBCV?: number;
  tasaCOP?: number;
  fechaPlanificada?: string;
}

export function listarCotizaciones(): Promise<CotizacionMedicaApi[]> {
  return request<CotizacionMedicaApi[]>(`/api/salud/cotizaciones`);
}

export function crearCotizacion(tenantId: number, datos: NuevaCotizacion): Promise<CotizacionMedicaApi> {
  return request<CotizacionMedicaApi>(`/api/salud/cotizaciones?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ paciente: { id: datos.pacienteId }, ...datos }),
  });
}

export function actualizarEstadoCotizacion(id: number, estado: CotizacionMedicaApi["estado"]): Promise<CotizacionMedicaApi> {
  return request<CotizacionMedicaApi>(`/api/salud/cotizaciones/${id}/estado?estado=${estado}`, { method: "PATCH" });
}

export function eliminarCotizacion(id: number): Promise<void> {
  return request<void>(`/api/salud/cotizaciones/${id}`, { method: "DELETE" });
}

export interface ConsultaMedica {
  id: number;
  motivoConsulta: string;
  descripcionDiagnostico?: string;
  /** Código CIE-10 del diagnóstico principal — es el dato que alimenta el Canal Endémico (ver CanalEndemico.tsx). */
  diagnosticoPrincipalCIE10?: string;
  planTratamiento?: string;
  anotacionesPrivadas?: string;
  observacionFisica?: string;
  talla?: string;
  peso?: string;
  evolucionClinica?: string;
  /** Cómo llegó el paciente respecto a su visita anterior — alimenta la gráfica de
   * tendencia de evolución en Historias Clínicas. Solo tiene sentido en consultas de
   * seguimiento (no en la primera visita de un paciente). */
  evolucionEstado?: "MEJORO" | "IGUAL" | "EMPEORO";
  fechaHora?: string;
  fechaConsulta?: string;
}

export async function historialConsultasPaciente(pacienteId: number): Promise<ConsultaMedica[]> {
  return request<ConsultaMedica[]>(`/api/salud/consultas/paciente/${pacienteId}`);
}

export async function registrarConsulta(
  tenantId: number,
  pacienteId: number,
  datos: Partial<ConsultaMedica>
): Promise<ConsultaMedica> {
  return request<ConsultaMedica>(`/api/salud/consultas?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ paciente: { id: pacienteId }, ...datos }),
  });
}

export async function eliminarConsulta(
  tenantId: number,
  _pacienteId: number,
  consultaId: number
): Promise<void> {
  await request(`/api/salud/consultas/${consultaId}?tenantId=${tenantId}`, {
    method: "DELETE",
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
  motivoAnulacion: string | null;
  fechaAnulacion: string | null;
  anuladoPor: string | null;
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
  fechaCreacion: string;
  notas?: string;
}

export function listarMesas(): Promise<Mesa[]> {
  return request(`/api/horeca/mesas-fisicas`);
}

export function crearMesa(tenantId: number, datos: { numero: number; capacidad?: number; zona?: string; forma?: string }): Promise<Mesa> {
  return request(`/api/horeca/mesas-fisicas?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function actualizarPosicionMesa(tenantId: number, mesaId: number, datos: { posX: number; posY: number; ancho?: number; alto?: number; forma?: string }): Promise<Mesa> {
  return request(`/api/horeca/mesas-fisicas/${mesaId}/posicion?tenantId=${tenantId}`, { method: "PUT", body: JSON.stringify(datos) });
}

export function editarMesa(tenantId: number, mesaId: number, datos: { numero?: number; capacidad?: number; zona?: string; forma?: string }): Promise<Mesa> {
  return request(`/api/horeca/mesas-fisicas/${mesaId}?tenantId=${tenantId}`, { method: "PUT", body: JSON.stringify(datos) });
}

export function eliminarMesa(tenantId: number, mesaId: number): Promise<void> {
  return request(`/api/horeca/mesas-fisicas/${mesaId}?tenantId=${tenantId}`, { method: "DELETE" });
}

export function mapaDeMesas(): Promise<MapaMesaEntrada[]> {
  return request(`/api/horeca/mesas-fisicas/mapa`);
}

export function abrirComanda(tenantId: number, datos: {
  numeroMesa?: number; mesero: string; canal?: string; nombreCliente?: string;
  telefonoCliente?: string; direccionEntrega?: string; mensajero?: string; clienteId?: number;
}): Promise<Comanda> {
  const params = new URLSearchParams({ tenantId: String(tenantId), mesero: datos.mesero });
  if (datos.numeroMesa != null) params.set("numeroMesa", String(datos.numeroMesa));
  if (datos.canal) params.set("canal", datos.canal);
  if (datos.nombreCliente) params.set("nombreCliente", datos.nombreCliente);
  if (datos.telefonoCliente) params.set("telefonoCliente", datos.telefonoCliente);
  if (datos.direccionEntrega) params.set("direccionEntrega", datos.direccionEntrega);
  if (datos.mensajero) params.set("mensajero", datos.mensajero);
  if (datos.clienteId != null) params.set("clienteId", String(datos.clienteId));
  return request(`/api/horeca/mesas/comandas/abrir?${params}`, { method: "POST" });
}

export function agregarItemComanda(tenantId: number, comandaId: number, datos: {
  escandalloId?: number; articuloId?: number; fastBarTragoId?: number; nombrePlato?: string; estacionCocina?: string; cantidad: number; precioUnitario?: number; notas?: string;
}): Promise<ItemComanda> {
  const params = new URLSearchParams({ tenantId: String(tenantId), cantidad: String(datos.cantidad) });
  if (datos.escandalloId != null) params.set("escandalloId", String(datos.escandalloId));
  if (datos.articuloId != null) params.set("articuloId", String(datos.articuloId));
  if (datos.fastBarTragoId != null) params.set("fastBarTragoId", String(datos.fastBarTragoId));
  if (datos.nombrePlato) params.set("nombrePlato", datos.nombrePlato);
  if (datos.estacionCocina) params.set("estacionCocina", datos.estacionCocina);
  if (datos.precioUnitario != null) params.set("precioUnitario", String(datos.precioUnitario));
  if (datos.notas) params.set("notas", datos.notas);
  return request(`/api/horeca/mesas/comandas/${comandaId}/items?${params}`, { method: "POST" });
}

export function actualizarEstadoItem(tenantId: number, itemId: number, nuevoEstado: EstadoItemComanda): Promise<ItemComanda> {
  return request(`/api/horeca/mesas/items/${itemId}/estado?tenantId=${tenantId}&nuevoEstado=${nuevoEstado}`, { method: "PATCH" });
}

export function obtenerTableroKds(tenantId: number, estacionCocina: string): Promise<ItemComanda[]> {
  return request(`/api/horeca/mesas/kds/${encodeURIComponent(estacionCocina)}?tenantId=${tenantId}`);
}

export interface ResumenUtilidadProducto {
  nombrePlato: string;
  cantidadVendida: number;
  ingresoTotal: number;
  costoTotal: number;
  utilidad: number;
}

/** Utilidad por producto del día (o de la fecha indicada, formato YYYY-MM-DD) — para el resumen diario de Administración. */
export function utilidadDiaria(tenantId: number, fecha?: string): Promise<ResumenUtilidadProducto[]> {
  const params = new URLSearchParams({ tenantId: String(tenantId) });
  if (fecha) params.set("fecha", fecha);
  return request(`/api/horeca/mesas/reportes/utilidad-diaria?${params}`);
}

export interface ReporteTicket {
  comandaId: number;
  numeroTicket: string;
  fecha: string;
  totalUsd: number;
  totalBs: number | null; // null si no había tasa BCV registrada para ese día
  metodoPago: string | null;
  estado: "ABIERTA" | "PAGADA" | "ANULADA";
  canal: string;
  numeroMesa: number | null;
}

/** Reportes Operativos: listado de tickets con filtros dinámicos (todos opcionales) — motor de solo lectura, aparte del flujo del POS. */
export function reporteTickets(tenantId: number, filtros: {
  fechaInicio?: string; fechaFin?: string; metodoPago?: string; estado?: "ABIERTA" | "PAGADA" | "ANULADA";
}): Promise<ReporteTicket[]> {
  const params = new URLSearchParams({ tenantId: String(tenantId) });
  if (filtros.fechaInicio) params.set("fechaInicio", filtros.fechaInicio);
  if (filtros.fechaFin) params.set("fechaFin", filtros.fechaFin);
  if (filtros.metodoPago) params.set("metodoPago", filtros.metodoPago);
  if (filtros.estado) params.set("estado", filtros.estado);
  return request(`/api/horeca/reportes/tickets?${params}`);
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

export interface PagoParcial {
  metodoPago: string; // EFECTIVO, TARJETA, TRANSFERENCIA, BILLETERA_DIGITAL
  moneda: string; // moneda en la que el cliente entrega ESTA línea, ej. USD, VES
  monto: number; // monto entregado en esa moneda
}

export interface PagoVenta {
  id: number;
  metodoPago: string;
  moneda: string;
  monto: number;
  montoEquivalenteBase: number;
  tasaAplicada: number | null;
  fechaPago: string;
}

export interface ResultadoCobroMixto {
  comanda: Comanda;
  pagos: PagoVenta[];
  totalBase: number;
  monedaBase: string;
  totalRecibidoBase: number;
  vueltoBase: number;
  monedaVuelto: string;
  vueltoEnMonedaVuelto: number;
  vueltoVes: number | null;
}

/** Cobro mixto: cierra la comanda con varias líneas de pago simultáneas (ej. parte USD efectivo + resto Bs Pago Móvil). */
export function cerrarComandaMixto(tenantId: number, comandaId: number, pagos: PagoParcial[], monedaVuelto?: string): Promise<ResultadoCobroMixto> {
  const params = new URLSearchParams({ tenantId: String(tenantId) });
  if (monedaVuelto) params.set("monedaVuelto", monedaVuelto);
  return request(`/api/horeca/mesas/comandas/${comandaId}/cerrar-mixto?${params}`, {
    method: "POST",
    body: JSON.stringify(pagos),
  });
}

/** Anula una comanda ABIERTA o PAGADA: revierte inventario/recetas y, si ya estaba cobrada, también la caja. Nunca borra nada. */
export function anularComanda(tenantId: number, comandaId: number, datos: { motivo: string; usuario?: string }): Promise<Comanda> {
  const params = new URLSearchParams({ tenantId: String(tenantId), motivo: datos.motivo });
  if (datos.usuario) params.set("usuario", datos.usuario);
  return request(`/api/horeca/mesas/comandas/${comandaId}/anular?${params}`, { method: "POST" });
}

export interface EscandalloReceta {
  id: number;
  tenantId: number;
  nombrePlato: string;
  costoTotalProduccion: number;
  estacionCocina: string;
  precioVenta: number;
  activo: boolean;
  requiereCocina: boolean;
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

export function crearEscandallo(tenantId: number, datos: { nombrePlato: string; estacionCocina?: string; precioVenta: number; requiereCocina?: boolean }): Promise<EscandalloReceta> {
  return request(`/api/horeca/escandallos?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

// Si la receta ya tiene ventas, el backend no la borra: la marca inactiva
// (desaparece de Venta Rápida) y devuelve el escandallo actualizado en vez
// de nada — por eso el tipo de retorno no es void.
export function eliminarEscandallo(tenantId: number, escandalloId: number): Promise<EscandalloReceta | void> {
  return request(`/api/horeca/escandallos/${escandalloId}?tenantId=${tenantId}`, { method: "DELETE" });
}

export function cambiarActivoEscandallo(tenantId: number, escandalloId: number, activo: boolean): Promise<EscandalloReceta> {
  return request(`/api/horeca/escandallos/${escandalloId}/activo?tenantId=${tenantId}&activo=${activo}`, { method: "PATCH" });
}

export function cambiarRequiereCocinaEscandallo(tenantId: number, escandalloId: number, requiereCocina: boolean): Promise<EscandalloReceta> {
  return request(`/api/horeca/escandallos/${escandalloId}/requiere-cocina?tenantId=${tenantId}&requiereCocina=${requiereCocina}`, { method: "PATCH" });
}

export function agregarIngredienteEscandallo(tenantId: number, escandalloId: number, datos: {
  ingredienteSku?: string; subEscandalloId?: number; cantidadRequerida?: number; pesoNeto?: number; porcentajeMerma?: number;
}): Promise<EscandalloReceta> {
  return request(`/api/horeca/escandallos/${escandalloId}/ingredientes?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function listarIngredientesEscandallo(tenantId: number, escandalloId: number): Promise<DetalleReceta[]> {
  return request(`/api/horeca/escandallos/${escandalloId}/ingredientes?tenantId=${tenantId}`);
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
  precioVenta: number;
  stockMinimo: number | null;
  // Moneda en la que se compró de verdad este artículo y el monto tal cual
  // se tecleó en esa moneda (costoUnitario arriba siempre está en la moneda
  // base del tenant, para que el margen/kardex funcione) — solo para
  // mostrar "se compró en COP" en vez de forzar todo a la moneda base.
  // Ausentes en artículos viejos.
  monedaCosto?: string | null;
  costoUnitarioOriginal?: number | null;
  // Aurora Retail (Ferretería/Farmacia/Repuestos) — ambos opcionales, ausentes
  // en artículos de otras verticales que no los usan.
  codigoBarras?: string | null;
  principioActivo?: string | null;
}

export function listarArticulos(): Promise<Articulo[]> {
  return request(`/api/inventario/articulos`);
}

// costoUnitario va tal cual lo tecleó el usuario en `monedaCosto` (o en la
// moneda base del tenant si se omite) — el backend lo convierte a la
// moneda base antes de guardar.
export function crearArticulo(tenantId: number, datos: { sku: string; nombre: string; unidadMedida?: string; categoria?: string; costoUnitario?: number; precioVenta?: number; stockMinimo?: number; monedaCosto?: string; codigoBarras?: string; principioActivo?: string }): Promise<Articulo> {
  return request(`/api/inventario/articulos?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

// costoUnitario va tal cual lo tecleó el usuario en `moneda` (o en la moneda
// base del tenant si se omite) — el backend lo convierte a la moneda base
// antes de guardar.
export function entradaArticulo(tenantId: number, articuloId: number, datos: { cantidad: number; costoUnitario?: number; motivo?: string; fechaVencimiento?: string; metodoPago?: string; moneda?: string }): Promise<unknown> {
  return request(`/api/inventario/articulos/${articuloId}/entrada?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function editarArticulo(tenantId: number, articuloId: number, datos: { nombre?: string; categoria?: string; unidadMedida?: string; costoUnitario?: number; precioVenta?: number; stockMinimo?: number; sku?: string; codigoBarras?: string; principioActivo?: string }): Promise<Articulo> {
  return request(`/api/inventario/articulos/${articuloId}?tenantId=${tenantId}`, { method: "PUT", body: JSON.stringify(datos) });
}

// --- Presentaciones de artículo (six-pack, caja x24, etc.) ---

export interface PresentacionArticulo {
  id: number;
  tenantId: number;
  articulo: Articulo;
  nombre: string;
  unidadesPorPresentacion: number;
  // "Pricing por volumen" (Ferretería) — null = se calcula como precioVenta del artículo × unidadesPorPresentacion.
  precioVenta: number | null;
}

export function listarPresentaciones(articuloId: number): Promise<PresentacionArticulo[]> {
  return request(`/api/inventario/presentaciones?articuloId=${articuloId}`);
}

export function crearPresentacion(tenantId: number, articuloId: number, datos: { nombre: string; unidadesPorPresentacion: number; precioVenta?: number }): Promise<PresentacionArticulo> {
  return request(`/api/inventario/presentaciones?tenantId=${tenantId}&articuloId=${articuloId}`, { method: "POST", body: JSON.stringify(datos) });
}

// --- Aurora Retail (Ferretería / Farmacia / Repuestos) ---

export interface ProveedorRetail {
  id: number;
  tenantId: number;
  nombre: string;
  rif: string | null;
  telefono: string | null;
  contacto: string | null;
  direccion: string | null;
  activo: boolean;
}

export function listarProveedoresRetail(): Promise<ProveedorRetail[]> {
  return request(`/api/retail/proveedores`);
}

export function crearProveedorRetail(tenantId: number, datos: { nombre: string; rif?: string; telefono?: string; contacto?: string; direccion?: string }): Promise<ProveedorRetail> {
  return request(`/api/retail/proveedores?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export interface ItemCompraRetail {
  articuloId: number;
  cantidad: number;
  costoUnitario: number;
  monedaCosto?: string;
  presentacionId?: number;
  fechaVencimiento?: string;
}

export interface CompraRetail {
  id: number;
  tenantId: number;
  proveedor: ProveedorRetail;
  numeroFactura: string | null;
  fechaCompra: string;
  total: number;
  montoPagado: number | null;
}

export function listarComprasRetail(tenantId: number): Promise<CompraRetail[]> {
  return request(`/api/retail/compras?tenantId=${tenantId}`);
}

export function registrarCompraRetail(tenantId: number, datos: { proveedorId: number; numeroFactura: string; items: ItemCompraRetail[]; montoPagadoAhora?: number; monedaPago?: string }): Promise<CompraRetail> {
  return request(`/api/retail/compras?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

/** Búsqueda unificada del POS de mostrador: código de barras, nombre/SKU, principio activo (Farmacia) o código OEM (Repuestos). */
export function buscarArticulosRetail(tenantId: number, texto: string): Promise<Articulo[]> {
  return request(`/api/retail/articulos/buscar?tenantId=${tenantId}&texto=${encodeURIComponent(texto)}`);
}

export interface ItemVentaRetailRequest {
  articuloId: number;
  cantidad: number;
  presentacionId?: number;
}

export interface ItemVentaRetail {
  id: number;
  articulo: Articulo;
  presentacion: PresentacionArticulo | null;
  cantidad: number;
  precioUnitario: number;
  costoUnitario: number;
}

export interface VentaRetail {
  id: number;
  tenantId: number;
  cliente: Cliente | null;
  total: number;
  moneda: string;
  esCredito: boolean;
  fechaRegistro: string;
}

export function registrarVentaRetail(tenantId: number, datos: {
  clienteId?: number; items: ItemVentaRetailRequest[]; esCredito?: boolean;
  metodoPago?: string; monedaPago?: string; montoRecibido?: number;
}): Promise<{ venta: VentaRetail; items: ItemVentaRetail[] }> {
  return request(`/api/retail/ventas?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function listarVentasRetail(tenantId: number): Promise<VentaRetail[]> {
  return request(`/api/retail/ventas?tenantId=${tenantId}`);
}

// --- Catálogo de cruce (Repuestos): qué código OEM/vehículos cruzan con un artículo ---

export interface CruceRepuesto {
  id: number;
  tenantId: number;
  articulo: Articulo;
  codigoOem: string;
  marcaVehiculo: string;
  modeloVehiculo: string;
  anioDesde: number | null;
  anioHasta: number | null;
  notas: string | null;
}

export function listarCrucesPorArticulo(articuloId: number, tenantId: number): Promise<CruceRepuesto[]> {
  return request(`/api/retail/cruces?articuloId=${articuloId}&tenantId=${tenantId}`);
}

export function crearCruceRepuesto(tenantId: number, articuloId: number, datos: { codigoOem: string; marcaVehiculo: string; modeloVehiculo: string; anioDesde?: number; anioHasta?: number; notas?: string }): Promise<CruceRepuesto> {
  return request(`/api/retail/cruces?tenantId=${tenantId}&articuloId=${articuloId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function eliminarCruceRepuesto(id: number, tenantId: number): Promise<void> {
  return request(`/api/retail/cruces/${id}?tenantId=${tenantId}`, { method: "DELETE" });
}

/** Corrección de inventario: indicá el stock REAL contado y el sistema calcula/ audita la diferencia solo. */
export function ajustarStockArticulo(tenantId: number, articuloId: number, datos: { stockReal: number; motivo?: string }): Promise<Articulo> {
  return request(`/api/inventario/articulos/${articuloId}/ajustar-stock?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function eliminarArticulo(tenantId: number, articuloId: number): Promise<void> {
  return request(`/api/inventario/articulos/${articuloId}?tenantId=${tenantId}`, { method: "DELETE" });
}

export interface ItemImportacionArticulo {
  sku: string;
  nombre: string;
  unidadMedida?: string;
  categoria?: string;
  costoUnitario?: number;
  precioVenta?: number;
  stockInicial?: number;
}

export interface FilaImportacionError { fila: number; motivo: string }

export interface ResultadoImportacionArticulos {
  creados: number;
  actualizados: number;
  errores: FilaImportacionError[];
}

/** Carga masiva de artículos (desde Excel/CSV parseado en el navegador con SheetJS) — crea o actualiza por SKU. */
export function importarArticulosLote(tenantId: number, items: ItemImportacionArticulo[]): Promise<ResultadoImportacionArticulos> {
  return request(`/api/inventario/articulos/importar-lote?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(items) });
}

export interface ItemCompraInsumo {
  articuloId: number;
  cantidad: number;
  costoUnitario: number;
  presentacionId?: number;
  fechaVencimiento?: string; // yyyy-MM-dd — si viene, crea un lote rastreable para alertas
}

export function registrarCompraInsumo(tenantId: number, datos: { proveedorId: number; numeroFactura: string; items: ItemCompraInsumo[]; montoPagadoAhora?: number; monedaPago?: string }): Promise<CompraInsumoHoreca> {
  return request(`/api/horeca/compras-insumo?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export interface CompraInsumoHoreca {
  id: number;
  tenantId: number;
  proveedor: ProveedorHoreca;
  numeroFactura: string | null;
  fechaCompra: string;
  total: number;
  montoPagado: number | null;
}

export interface ItemExtraidoFactura {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface FacturaExtraidaOcr {
  numeroFactura: string;
  proveedor: string;
  fecha: string;
  items: ItemExtraidoFactura[];
  total: number;
}

/** Sube una foto (o PDF) de la factura del proveedor y devuelve una PROPUESTA leída por IA — nunca registra la compra sola, el usuario revisa y confirma en el formulario. */
export async function extraerFacturaOcr(archivo: File): Promise<FacturaExtraidaOcr> {
  const sesion = leerSesion();
  const headers: Record<string, string> = {};
  if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;
  const formData = new FormData();
  formData.append("file", archivo);
  const res = await fetch(`/api/ocr/facturas/extraer`, { method: "POST", body: formData, headers });
  if (res.status === 401) {
    manejarSesionVencida();
    throw new ApiError("Sesión vencida — redirigiendo al login");
  }
  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const body = await res.json();
      mensaje = body.error || body.message || mensaje;
    } catch {}
    throw new ApiError(mensaje);
  }
  return res.json();
}

export function listarComprasInsumo(tenantId: number): Promise<CompraInsumoHoreca[]> {
  return request(`/api/horeca/compras-insumo?tenantId=${tenantId}`);
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

export interface InventarioKpis {
  cajaHoy: number;
  valorBodega: number;
  gananciaProyectada: number;
  alertasReposicion: number;
}

/** Panel de KPIs financieros de Inventario — caja neta de hoy, capital inmovilizado en bodega, utilidad proyectada y artículos que necesitan reposición. */
export function kpisInventario(tenantId: number): Promise<InventarioKpis> {
  return request(`/api/inventario/kpis?tenantId=${tenantId}`);
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
  montoEsperado: number | null;
  diferencia: number | null;
  fechaArqueo: string;
}

export function cerrarCaja(tenantId: number, datos: { idCajero: string; montoDeclarado: number; moneda: string }): Promise<ArqueoCaja> {
  const params = new URLSearchParams({ tenantId: String(tenantId), idCajero: datos.idCajero, montoDeclarado: String(datos.montoDeclarado), moneda: datos.moneda });
  return request(`/api/financiero/tesoreria/cerrar-caja?${params}`, { method: "POST" });
}

export function historialCierres(tenantId: number): Promise<ArqueoCaja[]> {
  return request(`/api/financiero/tesoreria/historial-cierres?tenantId=${tenantId}`);
}

// ═══════════════════════════════════════════════════════════════════════
// CONTROL DE CAJA POR TURNOS — apertura con monto base, egresos y Cierre Z
// ═══════════════════════════════════════════════════════════════════════
export interface Turno {
  id: number;
  tenantId: number;
  idCajero: string;
  moneda: string;
  montoBase: number;
  fechaApertura: string;
  fechaCierre: string | null;
  montoDeclarado: number | null;
  montoEsperado: number | null;
  descuadre: number | null;
  estado: "ABIERTO" | "CERRADO";
}

export function abrirTurno(tenantId: number, datos: { idCajero: string; montoBase: number; moneda: string }): Promise<Turno> {
  const params = new URLSearchParams({ tenantId: String(tenantId), idCajero: datos.idCajero, montoBase: String(datos.montoBase), moneda: datos.moneda });
  return request(`/api/financiero/turnos/abrir?${params}`, { method: "POST" });
}

/** null si no hay ningún turno abierto en esa moneda ahora mismo. */
export async function turnoAbierto(tenantId: number, moneda: string): Promise<Turno | null> {
  const resultado = await request<Turno | undefined>(`/api/financiero/turnos/abierto?tenantId=${tenantId}&moneda=${moneda}`);
  return resultado ?? null;
}

export function historialTurnos(tenantId: number): Promise<Turno[]> {
  return request(`/api/financiero/turnos/historial?tenantId=${tenantId}`);
}

export function registrarEgresoTurno(tenantId: number, turnoId: number, monto: number, concepto?: string): Promise<MovimientoCaja> {
  const params = new URLSearchParams({ tenantId: String(tenantId), monto: String(monto) });
  if (concepto) params.set("concepto", concepto);
  return request(`/api/financiero/turnos/${turnoId}/egresos?${params}`, { method: "POST" });
}

export function cerrarTurno(tenantId: number, turnoId: number, montoDeclarado: number): Promise<Turno> {
  const params = new URLSearchParams({ tenantId: String(tenantId), montoDeclarado: String(montoDeclarado) });
  return request(`/api/financiero/turnos/${turnoId}/cerrar?${params}`, { method: "POST" });
}

// Descarga el PDF del cierre autenticado (no puede ser un <a href> plano — necesita el Bearer token).
export async function descargarTicketComanda(tenantId: number, comandaId: number): Promise<Blob> {
  const sesion = leerSesion();
  const headers: Record<string, string> = {};
  if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;
  const res = await fetch(`/api/horeca/mesas/comandas/${comandaId}/ticket?tenantId=${tenantId}`, { headers });
  if (res.status === 401) {
    manejarSesionVencida();
    throw new ApiError("Sesión vencida — redirigiendo al login");
  }
  if (!res.ok) throw new ApiError(`Error ${res.status}`);
  return res.blob();
}

/** Mismo ticket, como bytes ESC/POS crudos — para escribirlos directo a una impresora térmica por Web Serial, sin diálogo de impresión. */
export async function descargarTicketEscPos(tenantId: number, comandaId: number): Promise<Uint8Array> {
  const sesion = leerSesion();
  const headers: Record<string, string> = {};
  if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;
  const res = await fetch(`/api/horeca/mesas/comandas/${comandaId}/ticket-escpos?tenantId=${tenantId}`, { headers });
  if (res.status === 401) {
    manejarSesionVencida();
    throw new ApiError("Sesión vencida — redirigiendo al login");
  }
  if (!res.ok) throw new ApiError(`Error ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

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
  saldoPendiente: number | null;
  estado: "PENDIENTE" | "PAGADO" | null;
}

export function registrarMovimiento(tenantId: number, datos: { tipo: "INGRESO" | "EGRESO"; monto: number; moneda: string; concepto: string }): Promise<MovimientoCaja> {
  return request(`/api/financiero/movimientos?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

/** Registra un pago (total o parcial) sobre una cuenta por pagar/cobrar existente. */
export function abonarMovimiento(tenantId: number, movimientoId: number, datos: { monto: number; moneda: string }): Promise<MovimientoCaja> {
  return request(`/api/financiero/movimientos/${movimientoId}/abonar?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
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

// ═══════════════════════════════════════════════════════════════════════
// CRM — CLIENTES Y FIDELIZACIÓN (Fase 3)
// ═══════════════════════════════════════════════════════════════════════
export interface Cliente {
  id: number;
  tenantId: number;
  nombre: string;
  identificacionRif: string | null;
  telefono: string | null;
  correo: string | null;
  fechaRegistro: string;
}

export interface MetricasCliente {
  totalGastado: number;
  cantidadVisitas: number;
  fechaUltimaCompra: string | null;
}

/** Lista todos los clientes, o filtra por nombre/RIF si se pasa `q` (mismo endpoint que usa el buscador de Venta Rápida). */
export function listarClientes(tenantId: number, q?: string): Promise<Cliente[]> {
  const params = new URLSearchParams({ tenantId: String(tenantId) });
  if (q) params.set("q", q);
  return request(`/api/crm/clientes?${params}`);
}

export function obtenerCliente(tenantId: number, id: number): Promise<Cliente> {
  return request(`/api/crm/clientes/${id}?tenantId=${tenantId}`);
}

export function crearCliente(tenantId: number, datos: { nombre?: string; identificacionRif?: string; telefono?: string; correo?: string }): Promise<Cliente> {
  return request(`/api/crm/clientes?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function editarCliente(tenantId: number, id: number, datos: { nombre?: string; identificacionRif?: string; telefono?: string; correo?: string }): Promise<Cliente> {
  return request(`/api/crm/clientes/${id}?tenantId=${tenantId}`, { method: "PUT", body: JSON.stringify(datos) });
}

export function eliminarCliente(tenantId: number, id: number): Promise<void> {
  return request(`/api/crm/clientes/${id}?tenantId=${tenantId}`, { method: "DELETE" });
}

export function metricasCliente(tenantId: number, id: number): Promise<MetricasCliente> {
  return request(`/api/crm/clientes/${id}/metricas?tenantId=${tenantId}`);
}

export function ticketsCliente(tenantId: number, id: number): Promise<Comanda[]> {
  return request(`/api/crm/clientes/${id}/tickets?tenantId=${tenantId}`);
}

export function enviarEmailDocumento(datos: {
  destinatario: string;
  asunto: string;
  cuerpo: string;
  pdfBase64?: string;
  nombreArchivo?: string;
}): Promise<{ success: boolean; mensaje: string }> {
  return request(`/api/salud/documentos/enviar-email`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

// --- Canal Endémico (vigilancia epidemiológica a partir de los diagnósticos
// CIE-10 que ya se registran en cada consulta médica) ---

export interface DiagnosticoFrecuente {
  cie10: string;
  totalCasos: number;
}

export interface PuntoAnualCanal {
  anio: number;
  casos: number;
}

export interface PuntoMensualCanal {
  anio: number;
  mes: number;
  casos: number;
}

export interface PuntoSemanalCanal {
  semana: number;
  casos: number;
}

export interface PuntoDelMesCanal {
  mes: number;
  casos: number;
}

/** Banda del corredor endémico para un período (`periodo` = número de semana ISO o de mes, según el arreglo donde venga). */
export interface BandaPeriodoCanal {
  periodo: number;
  minimo: number;
  percentil25: number;
  mediana: number;
  percentil75: number;
  maximo: number;
}

/** Banda de referencia para la vista ANUAL — percentiles de los totales de los años históricos (excluye el año consultado), no un corredor por período (un año no se repite). */
export interface ResumenAnualCanal {
  minimo: number;
  percentil25: number;
  mediana: number;
  percentil75: number;
  maximo: number;
  aniosUsados: number;
}

export interface CanalEndemico {
  cie10: string;
  anioConsultado: number;
  totalCasosHistorico: number;
  aniosHistoricosUsados: number;
  porAnio: PuntoAnualCanal[];
  porMes: PuntoMensualCanal[];
  semanasAnioConsultado: PuntoSemanalCanal[];
  corredorHistorico: BandaPeriodoCanal[];
  mesesAnioConsultado: PuntoDelMesCanal[];
  corredorHistoricoMensual: BandaPeriodoCanal[];
  bandaReferenciaAnual: ResumenAnualCanal;
  /** Años descartados del cálculo por ser brotes atípicos (ver CanalEndemicoService.detectarAniosAtipicos) — se excluyen para que no inflen el umbral de alerta. */
  aniosExcluidosPorAtipicos: number[];
}

/** Diagnósticos más frecuentes de ESTE médico — para elegir cuál canal ver (aislado por tenant, como todo lo demás del módulo salud). */
export function diagnosticosFrecuentesSalud(limite = 10): Promise<DiagnosticoFrecuente[]> {
  return request(`/api/salud/canal-endemico/diagnosticos-frecuentes?limite=${limite}`);
}

/** Canal endémico de ESTE médico para un diagnóstico y año dados. */
export function obtenerCanalEndemico(cie10: string, anio: number): Promise<CanalEndemico> {
  return request(`/api/salud/canal-endemico?cie10=${encodeURIComponent(cie10)}&anio=${anio}`);
}

/** Vista consolidada de TODA la red (solo super-admin). */
export function diagnosticosFrecuentesRed(limite = 20): Promise<DiagnosticoFrecuente[]> {
  return request(`/api/super-admin/canal-endemico/diagnosticos-frecuentes?limite=${limite}`);
}

export function obtenerCanalEndemicoRed(cie10: string, anio: number): Promise<CanalEndemico> {
  return request(`/api/super-admin/canal-endemico?cie10=${encodeURIComponent(cie10)}&anio=${anio}`);
}

export interface CasosPorClinica {
  tenantId: number;
  totalCasos: number;
}

export function desglosePorClinicaRed(cie10: string, anio: number): Promise<CasosPorClinica[]> {
  return request(`/api/super-admin/canal-endemico/desglose-por-clinica?cie10=${encodeURIComponent(cie10)}&anio=${anio}`);
}

// --- Importación de historiales epidemiológicos desde Excel (ver
// SaludImportacionHistoricaService en el backend) ---

export interface ErrorFilaImportacion {
  numeroFila: number;
  motivo: string;
}

export interface ResultadoImportacionHistorica {
  filasImportadas: number;
  filasConError: number;
  errores: ErrorFilaImportacion[];
}

/** Sube un .xlsx con el historial epidemiológico — multipart, por eso no usa request() (necesita dejar que el navegador ponga su propio Content-Type con el boundary). */
export async function importarHistoricoExcel(archivo: File): Promise<ResultadoImportacionHistorica> {
  const sesion = leerSesion();
  const formData = new FormData();
  formData.append("archivo", archivo);

  const res = await fetch("/api/salud/canal-endemico/historico/importar", {
    method: "POST",
    headers: sesion?.token ? { Authorization: `Bearer ${sesion.token}` } : {},
    body: formData,
  });
  if (res.status === 401) {
    throw new ApiError("Sesión vencida — vuelve a iniciar sesión");
  }
  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const body = await res.json();
      mensaje = body.message || body.error || mensaje;
    } catch {}
    throw new ApiError(mensaje);
  }
  return res.json();
}

// ══════════════════════════════════════════════════════════════════════════
// SUPER-ADMINISTRATION (CORE AURORA+ CEO SUITE)
// ══════════════════════════════════════════════════════════════════════════

export const SUPER_ADMIN_STORAGE_KEY = "aurora_super_admin_session";
const TENANTS_STORAGE_KEY = "aurora_super_admin_tenants_local";

export interface SuperAdminSession {
  token: string;
  username: string;
  autenticado: boolean;
}

export function guardarSesionSuperAdmin(sesion: SuperAdminSession) {
  localStorage.setItem(SUPER_ADMIN_STORAGE_KEY, JSON.stringify(sesion));
}

export function leerSesionSuperAdmin(): SuperAdminSession | null {
  try {
    const raw = localStorage.getItem(SUPER_ADMIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function borrarSesionSuperAdmin() {
  localStorage.removeItem(SUPER_ADMIN_STORAGE_KEY);
}

export type TipoLicencia = "DEMO" | "BASICO" | "PROFESIONAL" | "ENTERPRISE";

export interface LicenciaTenant {
  id: number;
  tenantId: number;
  nombreEmpresa: string;
  moduloPrincipal: string;
  tipoLicencia: TipoLicencia;
  activa: boolean;
  fechaVencimientoPago: string;
  emailContacto?: string;
  telefonoContacto?: string;
  monedaBase?: string;
  createdAt?: string;
}

export interface ModuloTenant {
  id?: number;
  tenantId: number;
  moduloNombre: string;
  activo: boolean;
}

export interface CrearTenantRequest {
  nombreEmpresa: string;
  moduloPrincipal: string;
  tipoLicencia: TipoLicencia;
  emailContacto?: string;
  telefonoContacto?: string;
  mesesVigencia?: number;
  monedaBase?: string;
  usuarioInicial?: string;
  passwordInicial?: string;
}

const TENANTS_DEMO_DEFAULT: LicenciaTenant[] = [
  {
    id: 1,
    tenantId: 1,
    nombreEmpresa: "Centro Médico Tamanaco",
    moduloPrincipal: "salud",
    tipoLicencia: "ENTERPRISE",
    activa: true,
    fechaVencimientoPago: "2026-12-31",
    emailContacto: "dr.mario@tamanaco.com",
    telefonoContacto: "+58 414-7001122",
    monedaBase: "USD",
  },
  {
    id: 2,
    tenantId: 2,
    nombreEmpresa: "Restaurante Gourmet & Bar Aurora",
    moduloPrincipal: "horeca",
    tipoLicencia: "PROFESIONAL",
    activa: true,
    fechaVencimientoPago: "2026-10-15",
    emailContacto: "gerencia@gourmetaurora.com",
    telefonoContacto: "+58 424-9988776",
    monedaBase: "USD",
  },
  {
    id: 3,
    tenantId: 3,
    nombreEmpresa: "Corporación Minera El Dorado",
    moduloPrincipal: "minero",
    tipoLicencia: "ENTERPRISE",
    activa: true,
    fechaVencimientoPago: "2027-01-01",
    emailContacto: "operaciones@eldorado-gold.com",
    telefonoContacto: "+58 412-5554433",
    monedaBase: "USD",
  },
];

function obtenerTenantsLocales(): LicenciaTenant[] {
  try {
    const raw = localStorage.getItem(TENANTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(TENANTS_DEMO_DEFAULT));
  return TENANTS_DEMO_DEFAULT;
}

function guardarTenantsLocales(lista: LicenciaTenant[]) {
  try {
    localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(lista));
  } catch {}
}

async function requestSuperAdmin<T>(path: string, options: RequestInit = {}): Promise<T> {
  const sesion = leerSesionSuperAdmin();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (sesion?.token) {
    headers["Authorization"] = `Bearer ${sesion.token}`;
  }

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Error ${res.status}: Fallo en la solicitud SuperAdmin`);
  }
  return res.json();
}
export interface ImportacionHistoricaResumen {
  fuente: string;
  filas: number;
}

export function listarImportacionesHistoricas(): Promise<ImportacionHistoricaResumen[]> {
  return request(`/api/salud/canal-endemico/historico/importaciones`);
}

export function eliminarImportacionHistorica(fuente: string): Promise<void> {
  return request(`/api/salud/canal-endemico/historico/importaciones/${encodeURIComponent(fuente)}`, { method: "DELETE" });
}


// ══════════════════════════════════════════════════════════════════════════
// RED DE ÓRDENES Y RESULTADOS DE LABORATORIO (MEDICLINIC LAB NETWORK)
// ══════════════════════════════════════════════════════════════════════════
export interface AdjuntoResultadoLab {
  id?: number;
  nombreArchivo: string;
  tipoMime: string;
  contenidoBase64: string;
}

export interface ResultadoLaboratorio {
  id?: number;
  nombreLaboratorio: string;
  bioanalistaResponsable: string;
  colegiaturaBioanalista?: string;
  fechaCarga: string;
  informeDetallado?: string;
  conclusionDiagnostica?: string;
  observacionesMuestra?: string;
  valoresCriticos: boolean;
  detalleValoresCriticos?: string;
  ipCarga?: string;
  adjuntos?: AdjuntoResultadoLab[];
}

export interface OrdenLaboratorio {
  id: number;
  tenantId: number;
  codigoOrden: string;
  tokenSeguro: string;
  pacienteId: number;
  pacienteNombre: string;
  pacienteCedula?: string;
  pacienteTelefono?: string;
  medicoId?: number;
  medicoNombre?: string;
  consultaId?: number;
  fechaEmision: string;
  estado: "EMITIDA" | "SELLADA" | "CANCELADA";
  examenesSolicitados: string;
  indicacionesClinicas?: string;
  diagnosticoPresuntivo?: string;
  laboratorioSugerido?: string;
  revisadoPorMedico: boolean;
  fechaRevisionMedico?: string;
  notasRevisionMedico?: string;
  resultado?: ResultadoLaboratorio;
}

export function crearOrdenLaboratorio(tenantId: number, orden: Partial<OrdenLaboratorio>): Promise<OrdenLaboratorio> {
  return request(`/api/salud/laboratorio/ordenes?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(orden),
  });
}

export function listarOrdenesLaboratorio(tenantId: number): Promise<OrdenLaboratorio[]> {
  return request(`/api/salud/laboratorio/ordenes?tenantId=${tenantId}`);
}

export function listarOrdenesLaboratorioPaciente(tenantId: number, pacienteId: number): Promise<OrdenLaboratorio[]> {
  return request(`/api/salud/laboratorio/ordenes/paciente/${pacienteId}?tenantId=${tenantId}`);
}

export function listarInboxLaboratorio(tenantId: number): Promise<OrdenLaboratorio[]> {
  return request(`/api/salud/laboratorio/ordenes/inbox?tenantId=${tenantId}`);
}

export function contadorInboxLaboratorio(tenantId: number): Promise<{ pendientes: number }> {
  return request(`/api/salud/laboratorio/ordenes/inbox/contador?tenantId=${tenantId}`);
}

export function marcarRevisadoOrdenLaboratorio(tenantId: number, id: number, notas?: string): Promise<OrdenLaboratorio> {
  return request(`/api/salud/laboratorio/ordenes/${id}/revisar?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ notas }),
  });
}

// Endpoints públicos para el bioanalista sin sesión
export function consultarOrdenPublicaLaboratorio(token: string): Promise<any> {
  return request(`/api/public/laboratorio/${token}`);
}

export function subirResultadoPublicoLaboratorio(token: string, payload: any): Promise<any> {
  return request(`/api/public/laboratorio/${token}/subir`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ══════════════════════════════════════════════════════════════════════════
// PORTAL DE RECEPCIÓN DE LABORATORIO (el PACIENTE sube resultados vía QR)
// ══════════════════════════════════════════════════════════════════════════
export interface ArchivoExamenRecibido {
  id?: number;
  nombreArchivo: string;
  tipoMime: string;
  contenidoBase64: string;
  orden: number;
}

export interface ExamenRecibidoPaciente {
  id: number;
  tenantId: number;
  pacienteId?: number | null;
  cedulaIngresada: string;
  nombreIngresado?: string;
  telefonoIngresado?: string;
  fechaHoraRecepcion: string;
  leido: boolean;
  fechaHoraLeido?: string;
  leidoPor?: string;
  archivos: ArchivoExamenRecibido[];
}

// --- Lado del doctor (autenticado) ---
export function obtenerUrlPortalLaboratorio(): Promise<{ url: string }> {
  return request(`/api/salud/laboratorio/portal/url`);
}

/** Descarga el PNG del QR fijo del consultorio (autenticado) y lo devuelve como
 * data URL, listo para incrustar con jsPDF.addImage() en la página 2 del informe. */
export async function obtenerQrPortalLaboratorioDataUrl(): Promise<string> {
  const sesion = leerSesion();
  const headers: Record<string, string> = {};
  if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;
  const res = await fetch(`/api/salud/laboratorio/portal/qr.png`, { headers });
  if (!res.ok) throw new ApiError(`No se pudo generar el QR (${res.status})`, res.status);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function listarInboxExamenesRecibidos(tenantId: number): Promise<ExamenRecibidoPaciente[]> {
  return request(`/api/salud/laboratorio/inbox?tenantId=${tenantId}`);
}

export function contadorInboxExamenesRecibidos(tenantId: number): Promise<{ pendientes: number }> {
  return request(`/api/salud/laboratorio/inbox/contador?tenantId=${tenantId}`);
}

export function listarExamenesRecibidosPorPaciente(tenantId: number, pacienteId: number): Promise<ExamenRecibidoPaciente[]> {
  return request(`/api/salud/laboratorio/inbox/paciente/${pacienteId}?tenantId=${tenantId}`);
}

export function marcarLeidoExamenRecibido(tenantId: number, id: number): Promise<ExamenRecibidoPaciente> {
  return request(`/api/salud/laboratorio/inbox/${id}/marcar-leido?tenantId=${tenantId}`, { method: "POST" });
}

export function vincularPacienteExamenRecibido(tenantId: number, id: number, pacienteId: number): Promise<ExamenRecibidoPaciente> {
  return request(`/api/salud/laboratorio/inbox/${id}/vincular-paciente?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ pacienteId }),
  });
}

// --- Lado del paciente (público, sin sesión) ---
export function consultarPortalLaboratorioPublico(token: string): Promise<{ nombreConsultorio: string }> {
  return request(`/api/public/laboratorio/portal/${token}`);
}

export async function subirExamenPortalLaboratorioPublico(
  token: string,
  cedula: string,
  nombre: string,
  telefono: string,
  archivos: File[]
): Promise<{ success: boolean; mensaje: string }> {
  const form = new FormData();
  form.append("cedula", cedula);
  if (nombre) form.append("nombre", nombre);
  if (telefono) form.append("telefono", telefono);
  archivos.forEach((f) => form.append("archivos", f));

  const res = await fetch(`/api/public/laboratorio/portal/${token}/subir`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const body = await res.json();
      mensaje = body.message || body.error || mensaje;
    } catch { /* respuesta no-JSON */ }
    throw new ApiError(mensaje, res.status);
  }
  return res.json();
}

export async function loginSuperAdminApi(username: string, password: string): Promise<string> {
  // Nunca fingir un login de super-admin exitoso — antes esto aceptaba
  // "admin"/"admin123" o "ceo"/"aurora2026" como puerta trasera hardcodeada
  // cada vez que el backend rechazaba o no respondía, sin importar si el
  // rechazo era real. Un token real, firmado por el backend, es la única
  // forma válida de entrar al panel de super-admin.
  const data = await requestSuperAdmin<{ token: string }>("/api/auth/login-super-admin", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return data.token;
}

export async function listarTenantsSuperAdmin(): Promise<LicenciaTenant[]> {
  try {
    const data = await requestSuperAdmin<LicenciaTenant[]>("/api/super-admin/tenants");
    if (Array.isArray(data)) {
      guardarTenantsLocales(data);
      return data;
    }
  } catch {}
  return obtenerTenantsLocales();
}

// Las funciones de escritura de este panel (crear/activar/desactivar/renovar/
// cambiar plan) antes fingían éxito guardando el cambio SOLO en localStorage
// si el backend real fallaba — el super-admin veía "listo" en pantalla
// mientras el tenant real seguía exactamente igual en el servidor. Activar o
// desactivar el acceso de un cliente real es la peor operación para
// equivocarse así, así que ahora todas propagan el error real tal cual.
export async function crearTenantSuperAdmin(requestData: CrearTenantRequest): Promise<LicenciaTenant> {
  const nuevo = await requestSuperAdmin<LicenciaTenant>("/api/super-admin/tenants", {
    method: "POST",
    body: JSON.stringify(requestData),
  });
  const lista = obtenerTenantsLocales();
  guardarTenantsLocales([nuevo, ...lista]);
  return nuevo;
}

export async function activarTenantSuperAdmin(tenantId: number): Promise<LicenciaTenant> {
  const res = await requestSuperAdmin<LicenciaTenant>(`/api/super-admin/tenants/${tenantId}/activar`, {
    method: "POST",
  });
  const lista = obtenerTenantsLocales();
  const index = lista.findIndex(t => t.tenantId === tenantId);
  if (index !== -1) { lista[index] = res; guardarTenantsLocales(lista); }
  return res;
}

export async function desactivarTenantSuperAdmin(tenantId: number): Promise<LicenciaTenant> {
  const res = await requestSuperAdmin<LicenciaTenant>(`/api/super-admin/tenants/${tenantId}/desactivar`, {
    method: "POST",
  });
  const lista = obtenerTenantsLocales();
  const index = lista.findIndex(t => t.tenantId === tenantId);
  if (index !== -1) { lista[index] = res; guardarTenantsLocales(lista); }
  return res;
}

export async function renovarTenantSuperAdmin(tenantId: number, meses: number = 1): Promise<LicenciaTenant> {
  const res = await requestSuperAdmin<LicenciaTenant>(`/api/super-admin/tenants/${tenantId}/renovar?meses=${meses}`, {
    method: "POST",
  });
  const lista = obtenerTenantsLocales();
  const index = lista.findIndex(t => t.tenantId === tenantId);
  if (index !== -1) { lista[index] = res; guardarTenantsLocales(lista); }
  return res;
}

export async function cambiarPlanTenantSuperAdmin(tenantId: number, tipoLicencia: TipoLicencia): Promise<LicenciaTenant> {
  const res = await requestSuperAdmin<LicenciaTenant>(`/api/super-admin/tenants/${tenantId}/cambiar-plan?tipoLicencia=${tipoLicencia}`, {
    method: "POST",
  });
  const lista = obtenerTenantsLocales();
  const index = lista.findIndex(t => t.tenantId === tenantId);
  if (index !== -1) { lista[index] = res; guardarTenantsLocales(lista); }
  return res;
}

export async function listarModulosTenantSuperAdmin(tenantId: number): Promise<ModuloTenant[]> {
  try {
    const res = await requestSuperAdmin<ModuloTenant[]>(`/api/super-admin/tenants/${tenantId}/modulos`);
    if (Array.isArray(res)) return res;
  } catch {}

  const raw = localStorage.getItem(`aurora_super_admin_modulos_${tenantId}`);
  if (raw) return JSON.parse(raw);

  const modulosDefault: ModuloTenant[] = [
    { tenantId, moduloNombre: "salud", activo: true },
    { tenantId, moduloNombre: "horeca", activo: false },
    { tenantId, moduloNombre: "minero", activo: false },
    { tenantId, moduloNombre: "repuestos", activo: false },
    { tenantId, moduloNombre: "moda", activo: false },
    { tenantId, moduloNombre: "ganaderia", activo: false },
  ];
  return modulosDefault;
}

export async function activarModuloTenantSuperAdmin(tenantId: number, moduloNombre: string, activo: boolean): Promise<ModuloTenant> {
  const res = await requestSuperAdmin<ModuloTenant>(`/api/super-admin/tenants/${tenantId}/modulos`, {
    method: "POST",
    body: JSON.stringify({ moduloNombre, activo }),
  });
  const modulos = await listarModulosTenantSuperAdmin(tenantId);
  const idx = modulos.findIndex(m => m.moduloNombre === moduloNombre);
  if (idx !== -1) modulos[idx] = res; else modulos.push(res);
  localStorage.setItem(`aurora_super_admin_modulos_${tenantId}`, JSON.stringify(modulos));
  return res;
}

export async function crearUsuarioTenantSuperAdmin(tenantId: number, datos: {
  username: string;
  password: string;
  rol?: string;
  nombreCompleto?: string;
}): Promise<any> {
  // Antes, si esto fallaba, igual devolvía {success:true} — el super-admin creía
  // haber aprovisionado un usuario que en realidad nunca se creó en el backend.
  return requestSuperAdmin(`/api/super-admin/tenants/${tenantId}/usuarios`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

// ══════════════════════════════════════════════════════════════════════════
// MÓDULO FERRETERÍA & REPUESTOS (Backend: com.auroraplus.modules.repuestos)
// ══════════════════════════════════════════════════════════════════════════

export interface RepuestoItem {
  id: number;
  tenantId: number;
  codigoSku: string;
  codigoOriginalOem?: string | null;
  descripcion: string;
  stockActual: number;
  precioVenta: number; // Precio detal
  unidadBase: string; // UNIDAD, METRO, KILOGRAMO, SACO, etc.
  precioMayorista?: number | null;
  cantidadMinimaMayorista?: number | null;
  costoUnitario?: number;
}

export interface PresentacionRepuesto {
  id: number;
  tenantId: number;
  repuestoId?: number;
  nombrePresentacion: string; // ej: Caja 100u, Metro, Rollo, Saco
  factorConversion: number; // multiplicador hacia la unidad base
  precioVenta: number;
}

export interface MovimientoRepuesto {
  id: number;
  tenantId: number;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE" | "VENTA" | "COMPRA";
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo?: string;
  fechaRegistro: string;
}

export interface ProveedorRepuesto {
  id: number;
  tenantId: number;
  nombre: string;
  rif?: string | null;
  telefono?: string | null;
  contacto?: string | null;
  direccion?: string | null;
  activo: boolean;
}

export interface DetalleCompraRepuesto {
  id?: number;
  repuesto: RepuestoItem;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
}

export interface CompraRepuesto {
  id: number;
  tenantId: number;
  proveedor: ProveedorRepuesto;
  numeroFactura?: string | null;
  fechaCompra: string;
  total: number;
  detalles?: DetalleCompraRepuesto[];
}

export interface ItemCompraRepuestoRequest {
  repuestoId: number;
  cantidad: number;
  costoUnitario: number;
}

export interface CompraRepuestoRequest {
  proveedorId: number;
  numeroFactura: string;
  items: ItemCompraRepuestoRequest[];
}

export interface ResultadoVentaRepuestoVolumen {
  precioUnitarioAplicado: number;
  total: number;
  esMayorista: boolean;
}

export function listarRepuestos(): Promise<RepuestoItem[]> {
  return request(`/api/repuestos/items`);
}

export function buscarRepuestoPorSku(tenantId: number, sku: string): Promise<RepuestoItem> {
  return request(`/api/repuestos/items/sku/${encodeURIComponent(sku)}?tenantId=${tenantId}`);
}

export function buscarRepuestoPorOem(tenantId: number, oem: string): Promise<RepuestoItem[]> {
  return request(`/api/repuestos/items/oem/${encodeURIComponent(oem)}?tenantId=${tenantId}`);
}

export function crearRepuesto(tenantId: number, datos: Partial<RepuestoItem>): Promise<RepuestoItem> {
  return request(`/api/repuestos/items?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function actualizarRepuesto(id: number, datos: Partial<RepuestoItem>): Promise<RepuestoItem> {
  return request(`/api/repuestos/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function eliminarRepuesto(id: number, tenantId: number): Promise<void> {
  return request(`/api/repuestos/items/${id}?tenantId=${tenantId}`, { method: "DELETE" });
}

export function historialMovimientosRepuesto(id: number, tenantId: number): Promise<MovimientoRepuesto[]> {
  return request(`/api/repuestos/items/${id}/movimientos?tenantId=${tenantId}`);
}

export function venderRepuestoPorVolumen(
  id: number,
  tenantId: number,
  cantidad: number,
  monedaPago?: string,
  montoRecibido?: number,
  claveIdempotencia?: string
): Promise<ResultadoVentaRepuestoVolumen> {
  const params = new URLSearchParams({
    tenantId: String(tenantId),
    cantidad: String(cantidad),
  });
  if (monedaPago) params.append("monedaPago", monedaPago);
  if (montoRecibido !== undefined) params.append("montoRecibido", String(montoRecibido));
  if (claveIdempotencia) params.append("claveIdempotencia", claveIdempotencia);

  return request(`/api/repuestos/items/${id}/vender?${params.toString()}`, {
    method: "POST",
  });
}

export function listarPresentacionesRepuesto(tenantId: number, repuestoId: number): Promise<PresentacionRepuesto[]> {
  return request(`/api/repuestos/presentaciones/repuesto/${repuestoId}?tenantId=${tenantId}`);
}

export function crearPresentacionRepuesto(
  tenantId: number,
  repuestoId: number,
  nombrePresentacion: string,
  factorConversion: number,
  precioVenta: number
): Promise<PresentacionRepuesto> {
  const params = new URLSearchParams({
    tenantId: String(tenantId),
    repuestoId: String(repuestoId),
    nombrePresentacion,
    factorConversion: String(factorConversion),
    precioVenta: String(precioVenta),
  });
  return request(`/api/repuestos/presentaciones?${params.toString()}`, {
    method: "POST",
  });
}

export function despacharPorPresentacion(
  presentacionId: number,
  tenantId: number,
  cantidad: number,
  monedaPago?: string,
  montoRecibido?: number,
  claveIdempotencia?: string
): Promise<number> {
  const params = new URLSearchParams({
    tenantId: String(tenantId),
    cantidad: String(cantidad),
  });
  if (monedaPago) params.append("monedaPago", monedaPago);
  if (montoRecibido !== undefined) params.append("montoRecibido", String(montoRecibido));
  if (claveIdempotencia) params.append("claveIdempotencia", claveIdempotencia);

  return request(`/api/repuestos/presentaciones/${presentacionId}/despachar?${params.toString()}`, {
    method: "POST",
  });
}

export function listarProveedoresRepuesto(): Promise<ProveedorRepuesto[]> {
  return request(`/api/repuestos/proveedores`);
}

export function crearProveedorRepuesto(tenantId: number, proveedor: Partial<ProveedorRepuesto>): Promise<ProveedorRepuesto> {
  return request(`/api/repuestos/proveedores?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(proveedor),
  });
}

export function actualizarProveedorRepuesto(id: number, proveedor: Partial<ProveedorRepuesto>): Promise<ProveedorRepuesto> {
  return request(`/api/repuestos/proveedores/${id}`, {
    method: "PUT",
    body: JSON.stringify(proveedor),
  });
}

export function listarComprasRepuesto(): Promise<CompraRepuesto[]> {
  return request(`/api/repuestos/compras`);
}

export function registrarCompraRepuesto(tenantId: number, compra: CompraRepuestoRequest): Promise<CompraRepuesto> {
  return request(`/api/repuestos/compras?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(compra),
  });
}

// ─────────────────────────────────────────────────────────────
// --- Módulo Ganadería & Fincas ---
// ─────────────────────────────────────────────────────────────

export interface PotreroGanaderia {
  id: number;
  tenantId: number;
  nombre: string;
  codigo?: string;
  areaHectareas: number;
  capacidadAnimales?: number;
  tipoPasto?: string;
  color?: string;
  observaciones?: string;
  diasDescansoMinimo?: number;
  estado: "ACTIVO" | "EN_DESCANSO" | "EN_MANTENIMIENTO" | string;
  ordenRotacion?: number;
  posX?: number;
  posY?: number;
  ancho?: number;
  alto?: number;
  poligono?: [number, number][];
  fechaInicioDescanso?: string;
  fechaInicioUso?: string;
}

export interface AnimalGanaderia {
  id: number;
  tenantId: number;
  arete: string;
  tipoIdentificador?: "ARETE" | "CHIP" | "QR" | string;
  nombre?: string;
  especie?: string;
  raza?: string;
  sexo: "MACHO" | "HEMBRA";
  tipoAnimal?: string;
  fechaNacimiento?: string;
  pesoActual?: number;
  estado?: "ACTIVO" | "VENDIDO" | "MUERTO" | "DESCARTADO" | string;
  potrero?: PotreroGanaderia | null;
  costoAdquisicion?: number;
  valorEstimado?: number;
  codigoQr?: string;
  lote?: string;
  estadoReproductivo?: "VACIA" | "PREÑADA" | "EN_ESPERA" | string;
  estadoProductivo?: "CRIANDO" | "ORDEÑO" | "SECA" | string;
}

export interface RegistroOrdenoGanaderia {
  id: number;
  tenantId: number;
  animal: AnimalGanaderia;
  fecha: string;
  turno: "MANANA" | "TARDE";
  cantidadLitros: number;
  precioVentaLitro?: number;
  montoVenta?: number;
  porcentajeGrasa?: number;
  porcentajeProteina?: number;
}

export interface ReporteOrdenoGanaderia {
  desde: string;
  hasta: string;
  totalLitros: number;
  totalIngresos: number;
  cantidadRegistros: number;
  registros: RegistroOrdenoGanaderia[];
}

export interface RegistroPesoGanaderia {
  id: number;
  tenantId: number;
  animal: AnimalGanaderia;
  fecha: string;
  pesoKg: number;
}

export interface GdpGanaderiaResponse {
  pesoInicial?: number;
  pesoActual?: number;
  fechaInicial?: string;
  fechaActual?: string;
  gananciaTotalKg?: number;
  dias?: number;
  gdpKgDia?: number | null;
  cantidadPesajes: number;
  mensaje?: string;
}

export interface VacunaGanaderia {
  id: number;
  tenantId: number;
  nombre: string;
  diasParaRefuerzo?: number;
  diasRetiroLeche?: number;
  diasRetiroCarne?: number;
}

export interface AplicacionVacunaGanaderia {
  id: number;
  tenantId: number;
  animal: AnimalGanaderia;
  vacuna: VacunaGanaderia;
  fechaAplicacion: string;
  lote?: string;
  veterinarioResponsable?: string;
  costo?: number;
  fechaProximoRefuerzo?: string;
  fechaFinRetiroLeche?: string;
  fechaFinRetiroCarne?: string;
}

export interface AlertaSanitariaGanaderia {
  tipo: string;
  animal: AnimalGanaderia;
  producto: string;
  fechaRelevante: string;
  mensaje: string;
}

export interface EventoReproductivoGanaderia {
  id: number;
  tenantId: number;
  hembra: AnimalGanaderia;
  tipo: "SERVICIO" | "DIAGNOSTICO_PRENEZ" | "PARTO" | "CELO" | string;
  fecha: string;
  semental?: AnimalGanaderia;
  sementalReferenciaExterna?: string;
  resultado?: string;
  fechaProbableParto?: string;
  tipoCelo?: string;
  sintomasCelo?: string;
  horaOptimaIA?: string;
}

export interface TableroAlertasGanaderia {
  fechaConsulta: string;
  diasAdelante: number;
  refuerzosVacunaPendientes: AplicacionVacunaGanaderia[];
  retirosSanitariosVigentes: AplicacionVacunaGanaderia[];
  partosProximos: EventoReproductivoGanaderia[];
}

export interface ResumenFinancieroGanaderia {
  desde: string;
  hasta: string;
  totalGastos: number;
  totalIngresosVenta: number;
  utilidadNeta: number;
  gastos: Array<{ id: number; fecha: string; categoria: string; descripcion: string; monto: number }>;
  ventas: Array<{ id: number; fecha: string; numeroTicket: string; comprador?: string; total: number }>;
}

export function listarAnimalesGanaderia(estado?: string): Promise<AnimalGanaderia[]> {
  const q = estado ? `?estado=${encodeURIComponent(estado)}` : "";
  return request(`/api/ganaderia/animales${q}`);
}

export function crearAnimalGanaderia(tenantId: number, datos: {
  arete: string;
  tipoIdentificador?: string;
  nombre?: string;
  especie?: string;
  raza?: string;
  sexo: string;
  tipoAnimal?: string;
  fechaNacimiento?: string;
  pesoActual?: number;
  valorEstimado?: number;
  potreroId?: number;
  lote?: string;
  madreId?: number;
  costoAdquisicion?: number;
  estadoReproductivo?: string;
  estadoProductivo?: string;
}): Promise<AnimalGanaderia> {
  return request(`/api/ganaderia/animales?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function actualizarAnimalGanaderia(id: number, tenantId: number, datos: Partial<AnimalGanaderia>): Promise<AnimalGanaderia> {
  return request(`/api/ganaderia/animales/${id}?tenantId=${tenantId}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function registrarVentaGanaderia(tenantId: number, datos: {
  numeroTicket?: string;
  comprador: string;
  items: Array<{
    animalId: number;
    precioVenta: number;
  }>;
  monedaPago?: string;
  montoRecibido?: number;
  claveIdempotencia?: string;
}): Promise<any> {
  return request(`/api/ganaderia/ventas?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function listarPotrerosGanaderia(): Promise<PotreroGanaderia[]> {
  return request(`/api/ganaderia/potreros`);
}

export function crearPotreroGanaderia(tenantId: number, datos: Partial<PotreroGanaderia>): Promise<PotreroGanaderia> {
  return request(`/api/ganaderia/potreros?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function actualizarPotreroGanaderia(id: number, tenantId: number, datos: Partial<PotreroGanaderia>): Promise<PotreroGanaderia> {
  return request(`/api/ganaderia/potreros/${id}?tenantId=${tenantId}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function rotarPotreroGanaderia(id: number, tenantId: number, potreroDestinoId: number, animalIds?: number[]): Promise<any> {
  return request(`/api/ganaderia/potreros/${id}/rotar?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ potreroDestinoId, animalIds }),
  });
}

export function registrarOrdenoGanaderia(tenantId: number, datos: {
  animalId: number;
  fecha?: string;
  turno: string;
  cantidadLitros: number;
  precioVentaLitro?: number;
  porcentajeGrasa?: number;
  porcentajeProteina?: number;
}): Promise<RegistroOrdenoGanaderia> {
  return request(`/api/ganaderia/ordeno?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function obtenerReporteOrdenoGanaderia(tenantId: number, desde: string, hasta: string): Promise<ReporteOrdenoGanaderia> {
  return request(`/api/ganaderia/ordeno/reporte?tenantId=${tenantId}&desde=${desde}&hasta=${hasta}`);
}

export function registrarPesoGanaderia(tenantId: number, animalId: number, pesoKg: number, fecha?: string): Promise<RegistroPesoGanaderia> {
  return request(`/api/ganaderia/pesos?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ animalId, pesoKg, fecha }),
  });
}

export function obtenerCurvaPesoGanaderia(animalId: number): Promise<RegistroPesoGanaderia[]> {
  return request(`/api/ganaderia/pesos/animal/${animalId}`);
}

export function obtenerGdpGanaderia(animalId: number): Promise<GdpGanaderiaResponse> {
  return request(`/api/ganaderia/pesos/animal/${animalId}/gdp`);
}

export function listarVacunasGanaderia(): Promise<VacunaGanaderia[]> {
  return request(`/api/ganaderia/vacunas`);
}

export function crearVacunaGanaderia(tenantId: number, datos: Partial<VacunaGanaderia>): Promise<VacunaGanaderia> {
  return request(`/api/ganaderia/vacunas?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function obtenerVacunasPorAnimal(animalId: number): Promise<AplicacionVacunaGanaderia[]> {
  return request(`/api/ganaderia/vacunas/animal/${animalId}`);
}

export function obtenerEventosReproductivosPorHembra(hembraId: number): Promise<EventoReproductivoGanaderia[]> {
  return request(`/api/ganaderia/reproduccion/hembra/${hembraId}`);
}

export function aplicarVacunaGanaderia(tenantId: number, datos: {
  animalId: number;
  vacunaId: number;
  fechaAplicacion: string;
  lote?: string;
  veterinarioResponsable?: string;
  costo?: number;
}): Promise<AplicacionVacunaGanaderia> {
  return request(`/api/ganaderia/vacunas/aplicar?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function obtenerAlertasSanitariasGanaderia(tenantId: number): Promise<AlertaSanitariaGanaderia[]> {
  return request(`/api/ganaderia/sanidad/alertas?tenantId=${tenantId}`);
}

export function obtenerAlertasGanaderia(tenantId: number, diasAdelante: number = 15): Promise<TableroAlertasGanaderia> {
  return request(`/api/ganaderia/alertas?tenantId=${tenantId}&diasAdelante=${diasAdelante}`);
}

export function registrarEventoReproductivoGanaderia(tenantId: number, datos: {
  hembraId: number;
  tipo: string;
  fecha: string;
  sementalId?: number;
  sementalReferenciaExterna?: string;
  resultado?: string;
  fechaProbableParto?: string;
  areteCria?: string;
  sexoCria?: string;
  pesoCria?: number;
  tipoCelo?: string;
  sintomasCelo?: string;
  horaOptimaIA?: string;
}): Promise<EventoReproductivoGanaderia> {
  return request(`/api/ganaderia/reproduccion?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function registrarMastitisGanaderia(tenantId: number, datos: {
  animalId: number;
  fecha?: string;
  cuartoAfectado?: string;
  gradoCmt?: string;
  farmacoAplicado?: string;
  diasRetiroLeche?: number;
  veterinario?: string;
  costo?: number;
  notas?: string;
}): Promise<any> {
  return request(`/api/ganaderia/sanidad/mastitis?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function obtenerFinanzasGanaderia(tenantId: number, desde: string, hasta: string): Promise<ResumenFinancieroGanaderia> {
  return request(`/api/ganaderia/finanzas/resumen-periodo?tenantId=${tenantId}&desde=${desde}&hasta=${hasta}`);
}


