import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { consultarPortalLaboratorioPublico, subirExamenPortalLaboratorioPublico } from "../api";
import { IconWarning, IconFrascoLab, IconFileText, IconCheckCircle, IconPaperclip, IconUpload, IconClose } from "../Icons";

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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-[#1D1D1F]">
        <div className="w-10 h-10 border-4 border-[#177E89] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#86868B] font-medium">Verificando enlace...</p>
      </div>
    );
  }

  // 2. Enlace inválido
  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-[#1D1D1F]">
        <div className="max-w-md w-full bg-white border border-[#E5E5EA] rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-[#F5F5F7] text-[#ef4444] rounded-2xl flex items-center justify-center mx-auto">
            <IconWarning size={28} />
          </div>
          <h1 className="text-xl font-bold text-[#1D1D1F]">Enlace no válido</h1>
          <p className="text-sm text-[#86868B]">{error}</p>
        </div>
      </div>
    );
  }

  // 3. Envío exitoso
  if (exito) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 text-[#1D1D1F]">
        <div className="max-w-md w-full bg-white border border-[#E5E5EA] rounded-3xl p-8 sm:p-10 text-center space-y-5 shadow-sm">
          <div className="w-20 h-20 bg-[#177E89]/10 border border-[#177E89]/30 text-[#177E89] rounded-3xl flex items-center justify-center mx-auto">
            <IconCheckCircle size={36} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">¡Resultados Enviados!</h1>
          <p className="text-[#6E6E73] text-sm leading-relaxed">
            Sus {archivos.length} {archivos.length === 1 ? "archivo fue enviado" : "archivos fueron enviados"} correctamente a{" "}
            <strong className="text-[#177E89]">{nombreConsultorio}</strong>. Su médico los revisará en breve.
          </p>
          <p className="text-xs text-[#86868B]">Ya puede cerrar esta página.</p>
        </div>
      </div>
    );
  }

  // 4. Formulario de carga
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] antialiased pb-16">
      <header className="border-b border-[#E5E5EA] bg-white sticky top-0 z-30 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#177E89]">
            <IconFrascoLab size={18} />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#177E89]">Envío de Resultados de Laboratorio</span>
            <h1 className="text-sm font-bold text-[#1D1D1F]">{nombreConsultorio}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        <div className="bg-[#177E89]/10 border border-[#177E89]/20 rounded-2xl p-4 text-xs text-[#1D1D1F] leading-relaxed">
          Suba aquí la foto o el PDF de los resultados que le entregó el laboratorio. Su médico los recibirá directamente
          en su expediente.
        </div>

        <form onSubmit={handleEnviar} className="bg-white border border-[#E5E5EA] rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div>
            <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">
              Número de Cédula <span className="text-[#177E89]">*</span>
            </label>
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Ej. V-12345678"
              className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2.5 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#177E89] placeholder:text-[#86868B]"
            />
            <p className="text-[11px] text-[#86868B] mt-1">Así identificamos que estos resultados son suyos.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Opcional"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2.5 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#177E89] placeholder:text-[#86868B]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Teléfono / WhatsApp</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 0414-1234567"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3.5 py-2.5 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#177E89] placeholder:text-[#86868B]"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[#E5E5EA]">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                <IconPaperclip size={13} /> Resultados (fotos o PDF)
              </h4>
              <label className="cursor-pointer px-4 py-2 bg-[#177E89] hover:bg-[#136570] text-white font-semibold text-xs rounded-full flex items-center gap-1.5 transition-colors">
                <span>+</span> Añadir Archivos
                <input type="file" multiple accept="image/*,application/pdf" onChange={handleArchivosSeleccionados} className="hidden" />
              </label>
            </div>

            {archivos.length === 0 ? (
              <label className="border-2 border-dashed border-[#E5E5EA] hover:border-[#177E89]/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#F5F5F7]">
                <div className="mb-2 flex justify-center text-[#86868B]"><IconFileText size={28} /></div>
                <p className="text-sm font-semibold text-[#1D1D1F]">Toque para seleccionar sus fotos o PDF</p>
                <p className="text-xs text-[#86868B] mt-1">Puede subir todos los que necesite, sin límite</p>
                <input type="file" multiple accept="image/*,application/pdf" onChange={handleArchivosSeleccionados} className="hidden" />
              </label>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {archivos.map((adj, i) => (
                  <div key={i} className="relative group bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden p-2 flex flex-col items-center text-center shadow-sm">
                    {adj.previewUrl ? (
                      <div className="w-full h-24 rounded-xl overflow-hidden bg-[#F5F5F7] mb-2">
                        <img src={adj.previewUrl} alt={adj.nombreArchivo} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-24 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex flex-col items-center justify-center text-[#177E89] mb-2">
                        <IconFileText size={22} />
                        <span className="text-[10px] uppercase font-bold text-[#86868B] mt-1">PDF</span>
                      </div>
                    )}
                    <span className="text-[10px] text-[#1D1D1F] truncate w-full font-medium px-1">{adj.nombreArchivo}</span>
                    <button
                      type="button"
                      onClick={() => eliminarArchivo(i)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white border border-[#E5E5EA] hover:bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <IconClose size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errorEnvio && (
            <div className="bg-[#F5F5F7] border border-[#ef4444]/30 text-[#ef4444] text-xs rounded-xl p-3">{errorEnvio}</div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-4 rounded-full bg-[#177E89] text-white font-semibold text-base transition-colors hover:bg-[#136570] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {enviando ? "Enviando..." : <><IconUpload size={16} /> Enviar a mi médico</>}
          </button>
        </form>
      </main>
    </div>
  );
}
