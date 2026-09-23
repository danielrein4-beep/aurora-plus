import React, { useEffect, useState } from "react";
import { leerSesion, type Paciente } from "../api";
import { abrirWhatsAppDirecto } from "../utils/pdfReports";

interface Props {
  paciente: Paciente;
  clinicaNombre?: string;
  onCerrar: () => void;
}

function authHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${leerSesion()?.token || ""}` };
}

// Genera el enlace personal del paciente a su historia dental y lo muestra como QR
// para escanear en la consulta, copiar o enviar por WhatsApp.
export default function PortalPacienteOdontoModal({ paciente, clinicaNombre, onCerrar }: Props) {
  const [enlace, setEnlace] = useState<{ url: string; qrPng: string; expira: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/salud/odontologia/portal/enlaces", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ pacienteId: paciente.id, origen: window.location.origin }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`error ${r.status}`);
        setEnlace(await r.json());
      })
      .catch((e) => setError(`No se pudo crear el enlace (${e instanceof Error ? e.message : "fallo de conexion"}).`));
  }, [paciente.id]);

  const copiar = async () => {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace.url);
      setAviso("Enlace copiado.");
    } catch {
      setAviso("No se pudo copiar; selecciónalo a mano.");
    }
  };

  const revocar = async () => {
    try {
      const r = await fetch(`/api/salud/odontologia/portal/enlaces?pacienteId=${paciente.id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok) throw new Error(`error ${r.status}`);
      const d = await r.json();
      setEnlace(null);
      setAviso(d.mensaje || "Enlaces desactivados.");
    } catch (e) {
      setAviso(`No se pudieron desactivar los enlaces: ${e instanceof Error ? e.message : "fallo de conexion"}.`);
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/70" onClick={onCerrar}>
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-left space-y-4 border border-slate-200 dark:border-white/10 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h4 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-[#FFFFFF]">Portal del paciente</h4>
          <p className="text-slate-500 dark:text-slate-400">
            {paciente.nombreCompleto} verá su diagnóstico, plan, citas y recetas, y podrá enviarte sus radiografías.
          </p>
        </div>

        {error && <p className="text-rose-600 dark:text-rose-400 font-semibold">{error}</p>}

        {enlace && (
          <>
            <img src={enlace.qrPng} alt="Código QR del portal del paciente" className="w-48 h-48 mx-auto bg-white p-2 rounded-xl" />
            <p className="text-center text-slate-500 dark:text-slate-400">
              Válido hasta el {new Date(enlace.expira).toLocaleDateString("es-VE")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={copiar} className="p-2 rounded-xl border border-slate-300 dark:border-white/15 font-semibold">
                Copiar enlace
              </button>
              <button
                type="button"
                disabled={!paciente.telefono}
                onClick={() =>
                  abrirWhatsAppDirecto(
                    paciente.telefono || "",
                    `Hola ${paciente.nombreCompleto}, desde ${clinicaNombre || "su clínica"} le compartimos su historia dental: ${enlace.url}`
                  )
                }
                className="p-2 rounded-xl bg-emerald-600 text-[#FFFFFF] font-bold disabled:opacity-50"
              >
                Enviar por WhatsApp
              </button>
            </div>
          </>
        )}

        {aviso && <p className="font-semibold text-slate-700 dark:text-slate-200">{aviso}</p>}

        <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-white/10">
          <button type="button" onClick={revocar} className="font-semibold text-rose-600 hover:underline">
            Desactivar todos sus enlaces
          </button>
          <button type="button" onClick={onCerrar} className="font-semibold text-slate-600 dark:text-slate-300">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
