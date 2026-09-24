import { useState } from "react";
import { IconChat, IconMail, IconInstagram, IconCheck } from "../Icons";
import { enviarContacto } from "../api";

const VALORES = [
  { title: "Simplicidad", desc: "La tecnología debe facilitar el trabajo, no complicarlo. Diseñamos cada pantalla pensando en el usuario final, no en el programador." },
  { title: "Adaptabilidad", desc: "No existe un negocio igual a otro. Por eso Aurora Plus se configura según tus procesos, no al revés." },
  { title: "Confiabilidad", desc: "Tu operación no puede detenerse. Construimos con seguridad real (cifrado, respaldos automáticos) desde la base, no como un agregado." },
  { title: "Acompañamiento", desc: "No te dejamos solo después de la venta. Implementamos, capacitamos y seguimos contigo en cada etapa de crecimiento." },
];

const EQUIPO = [
  { nombre: "Daniel Reina", rol: "Fundador", inicial: "DR", desc: "Estudiante de Administración de Empresas, Universidad Católica del Táchira." },
  { nombre: "Niccolle Delgado", rol: "Fundadora", inicial: "ND", desc: "Estudiante de Ingeniería Informática, UNET." },
];

const CONTACTO_MEDIOS = [
  { label: "WhatsApp", valor: "Próximamente", Icon: IconChat },
  { label: "Correo", valor: "auroraplussoftware@gmail.com", Icon: IconMail },
  { label: "Instagram", valor: "@auroraplusoftware", Icon: IconInstagram },
];

