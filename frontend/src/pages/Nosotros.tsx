import { useState } from "react";
import { IconChat, IconMail, IconInstagram, IconCheck } from "../Icons";
import Kicker from "../components/Kicker";
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
    <main className="pt-32 pb-24 relative">

      {/* Header */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto text-center mb-16">
        <Kicker>Sobre nosotros</Kicker>
        <h1 className="font-bold text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight text-slate-900 mb-5">
          Construimos Aurora Plus<br />
          <span className="text-[#177E89]">porque lo vivimos de cerca</span>
        </h1>
        <p className="text-slate-500 text-lg font-light uppercase tracking-wide max-w-2xl mx-auto leading-relaxed">
          Aurora Plus nace para emprendedores y comercios que sufren el desorden administrativo y el caos de la multi-moneda todos los días — en un país donde este nivel de tecnología tiene acceso limitado.
        </p>
      </section>

      {/* Mission */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-24">
        <div className="relative apple-glass rounded-3xl overflow-hidden p-10 sm:p-14 text-center">
          <div className="absolute inset-x-0 top-0 h-px bg-[#177E89]/30" />
          <div className="relative max-w-3xl mx-auto">
            <p className="font-light uppercase tracking-wide text-sm text-[#177E89] mb-4">Nuestra misión</p>
            <p className="font-bold text-2xl sm:text-3xl text-slate-900 leading-relaxed">
              "Simplificar procesos y automatizar la gestión administrativa y multi-moneda para negocios que hoy no tienen acceso a ese nivel de tecnología."
            </p>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-24">
        <div className="text-center mb-12">
          <Kicker>Lo que nos guía</Kicker>
          <h2 className="font-bold text-4xl text-slate-900">Nuestros valores</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALORES.map((v, i) => (
            <div key={v.title} className="apple-glass rounded-2xl p-6">
              <div className="font-['Fraunces'] italic text-5xl text-[#177E89] opacity-30 mb-3 leading-none">
                0{i + 1}
              </div>
              <h3 className="font-light uppercase tracking-wide text-slate-900 text-lg mb-2">{v.title}</h3>
              <p className="text-slate-500 text-sm font-light uppercase tracking-wide leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="px-4 sm:px-6 max-w-3xl mx-auto mb-24">
        <div className="text-center mb-12">
          <Kicker>El equipo</Kicker>
          <h2 className="font-bold text-4xl text-slate-900">
            Las personas detrás de<br />
            <span className="text-[#177E89]">Aurora Plus</span>
          </h2>
          <p className="text-slate-500 text-sm font-light uppercase tracking-wide mt-4 max-w-lg mx-auto">
            El negocio y la ingeniería, en la misma mesa desde el día uno.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EQUIPO.map((p) => (
            <div key={p.nombre} className="apple-glass rounded-2xl p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#0D3B3D] flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                {p.inicial}
              </div>
              <div className="font-light uppercase tracking-wide text-slate-900 text-base">{p.nombre}</div>
              <div className="text-[#177E89] text-xs font-light uppercase tracking-wide mt-0.5 mb-3">{p.rol}</div>
              <p className="text-slate-500 text-xs font-light uppercase tracking-wide leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <span className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-xs font-light uppercase tracking-wide text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            En fase de piloto — todavía no disponible al 100% para el público general
          </span>
        </div>
      </section>

      {/* Contact form */}
      <section className="px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="relative apple-glass rounded-3xl overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-[#177E89]/30" />
          <div className="p-8 sm:p-12 flex flex-col lg:flex-row gap-12">

            {/* Left */}
            <div className="lg:w-80 flex-shrink-0">
              <Kicker align="left">Contáctanos</Kicker>
              <h2 className="font-bold text-3xl text-slate-900 mb-4 leading-tight">
                Hablemos de<br />tu negocio
              </h2>
              <p className="text-slate-500 text-sm font-light uppercase tracking-wide leading-relaxed mb-8">
                Cuéntanos sobre tu empresa y te mostraremos exactamente cómo Aurora Plus puede ayudarte.
              </p>
              <div className="space-y-4">
                {CONTACTO_MEDIOS.map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#177E89]/10 border border-[#177E89]/20 flex items-center justify-center text-sm flex-shrink-0 text-[#177E89]">
                      <m.Icon size={16} />
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] tracking-wide font-light uppercase">{m.label}</div>
                      <div className="text-slate-700 text-sm font-light uppercase tracking-wide">{m.valor}</div>
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
                  <h3 className="font-bold text-2xl text-slate-900 mb-2">Mensaje recibido</h3>
                  <p className="text-slate-500 text-sm font-light uppercase tracking-wide max-w-xs">
                    Te contactaremos pronto.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">{error}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-700 text-xs mb-1.5 block font-light uppercase tracking-wide">Nombre completo</label>
                      <input required type="text" placeholder="Ej. Carlos Mendoza"
                        value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#177E89] transition-colors" />
                    </div>
                    <div>
                      <label className="text-slate-700 text-xs mb-1.5 block font-light uppercase tracking-wide">Correo de trabajo</label>
                      <input required type="email" placeholder="carlos@tuempresa.com"
                        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#177E89] transition-colors" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-700 text-xs mb-1.5 block font-light uppercase tracking-wide">Empresa</label>
                      <input required type="text" placeholder="Nombre de tu empresa"
                        value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#177E89] transition-colors" />
                    </div>
                    <div>
                      <label className="text-slate-700 text-xs mb-1.5 block font-light uppercase tracking-wide">Industria</label>
                      <select value={form.industria} onChange={(e) => setForm({ ...form, industria: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-[#177E89] transition-colors">
                        {["Comercio", "Clínica & Salud", "Restaurante & Cafetería", "Ganadería & Agro", "Otro rubro"].map((opt) => (
                          <option key={opt} value={opt} className="bg-white text-slate-900">{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-700 text-xs mb-1.5 block font-light uppercase tracking-wide">¿En qué podemos ayudarte?</label>
                    <textarea rows={4} placeholder="Cuéntanos brevemente sobre tu operación..."
                      value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#177E89] transition-colors resize-none" />
                  </div>
                  <button type="submit" disabled={enviando}
                    className="w-full bg-[#177E89] hover:bg-[#0D3B3D] text-white font-light uppercase tracking-wide py-3.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50">
                    {enviando ? "Enviando…" : "Enviar mensaje"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
