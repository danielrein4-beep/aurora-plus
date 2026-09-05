import { useState } from "react";

const VALORES = [
  { title: "Simplicidad", desc: "La tecnología debe facilitar el trabajo, no complicarlo. Diseñamos cada pantalla pensando en el usuario final, no en el programador." },
  { title: "Adaptabilidad", desc: "No existe un negocio igual a otro. Por eso Aurora Plus se configura según tus procesos, no al revés." },
  { title: "Confiabilidad", desc: "Tu operación no puede detenerse. Nos comprometemos con uptime de 99.9% y soporte real cuando lo necesitas." },
  { title: "Acompañamiento", desc: "No te dejamos solo después de la venta. Implementamos, capacitamos y seguimos contigo en cada etapa de crecimiento." },
];

const EQUIPO = [
  { nombre: "Carlos Méndez", rol: "CEO & Fundador", inicial: "CM", color: "from-teal-400 to-cyan-500", desc: "10 años optimizando operaciones empresariales en Latinoamérica." },
  { nombre: "Andrea López", rol: "Directora de Producto", inicial: "AL", color: "from-sky-400 to-blue-500", desc: "Especialista en UX empresarial con enfoque en usabilidad operativa." },
  { nombre: "Roberto Vargas", rol: "Director de Tecnología", inicial: "RV", color: "from-violet-400 to-purple-500", desc: "Arquitecto de software con experiencia en sistemas de alta disponibilidad." },
  { nombre: "María Fernández", rol: "Directora de Éxito del Cliente", inicial: "MF", color: "from-teal-400 to-blue-500", desc: "Garantiza que cada cliente alcance sus objetivos con la plataforma." },
];

const HITOS = [
  { año: "2020", evento: "Fundación de Aurora Plus con la visión de democratizar el software empresarial en Latinoamérica." },
  { año: "2021", evento: "Lanzamiento de los primeros módulos para el sector salud veterinario y clínicas médicas." },
  { año: "2022", evento: "Expansión a 8 industrias verticales. Superamos los 200 clientes activos." },
  { año: "2023", evento: "Lanzamiento de la versión móvil y los reportes de inteligencia de negocio en tiempo real." },
  { año: "2024", evento: "Alcanzamos 800 empresas activas en 12 países. Lanzamos el módulo de Control de Fincas." },
  { año: "2026", evento: "Más de 1,200 empresas confían en Aurora Plus para gestionar su operación diaria." },
];

const CONTACTO_MEDIOS = [
  { label: "WhatsApp", valor: "+1 (555) 000-0000", icon: "💬" },
  { label: "Correo", valor: "hola@auroraplus.com", icon: "✉️" },
  { label: "LinkedIn", valor: "Aurora Plus Software", icon: "in" },
];

