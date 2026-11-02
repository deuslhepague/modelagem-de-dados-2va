import { create } from 'zustand';

export interface FilterState {
  // 1. Período
  startDate: string;
  endDate: string;
  // 2. Anos
  anos: number[];
  // 3. Categoria principal (Faixa Etária)
  categorias: string[];
  // 4. Região do país
  regioes: string[];
  // 5. Estados (UF) em cascata
  estados: string[];
  // 6. Canal de venda / 2ª Categórica (Gênero)
  canais: string[];
  // 7. Segmento de clientes / 3ª Categórica (Grau de Instrução)
  segmentos: string[];
  // 8. Sliders numéricos
  faixaQtd: [number, number];
  faixaTaxa: [number, number];
  faixaLotes: [number, number];

  drillTemporal: 'ano' | 'trimestre' | 'mes';
  visaoRegional: 'barras' | 'mapa';
  anoFocoDrill: number | null;

  // Opções disponíveis dinâmicas carregadas do banco
  opcoesDisponiveis: {
    anos: number[];
    categorias: string[];
    regioes: string[];
    estadosPorRegiao: Record<string, string[]>;
    todosEstados: string[];
    canais: string[];
    segmentos: string[];
    limites: {
      minData: string;
      maxData: string;
      minQtd: number;
      maxQtd: number;
      minTaxa: number;
      maxTaxa: number;
      minLotes: number;
      maxLotes: number;
    };
  };

  // Status
  isReady: boolean;
  isLoading: boolean;
  error: string | null;

  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setAnos: (anos: number[]) => void;
  setCategorias: (cats: string[]) => void;
  setRegioes: (regs: string[]) => void;
  setEstados: (ufs: string[]) => void;
  setCanais: (canais: string[]) => void;
  setSegmentos: (segs: string[]) => void;
  setFaixaQtd: (range: [number, number]) => void;
  setFaixaTaxa: (range: [number, number]) => void;
  setFaixaLotes: (range: [number, number]) => void;
  setDrillTemporal: (drill: 'ano' | 'trimestre' | 'mes', anoFoco?: number | null) => void;
  setVisaoRegional: (visao: 'barras' | 'mapa') => void;
  resetFilters: () => void;
  initializeOptions: (opcoes: FilterState['opcoesDisponiveis']) => void;
  syncWithURL: () => void;
}

// Ler estado inicial dos SearchParams da URL se existirem
function parseURLFilters() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const out: Record<string, any> = {};

  if (params.has('inicio')) out.startDate = params.get('inicio')!;
  if (params.has('fim')) out.endDate = params.get('fim')!;
  if (params.has('anos')) out.anos = params.get('anos')!.split(',').map(Number).filter(Boolean);
  if (params.has('categorias')) out.categorias = params.get('categorias')!.split(',').filter(Boolean);
  if (params.has('regioes')) out.regioes = params.get('regioes')!.split(',').filter(Boolean);
  if (params.has('estados')) out.estados = params.get('estados')!.split(',').filter(Boolean);
  if (params.has('canais')) out.canais = params.get('canais')!.split(',').filter(Boolean);
  if (params.has('segmentos')) out.segmentos = params.get('segmentos')!.split(',').filter(Boolean);
  if (params.has('visao')) out.visaoRegional = params.get('visao') as any;

  return out;
}

// Atualizar URL com os filtros atuais
function updateURLParams(state: Partial<FilterState>) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();

  if (state.startDate) params.set('inicio', state.startDate);
  if (state.endDate) params.set('fim', state.endDate);
  if (state.anos && state.anos.length > 0) params.set('anos', state.anos.join(','));
  if (state.categorias && state.categorias.length > 0) params.set('categorias', state.categorias.join(','));
  if (state.regioes && state.regioes.length > 0) params.set('regioes', state.regioes.join(','));
  if (state.estados && state.estados.length > 0) params.set('estados', state.estados.join(','));
  if (state.canais && state.canais.length > 0) params.set('canais', state.canais.join(','));
  if (state.segmentos && state.segmentos.length > 0) params.set('segmentos', state.segmentos.join(','));
  if (state.visaoRegional && state.visaoRegional !== 'barras') params.set('visao', state.visaoRegional);

  const queryString = params.toString();
  const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
  window.history.replaceState({}, '', newUrl);
}

const defaultOptions: FilterState['opcoesDisponiveis'] = {
  anos: [2022, 2023, 2024, 2025, 2026],
  categorias: [],
  regioes: ['Sudeste', 'Nordeste', 'Sul', 'Centro-Oeste', 'Norte', 'Exterior'],
  estadosPorRegiao: {},
  todosEstados: [],
  canais: [],
  segmentos: [],
  limites: {
    minData: '2022-01-01',
    maxData: '2026-07-01',
    minQtd: 1,
    maxQtd: 10473,
    minTaxa: 0,
    maxTaxa: 100,
    minLotes: 1,
    maxLotes: 6103,
  },
};

