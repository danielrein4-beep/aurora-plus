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

  let res: Response;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    // fetch() rechaza (no responde con un status) cuando el navegador no
    // pudo ni siquiera contactar al servidor: sin internet, DNS caído, el
    // backend apagado. Esto es justo lo que ApiError.status===undefined ya
    // documentaba pero nunca se producía realmente — sin este catch, un
    // corte de conexión salía como un TypeError crudo ("Failed to fetch")
    // indistinguible de cualquier otro bug para quien llama. Con esto, todo
    // el código de la app (incluida la cola offline de Horeca) puede
    // confiar en "status === undefined" para saber "no hay conexión".
    throw new ApiError("Sin conexión con el servidor", undefined);
  }
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

export function actualizarLogo(imagenBase64: string): Promise<MiNegocio> {
  return request("/api/config/mi-negocio/logo", { method: "PUT", body: JSON.stringify({ imagenBase64 }) });
}

/** Moneda principal del negocio (USD/VES/COP) — la usa todo el motor financiero (tasas, conversiones, caja) como base de precios. Solo el Dueño/Administrador la puede cambiar. */
export function obtenerMonedaBaseNegocio(): Promise<{ monedaBase: string }> {
  return request("/api/config/mi-negocio/moneda-base");
}

export function actualizarMonedaBaseNegocio(monedaBase: string): Promise<{ monedaBase: string }> {
  return request("/api/config/mi-negocio/moneda-base", { method: "PUT", body: JSON.stringify({ monedaBase }) });
}

export type OrigenTasaActiva = "BCV" | "USDT" | "PERSONALIZADA";

/**
 * Cuál tasa gobierna el cobro en el POS — decisión de negocio (Dueño/Administrador), no una
 * preferencia por navegador. BCV y USDT no las escribe el negocio (se consultan en vivo con
 * actualizarTasaExterna); PERSONALIZADA sí, vía actualizarTasa.
 */
export function obtenerOrigenTasaActiva(): Promise<{ origenTasaActiva: OrigenTasaActiva }> {
  return request("/api/config/mi-negocio/origen-tasa");
}

export function actualizarOrigenTasaActiva(origenTasaActiva: OrigenTasaActiva): Promise<{ origenTasaActiva: OrigenTasaActiva }> {
  return request("/api/config/mi-negocio/origen-tasa", { method: "PUT", body: JSON.stringify({ origenTasaActiva }) });
}

export interface DatosFiscalesNegocio {
  rif?: string;
  razonSocial?: string;
  domicilioFiscal?: string;
}

/** Datos fiscales opcionales (RIF, razón social, domicilio) que se estampan en notas de entrega y recibos — nunca obligatorios. */
export function obtenerDatosFiscalesNegocio(): Promise<DatosFiscalesNegocio> {
  return request("/api/config/mi-negocio/datos-fiscales");
}

export function actualizarDatosFiscalesNegocio(datos: DatosFiscalesNegocio): Promise<DatosFiscalesNegocio> {
  return request("/api/config/mi-negocio/datos-fiscales", { method: "PUT", body: JSON.stringify(datos) });
}

/** Zonas/estaciones de cocina de Horeca (ej. COCINA, PARRILLA, BAR) — cada negocio arma las suyas; sin configurar trae las 4 clásicas por defecto. */
export function obtenerZonasCocina(): Promise<{ zonas: string[] }> {
  return request("/api/config/mi-negocio/zonas-cocina");
}

export function actualizarZonasCocina(zonas: string[]): Promise<{ zonas: string[] }> {
  return request("/api/config/mi-negocio/zonas-cocina", { method: "PUT", body: JSON.stringify({ zonas }) });
}

/** Zonas físicas de mesas de Horeca (ej. SALON_PRINCIPAL, TERRAZA, BARRA) — cada negocio arma las suyas; sin configurar trae las 3 clásicas por defecto. */
export function obtenerZonasMesa(): Promise<{ zonas: string[] }> {
  return request("/api/config/mi-negocio/zonas-mesa");
}

