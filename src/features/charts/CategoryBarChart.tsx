import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { CategoryPoint } from '../../lib/duckdb/queries';
import { formatNumber, formatPercent } from '../../lib/format';
import { Users } from 'lucide-react';

interface CategoryBarChartProps {
  data: CategoryPoint[];
  isLoading?: boolean;
  isDark?: boolean;
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ data, isLoading, isDark = false }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [viewMode, setViewMode] = useState<'top10' | 'todas'>('top10');

  useEffect(() => {
    if (!chartRef.current) return;

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

    // Ordenados para exibição horizontal:
    // No ECharts, o índice 0 fica na base e o índice N-1 no topo.
    // Para que o MAIOR fique no topo, ordenamos crescente (menor -> maior).
    const filtered = viewMode === 'top10'
      ? [...data].sort((a, b) => b.quantidade - a.quantidade).slice(0, 10).reverse()
      : [...data].sort((a, b) => a.quantidade - b.quantidade);

    const categorias = filtered.map(d => d.categoria);
    const quantidades = filtered.map(d => d.quantidade);

    const titleColor = isDark ? '#f8fafc' : '#0f172a';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const valColor = isDark ? '#ffffff' : '#0f172a';
    const axisTextColor = isDark ? '#f8fafc' : '#1e293b';
    const numTextColor = isDark ? '#e2e8f0' : '#334155';
    const splitLineColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9';
    const tickColor = isDark ? '#475569' : '#cbd5e1';

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const p = params[0];
          const item = filtered[p.dataIndex];
          if (!item) return '';
          return `
            <div style="font-family: inherit;">
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 13px; color: ${titleColor};">Faixa: ${item.categoria}</div>
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
        top: 15,
        right: 48,
        bottom: 20,
        left: 10,
        containLabel: true,
      },
      xAxis: {
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
      yAxis: {
        type: 'category',
        data: categorias,
        axisTick: {
          show: true,
          alignWithLabel: true,
          lineStyle: { color: tickColor },
        },
        axisLabel: {
          fontSize: 11,
          color: axisTextColor,
          interval: 0, // Nunca pular rótulos
          fontWeight: 600,
        },
      },
      series: [
        {
          name: 'Eleitores',
          type: 'bar',
          data: quantidades,
          itemStyle: {
            color: isDark ? '#3b82f6' : '#2563eb',
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => {
              const val = Number(p.value);
              if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
              if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
              return String(val);
            },
            fontSize: 10,
            fontFamily: 'monospace',
            fontWeight: 600,
            color: numTextColor,
          },
          barMaxWidth: 20,
          barCategoryGap: viewMode === 'top10' ? '28%' : '18%',
        },
      ],
    };

    chart.setOption(option, true);
    chart.resize();

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, isLoading, viewMode, isDark]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" />
            Transferências por Faixa Etária
          </CardTitle>
          <CardDescription>
            {viewMode === 'top10'
              ? 'As 10 faixas etárias com maior concentração de eleitores'
              : 'Distribuição completa por todas as faixas etárias'}
          </CardDescription>
        </div>

        {/* Alternância: Top 10 vs Todas */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md text-xs border border-border/50">
          <button
            id="btn-faixa-top10"
            type="button"
            onClick={() => setViewMode('top10')}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              viewMode === 'top10'
                ? 'bg-card text-foreground font-semibold shadow-subtle'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Top 10
          </button>
          <button
            id="btn-faixa-todas"
            type="button"
            onClick={() => setViewMode('todas')}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              viewMode === 'todas'
                ? 'bg-card text-foreground font-semibold shadow-subtle'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todas (22)
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-[310px] p-3 pt-0">
        <div className={viewMode === 'todas' ? 'overflow-y-auto max-h-[330px] pr-1' : 'w-full h-full'}>
          <div
            ref={chartRef}
            style={{
              width: '100%',
              height: viewMode === 'todas' ? `${Math.max(300, (data?.length || 22) * 24)}px` : '290px',
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
