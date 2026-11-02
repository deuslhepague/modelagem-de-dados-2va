import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Download, FileSpreadsheet, RefreshCw, Sun, Moon, Database } from 'lucide-react';
import { exportToCSV, exportToExcel } from '../features/export/ExportManager';
import { useFilterStore } from '../lib/store';
import { resetDatabase } from '../lib/duckdb/database';

interface HeaderProps {
  dataAtualizacao?: string;
  onRefreshStart?: () => void;
  onRefreshEnd?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenStarSchema: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dataAtualizacao = '01/11/2026',
  onRefreshStart,
  onRefreshEnd,
  isDark,
  onToggleTheme,
  onOpenStarSchema,
}) => {
  const filterState = useFilterStore();
  const [exporting, setExporting] = useState(false);
  const [reloading, setReloading] = useState(false);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await exportToCSV(filterState);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar CSV.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await exportToExcel(filterState);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar Excel.');
    } finally {
      setExporting(false);
    }
  };

  const handleReloadData = async () => {
    try {
      setReloading(true);
      if (onRefreshStart) onRefreshStart();
      await resetDatabase();
      filterState.resetFilters();
    } catch (err) {
      console.error(err);
      alert('Erro ao recarregar base de dados.');
    } finally {
      setReloading(false);
      if (onRefreshEnd) onRefreshEnd();
    }
  };

  return (
    <header className="border-b border-border bg-card shadow-subtle sticky top-0 z-30 transition-colors">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Lado Esquerdo: Identidade e Metadados (Sem 'Painel Analítico') */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-subtle shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base sm:text-lg text-foreground tracking-tight leading-snug">
              Data Warehouse Eleitoral (TSE) · Perfil e Transferências
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span>Fonte de dados: <strong>Data Warehouse Dimensional (Star Schema)</strong></span>
              <span>·</span>
              <span>2022 a 2026</span>
              <span>·</span>
              <span>atualizado em {dataAtualizacao}</span>
              <span>·</span>
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.2 rounded border border-border">DuckDB-WASM</span>
            </p>
          </div>
        </div>

        {/* Lado Direito: Ações de Exportação, Star Schema, Recarga e Tema */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenStarSchema}
            className="text-xs font-medium border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
            title="Visualizar modelo dimensional Star Schema e dicionário de dados"
          >
            <Database className="w-3.5 h-3.5 mr-1.5" />
            Modelo Star Schema (ERD)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={exporting || filterState.isLoading}
            className="text-xs font-medium"
            title="Exportar dados filtrados para CSV (UTF-8 com BOM)"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            Exportar CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exporting || filterState.isLoading}
            className="text-xs font-medium"
            title="Exportar dados filtrados para Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
            Exportar Excel (.xlsx)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleReloadData}
            disabled={reloading}
            className="text-xs font-medium"
            title="Limpar cache do DuckDB e reler os arquivos de dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${reloading ? 'animate-spin' : ''}`} />
            Recarregar dados
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTheme}
            className="w-8 h-8 p-0"
            title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </Button>
        </div>
      </div>
    </header>
  );
};