export function actualizarZonasMesa(zonas: string[]): Promise<{ zonas: string[] }> {
  return request("/api/config/mi-negocio/zonas-mesa", { method: "PUT", body: JSON.stringify({ zonas }) });
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

export async function listarPacientes(): Promise<Paciente[]> {
  return request<Paciente[]>(`/api/salud/pacientes`);
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

export async function crearPaciente(datos: NuevoPaciente): Promise<Paciente> {
  return request<Paciente>(`/api/salud/pacientes`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function actualizarPaciente(id: number, datos: NuevoPaciente): Promise<Paciente> {
  return request<Paciente>(`/api/salud/pacientes/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export async function buscarPacientePorIdentificacion(identificacion: string): Promise<Paciente | null> {
  try {
    return await request<Paciente>(`/api/salud/pacientes/identificacion/${encodeURIComponent(identificacion)}`);
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

export async function listarCitasDelDia(fecha: string): Promise<CitaMedica[]> {
  return request<CitaMedica[]>(`/api/salud/agenda?fecha=${fecha}`);
}

/** Citas de un rango de fechas (ej. el mes visible en el calendario) — una sola llamada en vez de una por día. */
export async function listarCitasPorRango(fechaInicio: string, fechaFin: string): Promise<CitaMedica[]> {
  return request<CitaMedica[]>(`/api/salud/agenda?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
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

export async function agendarCita(datos: NuevaCita): Promise<CitaMedica> {
  return request<CitaMedica>(`/api/salud/agenda/citas`, {
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
export function registrarBloqueoAgenda(datos: { fechaInicio: string; fechaFin: string; motivo: string }): Promise<BloqueoAgenda> {
  return request<BloqueoAgenda>(`/api/salud/agenda/bloqueos`, {
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
export function procesarCobro(datos: NuevoCobro, claveIdempotencia?: string): Promise<CobroConsulta> {
  return request<CobroConsulta>(`/api/salud/cobros`, {
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

export function registrarCierreCaja(datos: Omit<CierreCajaRegistro, "id">): Promise<CierreCajaRegistro> {
  return request<CierreCajaRegistro>(`/api/salud/cierres-caja`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function eliminarCierreCaja(id: number): Promise<void> {
  return request<void>(`/api/salud/cierres-caja/${id}`, { method: "DELETE" });
}

// El PIN del Médico Titular se valida en el servidor (nunca se guarda ni se
// compara en el navegador) — ver ConfiguracionMedicaController.
export function estadoPinDoctor(): Promise<{ personalizada: boolean }> {
  return request(`/api/salud/config/pin/estado`);
}

export function verificarPinDoctor(pin: string): Promise<{ valido: boolean }> {
  return request(`/api/salud/config/pin/verificar`, {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

export function configurarPinDoctor(pinNuevo: string, pinActual?: string): Promise<{ mensaje: string }> {
  return request(`/api/salud/config/pin/configurar`, {
    method: "POST",
    body: JSON.stringify({ pinNuevo, pinActual }),
  });
}

// Perfil médico y membrete de documentos (motor de personalización de PDFs) — guardado por
// tenant en el servidor (ver ConfiguracionMedicaController), no en localStorage de un solo
// dispositivo. Se inyecta automáticamente en el encabezado y la firma de cada PDF generado.
export interface PerfilMedicoDocumentos {
  doctorNombre: string;
  especialidad: string;
  matriculaMpps: string;
  colegioMedicos: string;
  encabezadoTexto: string;
  firmaBase64: string | null;
  /** Borrador editable del recordatorio de cita por WhatsApp (costo, forma de pago, hora de
   * llegada los define cada médico) — el sistema solo rellena saludo/paciente/fecha/hora. */
  plantillaRecordatorioCita: string | null;
}

export function obtenerPerfilMedicoDocumentos(): Promise<PerfilMedicoDocumentos> {
  return request("/api/salud/config/perfil");
}

export function actualizarPerfilMedicoDocumentos(datos: Omit<PerfilMedicoDocumentos, "firmaBase64">): Promise<PerfilMedicoDocumentos> {
  return request("/api/salud/config/perfil", { method: "PUT", body: JSON.stringify(datos) });
}

export function actualizarFirmaMedico(firmaBase64: string): Promise<PerfilMedicoDocumentos> {
  return request("/api/salud/config/firma", { method: "PUT", body: JSON.stringify({ firmaBase64 }) });
}

export interface SalaEsperaEntrada {
  id: number;
  paciente: Paciente;
  consultorio: string | null;
  estado: string;
  horaLlegada: string;
}

export async function listarSalaEspera(): Promise<SalaEsperaEntrada[]> {
  return request<SalaEsperaEntrada[]>(`/api/salud/sala-espera`);
}

export async function registrarLlegadaSalaEspera(
  pacienteId: number,
  consultorio?: string
): Promise<SalaEsperaEntrada> {
  return request<SalaEsperaEntrada>(`/api/salud/sala-espera/check-in`, {
    method: "POST",
    body: JSON.stringify({ paciente: { id: pacienteId }, consultorio }),
  });
}

export async function finalizarAtencionSalaEspera(id: number): Promise<SalaEsperaEntrada> {
  return request(`/api/salud/sala-espera/${id}/finalizar`, { method: "POST" });
}

export async function llamarAConsultorioSalaEspera(id: number, consultorio?: string): Promise<SalaEsperaEntrada> {
  const params = consultorio ? `?consultorio=${encodeURIComponent(consultorio)}` : "";
  return request(`/api/salud/sala-espera/${id}/llamar${params}`, { method: "POST" });
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

export function crearCotizacion(datos: NuevaCotizacion): Promise<CotizacionMedicaApi> {
  return request<CotizacionMedicaApi>(`/api/salud/cotizaciones`, {
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
  /** "120/80" tal cual la anota el doctor — sin este campo, los informes imprimían un valor inventado. */
  presionArterial?: string;
  frecuenciaCardiaca?: number;
  frecuenciaRespiratoria?: number;
  temperatura?: number;
  saturacionOxigeno?: number;
  /** Calculado y devuelto por el backend a partir de peso/talla — no se envía, solo se lee. */
  imc?: number;
  evolucionClinica?: string;
  /** Cómo llegó el paciente respecto a su visita anterior — alimenta la gráfica de
   * tendencia de evolución en Historias Clínicas. Solo tiene sentido en consultas de
   * seguimiento (no en la primera visita de un paciente). */
  evolucionEstado?: "MEJORO" | "IGUAL" | "EMPEORO";
  fechaHora?: string;
  fechaConsulta?: string;
  /** Listado de farmacos prescritos (JSON serializado desde VademecumPrescriptor). */
  recipeMedicamentos?: string;
}

export async function historialConsultasPaciente(pacienteId: number): Promise<ConsultaMedica[]> {
  return request<ConsultaMedica[]>(`/api/salud/consultas/paciente/${pacienteId}`);
}

export async function registrarConsulta(
  pacienteId: number,
  datos: Partial<ConsultaMedica>
): Promise<ConsultaMedica> {
  return request<ConsultaMedica>(`/api/salud/consultas`, {
    method: "POST",
    body: JSON.stringify({ paciente: { id: pacienteId }, ...datos }),
  });
}

export async function eliminarConsulta(
  _pacienteId: number,
  consultaId: number
): Promise<void> {
  await request(`/api/salud/consultas/${consultaId}`, {
    method: "DELETE",
  });
}

// --- Odontograma (Mediclinic Odonto) ---

export type EstadoDiente = "SANO" | "CARIES" | "OBTURADO" | "AUSENTE" | "CORONA" | "ENDODONCIA" | "EXTRACCION_INDICADA" | "IMPLANTE";

export interface OdontogramaDiente {
  id: number;
  numeroFdi: number;
  estado: EstadoDiente;
  notas: string | null;
  fechaActualizacion: string;
}

export async function listarOdontograma(pacienteId: number): Promise<OdontogramaDiente[]> {
  return request<OdontogramaDiente[]>(`/api/salud/odontograma?pacienteId=${pacienteId}`);
}

export async function actualizarDienteOdontograma(
  pacienteId: number,
  numeroFdi: number,
  datos: { estado: EstadoDiente; notas?: string }
): Promise<OdontogramaDiente> {
  return request<OdontogramaDiente>(`/api/salud/odontograma/diente`, {
    method: "PUT",
    body: JSON.stringify({ pacienteId, numeroFdi, ...datos }),
  });
}

// --- Veterinaria / Aurora Vet ---

export interface Propietario {
  id: number;
  nombreCompleto: string;
  identificacion: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo: boolean;
}

export interface NuevoPropietario {
  identificacion: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

export async function listarPropietarios(tenantId: number, buscar?: string): Promise<Propietario[]> {
  const q = buscar ? `&buscar=${encodeURIComponent(buscar)}` : "";
  return request<Propietario[]>(`/api/veterinaria/propietarios?tenantId=${tenantId}${q}`);
}

export async function crearPropietario(tenantId: number, datos: NuevoPropietario): Promise<Propietario> {
  return request<Propietario>(`/api/veterinaria/propietarios?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function actualizarPropietario(tenantId: number, id: number, datos: NuevoPropietario): Promise<Propietario> {
  return request<Propietario>(`/api/veterinaria/propietarios/${id}?tenantId=${tenantId}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export async function buscarPropietarioPorIdentificacion(tenantId: number, identificacion: string): Promise<Propietario | null> {
  try {
    return await request<Propietario>(`/api/veterinaria/propietarios/identificacion/${encodeURIComponent(identificacion)}?tenantId=${tenantId}`);
  } catch (err) {
    if (err instanceof ApiError && /404/.test(err.message)) return null;
    throw err;
  }
}

export async function eliminarPropietario(tenantId: number, id: number): Promise<void> {
  await request(`/api/veterinaria/propietarios/${id}?tenantId=${tenantId}`, { method: "DELETE" });
}

export type EspecieMascota = "PERRO" | "GATO" | "AVE" | "EXOTICO" | "OTRO";

export interface Mascota {
  id: number;
  nombre: string;
  propietario: Propietario;
  especie: EspecieMascota;
  raza?: string;
  sexo?: "MACHO" | "HEMBRA" | string;
  fechaNacimiento?: string;
  edadEstimada?: string;
  edadCalculada?: string;
  colorSenas?: string;
  pesoActualKg?: number;
  microchip?: string;
  esterilizado: boolean;
  alergias?: string;
  antecedentesPatologicos?: string;
  fallecido: boolean;
  activo: boolean;
}

export interface NuevaMascota {
  nombre: string;
  propietarioId: number;
  especie: EspecieMascota;
  raza?: string;
  sexo?: string;
  fechaNacimiento?: string;
  edadEstimada?: string;
  colorSenas?: string;
  pesoActualKg?: number;
  microchip?: string;
  esterilizado?: boolean;
  alergias?: string;
  antecedentesPatologicos?: string;
}

export async function listarMascotas(tenantId: number, propietarioId?: number, buscar?: string): Promise<Mascota[]> {
  let url = `/api/veterinaria/mascotas?tenantId=${tenantId}`;
  if (propietarioId) url += `&propietarioId=${propietarioId}`;
  if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
  return request<Mascota[]>(url);
}

export async function obtenerMascota(tenantId: number, id: number): Promise<Mascota> {
  return request<Mascota>(`/api/veterinaria/mascotas/${id}?tenantId=${tenantId}`);
}

export async function crearMascota(tenantId: number, datos: NuevaMascota): Promise<Mascota> {
  return request<Mascota>(`/api/veterinaria/mascotas?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({
      propietario: { id: datos.propietarioId },
      ...datos,
    }),
  });
}

export async function actualizarMascota(tenantId: number, id: number, datos: NuevaMascota): Promise<Mascota> {
  return request<Mascota>(`/api/veterinaria/mascotas/${id}?tenantId=${tenantId}`, {
    method: "PUT",
    body: JSON.stringify({
      propietario: { id: datos.propietarioId },
      ...datos,
    }),
  });
}

export async function eliminarMascota(tenantId: number, id: number): Promise<void> {
  await request(`/api/veterinaria/mascotas/${id}?tenantId=${tenantId}`, { method: "DELETE" });
}

export async function marcarMascotaFallecido(tenantId: number, id: number, fallecido: boolean): Promise<void> {
  await request(`/api/veterinaria/mascotas/${id}/fallecido?tenantId=${tenantId}&fallecido=${fallecido}`, { method: "PATCH" });
}

export interface CitaVeterinaria {
  id: number;
  mascota: Mascota;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo: string;
  especialidad: string | null;
  estado: string;
  costoEstimado?: number;
  moneda?: string;
  notas?: string;
}

export interface NuevaCitaVet {
  mascotaId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
  especialidad?: string;
  estado?: string;
  costoEstimado?: number;
  moneda?: string;
  notas?: string;
}

export async function listarCitasVetDelDia(tenantId: number, fecha: string): Promise<CitaVeterinaria[]> {
  return request<CitaVeterinaria[]>(`/api/veterinaria/agenda?tenantId=${tenantId}&fecha=${fecha}`);
}

export async function listarCitasVetPorRango(tenantId: number, fechaInicio: string, fechaFin: string): Promise<CitaVeterinaria[]> {
  return request<CitaVeterinaria[]>(`/api/veterinaria/agenda?tenantId=${tenantId}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
}

export async function agendarCitaVet(tenantId: number, datos: NuevaCitaVet): Promise<CitaVeterinaria> {
  return request<CitaVeterinaria>(`/api/veterinaria/agenda/citas?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({
      mascota: { id: datos.mascotaId },
      fecha: datos.fecha,
      horaInicio: datos.horaInicio,
      horaFin: datos.horaFin,
      motivo: datos.motivo,
      especialidad: datos.especialidad,
      estado: datos.estado || "PROGRAMADA",
      costoEstimado: datos.costoEstimado,
      moneda: datos.moneda || "USD",
      notas: datos.notas,
    }),
  });
}

export function actualizarEstadoCitaVet(tenantId: number, id: number, estado: string): Promise<CitaVeterinaria> {
  return request<CitaVeterinaria>(`/api/veterinaria/agenda/citas/${id}/estado?tenantId=${tenantId}&estado=${estado}`, { method: "PATCH" });
}

export function reprogramarCitaVet(tenantId: number, id: number, fecha: string, horaInicio: string, horaFin: string): Promise<CitaVeterinaria> {
  return request<CitaVeterinaria>(`/api/veterinaria/agenda/citas/${id}/reprogramar?tenantId=${tenantId}`, {
    method: "PATCH",
    body: JSON.stringify({ fecha, horaInicio, horaFin }),
  });
}

export interface BloqueoAgendaVet {
  id: number;
  veterinarioId: number;
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string | null;
  horaFin: string | null;
  motivo: string;
}

export function registrarBloqueoAgendaVet(tenantId: number, datos: { fechaInicio: string; fechaFin: string; motivo: string }): Promise<BloqueoAgendaVet> {
  return request<BloqueoAgendaVet>(`/api/veterinaria/agenda/bloqueos?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function listarBloqueosAgendaVet(tenantId: number, veterinarioId: number): Promise<BloqueoAgendaVet[]> {
  return request<BloqueoAgendaVet[]>(`/api/veterinaria/agenda/bloqueos/veterinario/${veterinarioId}?tenantId=${tenantId}`);
}

export function eliminarBloqueoAgendaVet(tenantId: number, id: number): Promise<void> {
  return request<void>(`/api/veterinaria/agenda/bloqueos/${id}?tenantId=${tenantId}`, { method: "DELETE" });
}

export interface CobroConsultaVet {
  id: number;
  mascota?: Mascota;
  propietario?: Propietario;
  concepto: string;
  montoTotal: number;
  monedaCobrada: string;
  montoRecibido: number;
  monedaPago: string;
  tasaCambio?: number;
  metodoPago: "EFECTIVO" | "TRANSFERENCIA" | "PUNTO_VENTA" | "PAGO_MOVIL" | "ZELLE" | "OTRO";
  referenciaPago?: string;
  fechaHora: string;
  cajeroUsuario?: string;
  estado: string;
}

export async function listarCobrosVetDelDia(tenantId: number, inicioIso: string, finIso: string): Promise<CobroConsultaVet[]> {
  try {
    return await request(`/api/veterinaria/cobros/reporte?tenantId=${tenantId}&inicio=${inicioIso}&fin=${finIso}`);
  } catch {
    return [];
  }
}

export interface NuevoCobroVet {
  mascotaId?: number;
  propietarioId?: number;
  concepto: string;
  montoTotal: number;
  monedaCobrada: string;
  montoRecibido: number;
  monedaPago: string;
  metodoPago: "EFECTIVO" | "TRANSFERENCIA" | "PUNTO_VENTA" | "PAGO_MOVIL" | "ZELLE" | "OTRO";
  referenciaPago?: string;
}

export function procesarCobroVet(tenantId: number, datos: NuevoCobroVet, claveIdempotencia?: string): Promise<CobroConsultaVet> {
  return request<CobroConsultaVet>(`/api/veterinaria/cobros?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({
      claveIdempotencia: claveIdempotencia || generarClaveIdempotencia(),
      mascotaId: datos.mascotaId,
      propietarioId: datos.propietarioId,
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

export interface CierreCajaVetRegistro {
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

export function listarCierresCajaVet(tenantId: number): Promise<CierreCajaVetRegistro[]> {
  return request<CierreCajaVetRegistro[]>(`/api/veterinaria/cierres-caja?tenantId=${tenantId}`);
}

export function registrarCierreCajaVet(tenantId: number, datos: Omit<CierreCajaVetRegistro, "id">): Promise<CierreCajaVetRegistro> {
  return request<CierreCajaVetRegistro>(`/api/veterinaria/cierres-caja?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function eliminarCierreCajaVet(tenantId: number, id: number): Promise<void> {
  return request<void>(`/api/veterinaria/cierres-caja/${id}?tenantId=${tenantId}`, { method: "DELETE" });
}

export interface SalaEsperaVetEntrada {
  id: number;
  mascota: Mascota;
  consultorio: string | null;
  estado: string;
  prioridad: string;
  horaLlegada: string;
  veterinarioNombre?: string;
}

export async function listarSalaEsperaVet(tenantId: number): Promise<SalaEsperaVetEntrada[]> {
  return request<SalaEsperaVetEntrada[]>(`/api/veterinaria/sala-espera?tenantId=${tenantId}`);
}

export async function registrarLlegadaSalaEsperaVet(
  tenantId: number,
  mascotaId: number,
  consultorio?: string
): Promise<SalaEsperaVetEntrada> {
  return request<SalaEsperaVetEntrada>(`/api/veterinaria/sala-espera/check-in?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ mascota: { id: mascotaId }, consultorio }),
  });
}

export async function llamarAConsultorioSalaEsperaVet(
  tenantId: number,
  id: number,
  consultorio?: string,
  veterinarioId?: number,
  veterinarioNombre?: string
): Promise<SalaEsperaVetEntrada> {
  let url = `/api/veterinaria/sala-espera/${id}/llamar?tenantId=${tenantId}`;
  if (consultorio) url += `&consultorio=${encodeURIComponent(consultorio)}`;
  if (veterinarioId) url += `&veterinarioId=${veterinarioId}`;
  if (veterinarioNombre) url += `&veterinarioNombre=${encodeURIComponent(veterinarioNombre)}`;
  return request<SalaEsperaVetEntrada>(url, { method: "POST" });
}

export async function finalizarAtencionSalaEsperaVet(tenantId: number, id: number): Promise<SalaEsperaVetEntrada> {
  return request(`/api/veterinaria/sala-espera/${id}/finalizar?tenantId=${tenantId}`, { method: "POST" });
}

export interface ProcedimientoVeterinario {
  id: number;
  nombre: string;
  descripcion: string | null;
  costo: number;
  moneda: string;
  duracionMinutos: number | null;
}

export async function listarProcedimientosVet(tenantId: number): Promise<ProcedimientoVeterinario[]> {
  return request<ProcedimientoVeterinario[]>(`/api/veterinaria/procedimientos?tenantId=${tenantId}`);
}

export async function crearProcedimientoVet(
  tenantId: number,
  datos: Omit<ProcedimientoVeterinario, "id">
): Promise<ProcedimientoVeterinario> {
  return request<ProcedimientoVeterinario>(`/api/veterinaria/procedimientos?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function eliminarProcedimientoVet(tenantId: number, id: number): Promise<void> {
  return request<void>(`/api/veterinaria/procedimientos/${id}?tenantId=${tenantId}`, { method: "DELETE" });
}

export interface CotizacionVeterinariaApi {
  id: number;
  mascota: Mascota;
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

export interface NuevaCotizacionVet {
  mascotaId: number;
  procedimientoNombre: string;
  descripcion?: string;
  costoUSD: number;
  costoVES?: number;
  costoCOP?: number;
  tasaBCV?: number;
  tasaCOP?: number;
  fechaPlanificada?: string;
}

export function listarCotizacionesVet(tenantId: number, mascotaId?: number): Promise<CotizacionVeterinariaApi[]> {
  const q = mascotaId ? `/mascota/${mascotaId}` : "";
  return request<CotizacionVeterinariaApi[]>(`/api/veterinaria/cotizaciones${q}?tenantId=${tenantId}`);
}

export function crearCotizacionVet(tenantId: number, datos: NuevaCotizacionVet): Promise<CotizacionVeterinariaApi> {
  return request<CotizacionVeterinariaApi>(`/api/veterinaria/cotizaciones?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ mascota: { id: datos.mascotaId }, ...datos }),
  });
}

export function actualizarEstadoCotizacionVet(tenantId: number, id: number, estado: CotizacionVeterinariaApi["estado"]): Promise<CotizacionVeterinariaApi> {
  return request<CotizacionVeterinariaApi>(`/api/veterinaria/cotizaciones/${id}/estado?tenantId=${tenantId}&estado=${estado}`, { method: "PATCH" });
}

export function eliminarCotizacionVet(tenantId: number, id: number): Promise<void> {
  return request<void>(`/api/veterinaria/cotizaciones/${id}?tenantId=${tenantId}`, { method: "DELETE" });
}

export interface ConsultaVeterinaria {
  id: number;
  motivoConsulta: string;
  enfermedadActual?: string;
  observacionFisica?: string;
  evolucionClinica?: string;
  evolucionEstado?: "MEJORO" | "IGUAL" | "EMPEORO";
  frecuenciaCardiaca?: number;
  frecuenciaRespiratoria?: number;
  temperatura?: number;
  peso?: string;
  pesoKg?: number;
  condicionCorporal?: number; // BCS 1-9
  diagnosticoPrincipal?: string;
  descripcionDiagnostico?: string;
  diagnosticosSecundarios?: string;
  planTratamiento?: string;
  recipeMedicamentos?: string;
  indicacionesGenerales?: string;
  ordenExamenes?: string;
  anotacionesPrivadas?: string;
  fechaHora?: string;
}

export async function historialConsultasMascota(tenantId: number, mascotaId: number): Promise<ConsultaVeterinaria[]> {
  return request<ConsultaVeterinaria[]>(`/api/veterinaria/consultas/mascota/${mascotaId}?tenantId=${tenantId}`);
}

export async function registrarConsultaVet(
  tenantId: number,
  mascotaId: number,
  datos: Partial<ConsultaVeterinaria>
): Promise<ConsultaVeterinaria> {
  return request<ConsultaVeterinaria>(`/api/veterinaria/consultas?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ mascota: { id: mascotaId }, ...datos }),
  });
}

export async function eliminarConsultaVet(
  tenantId: number,
  _mascotaId: number,
  consultaId: number
): Promise<void> {
  await request(`/api/veterinaria/consultas/${consultaId}?tenantId=${tenantId}`, {
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

export type EstadoItemComanda = "PENDIENTE" | "PREPARANDO" | "LISTO" | "ENTREGADO" | "ANULADO";

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
  motivoAnulacion?: string;
  usuarioAnulacion?: string;
  fechaAnulacion?: string;
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

export function abrirComanda(datos: {
  numeroMesa?: number; mesero: string; canal?: string; nombreCliente?: string;
  telefonoCliente?: string; direccionEntrega?: string; mensajero?: string; clienteId?: number;
}): Promise<Comanda> {
  const params = new URLSearchParams({ mesero: datos.mesero });
  if (datos.numeroMesa != null) params.set("numeroMesa", String(datos.numeroMesa));
  if (datos.canal) params.set("canal", datos.canal);
  if (datos.nombreCliente) params.set("nombreCliente", datos.nombreCliente);
  if (datos.telefonoCliente) params.set("telefonoCliente", datos.telefonoCliente);
  if (datos.direccionEntrega) params.set("direccionEntrega", datos.direccionEntrega);
  if (datos.mensajero) params.set("mensajero", datos.mensajero);
  if (datos.clienteId != null) params.set("clienteId", String(datos.clienteId));
  return request(`/api/horeca/mesas/comandas/abrir?${params}`, { method: "POST" });
}

export function agregarItemComanda(comandaId: number, datos: {
  escandalloId?: number; articuloId?: number; fastBarTragoId?: number; nombrePlato?: string; estacionCocina?: string; cantidad: number; precioUnitario?: number; notas?: string; claveIdempotencia?: string;
}): Promise<ItemComanda> {
  const params = new URLSearchParams({ cantidad: String(datos.cantidad) });
  if (datos.escandalloId != null) params.set("escandalloId", String(datos.escandalloId));
  if (datos.articuloId != null) params.set("articuloId", String(datos.articuloId));
  if (datos.fastBarTragoId != null) params.set("fastBarTragoId", String(datos.fastBarTragoId));
  if (datos.nombrePlato) params.set("nombrePlato", datos.nombrePlato);
  if (datos.estacionCocina) params.set("estacionCocina", datos.estacionCocina);
  if (datos.precioUnitario != null) params.set("precioUnitario", String(datos.precioUnitario));
  if (datos.notas) params.set("notas", datos.notas);
  if (datos.claveIdempotencia) params.set("claveIdempotencia", datos.claveIdempotencia);
  return request(`/api/horeca/mesas/comandas/${comandaId}/items?${params}`, { method: "POST" });
}

export function actualizarEstadoItem(itemId: number, nuevoEstado: EstadoItemComanda): Promise<ItemComanda> {
  return request(`/api/horeca/mesas/items/${itemId}/estado?nuevoEstado=${nuevoEstado}`, { method: "PATCH" });
}

// Ítem del tablero KDS — ya trae la mesa/mesero aplanados desde el backend
// (antes venían null: ItemComanda.comanda es LAZY y sin JOIN FETCH el
// Hibernate6Module global lo serializaba en null, el cocinero nunca sabía a
// qué mesa iba cada plato).
export interface ItemKds {
  id: number;
  nombrePlato: string;
  estacionCocina: string;
  estadoItem: EstadoItemComanda;
  cantidad: number;
  notas: string | null;
  fechaCreacion: string;
  numeroMesa: number | null;
  mesero: string | null;
  canal: string | null;
}

export function obtenerTableroKds(estacionCocina: string): Promise<ItemKds[]> {
  return request(`/api/horeca/mesas/kds/${encodeURIComponent(estacionCocina)}`);
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
  totalBs: number | null;
  totalCop?: number | null;
  monedaPago?: string | null;
  montoOriginal?: number | null;
  totalBase?: number;
  monedaBase?: string | null;
  monedaVuelto?: string | null;
  vuelto?: number | null;
  pagos?: Array<{ moneda: string; monto: number; metodoPago: string; equivalenteBase: number; tasaAplicada: number | null }>;  metodoPago: string | null;
  estado: "ABIERTA" | "PAGADA" | "ANULADA";
  canal: string;
  numeroMesa: number | null;
  mesero: string | null;
  propina?: number | null;
}

/** Reportes Operativos: listado de tickets con filtros dinámicos (todos opcionales) — motor de solo lectura, aparte del flujo del POS. */
export function reporteTickets(filtros: {
  fechaInicio?: string; fechaFin?: string; metodoPago?: string; estado?: "ABIERTA" | "PAGADA" | "ANULADA";
}): Promise<ReporteTicket[]> {
  const params = new URLSearchParams();
  if (filtros.fechaInicio) params.set("fechaInicio", filtros.fechaInicio);
  if (filtros.fechaFin) params.set("fechaFin", filtros.fechaFin);
  if (filtros.metodoPago) params.set("metodoPago", filtros.metodoPago);
  if (filtros.estado) params.set("estado", filtros.estado);
  return request(`/api/horeca/reportes/tickets?${params}`);
}

export function dividirCuenta(comandaId: number, numeroPersonas: number): Promise<number[]> {
  return request(`/api/horeca/mesas/comandas/${comandaId}/dividir?numeroPersonas=${numeroPersonas}`, { method: "POST" });
}

export function cerrarComanda(comandaId: number, datos: {
  metodoPago: string; monedaPago?: string; montoRecibido?: number;
}): Promise<Comanda> {
  const params = new URLSearchParams({ metodoPago: datos.metodoPago });
  if (datos.monedaPago) params.set("monedaPago", datos.monedaPago);
  if (datos.montoRecibido != null) params.set("montoRecibido", String(datos.montoRecibido));
  return request(`/api/horeca/mesas/comandas/${comandaId}/cerrar?${params}`, { method: "POST" });
}

export function cotizacionCobro(): Promise<{ monedaBase: string; factores: Record<string, number | null> }> {
  return request("/api/financiero/tasas/cotizacion-cobro");
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
export function cerrarComandaMixto(comandaId: number, pagos: PagoParcial[], monedaVuelto?: string, claveIdempotencia?: string): Promise<ResultadoCobroMixto> {
  const params = new URLSearchParams();
  if (monedaVuelto) params.set("monedaVuelto", monedaVuelto);
  if (claveIdempotencia) params.set("claveIdempotencia", claveIdempotencia);
  return request(`/api/horeca/mesas/comandas/${comandaId}/cerrar-mixto?${params}`, {
    method: "POST",
    body: JSON.stringify(pagos),
  });
}

/** Anula una comanda ABIERTA o PAGADA: revierte inventario/recetas y, si ya estaba cobrada, también la caja. Nunca borra nada. */
export function anularComanda(comandaId: number, datos: { motivo: string; usuario?: string }): Promise<Comanda> {
  const params = new URLSearchParams({ motivo: datos.motivo });
  if (datos.usuario) params.set("usuario", datos.usuario);
  return request(`/api/horeca/mesas/comandas/${comandaId}/anular?${params}`, { method: "POST" });
}

export function anularItemComanda(itemId: number, datos: { motivo: string; usuario?: string }): Promise<ItemComanda> {
  const params = new URLSearchParams({ motivo: datos.motivo });
  if (datos.usuario) params.set("usuario", datos.usuario);
  return request(`/api/horeca/mesas/items/${itemId}/anular?${params}`, { method: "POST" });
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

export function editarEscandallo(tenantId: number, escandalloId: number, datos: {
  nombrePlato?: string;
  estacionCocina?: string;
  precioVenta?: number;
  requiereCocina?: boolean;
}): Promise<EscandalloReceta> {
  return request(`/api/horeca/escandallos/${escandalloId}?tenantId=${tenantId}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
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

export function editarIngredienteEscandallo(tenantId: number, escandalloId: number, detalleId: number, datos: {
  cantidadRequerida?: number; pesoNeto?: number; porcentajeMerma?: number;
}): Promise<EscandalloReceta> {
  return request(`/api/horeca/escandallos/${escandalloId}/ingredientes/${detalleId}?tenantId=${tenantId}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function eliminarIngredienteEscandallo(tenantId: number, escandalloId: number, detalleId: number): Promise<EscandalloReceta> {
  return request(`/api/horeca/escandallos/${escandalloId}/ingredientes/${detalleId}?tenantId=${tenantId}`, {
    method: "DELETE",
  });
}

export function recalcularCostoEscandallo(tenantId: number, escandalloId: number): Promise<EscandalloReceta> {
  return request(`/api/horeca/escandallos/${escandalloId}/recalcular-costo?tenantId=${tenantId}`, {
    method: "POST",
  });
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

export function editarProveedorHoreca(proveedorId: number, datos: { nombre?: string; rif?: string; telefono?: string; contacto?: string; direccion?: string }): Promise<ProveedorHoreca> {
  return request(`/api/horeca/proveedores/${proveedorId}`, { method: "PUT", body: JSON.stringify(datos) });
}

// --- Meseros: directorio propio del negocio (Salón & Mesas / Reportes) ---

export interface MeseroHoreca {
  id: number;
  tenantId: number;
  nombre: string;
  telefono: string | null;
  activo: boolean;
  empleadoId: number | null;
}

// Lo que trae GET /api/horeca/meseros: el mesero + su estado de fichaje real
// (resuelto contra RRHH en el backend) cuando está vinculado a un empleado.
export interface MeseroConEstado {
  mesero: MeseroHoreca;
  enTurno: boolean;
  cargoEmpleado: string | null;
}

export function listarMeseros(): Promise<MeseroConEstado[]> {
  return request(`/api/horeca/meseros`);
}

export function crearMesero(datos: { nombre: string; telefono?: string; empleadoId?: number | null }): Promise<MeseroHoreca> {
  return request(`/api/horeca/meseros`, { method: "POST", body: JSON.stringify(datos) });
}

export function editarMesero(meseroId: number, datos: { nombre?: string; telefono?: string; empleadoId?: number | null }): Promise<MeseroHoreca> {
  return request(`/api/horeca/meseros/${meseroId}`, { method: "PUT", body: JSON.stringify(datos) });
}

// --- RRHH: empleados con reloj checador (para vincular con un mesero) ---
export type TipoControlEmpleado = "POR_HORA" | "SALARIO_FIJO" | "SOLO_CONTROL";
export type PeriodicidadPago = "SEMANAL" | "QUINCENAL" | "MENSUAL";

export interface EmpleadoRrhh {
  id: number;
  tenantId: number;
  nombre: string;
  cedula: string | null;
  cargo: string | null;
  tipoControl: TipoControlEmpleado;
  tarifaPorHora: number | null;
  salarioFijo: number | null;
  monedaSalario: string | null;
  periodicidadPago: PeriodicidadPago;
  activo: boolean;
}

export function listarEmpleadosRrhh(): Promise<EmpleadoRrhh[]> {
  return request(`/api/rrhh/empleados`);
}

export function editarEmpleadoRrhh(id: number, datos: Partial<EmpleadoRrhh>): Promise<EmpleadoRrhh> {
  return request(`/api/rrhh/empleados/${id}`, { method: "PUT", body: JSON.stringify(datos) });
}

export interface LineaLiquidacionRrhh {
  empleadoId: number;
  nombre: string;
  tipoControl: TipoControlEmpleado;
  horasTrabajadas: number;
  tarifaPorHora: number | null;
  totalPagar: number | null;
  monedaPago: string | null;
}

export interface LiquidacionPeriodoRrhh {
  desde: string;
  hasta: string;
  empleados: LineaLiquidacionRrhh[];
}

export function liquidarPeriodoRrhh(tenantId: number, desde: string, hasta: string): Promise<LiquidacionPeriodoRrhh> {
  return request(`/api/rrhh/asistencia/liquidacion?tenantId=${tenantId}&desde=${desde}&hasta=${hasta}`);
}

// --- RRHH: pagos de nómina ya efectuados (el gasto real + recibo del empleado) ---
export interface PagoNomina {
  id: number;
  tenantId: number;
  empleadoId: number;
  nombreEmpleado: string;
  cedulaEmpleado: string | null;
  cargoEmpleado: string | null;
  periodoDesde: string;
  periodoHasta: string;
  tipoControl: TipoControlEmpleado;
  horasTrabajadas: number | null;
  monto: number;
  moneda: string;
  movimientoCajaId: number | null;
  fechaPago: string;
}

export function pagarNomina(tenantId: number, datos: {
  empleadoId: number; periodoDesde: string; periodoHasta: string;
  horasTrabajadas?: number | null; monto: number; moneda: string;
}): Promise<PagoNomina> {
  return request(`/api/rrhh/pagos-nomina?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function listarPagosNomina(tenantId: number, empleadoId?: number): Promise<PagoNomina[]> {
  const params = new URLSearchParams({ tenantId: String(tenantId) });
  if (empleadoId != null) params.set("empleadoId", String(empleadoId));
  return request(`/api/rrhh/pagos-nomina?${params}`);
}

// Igual que descargarCierrePdf: necesita el Bearer token, no puede ser un <a href> plano.
export async function descargarReciboNominaPdf(tenantId: number, pagoId: number): Promise<Blob> {
  const sesion = leerSesion();
  const headers: Record<string, string> = {};
  if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;
  const res = await fetch(`/api/rrhh/pagos-nomina/${pagoId}/recibo.pdf?tenantId=${tenantId}`, { headers });
  if (res.status === 401) {
    manejarSesionVencida();
    throw new ApiError("Sesión vencida — redirigiendo al login");
  }
  if (!res.ok) throw new ApiError(`Error ${res.status}`);
  return res.blob();
}

export function desactivarMesero(meseroId: number): Promise<void> {
  return request(`/api/horeca/meseros/${meseroId}`, { method: "DELETE" });
}

export function reactivarMesero(meseroId: number): Promise<MeseroHoreca> {
  return request(`/api/horeca/meseros/${meseroId}/reactivar`, { method: "PUT" });
}

// --- Reservas de mesa ---

export type EstadoReserva = "PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "COMPLETADA";

export interface ReservaHoreca {
  id: number;
  tenantId: number;
  nombreCliente: string;
  telefono: string | null;
  fechaHora: string; // ISO datetime
  numeroPersonas: number;
  numeroMesaSugerida: number | null;
  notas: string | null;
  estado: EstadoReserva;
  fechaCreacion: string;
}

export interface DatosReserva {
  nombreCliente: string;
  telefono?: string;
  fechaHora: string; // yyyy-MM-ddTHH:mm
  numeroPersonas: number;
  numeroMesaSugerida?: number;
  notas?: string;
}

export function listarReservasDia(fecha: string): Promise<ReservaHoreca[]> {
  return request(`/api/horeca/reservas?fecha=${fecha}`);
}

export function crearReserva(datos: DatosReserva): Promise<ReservaHoreca> {
  return request(`/api/horeca/reservas`, { method: "POST", body: JSON.stringify(datos) });
}

export function editarReserva(id: number, datos: DatosReserva): Promise<ReservaHoreca> {
  return request(`/api/horeca/reservas/${id}`, { method: "PUT", body: JSON.stringify(datos) });
}

export function cambiarEstadoReserva(id: number, nuevoEstado: EstadoReserva): Promise<ReservaHoreca> {
  return request(`/api/horeca/reservas/${id}/estado?nuevoEstado=${nuevoEstado}`, { method: "PUT" });
}

// --- Binance Pay (cobro con cripto, configurable por negocio) ---

export interface EstadoBinancePay {
  configurado: boolean;
  activo: boolean;
  apiKey: string | null;
}

export function obtenerEstadoBinancePay(): Promise<EstadoBinancePay> {
  return request(`/api/config/mi-negocio/binance-pay`);
}

export function guardarBinancePay(datos: { apiKey?: string; secretKey?: string; activo: boolean }): Promise<EstadoBinancePay> {
  return request(`/api/config/mi-negocio/binance-pay`, { method: "PUT", body: JSON.stringify(datos) });
}

export interface EstadoWhatsApp {
  configurado: boolean;
  activo: boolean;
  phoneNumberId: string | null;
  plantillaNombre: string | null;
}

export function obtenerEstadoWhatsApp(): Promise<EstadoWhatsApp> {
  return request(`/api/config/mi-negocio/whatsapp`);
}

export function guardarWhatsApp(datos: { phoneNumberId?: string; accessToken?: string; plantillaNombre?: string; activo: boolean }): Promise<EstadoWhatsApp> {
  return request(`/api/config/mi-negocio/whatsapp`, { method: "PUT", body: JSON.stringify(datos) });
}

export interface OrdenBinancePay {
  prepayId: string | null;
  qrcodeLink: string | null;
  checkoutUrl: string | null;
  deeplink: string | null;
}

export function pagarComandaConBinance(comandaId: number): Promise<OrdenBinancePay> {
  return request(`/api/horeca/mesas/comandas/${comandaId}/pagar-binance`, { method: "POST" });
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
  monedaValoracion?: string | null;
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
export function crearArticulo(datos: { sku: string; nombre: string; unidadMedida?: string; categoria?: string; costoUnitario?: number; precioVenta?: number; stockMinimo?: number; monedaCosto?: string; tasaCambioAplicada?: number; unidadesOrigenPorBase?: number; cantidadInicial?: number; metodoPagoInicial?: string; fechaVencimientoInicial?: string; codigoBarras?: string; principioActivo?: string }): Promise<Articulo> {
  return request(`/api/inventario/articulos`, { method: "POST", body: JSON.stringify(datos) });
}

// costoUnitario va tal cual lo tecleó el usuario en `moneda` (o en la moneda
// base del tenant si se omite) — el backend lo convierte a la moneda base
// antes de guardar.
export function entradaArticulo(articuloId: number, datos: { cantidad: number; costoUnitario?: number; motivo?: string; fechaVencimiento?: string; metodoPago?: string; moneda?: string; tasaCambioAplicada?: number; unidadesOrigenPorBase?: number }): Promise<unknown> {
  return request(`/api/inventario/articulos/${articuloId}/entrada`, { method: "POST", body: JSON.stringify(datos) });
}

export function editarArticulo(articuloId: number, datos: { nombre?: string; categoria?: string; unidadMedida?: string; costoUnitario?: number; monedaCosto?: string; unidadesOrigenPorBase?: number; costoUnitarioOriginal?: number; precioVenta?: number; stockMinimo?: number; sku?: string; codigoBarras?: string; principioActivo?: string }): Promise<Articulo> {
  return request(`/api/inventario/articulos/${articuloId}`, { method: "PUT", body: JSON.stringify(datos) });
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

/** Corrección de inventario: indicá el stock REAL contado y el sistema calcula/ audita la diferencia solo. */
export function ajustarStockArticulo(articuloId: number, datos: { stockReal: number; motivo?: string }): Promise<Articulo> {
  return request(`/api/inventario/articulos/${articuloId}/ajustar-stock`, { method: "POST", body: JSON.stringify(datos) });
}

export function eliminarArticulo(articuloId: number): Promise<void> {
  return request(`/api/inventario/articulos/${articuloId}`, { method: "DELETE" });
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
export function importarArticulosLote(items: ItemImportacionArticulo[]): Promise<ResultadoImportacionArticulos> {
  return request(`/api/inventario/articulos/importar-lote`, { method: "POST", body: JSON.stringify(items) });
}

export interface ItemCompraInsumo {
  articuloId: number;
  cantidad: number;
  costoUnitario: number;
  presentacionId?: number;
  fechaVencimiento?: string; // yyyy-MM-dd — si viene, crea un lote rastreable para alertas
  monedaCosto?: string; // USD, VES, COP — moneda en que se escribió costoUnitario; vacío = moneda base del tenant
}

export function registrarCompraInsumo(tenantId: number, datos: { proveedorId: number; numeroFactura: string; items: ItemCompraInsumo[]; montoPagadoAhora?: number; monedaPago?: string; diasCredito?: number }): Promise<CompraInsumoHoreca> {
  return request(`/api/horeca/compras-insumo?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export interface DetalleCompraInsumoHoreca {
  id: number;
  articulo: Articulo;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
}

export interface CompraInsumoHoreca {
  id: number;
  tenantId: number;
  proveedor: ProveedorHoreca;
  numeroFactura: string | null;
  fechaCompra: string;
  total: number;
  montoPagado: number | null;
  items: DetalleCompraInsumoHoreca[];
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

export function listarTodosLotesConVencimiento(tenantId: number): Promise<LoteArticulo[]> {
  return request(`/api/inventario/lotes/todos-con-vencimiento?tenantId=${tenantId}`);
}

export interface InventarioKpis {
  cajaHoy: number;
  valorBodega: number;
  gananciaProyectada: number;
  alertasReposicion: number;
}

/** Panel de KPIs financieros de Inventario — caja neta de hoy, capital inmovilizado en bodega, utilidad proyectada y artículos que necesitan reposición. */
export function kpisInventario(): Promise<InventarioKpis> {
  return request(`/api/inventario/kpis`);
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

// Notas de entrega de Ganadería (venta de animales y despacho de leche en tanque) — igual
// que descargarCierrePdf, no pueden ser un <a href> plano porque necesitan el Bearer token.
export async function descargarNotaEntregaVentaAnimalPdf(tenantId: number, ventaId: number): Promise<Blob> {
  const sesion = leerSesion();
  const headers: Record<string, string> = {};
  if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;
  const res = await fetch(`/api/ganaderia/ventas/${ventaId}/pdf`, { headers });
  if (res.status === 401) {
    manejarSesionVencida();
    throw new ApiError("Sesión vencida — redirigiendo al login");
  }
  if (!res.ok) throw new ApiError(`Error ${res.status}`);
  return res.blob();
}

// Mismo problema que las notas de entrega: era un <a href> plano, así que el navegador
// pedía el .xlsx sin el Bearer token y el backend respondía 401 en vez del archivo.
export async function descargarAlertasSanitariasExcel(tenantId: number): Promise<Blob> {
  const sesion = leerSesion();
  const headers: Record<string, string> = {};
  if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;
  const res = await fetch(`/api/ganaderia/sanidad/alertas/export-excel?tenantId=${tenantId}`, { headers });
  if (res.status === 401) {
    manejarSesionVencida();
    throw new ApiError("Sesión vencida — redirigiendo al login");
  }
  if (!res.ok) throw new ApiError(`Error ${res.status}`);
  return res.blob();
}

export async function descargarNotaEntregaDespachoLechePdf(tenantId: number, despachoId: number): Promise<Blob> {
  const sesion = leerSesion();
  const headers: Record<string, string> = {};
  if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;
  const res = await fetch(`/api/ganaderia/ordeno/tanque/ventas/${despachoId}/pdf?tenantId=${tenantId}`, { headers });
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

/**
 * `origen` (BCV, USDT, PERSONALIZADA...) filtra a la tasa vigente de ESE origen
 * específico — cada origen es una serie propia en el backend. Sin `origen`, trae
 * la más reciente sin importar de qué origen vino (comportamiento histórico).
 */
export function tasaVigente(tenantId: number, monedaOrigen: string, monedaDestino: string, origen?: string): Promise<TasaCambio> {
  const params = new URLSearchParams({ tenantId: String(tenantId), monedaOrigen, monedaDestino });
  if (origen) params.set("origen", origen);
  return request(`/api/financiero/tasas/vigente?${params.toString()}`);
}

export function actualizarTasa(tenantId: number, datos: { monedaOrigen: string; monedaDestino: string; tasa: number; origen?: string }): Promise<TasaCambio> {
  return request(`/api/financiero/tasas?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

/**
 * Refresca la tasa USD/VES consultando en vivo una fuente pública (BCV oficial
 * o Binance P2P) y la registra como tasa nueva. Si la fuente falla, el backend
 * no escribe nada y esta llamada lanza un error con el motivo real — nunca se
 * simula un valor. Variante con tenantId explícito (ComercioApp/MediclinicApp);
 * ver también `actualizarTasaExterna` más abajo, que resuelve el tenant de la sesión.
 */
export function actualizarTasaExternaTenant(tenantId: number, fuente: "BCV" | "BINANCE", monedaDestino: string = "VES"): Promise<TasaCambio> {
  const params = new URLSearchParams({ tenantId: String(tenantId), fuente, monedaDestino });
  return request(`/api/financiero/tasas/actualizar-externa?${params.toString()}`, { method: "POST" });
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
  fechaVencimiento: string | null;
  moduloOrigen: string | null;
  referenciaTipo: string | null;
  referenciaId: number | null;
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
    if (!raw) return null;
    const sesion = JSON.parse(raw);
    if (!sesion || !sesion.token) return null;

    // Validacion proactiva: verificar si el token JWT ya expiro
    const partes = sesion.token.split(".");
    if (partes.length === 3) {
      const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const payload = JSON.parse(jsonStr);
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(SUPER_ADMIN_STORAGE_KEY);
        return null;
      }
    }
    return sesion;
  } catch {
    localStorage.removeItem(SUPER_ADMIN_STORAGE_KEY);
    return null;
  }
}

export function borrarSesionSuperAdmin() {
  localStorage.removeItem(SUPER_ADMIN_STORAGE_KEY);
}

export type TipoLicencia = "BASICA" | "COMERCIAL" | "INDUSTRIAL" | "ENTERPRISE" | "DEMO" | "BASICO" | "PROFESIONAL";

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
  rif?: string;
  razonSocial?: string;
  createdAt?: string;
  limiteUsuarios?: number | null;
  cantidadUsuarios?: number;
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
  accesoTotal?: boolean;
  limiteUsuarios?: number | null;
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
    nombreEmpresa: "Ferretería & Repuestos El Tornillo",
    moduloPrincipal: "repuestos",
    tipoLicencia: "ENTERPRISE",
    activa: true,
    fechaVencimientoPago: "2027-01-01",
    emailContacto: "ventas@eltornillo.com",
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
    let msg = errorText;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) msg = parsed.error;
    } catch {}

    if (res.status === 401) {
      borrarSesionSuperAdmin();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("superadmin:expired"));
      }
    }
    throw new Error(msg || `Error ${res.status}: Fallo en la solicitud SuperAdmin`);
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
  } catch (err: any) {
    if (err?.message?.includes("Token") || err?.message?.includes("expirado") || err?.message?.includes("401")) {
      throw err;
    }
  }
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
    { tenantId, moduloNombre: "repuestos", activo: false },
    { tenantId, moduloNombre: "ganaderia", activo: false },
  ];
  return modulosDefault;
}

export async function concederAccesoTotalSuperAdmin(tenantId: number): Promise<LicenciaTenant> {
  const res = await requestSuperAdmin<LicenciaTenant>(`/api/super-admin/tenants/${tenantId}/acceso-total`, {
    method: "POST",
  });
  const lista = obtenerTenantsLocales();
  const index = lista.findIndex(t => t.tenantId === tenantId);
  if (index !== -1) { lista[index] = res; guardarTenantsLocales(lista); }
  return res;
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

export interface SuperAdminStats {
  totalTenants: number;
  activos: number;
  suspendidos: number;
  porVencer7Dias: number;
  vencidos: number;
  ingresosMes: number;
  tenantsPorModulo: Record<string, number>;
  totalUsuarios?: number;
}

export interface PagoSuscripcion {
  id: number;
  tenantId: number;
  nombreEmpresa: string;
  monto: number;
  moneda: string;
  metodoPago: string;
  referenciaComprobante?: string;
  mesesPagados: number;
  diasAcreditados: number;
  fechaPago: string;
  fechaRegistro: string;
  estado: string;
  notas?: string;
  registradoPor: string;
}

export interface RegistrarPagoSuperAdminRequest {
  tenantId: number;
  monto: number;
  moneda?: string;
  metodoPago?: string;
  referenciaComprobante?: string;
  meses?: number;
  dias?: number;
  notas?: string;
}

export interface RegalarTiempoSuperAdminRequest {
  dias?: number;
  meses?: number;
  motivo?: string;
}

export async function obtenerStatsSuperAdmin(): Promise<SuperAdminStats> {
  return requestSuperAdmin<SuperAdminStats>("/api/super-admin/tenants/stats");
}

export async function ejecutarBarridoSuspensionSuperAdmin(): Promise<{ suspendidos: number; mensaje: string }> {
  return requestSuperAdmin<{ suspendidos: number; mensaje: string }>("/api/super-admin/tenants/barrido-suspension", {
    method: "POST",
  });
}

export async function listarPagosSuperAdmin(tenantId?: number): Promise<PagoSuscripcion[]> {
  const url = tenantId ? `/api/super-admin/tenants/pagos?tenantId=${tenantId}` : "/api/super-admin/tenants/pagos";
  return requestSuperAdmin<PagoSuscripcion[]>(url);
}

export async function registrarPagoSuperAdmin(datos: RegistrarPagoSuperAdminRequest): Promise<PagoSuscripcion> {
  return requestSuperAdmin<PagoSuscripcion>("/api/super-admin/tenants/pagos", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function regalarTiempoSuperAdmin(tenantId: number, datos: RegalarTiempoSuperAdminRequest): Promise<LicenciaTenant> {
  const res = await requestSuperAdmin<LicenciaTenant>(`/api/super-admin/tenants/${tenantId}/regalar-tiempo`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
  const lista = obtenerTenantsLocales();
  const index = lista.findIndex(t => t.tenantId === tenantId);
  if (index !== -1) { lista[index] = res; guardarTenantsLocales(lista); }
  return res;
}

export async function impersonarTenantSuperAdmin(tenantId: number): Promise<{ token: string; tenantId: string; nombreEmpresa: string; moduloPrincipal: string }> {
  return requestSuperAdmin<{ token: string; tenantId: string; nombreEmpresa: string; moduloPrincipal: string }>(`/api/super-admin/tenants/${tenantId}/impersonate`, {
    method: "POST",
  });
}


export interface UsuarioTenant {
  id: number;
  tenantId: number;
  username: string;
  rol: string;
  nombreCompleto?: string;
  activo: boolean;
  fechaCreacion: string;
}

export async function listarUsuariosTenantSuperAdmin(tenantId: number): Promise<UsuarioTenant[]> {
  return requestSuperAdmin<UsuarioTenant[]>(`/api/super-admin/tenants/${tenantId}/usuarios`);
}

export async function asignarLimiteUsuariosSuperAdmin(tenantId: number, limite: number | null): Promise<LicenciaTenant> {
  const res = await requestSuperAdmin<LicenciaTenant>(`/api/super-admin/tenants/${tenantId}/limite-usuarios`, {
    method: "POST",
    body: JSON.stringify({ limiteUsuarios: limite }),
  });
  const lista = obtenerTenantsLocales();
  const idx = lista.findIndex(t => t.tenantId === tenantId);
  if (idx !== -1) { lista[idx] = res; guardarTenantsLocales(lista); }
  return res;
}

export async function toggleUsuarioActivoSuperAdmin(tenantId: number, usuarioId: number): Promise<UsuarioTenant> {
  return requestSuperAdmin<UsuarioTenant>(`/api/super-admin/tenants/${tenantId}/usuarios/${usuarioId}/toggle-activo`, {
    method: "POST",
  });
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
  stockMinimo?: number;
  proveedorPrincipalId?: number | null;
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
  proveedor: ProveedorRepuesto | null;
  numeroFactura?: string | null;
  fechaCompra: string;
  total: number;
  montoPagado?: number | null;
  items?: DetalleCompraRepuesto[];
}

export interface ItemCompraRepuestoRequest {
  repuestoId: number;
  cantidad: number;
  costoUnitario: number;
  precioVenta?: number;
}

export interface CompraRepuestoRequest {
  proveedorId: number;
  numeroFactura: string;
  items: ItemCompraRepuestoRequest[];
  montoPagadoAhora?: number;
  monedaPago?: string;
  diasCredito?: number;
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

/** Corrección de inventario: indicá el stock REAL contado y el sistema calcula/audita la diferencia solo (Kárdex tipo AJUSTE). */
export function ajustarStockRepuesto(id: number, tenantId: number, datos: { stockReal: number; motivo?: string }): Promise<RepuestoItem> {
  return request(`/api/repuestos/items/${id}/ajustar-stock?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
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

export interface ItemImportacionRepuesto {
  codigoSku: string;
  descripcion: string;
  unidadBase?: string;
  costoUnitario?: number;
  precioVenta?: number;
  stockInicial?: number;
}

export interface ResultadoImportacionRepuestos {
  creados: number;
  actualizados: number;
  errores: FilaImportacionError[];
}

/** Carga masiva de repuestos (desde Excel/CSV parseado en el navegador con SheetJS) — crea o actualiza por SKU. Mismo patrón que importarArticulosLote (Horeca). */
export function importarRepuestosLote(tenantId: number, items: ItemImportacionRepuesto[]): Promise<ResultadoImportacionRepuestos> {
  return request(`/api/repuestos/items/importar-lote?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(items) });
}

// Utilidad real por producto (no ventas brutas) — solo calculada sobre líneas con costo
// conocido al momento de la venta, ver RepuestosReporteService. Distinto del Margen Bruto
// consolidado de Aurora Finanzas: este desglosa por producto.
export interface ResumenUtilidadProductoRepuesto {
  repuestoId: number;
  codigoSku: string;
  descripcion: string;
  cantidadVendida: number;
  ventasBrutas: number;
  ventasConCostoConocido: number;
  costoVentas: number;
  utilidad: number;
  margenPct: number | null;
}

export interface UtilidadPeriodoRepuesto {
  ventasBrutas: number;
  costoVentas: number;
  utilidad: number;
  margenPct: number | null;
  coberturaPct: number;
  moneda: string;
  productos: ResumenUtilidadProductoRepuesto[];
}

export function obtenerUtilidadRepuestos(desde: string, hasta: string): Promise<UtilidadPeriodoRepuesto> {
  return request(`/api/repuestos/reportes/utilidad?desde=${desde}&hasta=${hasta}`);
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

/** Ubicación compartida de la finca. El tenant se resuelve exclusivamente desde JWT. */
export interface FincaGanaderiaApi {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  puntosInteresJson: string;
  actualizadoEn: string;
}

export function obtenerFincaGanaderia(): Promise<FincaGanaderiaApi | undefined> {
  return request("/api/ganaderia/finca");
}

export function guardarFincaGanaderia(datos: {
  nombre: string;
  latitud: number;
  longitud: number;
  puntosInteresJson: string;
}): Promise<FincaGanaderiaApi> {
  return request("/api/ganaderia/finca", { method: "PUT", body: JSON.stringify(datos) });
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
  /** Ceba en sociedad: null = animal propio. */
  sociedadCebaId?: number | null;
  pesoEntradaSociedad?: number | null;
  fechaEntradaSociedad?: string | null;
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
  destino?: "TANQUE" | "VENTA_DIRECTA";
}

export interface TanqueLeche {
  id: number;
  tenantId: number;
  stockActualLitros: number;
  capacidadLitros: number;
  temperaturaCelsius: number;
  ultimaActualizacion?: string;
}

export interface VentaLecheTanque {
  id: number;
  tenantId: number;
  fecha: string;
  litrosVendidos: number;
  precioLitroUSD: number;
  totalUSD: number;
  compradorOPlanta: string;
  monedaPago: string;
  notas?: string;
  createdAt?: string;
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
  enfermedadPrevenida?: string;
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
  fechaProximaDosis?: string;
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
  return request(`/api/ganaderia/animales`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

/** Fila del Excel de carga inicial del hato — todo texto, el backend valida y normaliza. */
export interface FilaImportacionHato {
  arete?: string;
  tipoIdentificador?: string;
  nombre?: string;
  especie?: string;
  raza?: string;
  sexo?: string;
  tipoAnimal?: string;
  fechaNacimiento?: string;
  pesoActual?: string;
  valorEstimado?: string;
  potrero?: string;
  lote?: string;
  areteMadre?: string;
  aretePadre?: string;
  estadoReproductivo?: string;
  estadoProductivo?: string;
  padrotePrenez?: string;
  fechaProbableParto?: string;
}

export interface ResultadoImportacionHato {
  confirmado: boolean;
  totalFilas: number;
  animalesImportados: number;
  preneces: number;
  errores: Array<{ fila: number; campo: string | null; mensaje: string }>;
  porTipo: Record<string, number>;
  porRaza: Record<string, number>;
}

/** confirmar=false: solo vista previa. confirmar=true: guarda todo o nada. */
export function importarHatoGanaderia(filas: FilaImportacionHato[], confirmar: boolean): Promise<ResultadoImportacionHato> {
  return request(`/api/ganaderia/animales/importar?confirmar=${confirmar}`, {
    method: "POST",
    body: JSON.stringify({ filas }),
  });
}

export interface PrenezActualGanaderia {
  hembraId: number;
  sementalId: number | null;
  padrote: string | null;
  fechaProbableParto: string | null;
}

export function listarPrenezActualGanaderia(): Promise<PrenezActualGanaderia[]> {
  return request(`/api/ganaderia/animales/prenez-actual`);
}

async function descargarPdfGanaderia(ruta: string): Promise<Blob> {
  const sesion = leerSesion();
  const headers: Record<string, string> = {};
  if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;
  const res = await fetch(ruta, { headers });
  if (res.status === 401) {
    manejarSesionVencida();
    throw new ApiError("Sesión vencida — redirigiendo al login");
  }
  if (!res.ok) {
    // El backend devuelve el motivo (p. ej. "admite hasta 93 días") en el cuerpo
    const cuerpo = await res.json().catch(() => null);
    throw new ApiError(cuerpo?.message || cuerpo?.error || `Error ${res.status}`);
  }
  return res.blob();
}

/** Reporte PDF de ordeño: diario (desde = hasta) o semanal/rango. Fechas YYYY-MM-DD. */
export function descargarReporteOrdenoPdf(desde: string, hasta: string): Promise<Blob> {
  return descargarPdfGanaderia(`/api/ganaderia/ordeno/reporte/pdf?desde=${desde}&hasta=${hasta}`);
}

/** Constancia PDF de vacunación de una jornada (o rango), opcionalmente de una sola vacuna. */
export function descargarConstanciaVacunacionPdf(desde: string, hasta: string, vacunaId?: number): Promise<Blob> {
  const q = vacunaId ? `&vacunaId=${vacunaId}` : "";
  return descargarPdfGanaderia(`/api/ganaderia/vacunas/constancia/pdf?desde=${desde}&hasta=${hasta}${q}`);
}

export function actualizarAnimalGanaderia(id: number, datos: Partial<AnimalGanaderia>): Promise<AnimalGanaderia> {
  return request(`/api/ganaderia/animales/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function moverAnimalGanaderia(id: number, potreroDestinoId: number, motivo?: string) {
  return request(`/api/ganaderia/animales/${id}/mover`, {
    method: "POST",
    body: JSON.stringify({ potreroDestinoId, motivo }),
  });
}

export function registrarVentaGanaderia(datos: {
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
  return request(`/api/ganaderia/ventas`, {
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
  destino?: "TANQUE" | "VENTA_DIRECTA";
}): Promise<RegistroOrdenoGanaderia> {
  return request(`/api/ganaderia/ordeno?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function obtenerStockTanqueLeche(tenantId: number): Promise<TanqueLeche> {
  return request(`/api/ganaderia/ordeno/tanque?tenantId=${tenantId}`);
}

export function registrarDespachoLecheTanque(tenantId: number, datos: {
  fecha: string;
  litrosVendidos: number;
  precioLitroUSD: number;
  compradorOPlanta: string;
  monedaPago?: string;
  /** Monto efectivamente cobrado en monedaPago (obligatorio si no es USD). */
  montoRecibido?: number;
  notas?: string;
}): Promise<{ tanque: TanqueLeche; venta: VentaLecheTanque; mensaje: string }> {
  return request(`/api/ganaderia/ordeno/tanque/despacho?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function obtenerVentasLecheTanque(tenantId: number): Promise<VentaLecheTanque[]> {
  return request(`/api/ganaderia/ordeno/tanque/ventas?tenantId=${tenantId}`);
}

export function configurarTanqueLeche(tenantId: number, datos: {
  capacidadLitros?: number;
  temperaturaCelsius?: number;
  stockAjuste?: number;
}): Promise<TanqueLeche> {
  return request(`/api/ganaderia/ordeno/tanque/config?tenantId=${tenantId}`, {
    method: "PUT",
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

/** Fila del resumen de engorde: GDP total y del último tramo; null cuando no hay pesajes suficientes. */
export interface FilaEngordeGanaderia {
  animalId: number;
  arete: string;
  nombre: string | null;
  tipoAnimal: string | null;
  raza: string | null;
  sexo: string | null;
  lote: string | null;
  potreroId: number | null;
  potrero: string | null;
  cantidadPesajes: number;
  pesoInicial: number | null;
  fechaInicial: string | null;
  pesoUltimo: number | null;
  fechaUltimo: string | null;
  dias: number | null;
  gananciaTotalKg: number | null;
  gdpKgDia: number | null;
  gdpUltimoPeriodoKgDia: number | null;
}

export function resumenEngordeGanaderia(): Promise<FilaEngordeGanaderia[]> {
  return request(`/api/ganaderia/pesos/resumen-engorde`);
}

export function editarPesoGanaderia(id: number, datos: { pesoKg?: number; fecha?: string }): Promise<RegistroPesoGanaderia> {
  return request(`/api/ganaderia/pesos/${id}`, { method: "PUT", body: JSON.stringify(datos) });
}

export function eliminarPesoGanaderia(id: number): Promise<void> {
  return request(`/api/ganaderia/pesos/${id}`, { method: "DELETE" });
}

// ── Ceba en sociedad (reparto de kilos ganados) ──

export interface SociedadCebaGanaderia {
  id: number;
  nombreSocio: string;
  documentoSocio?: string | null;
  telefonoSocio?: string | null;
  porcentajeFinca: number;
  fechaInicio: string;
  estado: "ACTIVA" | "CERRADA" | string;
  fechaCierre?: string | null;
  notas?: string | null;
}

export interface LineaLiquidacionSociedad {
  animalId: number;
  arete: string;
  nombre: string | null;
  tipoAnimal: string | null;
  estado: string;
  fechaEntrada: string | null;
  diasEnFinca: number | null;
  pesoEntrada: number | null;
  pesoActual: number | null;
  kilosGanados: number | null;
  kilosFinca: number | null;
  kilosSocio: number | null;
  kilosTotalesSocio: number | null;
  gdpKgDia: number | null;
  precioVentaUSD: number | null;
  precioKgUSD: number | null;
  montoFincaUSD: number | null;
  montoSocioUSD: number | null;
}

export interface ResumenSociedadCeba {
  sociedad: SociedadCebaGanaderia;
  porcentajeSocio: number;
  animalesActivos: number;
  animalesVendidos: number;
  pesoEntradaTotal: number;
  pesoActualTotal: number;
  kilosGanadosTotal: number;
  kilosFincaTotal: number;
  kilosSocioTotal: number;
  montoFincaVendidosUSD: number;
  montoSocioVendidosUSD: number;
  lineas: LineaLiquidacionSociedad[];
}

export interface DatosSociedadCeba {
  nombreSocio?: string;
  documentoSocio?: string;
  telefonoSocio?: string;
  porcentajeFinca?: number;
  fechaInicio?: string;
  notas?: string;
}

export function listarSociedadesCeba(): Promise<ResumenSociedadCeba[]> {
  return request(`/api/ganaderia/sociedades`);
}

export function crearSociedadCeba(datos: DatosSociedadCeba): Promise<SociedadCebaGanaderia> {
  return request(`/api/ganaderia/sociedades`, { method: "POST", body: JSON.stringify(datos) });
}

export function editarSociedadCeba(id: number, datos: DatosSociedadCeba): Promise<SociedadCebaGanaderia> {
  return request(`/api/ganaderia/sociedades/${id}`, { method: "PUT", body: JSON.stringify(datos) });
}

export function asignarAnimalesSociedadCeba(id: number, animalIds: number[], fechaEntrada?: string): Promise<{ asignados: number }> {
  return request(`/api/ganaderia/sociedades/${id}/animales`, { method: "POST", body: JSON.stringify({ animalIds, fechaEntrada }) });
}

export function corregirPesoEntradaSociedadCeba(id: number, animalId: number, pesoEntrada: number): Promise<void> {
  return request(`/api/ganaderia/sociedades/${id}/animales/${animalId}`, { method: "PUT", body: JSON.stringify({ pesoEntrada }) });
}

export function quitarAnimalSociedadCeba(id: number, animalId: number): Promise<void> {
  return request(`/api/ganaderia/sociedades/${id}/animales/${animalId}`, { method: "DELETE" });
}

export function cerrarSociedadCeba(id: number): Promise<SociedadCebaGanaderia> {
  return request(`/api/ganaderia/sociedades/${id}/cerrar`, { method: "POST" });
}

export function obtenerGdpGanaderia(animalId: number): Promise<GdpGanaderiaResponse> {
  return request(`/api/ganaderia/pesos/animal/${animalId}/gdp`);
}

export function listarVacunasGanaderia(tenantId?: number): Promise<VacunaGanaderia[]> {
  const q = tenantId ? `?tenantId=${tenantId}` : "";
  return request(`/api/ganaderia/vacunas${q}`);
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

export interface MedicamentoGanaderia {
  id: number;
  tenantId: number;
  nombre: string;
  tipoTratamiento?: string;
  diasRetiroLeche?: number;
  diasRetiroCarne?: number;
}

export interface AplicacionMedicamentoGanaderia {
  id: number;
  tenantId: number;
  animal: AnimalGanaderia;
  medicamento: MedicamentoGanaderia;
  fechaAplicacion: string;
  dosis?: string;
  motivoDiagnostico?: string;
  veterinarioResponsable?: string;
  fechaFinRetiroLeche?: string;
  fechaFinRetiroCarne?: string;
  costo?: number;
}

export function obtenerMedicamentosPorAnimal(animalId: number): Promise<AplicacionMedicamentoGanaderia[]> {
  return request(`/api/ganaderia/medicamentos/animal/${animalId}`);
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

export function aplicarVacunaLoteGanaderia(tenantId: number, datos: {
  animalIds: number[];
  vacunaId: number;
  fechaAplicacion: string;
  lote?: string;
  veterinarioResponsable?: string;
  costo?: number;
}): Promise<AplicacionVacunaGanaderia[]> {
  return request(`/api/ganaderia/vacunas/aplicar-lote?tenantId=${tenantId}`, {
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

export interface GastoGanaderia {
  id: number;
  tenantId: number;
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
}

export function listarGastosGanaderia(tenantId?: number): Promise<GastoGanaderia[]> {
  const q = tenantId ? `?tenantId=${tenantId}` : "";
  return request(`/api/ganaderia/gastos${q}`);
}

export function crearGastoGanaderia(tenantId: number, datos: {
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
}): Promise<GastoGanaderia> {
  return request(`/api/ganaderia/gastos?tenantId=${tenantId}`, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export interface VentaGanaderiaResumen {
  id: number;
  tenantId: number;
  numeroTicket: string;
  comprador?: string;
  total: number;
  fecha: string;
  items?: any[];
}

export function listarVentasGanaderia(): Promise<VentaGanaderiaResumen[]> {
  return request(`/api/ganaderia/ventas`);
}

// Centro Financiero de empresa. El tenant se obtiene exclusivamente del JWT;
// nunca se envía por URL ni se reconvierten importes históricos en el cliente.
export interface EmpresaKpiResponse {
  periodo: { desde: string; hasta: string };
  moneda: "USD" | "VES" | "COP";
  consolidado: {
    ventasBrutas: number;
    costoVentas: number;
    margenBruto: number;
    margenBrutoPct: number;
    gastosOperativos: number;
    resultadoEstimado: number;
    coberturaPromedioPonderada: number;
  };
  porModulo: Array<{
    modulo: string;
    ventasBrutas: number;
    costoVentas: number;
    margenBruto: number;
    coberturaPct: number;
  }>;
  verticalesNoConectadas: string[];
  trazabilidad: {
    movimientosTotales: number;
    movimientosIdentificados: number;
    porcentajeIdentificado: number;
  };
}

export function obtenerEmpresaKpis(desde: string, hasta: string): Promise<EmpresaKpiResponse> {
  const params = new URLSearchParams({ desde, hasta });
  return request(`/api/empresa/kpis?${params.toString()}`);
}

// --- Tasas de cambio (USD/VES) ---

// BCV y BINANCE: ambas son cifras públicas que el negocio no controla, a diferencia de una
// tasa "PERSONALIZADA" que sí define el negocio a mano. BINANCE se guarda internamente con
// origen "USDT" (ver TasaCambioController.actualizarExterna) — es el mismo concepto de
// negocio que la tasa USDT/P2P del POS.
export type FuenteTasaCambio = "BCV" | "BINANCE";

export interface TasaCambioResponse {
  id: number;
  monedaOrigen: string;
  monedaDestino: string;
  tasa: number;
  fechaActualizacion: string;
  origenApi: string;
  obsoleta: boolean;
  horasSinActualizar: number;
}

/** Tasa vigente (la más reciente) entre dos monedas para el tenant en sesión. Null si aún no hay ninguna registrada. */
export async function obtenerTasaVigente(monedaOrigen: string, monedaDestino: string): Promise<TasaCambioResponse | null> {
  const sesion = leerSesion();
  if (!sesion) return null;
  const params = new URLSearchParams({ tenantId: String(sesion.tenantId), monedaOrigen, monedaDestino });
  try {
    return await request<TasaCambioResponse>(`/api/financiero/tasas/vigente?${params.toString()}`);
  } catch (err) {
    if (err instanceof ApiError && /400/.test(err.message)) return null;
    throw err;
  }
}

/**
 * Refresca la tasa USD/VES consultando en vivo una fuente pública (BCV oficial
 * o Binance P2P) y la registra como tasa nueva. Si la fuente falla, el backend
 * no escribe nada y esta llamada lanza ApiError con el motivo real — nunca se
 * simula un valor.
 */
export function actualizarTasaExterna(fuente: FuenteTasaCambio, monedaDestino: string = "VES"): Promise<TasaCambioResponse> {
  const sesion = leerSesion();
  if (!sesion) throw new ApiError("Sesión vencida — redirigiendo al login", 401);
  const params = new URLSearchParams({ tenantId: String(sesion.tenantId), fuente, monedaDestino });
  return request(`/api/financiero/tasas/actualizar-externa?${params.toString()}`, { method: "POST" });
}

// --- Personal y Aurora Nómina ---

export interface CapacidadesPersonal {
  accesoPersonal: boolean;
  asistencia: boolean;
  metas: boolean;
  nominaAvanzada: boolean;
  puedeVerDirectorio: boolean;
  puedeVerMontosNomina: boolean;
  puedeRegistrarAsistencia: boolean;
  puedeGestionarMetas: boolean;
  rolPersonal: "DUENO_ADMIN" | "RRHH" | "NOMINA" | "SUPERVISOR" | "EMPLEADO" | "AUDITOR" | null;
  empleadoId: number | null;
}

export function obtenerCapacidadesPersonal(): Promise<CapacidadesPersonal> {
  return request("/api/personal/capacidades");
}

export interface EmpleadoPersonalApi {
  id: number;
  nombreCompleto: string;
  documentoIdentidad: string;
  fechaIngreso: string;
  fechaEgreso: string | null;
  usuarioId: number | null;
  activo: boolean;
}

export function listarEmpleadosPersonal(): Promise<EmpleadoPersonalApi[]> {
  return request("/api/personal/empleados");
}

export interface EntradaDirectorioPersonalApi {
  id: number;
  nombreCompleto: string;
  documentoIdentidad: string;
  fechaIngreso: string;
  fechaEgreso: string | null;
  cargo: string | null;
  moduloOrigen: string | null;
  tipoSalario: "FIJO_MENSUAL" | "DIARIO" | "POR_HORA" | "POR_JORNADA" | null;
  salarioPactado: number | null;
  monedaSalario: "USD" | "VES" | "COP" | null;
}

export interface TurnoPersonalApi {
  id: number;
  empleadoId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

export interface AsistenciaPersonalApi {
  id: number;
  empleadoId: number;
  turnoId: number | null;
  fechaHoraEntrada: string;
  fechaHoraSalida: string | null;
  origen: "MANUAL" | "TERMINAL_PIN" | "PLANILLA_DIGITAL" | "APP";
  horasTrabajadas: number;
}

export interface MetaPersonalApi {
  id: number;
  empleadoId: number;
  nombre: string;
  descripcion: string | null;
  valorObjetivo: number;
  unidad: string;
  periodoDesde: string;
  periodoHasta: string;
}

export interface SeguimientoMetaApi {
  id: number;
  metaId: number;
  fecha: string;
  valorAlcanzado: number;
  nota: string | null;
}

export interface PeriodoNominaApi {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  fechaPagoPlanificada: string | null;
  moneda: "USD" | "VES" | "COP";
  estado: "BORRADOR" | "CALCULADA" | "EN_REVISION" | "APROBADA" | "PAGADA" | "REVERSADA";
  fechaAprobacion: string | null;
}

export interface DetallePeriodoNominaApi {
  periodo: PeriodoNominaApi;
  recibos: Array<{
    id: number;
    empleadoId: number;
    empleadoNombre: string;
    cargo: string | null;
    estado: string;
    totalAsignaciones: number;
    totalDeducciones: number;
    totalAportesPatronales: number;
    netoCalculado: number;
    netoEfectivo: number;
    moneda: "USD" | "VES" | "COP";
    lineas: Array<{
      id: number;
      descripcion: string;
      tipo: "ASIGNACION" | "DEDUCCION" | "APORTE_PATRONAL";
      cantidad: number;
      montoUnitario: number;
      montoTotal: number;
      moneda: "USD" | "VES" | "COP";
      conceptoId: number;
      reglaAplicadaId: number | null;
    }>;
    ajustes: Array<{
      id: number;
      tipo: "CORRECCION" | "REVERSO";
      motivo: string;
      montoAjuste: number;
      moneda: "USD" | "VES" | "COP";
      fecha: string;
    }>;
  }>;
}

export function listarDirectorioPersonal(): Promise<EntradaDirectorioPersonalApi[]> {
  return request("/api/personal/directorio");
}

export function listarTurnosPersonal(desde: string, hasta: string): Promise<TurnoPersonalApi[]> {
  const params = new URLSearchParams({ desde, hasta });
  return request(`/api/personal/turnos?${params.toString()}`);
}

export function crearTurnoPersonal(datos: {
  empleadoId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}): Promise<TurnoPersonalApi> {
  return request("/api/personal/turnos", { method: "POST", body: JSON.stringify(datos) });
}

export function listarAsistenciaPersonal(desde: string, hasta: string): Promise<AsistenciaPersonalApi[]> {
  const params = new URLSearchParams({ desde, hasta });
  return request(`/api/personal/asistencia?${params.toString()}`);
}

export function registrarEntradaPersonal(datos: {
  empleadoId: number;
  turnoId?: number | null;
  fechaHoraEntrada: string;
  origen: AsistenciaPersonalApi["origen"];
}): Promise<AsistenciaPersonalApi> {
  return request("/api/personal/asistencia/entrada", { method: "POST", body: JSON.stringify(datos) });
}

export function registrarSalidaPersonal(id: number, fechaHoraSalida: string): Promise<AsistenciaPersonalApi> {
  return request(`/api/personal/asistencia/${id}/salida`, {
    method: "PATCH",
    body: JSON.stringify({ fechaHoraSalida }),
  });
}

export function listarMetasPersonal(): Promise<MetaPersonalApi[]> {
  return request("/api/personal/metas");
}

export function listarMetasDeEmpleado(empleadoId: number): Promise<MetaPersonalApi[]> {
  return request(`/api/personal/metas/empleado/${empleadoId}`);
}

export function crearMetaPersonal(datos: {
  empleadoId: number;
  nombre: string;
  descripcion?: string;
  valorObjetivo: number;
  unidad: string;
  periodoDesde: string;
  periodoHasta: string;
}): Promise<MetaPersonalApi> {
  return request("/api/personal/metas", { method: "POST", body: JSON.stringify(datos) });
}

export function listarSeguimientosMeta(metaId: number): Promise<SeguimientoMetaApi[]> {
  return request(`/api/personal/metas/${metaId}/seguimientos`);
}

export function listarPeriodosNomina(): Promise<PeriodoNominaApi[]> {
  return request("/api/personal/nomina/periodos");
}

export function obtenerDetallePeriodoNomina(periodoId: number): Promise<DetallePeriodoNominaApi> {
  return request(`/api/personal/nomina/periodos/${periodoId}/detalle`);
}

// Bitácora de auditoría — solo el Dueño/Administrador puede consultarla (ver AuditoriaController).
export interface RegistroAuditoriaApi {
  id: number;
  fecha: string;
  modulo: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  descripcion: string;
  usuario: string;
  rolUsuario: string | null;
}

export interface PaginaAuditoria {
  content: RegistroAuditoriaApi[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export function listarAuditoria(opciones?: { modulo?: string; accion?: string; pagina?: number; tamano?: number }): Promise<PaginaAuditoria> {
  const params = new URLSearchParams();
  if (opciones?.modulo) params.set("modulo", opciones.modulo);
  if (opciones?.accion) params.set("accion", opciones.accion);
  params.set("pagina", String(opciones?.pagina ?? 0));
  params.set("tamano", String(opciones?.tamano ?? 50));
  return request(`/api/auditoria?${params.toString()}`);
}




// ==========================================
// MODULO FINANCIERO Y CONTABILIDAD SAAS SUPERADMIN
// ==========================================

export interface SaasGastoFijo {
  id: number;
  concepto: string;
  categoria: string;
  montoUsd: number;
  periodicidad: string;
  diaPago: number;
  metodoPago: string;
  proveedor?: string;
  activo: boolean;
  notas?: string;
  fechaCreacion: string;
}

export interface SaasMovimientoFinanciero {
  id: number;
  tipo: "INGRESO" | "EGRESO";
  categoria: string;
  concepto: string;
  montoUsd: number;
  fechaMovimiento: string;
  metodoPago: string;
  referenciaComprobante?: string;
  tenantId?: number;
  gastoFijoId?: number;
  notas?: string;
  registradoPor: string;
  fechaCreacion: string;
}

export interface ResumenFinancieroSaas {
  mes: string;
  ingresosSuscripciones: number;
  ingresosExtras: number;
  totalIngresos: number;
  totalEgresos: number;
  gastosFijosMensuales: number;
  utilidadNeta: number;
  margenPorcentaje: number;
  balanceHistorico: number;
  totalGastosFijosActivos: number;
}

export interface CrearGastoFijoRequest {
  concepto: string;
  categoria?: string;
  montoUsd: number;
  periodicidad?: string;
  diaPago?: number;
  metodoPago?: string;
  proveedor?: string;
  notas?: string;
}

export interface RegistrarMovimientoRequest {
  tipo: "INGRESO" | "EGRESO";
  categoria?: string;
  concepto: string;
  montoUsd: number;
  fechaMovimiento?: string;
  metodoPago?: string;
  referenciaComprobante?: string;
  notas?: string;
}

export async function obtenerResumenFinancieroSaas(mes?: string): Promise<ResumenFinancieroSaas> {
  const url = mes ? `/api/super-admin/tenants/finanzas/resumen?mes=${mes}` : "/api/super-admin/tenants/finanzas/resumen";
  return requestSuperAdmin<ResumenFinancieroSaas>(url);
}

export async function listarGastosFijosSaas(): Promise<SaasGastoFijo[]> {
  return requestSuperAdmin<SaasGastoFijo[]>("/api/super-admin/tenants/finanzas/gastos-fijos");
}

export async function crearGastoFijoSaas(datos: CrearGastoFijoRequest): Promise<SaasGastoFijo> {
  return requestSuperAdmin<SaasGastoFijo>("/api/super-admin/tenants/finanzas/gastos-fijos", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function actualizarGastoFijoSaas(id: number, datos: Partial<SaasGastoFijo>): Promise<SaasGastoFijo> {
  return requestSuperAdmin<SaasGastoFijo>(`/api/super-admin/tenants/finanzas/gastos-fijos/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export async function toggleGastoFijoSaas(id: number): Promise<SaasGastoFijo> {
  return requestSuperAdmin<SaasGastoFijo>(`/api/super-admin/tenants/finanzas/gastos-fijos/${id}/toggle`, {
    method: "POST",
  });
}

export async function eliminarGastoFijoSaas(id: number): Promise<{ mensaje: string }> {
  return requestSuperAdmin<{ mensaje: string }>(`/api/super-admin/tenants/finanzas/gastos-fijos/${id}`, {
    method: "DELETE",
  });
}

export async function ejecutarGastoFijoSaas(id: number, referencia?: string): Promise<SaasMovimientoFinanciero> {
  const url = referencia ? `/api/super-admin/tenants/finanzas/gastos-fijos/${id}/ejecutar?referencia=${encodeURIComponent(referencia)}` : `/api/super-admin/tenants/finanzas/gastos-fijos/${id}/ejecutar`;
  return requestSuperAdmin<SaasMovimientoFinanciero>(url, {
    method: "POST",
  });
}

export async function listarMovimientosFinancierosSaas(mes?: string, tipo?: string): Promise<SaasMovimientoFinanciero[]> {
  const params = new URLSearchParams();
  if (mes) params.append("mes", mes);
  if (tipo && tipo !== "TODOS") params.append("tipo", tipo);
  const q = params.toString() ? `?${params.toString()}` : "";
  return requestSuperAdmin<SaasMovimientoFinanciero[]>(`/api/super-admin/tenants/finanzas/movimientos${q}`);
}

export async function registrarMovimientoFinancieroSaas(datos: RegistrarMovimientoRequest): Promise<SaasMovimientoFinanciero> {
  return requestSuperAdmin<SaasMovimientoFinanciero>("/api/super-admin/tenants/finanzas/movimientos", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export async function eliminarMovimientoFinancieroSaas(id: number): Promise<{ mensaje: string }> {
  return requestSuperAdmin<{ mensaje: string }>(`/api/super-admin/tenants/finanzas/movimientos/${id}`, {
    method: "DELETE",
  });
}


// =========================================================================
// ANALITICA Y ESTADISTICAS SAAS SUPER ADMIN
// =========================================================================
export interface TopTenantRanking {
  posicion: number;
  tenantId: number;
  nombreEmpresa: string;
  moduloPrincipal: string;
  tipoLicencia: string;
  activa: boolean;
  totalFacturadoUsd: number;
  facturadoPeriodoUsd: number;
  cantidadPagos: number;
  cantidadPagosPeriodo: number;
  mesesAdquiridos: number;
  ultimoPago?: string | null;
  fechaVencimientoPago?: string | null;
}

export interface VerticalAnalytics {
  vertical: string;
  nombreVertical: string;
  totalTenants: number;
  cuotaTenantsPct: number;
  totalFacturadoUsd: number;
  facturadoPeriodoUsd: number;
  cuotaFacturacionPct: number;
}

export interface PlanAnalytics {
  plan: string;
  totalTenants: number;
  porcentaje: number;
  totalFacturadoUsd: number;
}

export interface MetodoPagoAnalytics {
  metodo: string;
  cantidadPagos: number;
  totalUsd: number;
  porcentaje: number;
}

export interface TendenciaDataPoint {
  etiqueta: string;
  fecha: string;
  montoUsd: number;
  cantidad: number;
}

export interface SaasKpis {
  facturacionPeriodoUsd: number;
  facturacionHistoricaUsd: number;
  cantidadPagosPeriodo: number;
  ticketPromedioPeriodoUsd: number;
  totalTenants: number;
  tenantsActivos: number;
  tenantsSuspendidos: number;
  tasaRetencionPct: number;
  nuevosTenantsPeriodo: number;
}

export interface SaasAnalyticsResponse {
  periodo: "DIA" | "SEMANA" | "MES" | "HISTORICO";
  periodoLabel: string;
  fechaRef: string;
  fechaDesde: string;
  fechaHasta: string;
  kpis: SaasKpis;
  topTenants: TopTenantRanking[];
  verticales: VerticalAnalytics[];
  planes: PlanAnalytics[];
  metodosPago: MetodoPagoAnalytics[];
  tendencia: TendenciaDataPoint[];
}

export async function obtenerAnalyticsSuperAdmin(periodo?: string, fechaRef?: string): Promise<SaasAnalyticsResponse> {
  const params = new URLSearchParams();
  if (periodo) params.append("periodo", periodo);
  if (fechaRef) params.append("fechaRef", fechaRef);
  const q = params.toString() ? `?${params.toString()}` : "";
  return requestSuperAdmin<SaasAnalyticsResponse>(`/api/super-admin/tenants/analytics${q}`);
}


// =========================================================================
// SISTEMA DE SOPORTE & ASISTENCIA AL TENANT (TICKETS Y CHAT EN VIVO)
// =========================================================================
export interface SaasSoporteTicket {
  id: number;
  tenantId: number;
  nombreEmpresa: string;
  usuarioCreador: string;
  tituloAsunto: string;
  categoria: "SOPORTE_TECNICO" | "FACTURACION" | "DUDA_USO" | "CONFIGURACION" | "ERROR_SISTEMA" | string;
  prioridad: "BAJA" | "MEDIA" | "ALTA" | "URGENTE" | string;
  estado: "ABIERTO" | "EN_ATENCION" | "RESUELTO" | "CERRADO" | string;
  agenteAsignado?: string | null;
  ultimoMensaje?: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  mensajesNoLeidos?: number;
}

export interface SaasSoporteMensaje {
  id: number;
  ticketId: number;
  emisorTipo: "TENANT" | "SUPERADMIN";
  emisorNombre: string;
  contenido: string;
  fechaEnvio: string;
  leidoPorDestinatario: boolean;
}

export interface CrearTicketRequest {
  tenantId?: number;
  nombreEmpresa?: string;
  tituloAsunto: string;
  mensajeInicial: string;
  categoria?: string;
  prioridad?: string;
  usuarioCreador?: string;
}

// SUPER ADMIN SOPORTE APIS
export async function listarTicketsSuperAdmin(estado?: string, prioridad?: string, q?: string): Promise<SaasSoporteTicket[]> {
  const params = new URLSearchParams();
  if (estado && estado !== "TODOS") params.append("estado", estado);
  if (prioridad && prioridad !== "TODOS") params.append("prioridad", prioridad);
  if (q) params.append("q", q);
  const query = params.toString() ? `?${params.toString()}` : "";
  return requestSuperAdmin<SaasSoporteTicket[]>(`/api/super-admin/soporte/tickets${query}`);
}

export async function listarMensajesTicketSuperAdmin(ticketId: number): Promise<SaasSoporteMensaje[]> {
  return requestSuperAdmin<SaasSoporteMensaje[]>(`/api/super-admin/soporte/tickets/${ticketId}/mensajes`);
}

export async function enviarMensajeTicketSuperAdmin(ticketId: number, contenido: string, agenteNombre: string = "Soporte Aurora"): Promise<SaasSoporteMensaje> {
  return requestSuperAdmin<SaasSoporteMensaje>(`/api/super-admin/soporte/tickets/${ticketId}/mensajes`, {
    method: "POST",
    body: JSON.stringify({ contenido, agenteNombre }),
  });
}

export async function cambiarEstadoTicketSuperAdmin(ticketId: number, estado: string, agenteAsignado?: string): Promise<SaasSoporteTicket> {
  return requestSuperAdmin<SaasSoporteTicket>(`/api/super-admin/soporte/tickets/${ticketId}/estado`, {
    method: "PUT",
    body: JSON.stringify({ estado, agenteAsignado }),
  });
}

// TENANT SOPORTE APIS
export async function listarTicketsTenant(tenantId?: number): Promise<SaasSoporteTicket[]> {
  const sesion = leerSesion();
  const tid = tenantId || sesion?.tenantId || 1;
  const res = await fetch(`/api/tenant/soporte/tickets?tenantId=${tid}`, {
    headers: {
      "Content-Type": "application/json",
      ...(sesion?.token ? { Authorization: `Bearer ${sesion.token}` } : {}),
      "X-Tenant-Id": String(tid),
    },
  });
  if (!res.ok) throw new Error("Error al listar tickets del tenant");
  return res.json();
}

export async function crearTicketTenant(datos: CrearTicketRequest): Promise<SaasSoporteTicket> {
  const sesion = leerSesion();
  const tid = datos.tenantId || sesion?.tenantId || 1;
  const res = await fetch("/api/tenant/soporte/tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sesion?.token ? { Authorization: `Bearer ${sesion.token}` } : {}),
      "X-Tenant-Id": String(tid),
    },
    body: JSON.stringify({ ...datos, tenantId: tid, usuarioCreador: datos.usuarioCreador || sesion?.username || "admin" }),
  });
  if (!res.ok) throw new Error("Error al crear ticket");
  return res.json();
}

export async function listarMensajesTicketTenant(ticketId: number): Promise<SaasSoporteMensaje[]> {
  const sesion = leerSesion();
  const res = await fetch(`/api/tenant/soporte/tickets/${ticketId}/mensajes`, {
    headers: {
      "Content-Type": "application/json",
      ...(sesion?.token ? { Authorization: `Bearer ${sesion.token}` } : {}),
    },
  });
  if (!res.ok) throw new Error("Error al cargar mensajes del ticket");
  return res.json();
}

export async function enviarMensajeTicketTenant(ticketId: number, contenido: string, emisorNombre?: string): Promise<SaasSoporteMensaje> {
  const sesion = leerSesion();
  const res = await fetch(`/api/tenant/soporte/tickets/${ticketId}/mensajes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sesion?.token ? { Authorization: `Bearer ${sesion.token}` } : {}),
    },
    body: JSON.stringify({ contenido, emisorNombre: emisorNombre || sesion?.username || "Usuario" }),
  });
  if (!res.ok) throw new Error("Error al enviar mensaje");
  return res.json();
}

// ==========================================
// AUDITORIA GLOBAL Y SOPORTE IMPERSONACION (SUPERADMIN)
// ==========================================

export interface RegistroAuditoriaItem {
  id: number;
  tenantId: number;
  fecha: string;
  modulo: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  descripcion: string;
  usuario: string;
  rolUsuario?: string;
}

export async function listarAuditoriaGlobalSuperAdmin(params?: {
  tenantId?: number;
  modulo?: string;
  accion?: string;
  pagina?: number;
  tamano?: number;
}): Promise<{ content: RegistroAuditoriaItem[]; totalElements: number; totalPages: number; number: number }> {
  const qs = new URLSearchParams();
  if (params?.tenantId) qs.append("tenantId", String(params.tenantId));
  if (params?.modulo) qs.append("modulo", params.modulo);
  if (params?.accion) qs.append("accion", params.accion);
  if (params?.pagina !== undefined) qs.append("pagina", String(params.pagina));
  if (params?.tamano) qs.append("tamano", String(params.tamano));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return requestSuperAdmin(`/api/super-admin/tenants/auditoria${query}`);
}

export function estaImpersonando(): boolean {
  return sessionStorage.getItem("aurora_impersonando") === "true";
}

export function obtenerDatosImpersonacion(): { tenantNombre: string; tenantId: string } | null {
  if (!estaImpersonando()) return null;
  return {
    tenantNombre: sessionStorage.getItem("aurora_impersonando_tenant_nombre") || "Negocio",
    tenantId: sessionStorage.getItem("aurora_impersonando_tenant_id") || "",
  };
}

export function salirDeImpersonacion(): void {
  sessionStorage.removeItem("aurora_impersonando");
  sessionStorage.removeItem("aurora_impersonando_tenant_nombre");
  sessionStorage.removeItem("aurora_impersonando_tenant_id");
  borrarSesion();
  window.location.href = "/?admin=true";
}


// ==========================================
// MÓDULO CONSTRUCCIÓN & OBRAS (MULTITENANT ESTRICTO)
// ==========================================

export interface ProyectoConstruccionApi {
  id?: number;
  tenantId?: number;
  codigo: string;
  nombre: string;
  cliente: string;
  ubicacion?: string;
  ingenieroResidente?: string;
  civResidente?: string;
  fechaInicio?: string;
  fechaFinEstimada?: string;
  estado?: string;
  montoPresupuestoTotal?: number;
  porcentajeAnticipo?: number;
  porcentajeRetencionGarantia?: number;
  porcentajeAdministracion?: number;
  porcentajeUtilidad?: number;
  iva?: number;
}

export interface CapituloConstruccionApi {
  id?: number;
  tenantId?: number;
  proyectoId: number;
  codigo: string;
  nombre: string;
  orden?: number;
}

export interface PartidaConstruccionApi {
  id?: number;
  tenantId?: number;
  proyectoId: number;
  capituloId?: number;
  codigoCovenin: string;
  codigoPartida?: string;
  descripcion: string;
  unidad: string;
  cantidadPresupuestada: number;
  precioUnitario: number;
  cantidadEjecutadaAcumulada?: number;
  totalPartida?: number;
  rendimientoDiario?: number;
}

export interface ValuacionConstruccionApi {
  id?: number;
  tenantId?: number;
  proyectoId: number;
  numeroValuacion: number;
  periodoDesde: string;
  periodoHasta: string;
  fechaEmision: string;
  montoBruto: number;
  amortizacionAnticipo?: number;
  retencionLaboral?: number;
  retencionFielCumplimiento?: number;
  montoSubtotal?: number;
  montoIva?: number;
  montoNetoACobrar?: number;
  montoAmortizacionAnticipo?: number;
  montoRetencionLaboral?: number;
  montoRetencionFielCumplimiento?: number;
  montoNetoAPagar?: number;
  estado?: string;
  observaciones?: string;
}

export interface InsumoConstruccionApi {
  id?: number;
  tenantId?: number;
  codigo: string;
  nombre: string;
  tipo: string;
  unidad: string;
  costoUnitario: number;
  stockActual: number;
  stockMinimo: number;
  proveedor?: string;
}

export interface BitacoraConstruccionApi {
  id?: number;
  tenantId?: number;
  proyectoId: number;
  fecha: string;
  clima?: string;
  condicionClimatica?: string;
  personalActivo?: number;
  cuadrillasActivas?: string;
  maquinariaOperativa?: string;
  actividadesEjecutadas?: string;
  actividadesRealizadas?: string;
  observacionesEIncidentes?: string;
  incidentesRetrasos?: string;
  elaboradoPor?: string;
}

export interface DespachoConstruccionApi {
  id?: number;
  tenantId?: number;
  proyectoId: number;
  insumoId?: number;
  guiaNumero: string;
  tipoMaterial: string;
  origen: string;
  destinoFrente: string;
  unidadTransporte?: string;
  chofer?: string;
  estado?: string;
  cantidad: number;
  unidadMedida: string;
  pesoBrutoKg?: number;
  pesoTaraKg?: number;
  pesoNetoKg?: number;
  slumpConoPulgadas?: number;
  fechaHoraSalida?: string;
  fechaHoraLlegada?: string;
  observaciones?: string;
  createdAt?: string;
}

export interface CatalogoCoveninApi {
  id: number;
  codigoCovenin: string;
  descripcion: string;
  unidad: string;
  rendimientoPromedio?: number;
  costoReferencialBs?: number;
}

// Proyectos
export function listarProyectosConstruccionApi(): Promise<ProyectoConstruccionApi[]> {
  return request("/api/construccion/proyectos");
}

export function crearProyectoConstruccionApi(datos: ProyectoConstruccionApi): Promise<ProyectoConstruccionApi> {
  return request("/api/construccion/proyectos", {
    method: "POST",
    body: JSON.stringify(datos)
  });
}

export function actualizarProyectoConstruccionApi(id: number, datos: ProyectoConstruccionApi): Promise<ProyectoConstruccionApi> {
  return request(`/api/construccion/proyectos/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos)
  });
}

export function eliminarProyectoConstruccionApi(id: number): Promise<void> {
  return request(`/api/construccion/proyectos/${id}`, {
    method: "DELETE"
  });
}

// Capítulos
export function listarCapitulosConstruccionApi(proyectoId: number): Promise<CapituloConstruccionApi[]> {
  return request(`/api/construccion/proyectos/${proyectoId}/capitulos`);
}

export function crearCapituloConstruccionApi(proyectoId: number, datos: CapituloConstruccionApi): Promise<CapituloConstruccionApi> {
  return request(`/api/construccion/proyectos/${proyectoId}/capitulos`, {
    method: "POST",
    body: JSON.stringify(datos)
  });
}

// Partidas
export function listarPartidasConstruccionApi(proyectoId: number): Promise<PartidaConstruccionApi[]> {
  return request(`/api/construccion/proyectos/${proyectoId}/partidas`);
}

export function crearPartidaConstruccionApi(proyectoId: number, datos: PartidaConstruccionApi): Promise<PartidaConstruccionApi> {
  return request(`/api/construccion/proyectos/${proyectoId}/partidas`, {
    method: "POST",
    body: JSON.stringify(datos)
  });
}

export function actualizarPartidaConstruccionApi(id: number, datos: PartidaConstruccionApi): Promise<PartidaConstruccionApi> {
  return request(`/api/construccion/partidas/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos)
  });
}

export function eliminarPartidaConstruccionApi(id: number): Promise<void> {
  return request(`/api/construccion/partidas/${id}`, {
    method: "DELETE"
  });
}

// Valuaciones
export function listarValuacionesConstruccionApi(proyectoId: number): Promise<ValuacionConstruccionApi[]> {
  return request(`/api/construccion/proyectos/${proyectoId}/valuaciones`);
}

export function crearValuacionConstruccionApi(proyectoId: number, datos: ValuacionConstruccionApi, idempotencyKey?: string): Promise<ValuacionConstruccionApi> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return request(`/api/construccion/proyectos/${proyectoId}/valuaciones`, {
    method: "POST",
    headers,
    body: JSON.stringify(datos)
  });
}

export function cambiarEstadoValuacionConstruccionApi(id: number, nuevoEstado: string): Promise<ValuacionConstruccionApi> {
  return request(`/api/construccion/valuaciones/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado: nuevoEstado })
  });
}

// Insumos
export function listarInsumosConstruccionApi(): Promise<InsumoConstruccionApi[]> {
  return request("/api/construccion/insumos");
}

export function crearInsumoConstruccionApi(datos: InsumoConstruccionApi): Promise<InsumoConstruccionApi> {
  return request("/api/construccion/insumos", {
    method: "POST",
    body: JSON.stringify(datos)
  });
}

export function registrarConsumoInsumoConstruccionApi(id: number, cantidad: number, idempotencyKey?: string): Promise<InsumoConstruccionApi> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return request(`/api/construccion/insumos/${id}/consumo`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cantidad })
  });
}

// Bitácora
export function listarBitacoraConstruccionApi(proyectoId: number): Promise<BitacoraConstruccionApi[]> {
  return request(`/api/construccion/proyectos/${proyectoId}/bitacora`);
}

export function registrarBitacoraConstruccionApi(proyectoId: number, datos: BitacoraConstruccionApi, idempotencyKey?: string): Promise<BitacoraConstruccionApi> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return request(`/api/construccion/proyectos/${proyectoId}/bitacora`, {
    method: "POST",
    headers,
    body: JSON.stringify(datos)
  });
}


export function listarDespachosConstruccionApi(proyectoId: number): Promise<DespachoConstruccionApi[]> {
  return request(`/api/construccion/proyectos/${proyectoId}/despachos`);
}

export function crearDespachoConstruccionApi(proyectoId: number, datos: DespachoConstruccionApi, idempotencyKey?: string): Promise<DespachoConstruccionApi> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return request(`/api/construccion/proyectos/${proyectoId}/despachos`, {
    method: "POST",
    headers,
    body: JSON.stringify(datos)
  });
}

export function cambiarEstadoDespachoConstruccionApi(id: number, estado: string, observaciones?: string): Promise<DespachoConstruccionApi> {
  return request(`/api/construccion/despachos/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado, observaciones })
  });
}

export function buscarCatalogoCoveninApi(q?: string): Promise<CatalogoCoveninApi[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  return request(`/api/construccion/catalogo-covenin${query}`);
}

export interface MaquinariaConstruccionApi {
  id?: number;
  tenantId?: number;
  proyectoId?: number | null;
  codigo: string;
  nombre: string;
  tipo: string; // PESADA, LIVIANA, TRANSPORTE, HERRAMIENTA_MENOR, GENERADOR
  marca?: string;
  modelo?: string;
  serialChasis?: string;
  placa?: string;
  horometroActual: number;
  horometroUltimoMantenimiento?: number;
  intervaloMantenimientoHoras?: number;
  estado: string; // OPERATIVO, EN_MANTENIMIENTO, FUERA_DE_SERVICIO, STANDBY
  operadorResponsable?: string;
  costoHoraUsd?: number;
  combustibleTipo?: string;
  capacidadTanqueLitros?: number;
  consumoPromedioLph?: number;
  observaciones?: string;
  createdAt?: string;
}

export interface MantenimientoMaquinariaApi {
  id?: number;
  tenantId?: number;
  maquinariaId: number;
  tipo: string; // PREVENTIVO, CORRECTIVO, OVERHAUL, INSPECCION_DIARIA
  fechaMantenimiento: string;
  horometroEnMantenimiento: number;
  proximoHorometroMantenimiento?: number;
  descripcionTrabajo: string;
  mecanicoOTaller?: string;
  costoTotalUsd?: number;
  repuestosUtilizados?: string;
  createdAt?: string;
}

export function listarMaquinariasConstruccionApi(proyectoId?: number | null): Promise<MaquinariaConstruccionApi[]> {
  const query = proyectoId ? `?proyectoId=${proyectoId}` : '';
  return request(`/api/construccion/maquinarias${query}`);
}

export function obtenerMaquinariaConstruccionApi(id: number): Promise<MaquinariaConstruccionApi> {
  return request(`/api/construccion/maquinarias/${id}`);
}

export function crearMaquinariaConstruccionApi(datos: Partial<MaquinariaConstruccionApi>, idempotencyKey?: string): Promise<MaquinariaConstruccionApi> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return request(`/api/construccion/maquinarias`, {
    method: "POST",
    headers,
    body: JSON.stringify(datos)
  });
}

export function actualizarMaquinariaConstruccionApi(id: number, datos: Partial<MaquinariaConstruccionApi>): Promise<MaquinariaConstruccionApi> {
  return request(`/api/construccion/maquinarias/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos)
  });
}

export function actualizarHorometroMaquinariaApi(id: number, horometro: number, operador?: string): Promise<MaquinariaConstruccionApi> {
  return request(`/api/construccion/maquinarias/${id}/horometro`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ horometro, operador })
  });
}

export function listarMantenimientosMaquinariaApi(maquinariaId: number): Promise<MantenimientoMaquinariaApi[]> {
  return request(`/api/construccion/maquinarias/${maquinariaId}/mantenimientos`);
}

export function crearMantenimientoMaquinariaApi(
  maquinariaId: number,
  datos: Partial<MantenimientoMaquinariaApi>,
  idempotencyKey?: string
): Promise<MantenimientoMaquinariaApi> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return request(`/api/construccion/maquinarias/${maquinariaId}/mantenimientos`, {
    method: "POST",
    headers,
    body: JSON.stringify(datos)
  });
}

export interface RiesgoConstruccionApi {
  id?: number;
  tenantId?: number;
  proyectoId: number;
  codigo: string;
  procesoFrente: string;
  peligro: string;
  riesgoConsecuencia: string;
  categoria: string;
  probabilidad: number; // 1-5
  severidad: number; // 1-5
  nivelRiesgo?: string; // BAJO, MEDIO, ALTO, CRITICO
  medidasControl: string;
  responsable?: string;
  estado?: string; // IDENTIFICADO, EN_MITIGACION, CONTROLADO, RESUELTO
  fechaEvaluacion: string;
  observaciones?: string;
  createdAt?: string;
}

export function listarRiesgosConstruccionApi(proyectoId: number): Promise<RiesgoConstruccionApi[]> {
  return request(`/api/construccion/proyectos/${proyectoId}/riesgos`);
}

export function obtenerRiesgoConstruccionApi(id: number): Promise<RiesgoConstruccionApi> {
  return request(`/api/construccion/riesgos/${id}`);
}

export function crearRiesgoConstruccionApi(proyectoId: number, datos: Partial<RiesgoConstruccionApi>, idempotencyKey?: string): Promise<RiesgoConstruccionApi> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return request(`/api/construccion/proyectos/${proyectoId}/riesgos`, {
    method: "POST",
    headers,
    body: JSON.stringify(datos)
  });
}

export function cambiarEstadoRiesgoConstruccionApi(id: number, estado: string, medidasControl?: string): Promise<RiesgoConstruccionApi> {
  return request(`/api/construccion/riesgos/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado, medidasControl })
  });
}

export interface DocumentoBimApi {
  id?: number;
  tenantId?: number;
  proyectoId: number;
  codigo: string;
  titulo: string;
  disciplina: string; // ARQUITECTURA, ESTRUCTURAS, INSTALACIONES_SANITARIAS, INSTALACIONES_ELECTRICAS, MECANICA_CLIMATIZACION, COORDINACION_GENERAL
  formato: string; // IFC, RVT_REVIT, DWG_AUTOCAD, PDF_PLANO, NWD_NAVISWORKS, OTRO
  version: string;
  autorProyectista?: string;
  archivoUrl?: string;
  pesoMb?: number;
  estadoRevision: string; // VIGENTE, EN_REVISION, SUPERIOR_OBSOLETO, APROBADO_PARA_CONSTRUCCION
  observaciones?: string;
  createdAt?: string;
}

export interface RfiConstruccionApi {
  id?: number;
  tenantId?: number;
  proyectoId: number;
  documentoBimId?: number | null;
  numeroRfi: string;
  asunto: string;
  disciplina: string; // ESTRUCTURAS, ARQUITECTURA, MEP, GENERAL
  preguntaConsulta: string;
  propuestaSolucion?: string;
  respuestaOficial?: string;
  solicitante: string;
  responsableRespuesta?: string;
  estado: string; // ABIERTO, EN_EVALUACION, RESPONDIDO, CERRADO
  fechaLimite?: string;
  fechaRespuesta?: string;
  createdAt?: string;
}

export function listarDocumentosBimApi(proyectoId: number, disciplina?: string): Promise<DocumentoBimApi[]> {
  const q = disciplina ? `?disciplina=${encodeURIComponent(disciplina)}` : '';
  return request(`/api/construccion/proyectos/${proyectoId}/bim${q}`);
}

export function crearDocumentoBimApi(proyectoId: number, datos: Partial<DocumentoBimApi>, idempotencyKey?: string): Promise<DocumentoBimApi> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return request(`/api/construccion/proyectos/${proyectoId}/bim`, {
    method: "POST",
    headers,
    body: JSON.stringify(datos)
  });
}

export function cambiarEstadoDocumentoBimApi(id: number, estado: string): Promise<DocumentoBimApi> {
  return request(`/api/construccion/bim/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado })
  });
}

export function listarRfisConstruccionApi(proyectoId: number): Promise<RfiConstruccionApi[]> {
  return request(`/api/construccion/proyectos/${proyectoId}/rfis`);
}

export function crearRfiConstruccionApi(proyectoId: number, datos: Partial<RfiConstruccionApi>, idempotencyKey?: string): Promise<RfiConstruccionApi> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return request(`/api/construccion/proyectos/${proyectoId}/rfis`, {
    method: "POST",
    headers,
    body: JSON.stringify(datos)
  });
}

export function responderRfiConstruccionApi(id: number, respuestaOficial: string, responsableRespuesta?: string, estado?: string): Promise<RfiConstruccionApi> {
  return request(`/api/construccion/rfis/${id}/respuesta`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ respuestaOficial, responsableRespuesta, estado })
  });
}

export interface CuadrillaConstruccionApi {
  id?: number;
  tenantId?: number;
  proyectoId: number;
  partidaId?: number | null;
  codigo: string;
  nombre: string;
  frenteTrabajo: string;
  capatazResponsable: string;
  capatazLider?: string;
  cantidadOficiales: number;
  cantidadAyudantes: number;
  cantidadTotalPersonal?: number;
  totalPersonal?: number;
  especialidad: string; // CONCRETO_Y_ENCOFRADO, ACERO_Y_CABILLAS, ALBANILERIA, MOVIMIENTO_TIERRAS, INSTALACIONES_ELECTRICAS, INSTALACIONES_SANITARIAS, ACABADOS_Y_PINTURA, SOLDADURA_ESTRUCTURAL, GENERAL
  rendimientoDiarioEstimado?: number;
  unidadMedidaRendimiento?: string;
  estado: string; // ACTIVA, EN_STANDBY, REASIGNADA, FINALIZADA
  fechaInicio: string;
  fechaFin?: string;
  observaciones?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function listarCuadrillasConstruccionApi(proyectoId: number): Promise<CuadrillaConstruccionApi[]> {
  return request(`/api/construccion/proyectos/${proyectoId}/cuadrillas`);
}

export function crearCuadrillaConstruccionApi(proyectoId: number, datos: Partial<CuadrillaConstruccionApi>, idempotencyKey?: string): Promise<CuadrillaConstruccionApi> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return request(`/api/construccion/proyectos/${proyectoId}/cuadrillas`, {
    method: "POST",
    headers,
    body: JSON.stringify(datos)
  });
}

export function cambiarEstadoCuadrillaConstruccionApi(id: number, estado: string): Promise<CuadrillaConstruccionApi> {
  return request(`/api/construccion/cuadrillas/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado })
  });
}