export default function Nosotros() {
  const [form, setForm] = useState({ nombre: "", empresa: "", correo: "", mensaje: "" });
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
  };

  return (
    <main className="pt-28 pb-24 relative">

      {/* Header */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto text-center mb-20">
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 text-xs text-teal-300 mb-6 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          Nuestra historia
        </div>
        <h1 className="font-['Outfit'] font-black text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight text-white mb-5">
          Construimos Aurora Plus<br />
          <span className="text-aurora">porque lo necesitábamos</span>
        </h1>
        <p className="text-white/45 text-lg max-w-2xl mx-auto leading-relaxed">
          Vimos cómo pequeñas y medianas empresas perdían tiempo y dinero con software que no entendía su negocio. Aurora Plus nació para cambiar eso.
        </p>
      </section>

      {/* Mission */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-24">
        <div className="relative bg-[#0c0c20] border border-white/5 rounded-3xl overflow-hidden p-10 sm:p-14 text-center">
          <div className="line-aurora absolute top-0 left-0 right-0" />
          <div className="absolute inset-0 opacity-15"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(0,229,184,0.3) 0%, transparent 55%)" }} />
          <div className="relative max-w-3xl mx-auto">
            <p className="text-xs font-semibold tracking-widest text-teal-400 uppercase mb-4">Nuestra misión</p>
            <p className="font-['Outfit'] font-bold text-2xl sm:text-3xl text-white leading-relaxed">
              "Poner tecnología empresarial de primer nivel al alcance de cualquier negocio, sin importar su tamaño o industria."
            </p>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-24">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest text-violet-400 uppercase mb-3">Lo que nos guía</p>
          <h2 className="font-['Outfit'] font-bold text-4xl text-white">Nuestros valores</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALORES.map((v, i) => (
            <div key={v.title} className="bg-[#0c0c20] border border-white/5 rounded-2xl p-6">
              <div className="font-['Outfit'] font-black text-5xl text-aurora opacity-20 mb-3 leading-none">
                0{i + 1}
              </div>
              <h3 className="font-['Outfit'] font-bold text-white text-lg mb-2">{v.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="px-4 sm:px-6 max-w-4xl mx-auto mb-24">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">Trayectoria</p>
          <h2 className="font-['Outfit'] font-bold text-4xl text-white">Nuestra historia</h2>
        </div>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-16 sm:left-1/2 top-0 bottom-0 w-px bg-white/5" />
          <div className="space-y-8">
            {HITOS.map((h, i) => (
              <div key={h.año} className={`flex gap-6 items-start ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"}`}>
                {/* Year bubble */}
                <div className="flex-shrink-0 w-32 text-right sm:text-right">
                  <span className="font-['Outfit'] font-black text-2xl text-aurora">{h.año}</span>
                </div>
                {/* Dot */}
                <div className="relative flex-shrink-0 w-4 flex justify-center mt-2">
                  <div className="w-3 h-3 rounded-full bg-teal-400 ring-4 ring-teal-400/20" />
                </div>
                {/* Content */}
                <div className="flex-1 bg-[#0c0c20] border border-white/5 rounded-xl p-4">
                  <p className="text-white/55 text-sm leading-relaxed">{h.evento}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-24">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest text-teal-400 uppercase mb-3">El equipo</p>
          <h2 className="font-['Outfit'] font-bold text-4xl text-white">
            Las personas detrás de<br />
            <span className="text-aurora">Aurora Plus</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EQUIPO.map((p) => (
            <div key={p.nombre} className="bg-[#0c0c20] border border-white/5 rounded-2xl p-6 text-center hover-card card-shadow">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white font-bold text-lg mx-auto mb-4`}>
                {p.inicial}
              </div>
              <div className="font-['Outfit'] font-bold text-white text-base">{p.nombre}</div>
              <div className="text-aurora text-xs mt-0.5 mb-3">{p.rol}</div>
              <p className="text-white/40 text-xs leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact form */}
      <section className="px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="relative bg-[#0c0c20] border border-white/5 rounded-3xl overflow-hidden">
          <div className="line-aurora absolute top-0 left-0 right-0" />
          <div className="p-8 sm:p-12 flex flex-col lg:flex-row gap-12">

            {/* Left */}
            <div className="lg:w-80 flex-shrink-0">
              <p className="text-xs font-semibold tracking-widest text-teal-400 uppercase mb-3">Contáctanos</p>
              <h2 className="font-['Outfit'] font-bold text-3xl text-white mb-4 leading-tight">
                Hablemos de<br />tu negocio
              </h2>
              <p className="text-white/40 text-sm leading-relaxed mb-8">
                Cuéntanos sobre tu empresa y te mostraremos exactamente cómo Aurora Plus puede ayudarte.
              </p>
              <div className="space-y-4">
                {CONTACTO_MEDIOS.map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-sm flex-shrink-0">
                      {m.icon}
                    </div>
                    <div>
                      <div className="text-white/30 text-[10px] uppercase tracking-widest">{m.label}</div>
                      <div className="text-white/65 text-sm">{m.valor}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="flex-1">
              {enviado ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 rounded-2xl g-aurora flex items-center justify-center text-2xl mb-4">✓</div>
                  <h3 className="font-['Outfit'] font-bold text-white text-2xl mb-2">¡Mensaje enviado!</h3>
                  <p className="text-white/45 text-sm">Nuestro equipo te contactará en menos de 24 horas.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: "nombre",   label: "Nombre completo", placeholder: "Tu nombre" },
                      { key: "empresa",  label: "Empresa",         placeholder: "Nombre de tu empresa" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="block text-white/40 text-xs mb-1.5 tracking-wide">{f.label}</label>
                        <input
                          type="text"
                          placeholder={f.placeholder}
                          value={form[f.key as keyof typeof form]}
                          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                          className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/40 transition-colors"
                          required
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-white/40 text-xs mb-1.5 tracking-wide">Correo electrónico</label>
                    <input
                      type="email"
                      placeholder="tu@empresa.com"
                      value={form.correo}
                      onChange={(e) => setForm({ ...form, correo: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/40 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/40 text-xs mb-1.5 tracking-wide">¿Cómo podemos ayudarte?</label>
                    <textarea
                      rows={4}
                      placeholder="Cuéntanos sobre tu negocio y qué buscas mejorar..."
                      value={form.mensaje}
                      onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/40 transition-colors resize-none"
                      required
                    />
                  </div>
                  <button type="submit"
                    className="w-full g-aurora glow-teal text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity text-sm">
                    Enviar mensaje
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
