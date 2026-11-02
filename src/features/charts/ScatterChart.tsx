import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { ScatterPoint } from '../../lib/duckdb/queries';
import { formatNumber, formatPercent } from '../../lib/format';
import { Target } from 'lucide-react';

interface ScatterChartProps {
  data: ScatterPoint[];
  isLoading?: boolean;
  isDark?: boolean;
}

const GENDER_COLORS: Record<string, string> = {
  'FEMININO': '#e11d48',
  'MASCULINO': '#2563eb',
  'NÃO INFORMADO': '#94a3b8',
  'Não informado': '#94a3b8',
};

export const ScatterChart: React.FC<ScatterChartProps> = ({ data, isLoading, isDark = false }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Se já existia, descarta para recriar com o tema correto (dw-dark vs dw-light)
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

    // Agrupar por canal (gênero) para ter séries e legendas distintas
    const canais = Array.from(new Set(data.map(d => d.canalVenda)));
    const maxLotes = Math.max(...data.map(d => d.lotes), 1);

    const series: echarts.SeriesOption[] = canais.map(canal => {
      const pontosCanal = data.filter(d => d.canalVenda === canal);
      return {
        name: canal,
        type: 'scatter',
        data: pontosCanal.map(p => [
          p.quantidade,
          p.taxaInterestadual,
          p.lotes,
          p.categoria,
          p.regiao,
          p.estado,
        ]),
        symbolSize: (val: any) => {
          const lotes = val[2] || 1;
          const normalized = Math.sqrt(lotes / maxLotes);
          return Math.max(6, Math.min(32, Math.round(normalized * 32)));
        },
        itemStyle: {
          color: GENDER_COLORS[canal] || (isDark ? '#3b82f6' : '#2563eb'),
          opacity: 0.8,
        },
      };
    });

    const titleColor = isDark ? '#f8fafc' : '#0f172a';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const valColor = isDark ? '#ffffff' : '#0f172a';
    const axisTextColor = isDark ? '#f8fafc' : '#1e293b';
    const splitLineColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9';

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const [qtd, taxa, lotes, cat, reg, uf] = params.value;
          return `
            <div style="font-family: inherit;">
              <div style="font-weight: 600; font-size: 13px; color: ${titleColor}; margin-bottom: 4px;">
                ${cat} · ${uf} (${reg})
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 2px;">
                <span style="color: ${labelColor};">Gênero:</span>
                <span style="font-weight: 600; color: ${valColor};">${params.seriesName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 2px;">
                <span style="color: ${labelColor};">Transferências:</span>
                <span style="font-weight: 600; font-family: monospace; color: ${valColor};">${formatNumber(qtd)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin-bottom: 2px;">
                <span style="color: ${labelColor};">Taxa Interestadual:</span>
                <span style="font-weight: 600; font-family: monospace; color: #10b981;">${formatPercent(taxa)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 16px; font-size: 12px;">
                <span style="color: ${labelColor};">Lotes no DW:</span>
                <span style="font-weight: 600; font-family: monospace; color: ${valColor};">${formatNumber(lotes)}</span>
              </div>
            </div>
          `;
        },
      },
      legend: {
        data: canais,
        right: 15,
        top: 0,
        textStyle: { fontSize: 11, color: isDark ? '#e2e8f0' : '#475569' },
      },
      grid: {
        top: 35,
        right: 20,
        bottom: 30,
        left: 50,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: 'Eleitores',
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: { color: axisTextColor, fontSize: 11, fontWeight: 500 },
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
        type: 'value',
        name: 'Taxa Interestadual (%)',
        nameTextStyle: { color: axisTextColor, fontSize: 11, fontWeight: 500 },
        axisLabel: {
          formatter: '{value}%',
          fontSize: 10,
          fontFamily: 'monospace',
          color: labelColor,
        },
        splitLine: { lineStyle: { type: 'dashed', color: splitLineColor } },
      },
      series,
    };

    chart.setOption(option, true);
    chart.resize();

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      chartInstance.current = null;
    };
  }, [data, isLoading, isDark]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Target className="w-4 h-4 text-primary" />
          Dispersão: Volume de Eleitores vs Taxa Interestadual
        </CardTitle>
        <CardDescription>
          Relação de intensidade migratória por gênero e densidade de lotes
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px] p-3 pt-0">
        <div ref={chartRef} className="w-full h-full min-h-[290px]" />
      </CardContent>
    </Card>
  );
};
