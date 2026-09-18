import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuroraLogo from '../AuroraLogo';
import { AuroraGradientDef, IconShield, IconRefresh } from '../Icons';
import { listarAuditoria, type RegistroAuditoriaApi, type PaginaAuditoria } from '../api';

const MODULOS: { valor: string; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todos los módulos' },
  { valor: 'HORECA', etiqueta: 'Restaurantes' },
  { valor: 'COMERCIO', etiqueta: 'Comercio' },
  { valor: 'GANADERIA', etiqueta: 'Ganadería' },
  { valor: 'SALUD', etiqueta: 'Mediclinic' },
  { valor: 'PERSONAL', etiqueta: 'Personal & Nómina' },
  { valor: 'TAMANACO_COMERCIAL', etiqueta: 'Tamanaco Comercial' },
];

const ACCIONES: { valor: string; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todas las acciones' },
  { valor: 'CREAR', etiqueta: 'Creó' },
  { valor: 'EDITAR', etiqueta: 'Editó' },
  { valor: 'ELIMINAR', etiqueta: 'Eliminó' },
];

function colorAccion(accion: string) {
  if (accion === 'CREAR') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  if (accion === 'ELIMINAR') return 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30';
  return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
}

export default function Auditoria() {
  const navigate = useNavigate();
  const [modulo, setModulo] = useState('');
  const [accion, setAccion] = useState('');
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<PaginaAuditoria | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = () => {
    setCargando(true);
    setError(null);
    listarAuditoria({ modulo: modulo || undefined, accion: accion || undefined, pagina })
      .then(setDatos)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la auditoría.'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [modulo, accion, pagina]);

  const registros: RegistroAuditoriaApi[] = datos?.content ?? [];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <AuroraGradientDef />

      <header className="nav-glass border-b border-slate-300/60 dark:border-white/10 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 relative z-30 sticky top-0 backdrop-blur-2xl">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/dashboard')}
            className="apple-glass-btn text-xs font-semibold px-3 py-1.5 rounded-full text-slate-700 dark:text-white/80 hover:text-amber-500 dark:hover:text-amber-300 border border-slate-300/70 dark:border-white/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>←</span>
            <span>Volver al Hub</span>
          </button>
          <div className="h-5 w-[1px] bg-slate-300/80 dark:bg-white/15 mx-1" />
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AuroraLogo size={24} animated />
            </div>
            <div>
              <div className="font-['Outfit'] font-extrabold text-base text-slate-900 dark:text-white leading-none flex items-center gap-2">
                <span>Auditoría</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Solo Dueño/Admin
                </span>
              </div>
              <div className="text-slate-500 dark:text-white/45 text-[10px] tracking-wider uppercase mt-0.5 font-medium">
                Quién creó, editó o eliminó cada registro
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={cargar}
          className="apple-glass-btn text-xs font-semibold px-3 py-1.5 rounded-full text-slate-700 dark:text-white/80 hover:text-amber-500 dark:hover:text-amber-300 border border-slate-300/70 dark:border-white/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <IconRefresh size={14} />
          <span>Actualizar</span>
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={modulo}
            onChange={(e) => { setModulo(e.target.value); setPagina(0); }}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-sm text-slate-800 dark:text-white/80"
          >
            {MODULOS.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
          </select>
          <select
            value={accion}
            onChange={(e) => { setAccion(e.target.value); setPagina(0); }}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-sm text-slate-800 dark:text-white/80"
          >
            {ACCIONES.map((a) => <option key={a.valor} value={a.valor}>{a.etiqueta}</option>)}
          </select>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-sm font-semibold flex items-center gap-2">
            <IconShield size={18} />
            <span>{error}</span>
          </div>
        )}

        {!error && cargando && (
          <div className="text-center py-16 text-slate-400 text-sm">Cargando bitácora…</div>
        )}

        {!error && !cargando && registros.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            Todavía no hay acciones registradas{modulo || accion ? ' con estos filtros' : ''}.
          </div>
        )}

        {!error && !cargando && registros.length > 0 && (
          <div className="apple-glass rounded-2xl overflow-hidden border border-slate-300/60 dark:border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 dark:text-white/40 border-b border-slate-200/80 dark:border-white/10">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Módulo</th>
                  <th className="px-4 py-3 font-semibold">Acción</th>
                  <th className="px-4 py-3 font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className="border-b border-slate-200/60 dark:border-white/5 last:border-0 hover:bg-slate-50/60 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-slate-500 dark:text-white/50 font-mono text-xs whitespace-nowrap">
                      {new Date(r.fecha).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 dark:text-white/85">{r.usuario}</div>
                      {r.rolUsuario && <div className="text-[10px] text-slate-400 dark:text-white/40 uppercase">{r.rolUsuario}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-white/60 text-xs font-mono">{r.modulo}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${colorAccion(r.accion)}`}>
                        {r.accion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-white/70">{r.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && datos && datos.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              disabled={pagina === 0}
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              ← Anterior
            </button>
            <span className="text-xs text-slate-400">Página {pagina + 1} de {datos.totalPages}</span>
            <button
              disabled={pagina + 1 >= datos.totalPages}
              onClick={() => setPagina((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Siguiente →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
