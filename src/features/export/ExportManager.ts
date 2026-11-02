import * as XLSX from 'xlsx';
import { queryExportRows } from '../../lib/duckdb/queries';
import { FilterState } from '../../lib/store';

function getFormattedDateStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Exporta dados filtrados para CSV com UTF-8 BOM (\ufeff)
 */
export async function exportToCSV(state: FilterState) {
  const rows = await queryExportRows(state, 200000);
  if (!rows || rows.length === 0) {
    alert('Nenhum dado encontrado para os filtros selecionados.');
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvLines: string[] = [];

  // Cabeçalho
  csvLines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';'));

  // Linhas
  for (const row of rows) {
    const line = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(';');
    csvLines.push(line);
  }

  // UTF-8 com BOM (\ufeff) para compatibilidade perfeita com Excel no Windows
  const blob = new Blob(['\ufeff' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const filename = `dw_filtrado_${getFormattedDateStamp()}.csv`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta dados filtrados para Excel (.xlsx) com a aba 'DW_Filtrado'
 */
export async function exportToExcel(state: FilterState) {
  const rows = await queryExportRows(state, 200000);
  if (!rows || rows.length === 0) {
    alert('Nenhum dado encontrado para os filtros selecionados.');
    return;
  }

  // Criação da planilha e pasta de trabalho
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DW_Filtrado');

  const filename = `dw_filtrado_${getFormattedDateStamp()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
