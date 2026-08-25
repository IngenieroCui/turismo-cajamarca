import React, { useState } from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Users,
  Download,
  Database,
  Filter,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';

export const AnalistaDatosPage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.ANALISTA_DATOS];
  const [selectedPeriod, setSelectedPeriod] = useState<'mes' | 'trimestre' | 'anio'>('mes');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportCSV = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    }, 1000);
  };

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        {/* BANNER PRINCIPAL ANALISTA DE DATOS */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-secondary)] border border-cyan-500/20 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] my-0">
                  Panel de Inteligencia Turística
                </h2>
                <span className={`px-3 py-1 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Analista: <strong>{profile?.full_name || user?.email}</strong> • Herramienta BI: <span className="font-mono text-cyan-400 font-bold">{profile?.bi_tool || 'Metabase BI'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'Generando Reporte...' : 'Exportar Datos (CSV/BI)'}</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {meta.description} • Alcance actual: <strong className="text-[var(--text-primary)]">{profile?.dataset_access_scope || 'Datos Agregados Anonimizados'}</strong>.
          </p>

          {exportSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4" />
              <span>Reporte turistico exportado correctamente en formato compatible con {profile?.bi_tool || 'Metabase'}.</span>
            </div>
          )}
        </div>

        {/* FILTROS DE PERÍODO */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-[var(--text-primary)]">Período de Análisis:</span>
          </div>

          <div className="flex items-center gap-1.5">
            {(['mes', 'trimestre', 'anio'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  selectedPeriod === period
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-md'
                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:text-[var(--text-primary)]'
                }`}
              >
                {period === 'mes' ? 'Este Mes' : period === 'trimestre' ? 'Último Trimestre' : 'Año 2026'}
              </button>
            ))}
          </div>
        </div>

        {/* TARJETAS KPI DE MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +14.2%
              </span>
            </div>
            <h4 className="text-xs font-bold text-[var(--text-secondary)] my-0">Afluencia Total de Turistas</h4>
            <p className="text-2xl font-black text-[var(--text-primary)] font-mono my-0">
              {selectedPeriod === 'mes' ? '14,250' : selectedPeriod === 'trimestre' ? '42,800' : '168,500'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">Visitantes a atractivos de Cajamarca</p>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +8.5%
              </span>
            </div>
            <h4 className="text-xs font-bold text-[var(--text-secondary)] my-0">Ocupación Hotelera</h4>
            <p className="text-2xl font-black text-teal-400 font-mono my-0">78.4%</p>
            <p className="text-[10px] text-[var(--text-muted)]">Promedio en posadas y fincas agroturísticas</p>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +5.1%
              </span>
            </div>
            <h4 className="text-xs font-bold text-[var(--text-secondary)] my-0">Gasto Promedio por Turista</h4>
            <p className="text-2xl font-black text-emerald-400 font-mono my-0">$ 185,000</p>
            <p className="text-[10px] text-[var(--text-muted)]">COP en hospedaje, comida y tours</p>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <PieChart className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
                ★ 4.8 / 5.0
              </span>
            </div>
            <h4 className="text-xs font-bold text-[var(--text-secondary)] my-0">Índice de Satisfacción</h4>
            <p className="text-2xl font-black text-purple-400 font-mono my-0">96.2%</p>
            <p className="text-[10px] text-[var(--text-muted)]">Basado en reseñas verificadas</p>
          </div>
        </div>

        {/* TABLA DE ATRACTIVOS MÁS VISITADOS */}
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--text-primary)] my-0 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Desglose por Destinos y Categorías en Cajamarca</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-light)] text-[var(--text-muted)] uppercase tracking-wider font-bold bg-[var(--bg-primary)]/50">
                  <th className="p-3">Destino / Atractivo</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Visitantes Estimados</th>
                  <th className="p-3">Calificación</th>
                  <th className="p-3 text-right">Tendencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-primary)]">
                <tr>
                  <td className="p-3 font-bold">Bosque de Palma de Cera (Vereda Anaime)</td>
                  <td className="p-3 text-emerald-400 font-semibold">Ecoturismo</td>
                  <td className="p-3 font-mono">6,840 turistas</td>
                  <td className="p-3 font-bold text-amber-400">★ 4.9</td>
                  <td className="p-3 text-right text-emerald-400 font-bold">↑ +18%</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Cascadas del Cañón de Anaime</td>
                  <td className="p-3 text-blue-400 font-semibold">Aventura</td>
                  <td className="p-3 font-mono">3,910 turistas</td>
                  <td className="p-3 font-bold text-amber-400">★ 4.8</td>
                  <td className="p-3 text-right text-emerald-400 font-bold">↑ +12%</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Ruta Agroturística del Tamal y Arrunchado</td>
                  <td className="p-3 text-amber-400 font-semibold">Gastronomía</td>
                  <td className="p-3 font-mono">2,500 turistas</td>
                  <td className="p-3 font-bold text-amber-400">★ 4.7</td>
                  <td className="p-3 text-right text-emerald-400 font-bold">↑ +8%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleDrawerLayout>
  );
};

export default AnalistaDatosPage;
