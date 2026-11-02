import * as echarts from 'echarts';

export const REGION_COLORS: Record<string, string> = {
  'Sudeste': '#2563eb',
  'Nordeste': '#d97706',
  'Sul': '#059669',
  'Centro-Oeste': '#7c3aed',
  'Norte': '#0891b2',
  'Exterior': '#64748b',
};

export const COLORBLIND_PALETTE = [
  '#2563eb', // Azul Safira
  '#d97706', // Âmbar
  '#059669', // Esmeralda
  '#7c3aed', // Violeta
  '#0891b2', // Ciano
  '#64748b', // Ardósia
];

export function registerEChartsThemes() {
  echarts.registerTheme('dw-light', {
    color: COLORBLIND_PALETTE,
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      color: '#334155',
    },
    title: {
      textStyle: {
        fontFamily: '"Space Grotesk", sans-serif',
        color: '#0f172a',
        fontWeight: 600,
      },
      subtextStyle: {
        color: '#64748b',
      },
    },
    grid: {
      top: 30,
      right: 20,
      bottom: 35,
      left: 55,
      borderWidth: 0,
      containLabel: true,
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { show: false },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#f1f5f9',
          type: 'dashed',
        },
      },
    },
    tooltip: {
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#0f172a', fontSize: 12 },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-radius: 8px; padding: 10px 14px;',
    },
  });

  echarts.registerTheme('dw-dark', {
    color: COLORBLIND_PALETTE,
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      color: '#94a3b8',
    },
    title: {
      textStyle: {
        fontFamily: '"Space Grotesk", sans-serif',
        color: '#f8fafc',
        fontWeight: 600,
      },
      subtextStyle: {
        color: '#64748b',
      },
    },
    grid: {
      top: 30,
      right: 20,
      bottom: 35,
      left: 55,
      borderWidth: 0,
      containLabel: true,
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: '#334155' } },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      splitLine: { show: false },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#1e293b',
          type: 'dashed',
        },
      },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      borderWidth: 1,
      textStyle: { color: '#f8fafc', fontSize: 12 },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.4); border-radius: 8px; padding: 10px 14px;',
    },
  });
}
