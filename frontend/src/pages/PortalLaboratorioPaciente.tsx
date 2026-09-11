import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { consultarPortalLaboratorioPublico, subirExamenPortalLaboratorioPublico } from "../api";

interface ArchivoLocal {
  file: File;
  nombreArchivo: string;
  previewUrl: string;
}

export default function PortalLaboratorioPaciente() {
  const { token } = useParams<{ token: string }>();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombreConsultorio, setNombreConsultorio] = useState<string>("");

  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [archivos, setArchivos] = useState<ArchivoLocal[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (!token) return;
    setCargando(true);
    setError(null);
    consultarPortalLaboratorioPublico(token)
      .then((data) => setNombreConsultorio(data.nombreConsultorio))
      .catch((err) => setError(err.message || "Este enlace de laboratorio no es válido."))
      .finally(() => setCargando(false));
  }, [token]);

  const handleArchivosSeleccionados = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const nuevos: ArchivoLocal[] = Array.from(files).map((file) => ({
      file,
      nombreArchivo: file.name,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));
    setArchivos((prev) => [...prev, ...nuevos]);
    e.target.value = "";
  };

  const eliminarArchivo = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!cedula.trim()) {
      setErrorEnvio("Por favor ingrese su número de cédula.");
      return;
    }
    if (archivos.length === 0) {
      setErrorEnvio("Adjunte al menos una foto o PDF de sus resultados.");
      return;
    }
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await subirExamenPortalLaboratorioPublico(
        token,
        cedula.trim(),
        nombre.trim(),
        telefono.trim(),
        archivos.map((a) => a.file)
      );
      setExito(true);
    } catch (err: any) {
      setErrorEnvio(err.message || "No se pudo enviar. Intente de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  // 1. Cargando
  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Verificando enlace...</p>
      </div>
    );
  }

  // 2. Enlace inválido
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto text-3xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-white">Enlace no válido</h1>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  // 3. Envío exitoso
  if (exito) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-8 sm:p-10 text-center space-y-5 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto text-4xl">
            ✅
          </div>
          <h1 className="text-2xl font-black text-white font-['Outfit']">¡Resultados Enviados!</h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Sus {archivos.length} {archivos.length === 1 ? "archivo fue enviado" : "archivos fueron enviados"} correctamente a{" "}
            <strong className="text-emerald-300">{nombreConsultorio}</strong>. Su médico los revisará en breve.
          </p>
          <p className="text-xs text-slate-500">Ya puede cerrar esta página.</p>
        </div>
      </div>
    );
  }

  // 4. Formulario de carga
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Manrope'] selection:bg-teal-500 selection:text-white pb-16">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
            🧪
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">Envío de Resultados de Laboratorio</span>
            <h1 className="text-sm font-bold text-white">{nombreConsultorio}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-4 text-xs text-teal-200 leading-relaxed">
          Suba aquí la foto o el PDF de los resultados que le entregó el laboratorio. Su médico los recibirá directamente
          en su expediente.
        </div>

        <form onSubmit={handleEnviar} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Número de Cédula <span className="text-teal-400">*</span>
            </label>
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Ej. V-12345678"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 placeholder:text-slate-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">Así identificamos que estos resultados son suyos.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Opcional"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Teléfono / WhatsApp</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 0414-1234567"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📎</span> Resultados (fotos o PDF)
              </h4>
              <label className="cursor-pointer px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all">
                <span>➕</span> Añadir Archivos
                <input type="file" multiple accept="image/*,application/pdf" onChange={handleArchivosSeleccionados} className="hidden" />
              </label>
            </div>

            {archivos.length === 0 ? (
              <label className="border-2 border-dashed border-slate-800 hover:border-teal-500/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-950/40">
                <div className="text-3xl mb-2">📄</div>
                <p className="text-sm font-semibold text-slate-300">Toque para seleccionar sus fotos o PDF</p>
                <p className="text-xs text-slate-500 mt-1">Puede subir todos los que necesite, sin límite</p>
                <input type="file" multiple accept="image/*,application/pdf" onChange={handleArchivosSeleccionados} className="hidden" />
              </label>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {archivos.map((adj, i) => (
                  <div key={i} className="relative group bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-2 flex flex-col items-center text-center shadow-md">
                    {adj.previewUrl ? (
                      <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-900 mb-2">
                        <img src={adj.previewUrl} alt={adj.nombreArchivo} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-24 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-red-400 mb-2">
                        <span className="text-2xl">📄</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">PDF</span>
                      </div>
                    )}
                    <span className="text-[10px] text-slate-300 truncate w-full font-medium px-1">{adj.nombreArchivo}</span>
                    <button
                      type="button"
                      onClick={() => eliminarArchivo(i)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-600 text-white text-xs flex items-center justify-center shadow-lg transition-all"
                    >
                      ✖
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errorEnvio && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3">{errorEnvio}</div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 text-slate-950 font-black text-base shadow-xl hover:shadow-teal-500/25 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {enviando ? "Enviando..." : "📤 Enviar a mi médico"}
          </button>
        </form>
      </main>
    </div>
  );
}
