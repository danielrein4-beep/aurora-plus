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
}

export function crearPaciente(tenantId: number, datos: NuevoPaciente): Promise<Paciente> {
  return request(`/api/salud/pacientes?tenantId=${tenantId}`, { method: "POST", body: JSON.stringify(datos) });
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
