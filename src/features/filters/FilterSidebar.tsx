import React, { useMemo, useState } from 'react';
import { useFilterStore } from '../../lib/store';
import { Button } from '../../components/ui/button';
import { RotateCcw, Filter, MapPin, Calendar, Users, Sliders, GraduationCap, Search } from 'lucide-react';
import { formatNumber, formatPercent, formatGrau } from '../../lib/format';

interface FilterSidebarProps {
  className?: string;
  onCloseMobile?: () => void;
}


export const FilterSidebar: React.FC<FilterSidebarProps> = ({ className, onCloseMobile }) => {
  const {
    startDate,
    endDate,
    anos,
    categorias,
    regioes,
    estados,
    canais,
    segmentos,
    faixaQtd,
    faixaTaxa,
    faixaLotes,
    opcoesDisponiveis,
    setStartDate,
    setEndDate,
    setAnos,
    setCategorias,
    setRegioes,
    setEstados,
    setCanais,
    setSegmentos,
    setFaixaQtd,
    setFaixaTaxa,
    setFaixaLotes,
    resetFilters,
  } = useFilterStore();

  const [searchTerm, setSearchTerm] = useState('');

  // Estados disponíveis filtrados pelas regiões ativas
  const estadosFiltrados = useMemo(() => {
    if (!regioes || regioes.length === 0) return [];
    const lista: string[] = [];
    for (const r of regioes) {
      if (opcoesDisponiveis.estadosPorRegiao[r]) {
        lista.push(...opcoesDisponiveis.estadosPorRegiao[r]);
      }
    }
    return Array.from(new Set(lista)).sort();
  }, [regioes, opcoesDisponiveis.estadosPorRegiao]);

  // Filtragem pela caixa de busca rápida
  const categoriasVisiveis = useMemo(() => {
    if (!searchTerm.trim()) return opcoesDisponiveis.categorias;
    const term = searchTerm.toLowerCase();
    return opcoesDisponiveis.categorias.filter(c => c.toLowerCase().includes(term));
  }, [opcoesDisponiveis.categorias, searchTerm]);

  // Handlers para UFs em cascata
  const toggleEstado = (uf: string) => {
    if (estados.includes(uf)) {
      setEstados(estados.filter(e => e !== uf));
    } else {
      setEstados([...estados, uf]);
    }
  };

  const marcarTodosEstados = () => {
    setEstados([...estadosFiltrados]);
  };

  const desmarcarTodosEstados = () => {
    setEstados([]);
  };

  // Handlers para Anos
  const toggleAno = (ano: number) => {
    if (anos.includes(ano)) {
      setAnos(anos.filter(a => a !== ano));
    } else {
      setAnos([...anos, ano].sort());
    }
  };

  const selecionarTodosAnos = () => {
    setAnos([...opcoesDisponiveis.anos]);
  };

  // Handlers para Regiões
  const toggleRegiao = (reg: string) => {
    if (regioes.includes(reg)) {
      setRegioes(regioes.filter(r => r !== reg));
    } else {
      setRegioes([...regioes, reg]);
    }
  };

  const selecionarTodasRegioes = () => {
    setRegioes([...opcoesDisponiveis.regioes]);
  };

  // Handlers para Canais (Gênero)
  const toggleCanal = (can: string) => {
    if (canais.includes(can)) {
      setCanais(canais.filter(c => c !== can));
    } else {
      setCanais([...canais, can]);
    }
  };

  const selecionarTodosCanais = () => {
    setCanais([...opcoesDisponiveis.canais]);
  };

  // Handlers para Categorias
  const toggleCategoria = (cat: string) => {
    if (categorias.includes(cat)) {
      setCategorias(categorias.filter(c => c !== cat));
    } else {
      setCategorias([...categorias, cat]);
    }
  };

  const selecionarTodasCategorias = () => {
    setCategorias([...opcoesDisponiveis.categorias]);
  };

  // Handlers para Segmentos (Grau de instrução)
  const toggleSegmento = (seg: string) => {
    if (segmentos.includes(seg)) {
      setSegmentos(segmentos.filter(s => s !== seg));
    } else {
      setSegmentos([...segmentos, seg]);
    }
  };

  const selecionarTodosSegmentos = () => {
    setSegmentos([...opcoesDisponiveis.segmentos]);
  };

  const selecionarTodoPeriodo = () => {
    setStartDate(opcoesDisponiveis.limites.minData);
    setEndDate(opcoesDisponiveis.limites.maxData);
  };

  return (
    <aside className={className}>
      <div className="bg-card border border-border rounded-lg p-4 shadow-subtle space-y-4">
        {/* Cabeçalho do Painel de Filtros */}
        <div className="flex items-center justify-between pb-2 border-b border-border/80">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Filtros</h2>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Redefinir todos os filtros para o padrão"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Campo de Busca Rápida */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar estado, faixa etária..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-md bg-background border border-input focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* 1. Período entre Datas */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              Período
            </label>
            <button
              type="button"
              onClick={selecionarTodoPeriodo}
              className="text-[11px] text-blue-500 hover:underline font-medium"
            >
              Todo Período
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground block mb-0.5">Data Inicial:</span>
              <input
                type="date"
                value={startDate}
                min={opcoesDisponiveis.limites.minData}
                max={endDate || opcoesDisponiveis.limites.maxData}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs font-mono bg-background border border-input rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block mb-0.5">Data Final:</span>
              <input
                type="date"
                value={endDate}
                min={startDate || opcoesDisponiveis.limites.minData}
                max={opcoesDisponiveis.limites.maxData}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs font-mono bg-background border border-input rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>
          </div>
        </div>

        {/* 2. Filtro por Ano */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Ano</label>
            <button
              type="button"
              onClick={selecionarTodosAnos}
              className="text-[11px] text-blue-500 hover:underline font-medium"
            >
              Todos
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {opcoesDisponiveis.anos.map((ano) => {
              const active = anos.includes(ano);
              return (
                <button
                  key={ano}
                  type="button"
                  onClick={() => toggleAno(ano)}
                  className={`text-xs px-2.5 py-1 rounded font-mono transition-colors ${
                    active
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted border border-border/40'
                  }`}
                >
                  {ano}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Categoria Principal: Faixa Etária */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Faixa Etária</label>
            <button
              type="button"
              onClick={selecionarTodasCategorias}
              className="text-[11px] text-blue-500 hover:underline font-medium"
            >
              Todas
            </button>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-border/60 rounded p-1.5 bg-background/50">
            {categoriasVisiveis.map((cat) => {
              const checked = categorias.includes(cat);
              return (
                <label key={cat} className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none hover:bg-accent/40 px-1 py-0.5 rounded">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategoria(cat)}
                    className="rounded border-input text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span className="truncate">{cat}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 4. Região do País */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              Região
            </label>
            <button
              type="button"
              onClick={selecionarTodasRegioes}
              className="text-[11px] text-blue-500 hover:underline font-medium"
            >
              Todas
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {opcoesDisponiveis.regioes.map((reg) => {
              const active = regioes.includes(reg);
              return (
                <button
                  key={reg}
                  type="button"
                  onClick={() => toggleRegiao(reg)}
                  className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors text-center ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 shadow-xs'
                      : 'bg-muted text-muted-foreground hover:bg-accent border border-border/50'
                  }`}
                >
                  {reg}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Estados (UF) em Cascata */}
        {regioes.length > 0 && (
          <div className="space-y-1.5 p-2.5 bg-background border border-border/80 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Estados da Federação (UF):</span>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={marcarTodosEstados}
                  className="text-blue-500 hover:underline font-medium"
                >
                  Marcar Todos
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  onClick={desmarcarTodosEstados}
                  className="text-muted-foreground hover:underline"
                >
                  Limpar
                </button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Inicialmente todos marcados. Desmarque para filtrar estados específicos:
            </p>
            <div className="grid grid-cols-4 gap-1 pt-1 max-h-36 overflow-y-auto pr-1">
              {estadosFiltrados.map((uf) => {
                const checked = estados.includes(uf);
                return (
                  <button
                    key={uf}
                    type="button"
                    onClick={() => toggleEstado(uf)}
                    className={`text-xs font-mono py-1 rounded border transition-colors flex items-center justify-center gap-1 ${
                      checked
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted'
                    }`}
                  >
                    <span>{uf}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Gênero */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              Gênero
            </label>
            <button
              type="button"
              onClick={selecionarTodosCanais}
              className="text-[11px] text-blue-500 hover:underline font-medium"
            >
              Todos
            </button>
          </div>
          <div className="space-y-1 border border-border/60 rounded p-1.5 bg-background/50">
            {opcoesDisponiveis.canais.map((can) => {
              const checked = canais.includes(can);
              return (
                <label key={can} className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none hover:bg-accent/40 px-1 py-0.5 rounded">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCanal(can)}
                    className="rounded border-input text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>{can}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 7. Escolaridade */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
              Escolaridade
            </label>
            <button
              type="button"
              onClick={selecionarTodosSegmentos}
              className="text-[11px] text-blue-500 hover:underline font-medium"
            >
              Todos
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1 border border-border/60 rounded p-1.5 bg-background/50">
            {opcoesDisponiveis.segmentos.map((seg) => {
              const checked = segmentos.includes(seg);
              return (
                <label
                  key={seg}
                  className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none hover:bg-accent/40 px-1.5 py-1 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSegmento(seg)}
                    className="rounded border-input text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span className="truncate">{formatGrau(seg)}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 8. Filtros Quantitativos */}
        <div className="space-y-3 pt-2 border-t border-border/80">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">Filtros Quantitativos</h3>
          </div>

          {/* Slider 1: Eleitores por Registro */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Eleitores por registro:</span>
              <span className="font-mono font-medium text-foreground">
                até {formatNumber(faixaQtd[1])}
              </span>
            </div>
            <input
              type="range"
              min={opcoesDisponiveis.limites.minQtd}
              max={opcoesDisponiveis.limites.maxQtd}
              value={faixaQtd[1]}
              style={{ accentColor: '#2563eb' }}
              onChange={(e) => setFaixaQtd([faixaQtd[0], Number(e.target.value)])}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Slider 2: Taxa Interestadual */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Taxa interestadual:</span>
              <span className="font-mono font-medium text-foreground">
                a partir de {formatPercent(faixaTaxa[0])}
              </span>
            </div>
            <input
              type="range"
              min={opcoesDisponiveis.limites.minTaxa}
              max={opcoesDisponiveis.limites.maxTaxa}
              value={faixaTaxa[0]}
              style={{ accentColor: '#2563eb' }}
              onChange={(e) => setFaixaTaxa([Number(e.target.value), faixaTaxa[1]])}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Slider 3: Lotes por Registro */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Lotes por registro:</span>
              <span className="font-mono font-medium text-foreground">
                até {formatNumber(faixaLotes[1])}
              </span>
            </div>
            <input
              type="range"
              min={opcoesDisponiveis.limites.minLotes}
              max={opcoesDisponiveis.limites.maxLotes}
              value={faixaLotes[1]}
              style={{ accentColor: '#2563eb' }}
              onChange={(e) => setFaixaLotes([faixaLotes[0], Number(e.target.value)])}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>

        {/* 9. Botão de Redefinição Global */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetFilters}
          className="w-full text-xs text-muted-foreground hover:text-foreground mt-2"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Redefinir Filtros
        </Button>

        {onCloseMobile && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onCloseMobile}
            className="w-full lg:hidden"
          >
            Aplicar e Fechar
          </Button>
        )}
      </div>
    </aside>
  );
};
