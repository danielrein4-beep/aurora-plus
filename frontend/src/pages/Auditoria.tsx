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
  if (accion === 'CREAR') return 'bg-[#177E89]/10 text-[#177E89] border-[#177E89]/20';
  if (accion === 'ELIMINAR') return 'bg-[#FEF2F2] text-[#D92D20] border-[#FECACA]';
  return 'bg-[#F5F5F7] text-[#6E6E73] border-[#E5E5EA]';
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
    <div className="min-h-screen bg-white text-[#1D1D1F]">
      <AuroraGradientDef />

      <header className="bg-white border-b border-[#E5E5EA] px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 relative z-30 sticky top-0">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border border-[#E5E5EA] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>←</span>
            <span>Volver al Hub</span>
          </button>
          <div className="h-5 w-[1px] bg-[#E5E5EA] mx-1" />
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]">
              <AuroraLogo size={24} animated />
            </div>
            <div>
              <div className="font-bold text-base text-[#1D1D1F] leading-none flex items-center gap-2">
                <span>Auditoría</span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#6E6E73] border border-[#E5E5EA] font-semibold">
                  Solo Dueño/Admin
                </span>
              </div>
              <div className="text-[#86868B] text-[10px] tracking-wider uppercase mt-0.5 font-medium">
                Quién creó, editó o eliminó cada registro
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={cargar}
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border border-[#E5E5EA] transition-colors flex items-center gap-1.5 cursor-pointer"
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
            className="px-3 py-2 rounded-xl border border-[#E5E5EA] bg-white text-sm text-[#1D1D1F]"
          >
            {MODULOS.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
          </select>
          <select
            value={accion}
            onChange={(e) => { setAccion(e.target.value); setPagina(0); }}
            className="px-3 py-2 rounded-xl border border-[#E5E5EA] bg-white text-sm text-[#1D1D1F]"
          >
            {ACCIONES.map((a) => <option key={a.valor} value={a.valor}>{a.etiqueta}</option>)}
          </select>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#D92D20] text-sm font-semibold flex items-center gap-2">
            <IconShield size={18} />
            <span>{error}</span>
          </div>
        )}

        {!error && cargando && (
          <div className="text-center py-16 text-[#86868B] text-sm">Cargando bitácora…</div>
        )}

        {!error && !cargando && registros.length === 0 && (
          <div className="text-center py-16 text-[#86868B] text-sm">
            Todavía no hay acciones registradas{modulo || accion ? ' con estos filtros' : ''}.
          </div>
        )}

        {!error && !cargando && registros.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E5EA] shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[#86868B] border-b border-[#E5E5EA]">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Módulo</th>
                  <th className="px-4 py-3 font-semibold">Acción</th>
                  <th className="px-4 py-3 font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className="border-b border-[#E5E5EA] last:border-0 hover:bg-[#F5F5F7] transition-colors">
                    <td className="px-4 py-3 text-[#86868B] text-xs whitespace-nowrap">
                      {new Date(r.fecha).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#1D1D1F]">{r.usuario}</div>
                      {r.rolUsuario && <div className="text-[10px] text-[#86868B] uppercase">{r.rolUsuario}</div>}
                    </td>
                    <td className="px-4 py-3 text-[#6E6E73] text-xs">{r.modulo}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${colorAccion(r.accion)}`}>
                        {r.accion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#1D1D1F]">{r.descripcion}</td>
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
              className="px-3 py-1.5 rounded-full border border-[#E5E5EA] text-xs font-semibold disabled:opacity-40 cursor-pointer hover:bg-[#F5F5F7] transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-xs text-[#86868B]">Página {pagina + 1} de {datos.totalPages}</span>
            <button
              disabled={pagina + 1 >= datos.totalPages}
              onClick={() => setPagina((p) => p + 1)}
              className="px-3 py-1.5 rounded-full border border-[#E5E5EA] text-xs font-semibold disabled:opacity-40 cursor-pointer hover:bg-[#F5F5F7] transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
