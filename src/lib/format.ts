/**
 * Utilitários de formatação em Português do Brasil (pt-BR)
 * Garante fidelidade métrica, algarismos tabulares e representação limpa.
 */

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  if (Math.abs(value) >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1).replace('.', ',');
    return `${formatted} mi`;
  }
  if (Math.abs(value) >= 1_000) {
    const formatted = (value / 1_000).toFixed(1).replace('.', ',');
    return `${formatted} mil`;
  }
  return formatNumber(value, 0);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '0,0%';
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

export function formatDataKeyToDate(dataKey: number | string): string {
  const str = String(dataKey);
  if (str.length === 6) {
    const ano = str.substring(0, 4);
    const mes = str.substring(4, 6);
    return `${mes}/${ano}`;
  }
  return str;
}

export function formatISOToBR(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export function formatBRToISO(brDate: string): string {
  if (!brDate) return '';
  const parts = brDate.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return brDate;
}

export function formatGrau(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/L\?\s*E\s*ESCREVE/gi, 'Lê e Escreve')
    .replace(/M\?DIO/gi, 'Médio')
    .replace(/N\?O/gi, 'Não')
    .replace(/ANALFABETO/gi, 'Analfabeto')
    .replace(/ENSINO FUNDAMENTAL INCOMPLETO/gi, 'Ensino Fundamental Incompleto')
    .replace(/ENSINO FUNDAMENTAL COMPLETO/gi, 'Ensino Fundamental Completo')
    .replace(/ENSINO M[E\?]DIO INCOMPLETO/gi, 'Ensino Médio Incompleto')
    .replace(/ENSINO M[E\?]DIO COMPLETO/gi, 'Ensino Médio Completo')
    .replace(/SUPERIOR INCOMPLETO/gi, 'Superior Incompleto')
    .replace(/SUPERIOR COMPLETO/gi, 'Superior Completo');
}