export default function Nosotros() {
  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    email: "",
    industria: "Ferretería & Retail",
    mensaje: "",
  });
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await enviarContacto(form);
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="w-full bg-white text-[#1D1D1F] antialiased pt-28">

      {/* Header */}
      <section className="py-20 md:py-28 px-6 sm:px-8 border-b border-[#E5E5EA]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#F5F5F7] border border-[#E5E5EA] rounded-full px-4 py-1.5 text-xs font-semibold text-[#177E89] mb-6">
            Sobre nosotros
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.06] text-[#1D1D1F] mb-5">
            Construimos Aurora Plus<br />
            <span className="text-[#177E89]">porque lo vivimos de cerca</span>
          </h1>
          <p className="text-base sm:text-lg text-[#86868B] max-w-2xl mx-auto leading-relaxed">
            Aurora Plus nace para emprendedores y comercios que sufren el desorden administrativo y el caos de la multi-moneda todos los días — en un país donde este nivel de tecnología tiene acceso limitado.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 md:py-28 px-6 sm:px-8 bg-[#F5F5F7] border-b border-[#E5E5EA]">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white border border-[#E5E5EA] rounded-3xl overflow-hidden p-10 sm:p-14 text-center shadow-sm">
            <div className="max-w-3xl mx-auto">
              <p className="text-xs font-semibold tracking-widest text-[#177E89] uppercase mb-4">Nuestra misión</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] leading-relaxed">
                "Simplificar procesos y automatizar la gestión administrativa y multi-moneda para negocios que hoy no tienen acceso a ese nivel de tecnología."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="py-20 md:py-28 px-6 sm:px-8 border-b border-[#E5E5EA]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-[#177E89] uppercase mb-3">Lo que nos guía</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F]">Nuestros valores</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALORES.map((v, i) => (
              <div key={v.title} className="bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-sm">
                <div className="text-5xl font-bold tracking-tight text-[#177E89] opacity-30 mb-3 leading-none">
                  0{i + 1}
                </div>
                <h3 className="font-bold tracking-tight text-[#1D1D1F] text-lg mb-2">{v.title}</h3>
                <p className="text-[#86868B] text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 md:py-28 px-6 sm:px-8 bg-[#F5F5F7] border-b border-[#E5E5EA]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-[#177E89] uppercase mb-3">El equipo</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F]">
              Las personas detrás de<br />
              <span className="text-[#177E89]">Aurora Plus</span>
            </h2>
            <p className="text-[#86868B] text-sm mt-4 max-w-lg mx-auto">
              El negocio y la ingeniería, en la misma mesa desde el día uno.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EQUIPO.map((p) => (
              <div key={p.nombre} className="bg-white border border-[#E5E5EA] rounded-2xl p-6 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-[#177E89] flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                  {p.inicial}
                </div>
                <div className="font-bold text-[#1D1D1F] text-base">{p.nombre}</div>
                <div className="text-[#177E89] text-xs font-semibold mt-0.5 mb-3">{p.rol}</div>
                <p className="text-[#86868B] text-xs leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <span className="inline-flex items-center gap-2 bg-white border border-[#E5E5EA] rounded-full px-4 py-1.5 text-xs text-[#86868B] font-medium">
              En fase de piloto — todavía no disponible al 100% para el público general
            </span>
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section className="py-20 md:py-28 px-6 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white border border-[#E5E5EA] rounded-3xl overflow-hidden shadow-sm">
            <div className="p-8 sm:p-12 flex flex-col lg:flex-row gap-12">

              {/* Left */}
              <div className="lg:w-80 flex-shrink-0">
                <p className="text-xs font-semibold tracking-widest text-[#177E89] uppercase mb-3">Contáctanos</p>
                <h2 className="text-3xl font-bold tracking-tight text-[#1D1D1F] mb-4 leading-tight">
                  Hablemos de<br />tu negocio
                </h2>
                <p className="text-[#86868B] text-sm leading-relaxed mb-8">
                  Cuéntanos sobre tu empresa y te mostraremos exactamente cómo Aurora Plus puede ayudarte.
                </p>
                <div className="space-y-4">
                  {CONTACTO_MEDIOS.map((m) => (
                    <div key={m.label} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-sm flex-shrink-0 text-[#177E89]">
                        <m.Icon size={16} />
                      </div>
                      <div>
                        <div className="text-[#86868B] text-[10px] uppercase tracking-widest font-semibold">{m.label}</div>
                        <div className="text-[#1D1D1F] text-sm font-medium">{m.valor}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form */}
              <div className="flex-1">
                {enviado ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-[#177E89] flex items-center justify-center mb-4 text-white"><IconCheck size={26} /></div>
                    <h3 className="font-bold text-2xl text-[#1D1D1F] mb-2">Mensaje recibido</h3>
                    <p className="text-[#86868B] text-sm max-w-xs">
                      Te contactaremos pronto.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <p className="text-xs text-[#B3261E] bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-3">{error}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[#1D1D1F] text-xs mb-1.5 block font-medium">Nombre completo</label>
                        <input required type="text" placeholder="Ej. Carlos Mendoza"
                          value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                          className="w-full bg-white border border-[#E5E5EA] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#177E89] transition-colors" />
                      </div>
                      <div>
                        <label className="text-[#1D1D1F] text-xs mb-1.5 block font-medium">Correo de trabajo</label>
                        <input required type="email" placeholder="carlos@tuempresa.com"
                          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full bg-white border border-[#E5E5EA] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#177E89] transition-colors" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[#1D1D1F] text-xs mb-1.5 block font-medium">Empresa</label>
                        <input required type="text" placeholder="Nombre de tu empresa"
                          value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                          className="w-full bg-white border border-[#E5E5EA] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#177E89] transition-colors" />
                      </div>
                      <div>
                        <label className="text-[#1D1D1F] text-xs mb-1.5 block font-medium">Industria</label>
                        <select value={form.industria} onChange={(e) => setForm({ ...form, industria: e.target.value })}
                          className="w-full bg-white border border-[#E5E5EA] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] focus:outline-none focus:border-[#177E89] transition-colors">
                          {["Comercio", "Clínica & Salud", "Restaurante & Cafetería", "Ganadería & Agro", "Otro rubro"].map((opt) => (
                            <option key={opt} value={opt} className="bg-white text-[#1D1D1F]">{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[#1D1D1F] text-xs mb-1.5 block font-medium">¿En qué podemos ayudarte?</label>
                      <textarea rows={4} placeholder="Cuéntanos brevemente sobre tu operación..."
                        value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                        className="w-full bg-white border border-[#E5E5EA] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#177E89] transition-colors resize-none" />
                    </div>
                    <button type="submit" disabled={enviando}
                      className="w-full bg-[#177E89] text-white font-semibold py-3.5 rounded-xl text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50">
                      {enviando ? "Enviando…" : "Enviar mensaje"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
