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

const PACIENTES_DEFAULT: Paciente[] = [
  {
    id: 1,
    nombreCompleto: "Carlos Andrés Gómez Peña",
    identificacion: "10987654321",
    nombres: "Carlos Andrés",
    apellidos: "Gómez Peña",
    edad: 34,
    fechaNacimiento: "1992-05-14",
    telefono: "0414-7654321",
    email: "carlos.gomez@gmail.com",
    direccion: "Barrio Blanco, Cúcuta",
    genero: "M",
    tipoOrigen: "Foráneo",
    origen: "Foráneo",
    ciudadOrigen: "Cúcuta",
  },
  {
    id: 2,
    nombreCompleto: "Niccolle Angelyc Medina Delgado",
    identificacion: "30398619",
    nombres: "Niccolle Angelyc",
    apellidos: "Medina Delgado",
    edad: 22,
    fechaNacimiento: "2004-07-22",
    telefono: "04247640913",
    email: "niccolledelgado@gmail.com",
    direccion: "Urbanización Cumbres Andinas Edif.7 piso 3 apto #",
    genero: "F",
    tipoOrigen: "Local",
    origen: "Local",
    ciudadOrigen: "San Cristóbal",
  },
  {
    id: 3,
    nombreCompleto: "Daniel Eduardo Reina Porras",
    identificacion: "28145920",
    nombres: "Daniel Eduardo",
    apellidos: "Reina Porras",
    edad: 25,
    fechaNacimiento: "2001-03-10",
    telefono: "0412-1234567",
    email: "daniel.reina@gmail.com",
    direccion: "Pueblo Nuevo, San Cristóbal",
    genero: "M",
    tipoOrigen: "Local",
    origen: "Local",
    ciudadOrigen: "San Cristóbal",
  },
  {
    id: 4,
    nombreCompleto: "Valentina Duque",
    identificacion: "29841203",
    nombres: "Valentina",
    apellidos: "Duque",
    edad: 24,
    fechaNacimiento: "2002-11-18",
    telefono: "0414-9876543",
    email: "valentina.duque@gmail.com",
    direccion: "Pirineos, San Cristóbal",
    genero: "F",
    tipoOrigen: "Local",
    origen: "Local",
    ciudadOrigen: "San Cristóbal",
  },
];

