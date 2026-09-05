import { Outlet } from "react-router-dom";
import Nav from "./Nav";
import { AuroraGradientDef } from "./Icons";

export default function Layout() {
  return (
    <div className="min-h-full bg-[#060612] text-white overflow-x-hidden">
      <AuroraGradientDef />

      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="blob1 absolute -top-48 -left-48 w-[640px] h-[640px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,229,184,0.13) 0%, transparent 70%)" }} />
        <div className="blob2 absolute top-1/2 -right-64 w-[720px] h-[720px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.11) 0%, transparent 70%)" }} />
        <div className="blob3 absolute -bottom-32 left-1/3 w-[560px] h-[560px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(14,165,233,0.09) 0%, transparent 70%)" }} />
      </div>

      <Nav />
      <Outlet />

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 max-w-7xl mx-auto relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div>
              <span className="font-['Outfit'] font-bold text-aurora text-sm">Aurora Plus</span>
              <div className="text-white/25 text-[10px] tracking-widest uppercase">Software Administrativo</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-white/25">
            {["Privacidad", "Términos", "Soporte", "Documentación", "Blog", "Contacto"].map((l) => (
              <button key={l} className="hover:text-white/55 transition-colors">{l}</button>
            ))}
          </div>
          <p className="text-white/20 text-xs">© 2026 Aurora Plus. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