export const useFilterStore = create<FilterState>((set, get) => {
  const urlInitial = parseURLFilters();

  return {
    startDate: urlInitial.startDate || defaultOptions.limites.minData,
    endDate: urlInitial.endDate || defaultOptions.limites.maxData,
    anos: urlInitial.anos || defaultOptions.anos,
    categorias: urlInitial.categorias || [],
    regioes: urlInitial.regioes || defaultOptions.regioes,
    estados: urlInitial.estados || [],
    canais: urlInitial.canais || [],
    segmentos: urlInitial.segmentos || [],
    faixaQtd: [defaultOptions.limites.minQtd, defaultOptions.limites.maxQtd],
    faixaTaxa: [defaultOptions.limites.minTaxa, defaultOptions.limites.maxTaxa],
    faixaLotes: [defaultOptions.limites.minLotes, defaultOptions.limites.maxLotes],

    drillTemporal: 'mes',
    visaoRegional: urlInitial.visaoRegional || 'barras',
    anoFocoDrill: null,

    opcoesDisponiveis: defaultOptions,
    isReady: false,
    isLoading: true,
    error: null,

    setStartDate: (startDate) => {
      set({ startDate });
      get().syncWithURL();
    },

    setEndDate: (endDate) => {
      set({ endDate });
      get().syncWithURL();
    },

    setAnos: (anos) => {
      set({ anos });
      get().syncWithURL();
    },

    setCategorias: (categorias) => {
      set({ categorias });
      get().syncWithURL();
    },

    setRegioes: (regioes) => {
      // Requisito: Estados em cascata dependem das regiões selecionadas
      // Se nenhuma região selecionada, estados ficam vazios
      // Se novas regiões adicionadas, novos estados dessas regiões entram marcados por padrão
      const { opcoesDisponiveis } = get();
      if (!regioes || regioes.length === 0) {
        set({ regioes: [], estados: [] });
      } else {
        const ufsDisponiveis: string[] = [];
        for (const r of regioes) {
          const ufs = opcoesDisponiveis.estadosPorRegiao[r] || [];
          ufsDisponiveis.push(...ufs);
        }
        // Inicialmente todos os estados das regiões ativas começam marcados
        set({ regioes, estados: Array.from(new Set(ufsDisponiveis)) });
      }
      get().syncWithURL();
    },

    setEstados: (estados) => {
      set({ estados });
      get().syncWithURL();
    },

    setCanais: (canais) => {
      set({ canais });
      get().syncWithURL();
    },

    setSegmentos: (segmentos) => {
      set({ segmentos });
      get().syncWithURL();
    },

    setFaixaQtd: (faixaQtd) => set({ faixaQtd }),
    setFaixaTaxa: (faixaTaxa) => set({ faixaTaxa }),
    setFaixaLotes: (faixaLotes) => set({ faixaLotes }),

    setDrillTemporal: (drillTemporal, anoFoco = null) => {
      set({ drillTemporal, anoFocoDrill: anoFoco });
    },

    setVisaoRegional: (visaoRegional) => {
      set({ visaoRegional });
      get().syncWithURL();
    },

    resetFilters: () => {
      const { opcoesDisponiveis } = get();
      const defaultState = {
        startDate: opcoesDisponiveis.limites.minData,
        endDate: opcoesDisponiveis.limites.maxData,
        anos: [...opcoesDisponiveis.anos],
        categorias: [...opcoesDisponiveis.categorias],
        regioes: [...opcoesDisponiveis.regioes],
        estados: [...opcoesDisponiveis.todosEstados],
        canais: [...opcoesDisponiveis.canais],
        segmentos: [...opcoesDisponiveis.segmentos],
        faixaQtd: [opcoesDisponiveis.limites.minQtd, opcoesDisponiveis.limites.maxQtd] as [number, number],
        faixaTaxa: [opcoesDisponiveis.limites.minTaxa, opcoesDisponiveis.limites.maxTaxa] as [number, number],
        faixaLotes: [opcoesDisponiveis.limites.minLotes, opcoesDisponiveis.limites.maxLotes] as [number, number],
        drillTemporal: 'mes' as const,
        anoFocoDrill: null,
      };
      set(defaultState);
      updateURLParams(defaultState);
    },

    initializeOptions: (opcoes) => {
      const current = get();
      const url = parseURLFilters();

      const categorias = (url.categorias && url.categorias.length > 0)
        ? url.categorias
        : (current.categorias.length > 0 ? current.categorias : [...opcoes.categorias]);

      const regioes = (url.regioes && url.regioes.length > 0)
        ? url.regioes
        : (current.regioes.length > 0 ? current.regioes : [...opcoes.regioes]);

      const estados = (url.estados && url.estados.length > 0)
        ? url.estados
        : (current.estados.length > 0 ? current.estados : [...opcoes.todosEstados]);

      const canais = (url.canais && url.canais.length > 0)
        ? url.canais
        : (current.canais.length > 0 ? current.canais : [...opcoes.canais]);

      const segmentos = (url.segmentos && url.segmentos.length > 0)
        ? url.segmentos
        : (current.segmentos.length > 0 ? current.segmentos : [...opcoes.segmentos]);

      const startDate = url.startDate || opcoes.limites.minData;
      const endDate = url.endDate || opcoes.limites.maxData;

      set({
        opcoesDisponiveis: opcoes,
        startDate,
        endDate,
        categorias,
        regioes,
        estados,
        canais,
        segmentos,
        faixaQtd: [opcoes.limites.minQtd, opcoes.limites.maxQtd],
        faixaTaxa: [opcoes.limites.minTaxa, opcoes.limites.maxTaxa],
        faixaLotes: [opcoes.limites.minLotes, opcoes.limites.maxLotes],
        isReady: true,
        isLoading: false,
      });
    },

    syncWithURL: () => {
      const state = get();
      updateURLParams(state);
    },
  };
});
