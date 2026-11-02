import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { TemporalPoint } from '../../lib/duckdb/queries';
import { formatNumber, formatPercent } from '../../lib/format';
import { useFilterStore } from '../../lib/store';
import { Calendar, ChevronRight } from 'lucide-react';

interface TemporalChartProps {
  data: TemporalPoint[];
  isLoading?: boolean;
  isDark?: boolean;
}

export const TemporalChart: React.FC<TemporalChartProps> = ({ data, isLoading, isDark = false }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { drillTemporal, setDrillTemporal } = useFilterStore();

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

    const periodos = data.map(d => d.periodo);
    const qtdTotal = data.map(d => d.quantidade);
    const qtdInter = data.map(d => d.qtdInterestadual);

    const titleColor = isDark ? '#f8fafc' : '#0f172a';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const valColor = isDark ? '#ffffff' : '#0f172a';
    const axisTextColor = isDark ? '#f8fafc' : '#1e293b';
    const splitLineColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9';

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)' },
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const item = data[idx];
          const total = item.quantidade;
          const inter = item.qtdInterestadual;
          const taxa = total > 0 ? (inter / total) * 100 : 0;

          return `
            <div style="font-family: inherit;">
              <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px; color: ${titleColor};">
                ${item.periodo} ${item.tipoEleicao ? `(${item.tipoEleicao})` : ''}
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 3px;">
                <span style="color: ${labelColor};">Total de Eleitores:</span>
                <span style="font-weight: 600; font-family: monospace; color: ${valColor};">${formatNumber(total)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 3px;">
                <span style="color: ${labelColor};">Migração Interestadual:</span>
                <span style="font-weight: 600; font-family: monospace; color: #10b981;">${formatNumber(inter)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; border-top: 1px dashed ${isDark ? '#334155' : '#e2e8f0'}; padding-top: 4px; margin-top: 4px;">
                <span style="color: ${labelColor};">Taxa Interestadual:</span>
                <span style="font-weight: 600; font-family: monospace; color: ${valColor};">${formatPercent(taxa)}</span>
              </div>
            </div>
          `;
        },
      },
      legend: {
        data: ['Total de Eleitores', 'Migração Interestadual'],
        right: 10,
        top: 0,
        textStyle: { fontSize: 11, color: isDark ? '#e2e8f0' : '#475569' },
      },
      grid: {
        top: 35,
        right: 15,
        bottom: 30,
        left: 50,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: periodos,
        axisTick: { alignWithLabel: true },
        axisLabel: {
          rotate: periodos.length > 24 ? 45 : 0,
          fontSize: 11,
          fontFamily: 'monospace',
          color: axisTextColor,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Eleitores',
          nameTextStyle: { color: labelColor },
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
      ],
      series: [
        {
          name: 'Total de Eleitores',
          type: 'bar',
          data: qtdTotal,
          itemStyle: {
            color: isDark ? '#3b82f6' : '#2563eb',
            borderRadius: [3, 3, 0, 0],
          },
          barMaxWidth: 32,
        },
        {
          name: 'Migração Interestadual',
          type: 'line',
          data: qtdInter,
          smooth: true,
          showSymbol: data.length <= 36,
          symbolSize: 6,
          lineStyle: {
            color: isDark ? '#34d399' : '#059669',
            width: 2.5,
          },
          itemStyle: {
            color: isDark ? '#34d399' : '#059669',
          },
        },
      ],
    };

    chart.setOption(option, true);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, isLoading, isDark]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-primary" />
            Evolução Temporal: Fluxo Geral e Migração Interestadual
          </CardTitle>
          <CardDescription>
            Como o volume de transferências se comportou ao longo dos ciclos eleitorais
          </CardDescription>
        </div>

        {/* Drill-down Breadcrumb OLAP */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-md text-xs border border-border/50">
          <button
            type="button"
            onClick={() => setDrillTemporal('ano')}
            className={`px-2 py-0.5 rounded transition-colors ${
              drillTemporal === 'ano' ? 'bg-card text-foreground font-semibold shadow-subtle' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ano
          </button>
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
          <button
            type="button"
            onClick={() => setDrillTemporal('trimestre')}
            className={`px-2 py-0.5 rounded transition-colors ${
              drillTemporal === 'trimestre' ? 'bg-card text-foreground font-semibold shadow-subtle' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Trimestre
          </button>
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
          <button
            type="button"
            onClick={() => setDrillTemporal('mes')}
            className={`px-2 py-0.5 rounded transition-colors ${
              drillTemporal === 'mes' ? 'bg-card text-foreground font-semibold shadow-subtle' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Mês
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-[300px] p-3 pt-0">
        <div ref={chartRef} className="w-full h-full min-h-[290px]" />
      </CardContent>
    </Card>
  );
};