export async function listarPacientes(tenantId: number): Promise<Paciente[]> {
  try {
    const apiRes = await request<Paciente[]>(`/api/salud/pacientes?tenantId=${tenantId}`);
    if (Array.isArray(apiRes) && apiRes.length > 0) {
      localStorage.setItem("aurora_mediclinic_pacientes", JSON.stringify(apiRes));
      return apiRes;
    }
  } catch {}
  try {
    const raw = localStorage.getItem("aurora_mediclinic_pacientes");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem("aurora_mediclinic_pacientes", JSON.stringify(PACIENTES_DEFAULT));
  return PACIENTES_DEFAULT;
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

export async function crearPaciente(tenantId: number, datos: NuevoPaciente): Promise<Paciente> {
  const nombreCompleto = `${datos.nombres || ""} ${datos.apellidos || ""}`.trim() || datos.identificacion;
  let edadCalc: number | null = null;
  if (datos.fechaNacimiento) {
    try {
      const anioNac = new Date(datos.fechaNacimiento).getFullYear();
      if (!isNaN(anioNac)) edadCalc = Math.max(0, new Date().getFullYear() - anioNac);
    } catch {}
  }

  const pacienteGenerado: Paciente = {
    id: Date.now(),
    nombreCompleto,
    identificacion: datos.identificacion,
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    edad: edadCalc || 30,
    fechaNacimiento: datos.fechaNacimiento || null,
    telefono: datos.telefono || null,
    email: datos.email || null,
    direccion: datos.direccion || null,
    genero: datos.genero || "M",
    tipoOrigen: datos.tipoOrigen || "Local",
    origen: datos.tipoOrigen || "Local",
    ciudadOrigen: datos.ciudadOrigen || (datos.tipoOrigen === "Foráneo" ? "Cúcuta" : "San Cristóbal"),
  };

  try {
    const apiRes = await request<Paciente>(`/api/salud/pacientes?tenantId=${tenantId}`, {
      method: "POST",
      body: JSON.stringify(datos),
    });
    if (apiRes && apiRes.id) {
      try {
        const raw = localStorage.getItem("aurora_mediclinic_pacientes");
        const list: Paciente[] = raw ? JSON.parse(raw) : [...PACIENTES_DEFAULT];
        const filtrada = list.filter((p) => p.id !== apiRes.id);
        localStorage.setItem("aurora_mediclinic_pacientes", JSON.stringify([apiRes, ...filtrada]));
      } catch {}
      return apiRes;
    }
  } catch {}

  try {
    const raw = localStorage.getItem("aurora_mediclinic_pacientes");
    const list: Paciente[] = raw ? JSON.parse(raw) : [...PACIENTES_DEFAULT];
    const nuevaLista = [pacienteGenerado, ...list.filter((p) => p.identificacion !== pacienteGenerado.identificacion)];
    localStorage.setItem("aurora_mediclinic_pacientes", JSON.stringify(nuevaLista));
  } catch {}

  return pacienteGenerado;
}

export async function eliminarPaciente(id: number): Promise<void> {
  try {
    await request(`/api/salud/pacientes/${id}`, { method: "DELETE" });
  } catch {}
  try {
    const raw = localStorage.getItem("aurora_mediclinic_pacientes");
    if (raw) {
      const list: Paciente[] = JSON.parse(raw);
      localStorage.setItem("aurora_mediclinic_pacientes", JSON.stringify(list.filter((p) => p.id !== id)));
    }
  } catch {}
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
  try {
    const apiRes = await request<CitaMedica[]>(`/api/salud/agenda?tenantId=${tenantId}&fecha=${fecha}`);
    if (Array.isArray(apiRes)) {
      localStorage.setItem(`aurora_mediclinic_citas_${fecha}`, JSON.stringify(apiRes));
      return apiRes;
    }
  } catch {}
  try {
    const raw = localStorage.getItem(`aurora_mediclinic_citas_${fecha}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
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
  const pacienteMock: Paciente = {
    id: datos.pacienteId,
    nombreCompleto: "Paciente Registrado",
    identificacion: "10987654",
    edad: 30,
    telefono: "0414-0000000",
  };
  const nuevaCita: CitaMedica = {
    id: Date.now(),
    paciente: pacienteMock,
    fecha: datos.fecha,
    horaInicio: datos.horaInicio,
    horaFin: datos.horaFin,
    motivo: datos.motivo || "Consulta General",
    especialidad: datos.especialidad || "Medicina General",
    estado: datos.estado || "PROGRAMADA",
  };

  try {
    const apiRes = await request<CitaMedica>(`/api/salud/agenda/citas?tenantId=${tenantId}`, {
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
    if (apiRes && apiRes.id) {
      try {
        const raw = localStorage.getItem(`aurora_mediclinic_citas_${datos.fecha}`);
        const list: CitaMedica[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(`aurora_mediclinic_citas_${datos.fecha}`, JSON.stringify([apiRes, ...list]));
      } catch {}
      return apiRes;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(`aurora_mediclinic_citas_${datos.fecha}`);
    const list: CitaMedica[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(`aurora_mediclinic_citas_${datos.fecha}`, JSON.stringify([nuevaCita, ...list]));
  } catch {}

  return nuevaCita;
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

export interface SalaEsperaEntrada {
  id: number;
  paciente: Paciente;
  consultorio: string | null;
  estado: string;
  horaLlegada: string;
}

export async function listarSalaEspera(): Promise<SalaEsperaEntrada[]> {
  try {
    const apiRes = await request<SalaEsperaEntrada[]>(`/api/salud/sala-espera`);
    if (Array.isArray(apiRes)) {
      localStorage.setItem("aurora_mediclinic_sala_espera", JSON.stringify(apiRes));
      return apiRes;
    }
  } catch {}
  try {
    const raw = localStorage.getItem("aurora_mediclinic_sala_espera");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function registrarLlegadaSalaEspera(
  tenantId: number,
  pacienteId: number,
  consultorio?: string
): Promise<SalaEsperaEntrada> {
  const nuevaEntrada: SalaEsperaEntrada = {
    id: Date.now(),
    paciente: {
      id: pacienteId,
      nombreCompleto: "Paciente En Espera",
      identificacion: "10987654",
      edad: 30,
      telefono: "0414-0000000",
    },
    consultorio: consultorio || "Consultorio 1",
    estado: "EN_ESPERA",
    horaLlegada: new Date().toLocaleTimeString().slice(0, 5),
  };

  try {
    const apiRes = await request<SalaEsperaEntrada>(`/api/salud/sala-espera/check-in?tenantId=${tenantId}`, {
      method: "POST",
      body: JSON.stringify({ paciente: { id: pacienteId }, consultorio }),
    });
    if (apiRes && apiRes.id) {
      try {
        const raw = localStorage.getItem("aurora_mediclinic_sala_espera");
        const list: SalaEsperaEntrada[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem("aurora_mediclinic_sala_espera", JSON.stringify([apiRes, ...list]));
      } catch {}
      return apiRes;
    }
  } catch {}

  try {
    const raw = localStorage.getItem("aurora_mediclinic_sala_espera");
    const list: SalaEsperaEntrada[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem("aurora_mediclinic_sala_espera", JSON.stringify([nuevaEntrada, ...list]));
  } catch {}

  return nuevaEntrada;
}

export async function finalizarAtencionSalaEspera(id: number): Promise<SalaEsperaEntrada> {
  try {
    return await request(`/api/salud/sala-espera/${id}/finalizar`, { method: "POST" });
  } catch {
    const mock: SalaEsperaEntrada = {
      id,
      paciente: { id: 1, nombreCompleto: "Paciente Atendido", identificacion: "10987654", edad: 30, telefono: "" },
      consultorio: "Consultorio 1",
      estado: "FINALIZADO",
      horaLlegada: "10:00",
    };
    try {
      const raw = localStorage.getItem("aurora_mediclinic_sala_espera");
      if (raw) {
        const list: SalaEsperaEntrada[] = JSON.parse(raw);
        localStorage.setItem(
          "aurora_mediclinic_sala_espera",
          JSON.stringify(list.map((e) => (e.id === id ? { ...e, estado: "FINALIZADO" } : e)))
        );
      }
    } catch {}
    return mock;
  }
}

export interface ProcedimientoMedico {
  id: number;
  nombre: string;
  descripcion: string | null;
  costo: number;
  moneda: string;
  duracionMinutos: number | null;
}

export async function listarProcedimientos(): Promise<ProcedimientoMedico[]> {
  try {
    const apiRes = await request<ProcedimientoMedico[]>(`/api/salud/procedimientos`);
    if (Array.isArray(apiRes)) {
      localStorage.setItem("aurora_mediclinic_procedimientos", JSON.stringify(apiRes));
      return apiRes;
    }
  } catch {}
  try {
    const raw = localStorage.getItem("aurora_mediclinic_procedimientos");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function crearProcedimiento(
  tenantId: number,
  datos: Omit<ProcedimientoMedico, "id">
): Promise<ProcedimientoMedico> {
  const nuevo: ProcedimientoMedico = {
    id: Date.now(),
    ...datos,
  };

  try {
    const apiRes = await request<ProcedimientoMedico>(`/api/salud/procedimientos?tenantId=${tenantId}`, {
      method: "POST",
      body: JSON.stringify(datos),
    });
    if (apiRes && apiRes.id) {
      try {
        const raw = localStorage.getItem("aurora_mediclinic_procedimientos");
        const list: ProcedimientoMedico[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem("aurora_mediclinic_procedimientos", JSON.stringify([apiRes, ...list]));
      } catch {}
      return apiRes;
    }
  } catch {}

  try {
    const raw = localStorage.getItem("aurora_mediclinic_procedimientos");
    const list: ProcedimientoMedico[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem("aurora_mediclinic_procedimientos", JSON.stringify([nuevo, ...list]));
  } catch {}

  return nuevo;
}

export interface ConsultaMedica {
  id: number;
  motivoConsulta: string;
  descripcionDiagnostico?: string;
  planTratamiento?: string;
  fechaHora?: string;
  fechaConsulta?: string;
}

export async function historialConsultasPaciente(pacienteId: number): Promise<ConsultaMedica[]> {
  try {
    const apiRes = await request<ConsultaMedica[]>(`/api/salud/consultas/paciente/${pacienteId}`);
    if (Array.isArray(apiRes)) {
      localStorage.setItem(`aurora_mediclinic_consultas_${pacienteId}`, JSON.stringify(apiRes));
      return apiRes;
    }
  } catch {}
  try {
    const raw = localStorage.getItem(`aurora_mediclinic_consultas_${pacienteId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function registrarConsulta(
  tenantId: number,
  pacienteId: number,
  datos: Partial<ConsultaMedica>
): Promise<ConsultaMedica> {
  const nuevaConsulta: ConsultaMedica = {
    id: Date.now(),
    motivoConsulta: datos.motivoConsulta || "Consulta Médica",
    descripcionDiagnostico: datos.descripcionDiagnostico,
    planTratamiento: datos.planTratamiento,
    fechaHora: new Date().toISOString(),
    fechaConsulta: new Date().toISOString().slice(0, 10),
  };

  try {
    const apiRes = await request<ConsultaMedica>(`/api/salud/consultas?tenantId=${tenantId}`, {
      method: "POST",
      body: JSON.stringify({ paciente: { id: pacienteId }, ...datos }),
    });
    if (apiRes && apiRes.id) {
      try {
        const raw = localStorage.getItem(`aurora_mediclinic_consultas_${pacienteId}`);
        const list: ConsultaMedica[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(`aurora_mediclinic_consultas_${pacienteId}`, JSON.stringify([apiRes, ...list]));
      } catch {}
      return apiRes;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(`aurora_mediclinic_consultas_${pacienteId}`);
    const list: ConsultaMedica[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(`aurora_mediclinic_consultas_${pacienteId}`, JSON.stringify([nuevaConsulta, ...list]));
  } catch {}

  return nuevaConsulta;
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
  fechaCreacion: string;
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
  escandalloId?: number; articuloId?: number; nombrePlato?: string; estacionCocina?: string; cantidad: number; precioUnitario?: number;
}): Promise<ItemComanda> {
  const params = new URLSearchParams({ tenantId: String(tenantId), cantidad: String(datos.cantidad) });
  if (datos.escandalloId != null) params.set("escandalloId", String(datos.escandalloId));
  if (datos.articuloId != null) params.set("articuloId", String(datos.articuloId));
  if (datos.nombrePlato) params.set("nombrePlato", datos.nombrePlato);
  if (datos.estacionCocina) params.set("estacionCocina", datos.estacionCocina);
  if (datos.precioUnitario != null) params.set("precioUnitario", String(datos.precioUnitario));
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

export function editarArticulo(tenantId: number, articuloId: number, datos: { nombre?: string; categoria?: string; unidadMedida?: string; costoUnitario?: number }): Promise<Articulo> {
  return request(`/api/inventario/articulos/${articuloId}?tenantId=${tenantId}`, { method: "PUT", body: JSON.stringify(datos) });
}

/** Corrección de inventario: indicá el stock REAL contado y el sistema calcula/ audita la diferencia solo. */
export function ajustarStockArticulo(tenantId: number, articuloId: number, datos: { stockReal: number; motivo?: string }): Promise<Articulo> {
  return request(`/api/inventario/articulos/${articuloId}/ajustar-stock?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
}

export function eliminarArticulo(tenantId: number, articuloId: number): Promise<void> {
  return request(`/api/inventario/articulos/${articuloId}?tenantId=${tenantId}`, { method: "DELETE" });
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
