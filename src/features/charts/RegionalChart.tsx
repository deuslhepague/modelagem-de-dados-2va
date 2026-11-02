import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { RegionalPoint } from '../../lib/duckdb/queries';
import { formatNumber, formatPercent } from '../../lib/format';
import { REGION_COLORS } from '../../theme/echarts-theme';
import { useFilterStore } from '../../lib/store';
import { MapPin, BarChart3, Map, Filter } from 'lucide-react';
import { MapBrazil } from 'react-brazil-map';

interface RegionalChartProps {
  data: RegionalPoint[];
  isLoading?: boolean;
  isDark?: boolean;
}

export const RegionalChart: React.FC<RegionalChartProps> = ({ data, isLoading, isDark = false }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { visaoRegional, setVisaoRegional, estados, setEstados } = useFilterStore();
  const [selectedUf, setSelectedUf] = useState<string>('SP');

  // Mapa de dados por UF para lookup instantâneo
  const dataByUf = useMemo(() => {
    const map: Record<string, RegionalPoint> = {};
    for (const d of data) {
      map[d.estado] = d;
    }
    return map;
  }, [data]);

  const currentUfData = dataByUf[selectedUf];

  // Alternar ou filtrar pela UF selecionada no mapa
  const handleToggleFilterUf = (uf: string) => {
    if (estados.includes(uf)) {
      setEstados(estados.filter(e => e !== uf));
    } else {
      setEstados([...estados, uf]);
    }
  };

  useEffect(() => {
    if (visaoRegional !== 'barras' || !chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }

    const chart = echarts.init(chartRef.current, isDark ? 'dw-dark' : 'dw-light', {
      renderer: 'canvas',
    });
    chartInstance.current = chart;

    if (isLoading || !data || data.length === 0) {
      chart.clear();
      return;
    }

    // VISÃO BARRAS AGRUPADAS POR UF (COR = REGIÃO)
    const ufs = data.map(d => d.estado);
    const seriesData = data.map(d => ({
      value: d.quantidade,
      itemStyle: {
        color: REGION_COLORS[d.regiao] || (isDark ? '#3b82f6' : '#2563eb'),
        borderRadius: [2, 2, 0, 0],
      },
      regiao: d.regiao,
      estado: d.estado,
      qtdInterestadual: d.qtdInterestadual,
      taxaInterestadual: d.taxaInterestadual,
    }));

    const titleColor = isDark ? '#f8fafc' : '#0f172a';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const valColor = isDark ? '#ffffff' : '#0f172a';
    const axisTextColor = isDark ? '#f8fafc' : '#1e293b';
    const splitLineColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9';

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const item = data[p.dataIndex];
          return `
            <div style="font-family: inherit;">
              <div style="font-weight: 600; font-size: 13px; color: ${titleColor}; margin-bottom: 4px;">
                UF: ${item.estado} (${item.regiao})
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 3px;">
                <span style="color: ${labelColor};">Transferências:</span>
                <span style="font-weight: 600; font-family: monospace; color: ${valColor};">${formatNumber(item.quantidade)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px;">
                <span style="color: ${labelColor};">Taxa Interestadual:</span>
                <span style="font-weight: 600; font-family: monospace; color: #10b981;">${formatPercent(item.taxaInterestadual)}</span>
              </div>
            </div>
          `;
        },
      },
      grid: {
        top: 25,
        right: 15,
        bottom: 30,
        left: 45,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: ufs,
        axisTick: { alignWithLabel: true },
        axisLabel: {
          fontSize: 10,
          fontFamily: 'monospace',
          interval: 0,
          color: axisTextColor,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => {
            if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
            if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
            return String(v);
          },
          fontSize: 10,
          fontFamily: 'monospace',
          color: labelColor,
        },
        splitLine: { lineStyle: { type: 'dashed', color: splitLineColor } },
      },
      series: [
        {
          name: 'Eleitores',
          type: 'bar',
          data: seriesData,
          barMaxWidth: 24,
        },
      ],
    };

    chart.setOption(option, true);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, isLoading, visaoRegional, isDark]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" />
            Desempenho Regional por Estado e Região
          </CardTitle>
          <CardDescription>
            Distribuição geográfica das transferências de destino no Brasil
          </CardDescription>
        </div>

        {/* Alternância OLAP: Barras vs Mapa do Brasil */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md text-xs border border-border/50">
          <button
            id="btn-regional-barras"
            type="button"
            onClick={() => setVisaoRegional('barras')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
              visaoRegional === 'barras'
                ? 'bg-card text-foreground font-semibold shadow-subtle'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Barras
          </button>
          <button
            id="btn-regional-mapa"
            type="button"
            onClick={() => setVisaoRegional('mapa')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
              visaoRegional === 'mapa'
                ? 'bg-card text-foreground font-semibold shadow-subtle'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            Mapa Brasil
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-[310px] p-3 pt-0 relative">
        {/* Visão 1: Mapa do Brasil (react-brazil-map) com painel interativo */}
        <div
          id="regional-map-view"
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 h-full pt-1 ${
            visaoRegional === 'mapa' ? 'flex' : 'hidden'
          }`}
        >
          {/* Mapa Vetorial SVG nítido do Brasil (react-brazil-map) */}
          <div className="flex-1 flex items-center justify-center p-2 overflow-hidden max-h-[300px]">
            <MapBrazil
              onChange={(district) => {
                if (district) setSelectedUf(district.toUpperCase());
              }}
              fill={isDark ? '#3b82f6' : '#2563eb'}
              bg={isDark ? '#1e293b' : '#cbd5e1'}
              colorStroke={isDark ? '#0f172a' : '#ffffff'}
              width={340}
              height={260}
            />
          </div>

          {/* Painel de Detalhes da UF selecionada */}
          <div className="w-full sm:w-60 bg-muted/40 p-3.5 rounded-lg border border-border space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Estado Selecionado</span>
              <span className="font-mono text-base font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                {selectedUf}
              </span>
            </div>

            {currentUfData ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between border-b border-border/60 pb-1">
                  <span className="text-muted-foreground">Região:</span>
                  <span className="font-semibold text-foreground">{currentUfData.regiao}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-1">
                  <span className="text-muted-foreground">Transferências:</span>
                  <span className="font-mono font-bold text-foreground">{formatNumber(currentUfData.quantidade)}</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-1">
                  <span className="text-muted-foreground">Interestaduais:</span>
                  <span className="font-mono text-foreground">{formatNumber(currentUfData.qtdInterestadual)}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-muted-foreground">Taxa Interestadual:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatPercent(currentUfData.taxaInterestadual)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleFilterUf(selectedUf)}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded bg-card hover:bg-accent border border-border text-foreground transition-colors"
                >
                  <Filter className="w-3 h-3 text-primary" />
                  <span>{estados.includes(selectedUf) ? 'Remover filtro de ' : 'Filtrar por '}{selectedUf}</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-2 text-center">
                Clique em um estado no mapa para ver estatísticas detalhadas.
              </div>
            )}
          </div>
        </div>

        {/* Visão 2: Barras Agrupadas por UF (ECharts) */}
        <div
          ref={chartRef}
          id="regional-chart-bars"
          className={`w-full h-full min-h-[300px] ${visaoRegional === 'barras' ? 'block' : 'hidden'}`}
        />
      </CardContent>
    </Card>
  );
};
