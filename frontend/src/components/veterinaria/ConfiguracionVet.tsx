import React from 'react';
import { IconSettings } from '../../Icons';

export default function ConfiguracionVet({ tenantId }: { tenantId: number }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Configuración Veterinaria</h2>
        <p className="text-slate-400 text-sm">Ajustes generales del módulo clínico y multi-tenant</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <IconSettings size={20} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Parámetros de la Clínica</h3>
            <p className="text-xs text-slate-400">Tenant ID Activo: <span className="text-emerald-400 font-mono font-semibold">{tenantId}</span></p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-300">
          <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
            <div>
              <p className="font-medium text-white">Aislamiento Multi-Tenant</p>
              <p className="text-xs text-slate-400">Filtro Hibernate estricto por tenant_id</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">Activo</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
            <div>
              <p className="font-medium text-white">Motor Financiero Integrado</p>
              <p className="text-xs text-slate-400">Enlace contable mediante CobroVeterinariaService</p>
            </div>
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">Conectado</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-white">Escala de Condición Corporal</p>
              <p className="text-xs text-slate-400">Sistema BCS veterinario de 1 a 9 puntos</p>
            </div>
            <span className="px-2.5 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">BCS 1-9</span>
          </div>
        </div>
      </div>
    </div>
  );
}
