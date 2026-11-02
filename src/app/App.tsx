import { useEffect, useState, useCallback } from 'react';
import { Header } from './Header';
import { FilterSidebar } from '../features/filters/FilterSidebar';
import { KpiRow } from '../features/kpis/KpiRow';
import { TemporalChart } from '../features/charts/TemporalChart';
import { CategoryBarChart } from '../features/charts/CategoryBarChart';
import { RegionalChart } from '../features/charts/RegionalChart';
import { ScatterChart } from '../features/charts/ScatterChart';
import { FactDataTable } from '../features/table/FactDataTable';
import { StarSchemaModal } from '../features/modals/StarSchemaModal';
import { useFilterStore } from '../lib/store';
import { initDuckDB, getManifest } from '../lib/duckdb/database';
import {
  loadInitialMetadata,
  queryKpis,
  queryTemporal,
  queryCategories,
  queryRegional,
  queryScatter,
  KpiData,
  TemporalPoint,
  CategoryPoint,
  RegionalPoint,
  ScatterPoint,
} from '../lib/duckdb/queries';
import { Button } from '../components/ui/button';
import { Filter, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { registerEChartsThemes } from '../theme/echarts-theme';

export function App() {
  const filterState = useFilterStore();
  const [isDark, setIsDark] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [starSchemaModalOpen, setStarSchemaModalOpen] = useState(false);

  // Estados dos dados analíticos
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [temporalData, setTemporalData] = useState<TemporalPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryPoint[]>([]);
  const [regionalData, setRegionalData] = useState<RegionalPoint[]>([]);
  const [scatterData, setScatterData] = useState<ScatterPoint[]>([]);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manifestInfo, setManifestInfo] = useState<{ versao: string; gerado_em: string } | null>(null);

  // Registro de temas do ECharts
  useEffect(() => {
    registerEChartsThemes();
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  // 1. Inicialização do DuckDB-WASM e carga inicial de metadados
  const initialize = useCallback(async () => {
    try {
      setLoadingInitial(true);
      setError(null);
      await initDuckDB();
      const manifest = await getManifest();
      setManifestInfo({ versao: manifest.versao, gerado_em: manifest.gerado_em.substring(0, 10) });

      const metadata = await loadInitialMetadata();
      filterState.initializeOptions(metadata);
    } catch (err: any) {
      console.error('Falha ao inicializar DuckDB:', err);
      setError(err?.message || 'Erro ao carregar o motor de banco de dados no navegador.');
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // 2. Recálculo reativo dos dados analíticos ao alterar filtros
  useEffect(() => {
    if (!filterState.isReady) return;

    let isMounted = true;
    setLoadingQueries(true);

    const timer = setTimeout(async () => {
      try {
        const [kpis, temporal, categories, regional, scatter] = await Promise.all([
          queryKpis(filterState),
          queryTemporal(filterState),
          queryCategories(filterState),
          queryRegional(filterState),
          queryScatter(filterState),
        ]);

        if (!isMounted) return;
        setKpiData(kpis);
        setTemporalData(temporal);
        setCategoryData(categories);
        setRegionalData(regional);
        setScatterData(scatter);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Erro na consulta analítica:', err);
      } finally {
        if (isMounted) setLoadingQueries(false);
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    filterState.startDate,
    filterState.endDate,
    filterState.anos,
    filterState.categorias,
    filterState.regioes,
    filterState.estados,
    filterState.canais,
    filterState.segmentos,
    filterState.faixaQtd,
    filterState.faixaTaxa,
    filterState.faixaLotes,
    filterState.drillTemporal,
    filterState.isReady,
  ]);

  const isEmpty = kpiData && kpiData.totTransf === 0 && !loadingQueries;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors">
      {/* Cabeçalho Limpo e Elegante */}
      <Header
        dataAtualizacao={manifestInfo?.gerado_em ? manifestInfo.gerado_em.split('-').reverse().join('/') : '01/11/2026'}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onRefreshStart={() => setLoadingQueries(true)}
        onRefreshEnd={() => setLoadingQueries(false)}
        onOpenStarSchema={() => setStarSchemaModalOpen(true)}
      />

      {/* Modal do Modelo Star Schema */}
      <StarSchemaModal
        isOpen={starSchemaModalOpen}
        onClose={() => setStarSchemaModalOpen(false)}
      />

      {/* Corpo Principal */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6">
        {/* Estado de Erro Grave */}
        {error ? (
          <div className="p-8 my-8 max-w-xl mx-auto rounded-lg border border-destructive/20 bg-destructive/5 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
            <h2 className="text-base font-semibold text-foreground">Falha ao inicializar motor de dados</h2>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button variant="primary" size="sm" onClick={initialize}>
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        ) : loadingInitial ? (
          /* Estado Skeleton Inicial */
          <div className="space-y-4 animate-pulse py-6">
            <div className="h-20 bg-muted/60 rounded-lg w-full" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="h-96 bg-muted/60 rounded-lg" />
              <div className="md:col-span-3 space-y-4">
                <div className="h-24 bg-muted/60 rounded-lg" />
                <div className="h-72 bg-muted/60 rounded-lg" />
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard Operacional Completo */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Coluna Esquerda: Filtros (Desktop) */}
            <div className="hidden lg:block lg:col-span-3 sticky top-20">
              <FilterSidebar />
            </div>

            {/* Gaveta Mobile de Filtros */}
            {mobileFilterOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex lg:hidden">
                <div className="w-full max-w-xs bg-background h-full overflow-y-auto p-4">
                  <FilterSidebar onCloseMobile={() => setMobileFilterOpen(false)} />
                </div>
                <div className="flex-1" onClick={() => setMobileFilterOpen(false)} />
              </div>
            )}

            {/* Coluna Direita: KPIs, Gráficos e Tabela */}
            <div className="lg:col-span-9 space-y-5">
              {/* Botão flutuante para abrir filtros no Mobile */}
              <div className="lg:hidden flex justify-between items-center bg-card p-3 rounded-lg border border-border">
                <span className="text-xs font-medium text-foreground">Filtros Multidimensionais</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileFilterOpen(true)}
                  className="text-xs gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Abrir Filtros
                </Button>
              </div>

              {/* Linha 1: 5 Cartões KPI */}
              <KpiRow data={kpiData} isLoading={loadingQueries} />

              {/* Mensagem de Estado Vazio */}
              {isEmpty && (
                <div className="p-8 text-center bg-card border border-border rounded-lg text-muted-foreground space-y-2">
                  <Layers className="w-8 h-8 mx-auto text-muted-foreground/60" />
                  <p className="text-sm font-semibold text-foreground">Nenhum dado encontrado para os filtros selecionados</p>
                  <p className="text-xs text-muted-foreground">Tente redefinir os filtros ou marcar mais UFs e faixas etárias.</p>
                  <Button variant="outline" size="sm" onClick={() => filterState.resetFilters()} className="mt-2 text-xs">
                    Redefinir Filtros
                  </Button>
                </div>
              )}

              {/* Linha 2 de Gráficos: Temporal (7 cols) e Categorias (5 cols) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-7">
                  <TemporalChart data={temporalData} isLoading={loadingQueries} isDark={isDark} />
                </div>
                <div className="xl:col-span-5">
                  <CategoryBarChart data={categoryData} isLoading={loadingQueries} isDark={isDark} />
                </div>
              </div>

              {/* Linha 3 de Gráficos: Regional com react-brazil-map SVG (6 cols) e Dispersão (6 cols) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-6">
                  <RegionalChart data={regionalData} isLoading={loadingQueries} isDark={isDark} />
                </div>
                <div className="xl:col-span-6">
                  <ScatterChart data={scatterData} isLoading={loadingQueries} isDark={isDark} />
                </div>
              </div>

              {/* Linha 4: Tabela Fato Detalhada com Paginação */}
              <FactDataTable />
            </div>
          </div>
        )}
      </main>

      {/* Rodapé Acadêmico e Técnico */}
      <footer className="border-t border-border bg-card/60 py-4 px-4 sm:px-6 text-xs text-muted-foreground transition-colors mt-8">
        <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Universidade Federal Rural de Pernambuco (UFRPE) · Disciplina: <strong>Modelagem de Dados (2ª VA)</strong>
          </div>
          <div className="flex items-center gap-2">
            <span>Data Warehouse Dimensional (Star Schema)</span>
            <span>·</span>
            <span>Microdados TSE (2022–2026)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
