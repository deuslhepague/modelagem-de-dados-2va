import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { TableRow, queryTable } from '../../lib/duckdb/queries';
import { formatNumber, formatPercent, formatGrau } from '../../lib/format';

import { useFilterStore } from '../../lib/store';
import { Table, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

export const FactDataTable: React.FC = () => {
  const filterState = useFilterStore();
  const [rows, setRows] = useState<TableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortCol, setSortCol] = useState('quantidade');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [loading, setLoading] = useState(false);

  // Recarregar dados da tabela quando filtros mudam ou página muda
  useEffect(() => {
    if (!filterState.isReady) return;

    let isMounted = true;
    setLoading(true);

    queryTable(filterState, page, pageSize, sortCol, sortDir)
      .then(({ rows: resultRows, total: resultTotal }) => {
        if (!isMounted) return;
        setRows(resultRows);
        setTotal(resultTotal);
      })
      .catch((err) => {
        console.error('Erro ao paginar tabela DuckDB:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
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
    filterState.isReady,
    page,
    pageSize,
    sortCol,
    sortDir,
  ]);

  // Se os filtros mudarem, resetar para a primeira página
  useEffect(() => {
    setPage(1);
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
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'DESC' ? 'ASC' : 'DESC');
    } else {
      setSortCol(col);
      setSortDir('DESC');
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-semibold">
            Visualização Detalhada da Tabela Fato (Dados Filtrados)
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {formatNumber(total)} registros encontrados
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/50 border-y border-border/80 text-muted-foreground font-medium uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Mês/Ano</th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort('categoria')}
                >
                  <div className="flex items-center gap-1">
                    Faixa Etária
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort('canalVenda')}
                >
                  <div className="flex items-center gap-1">
                    Gênero
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Região</th>
                <th className="py-2.5 px-3 text-center">UF</th>
                <th className="py-2.5 px-3">Escolaridade</th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort('lotes')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Lotes
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort('quantidade')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Eleitores
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort('qtdInterestadual')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Interestadual
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort('taxaInterestadual')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Taxa (%)
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-sans">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="py-2.5 px-3">
                      <div className="h-4 bg-muted/70 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-muted-foreground text-xs">
                    Nenhum dado encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-accent/30 transition-colors tabular-nums"
                  >
                    <td className="py-2 px-3 font-mono text-muted-foreground">{row.anoMes}</td>
                    <td className="py-2 px-3 font-medium text-foreground">{row.categoria}</td>
                    <td className="py-2 px-3 text-muted-foreground">{row.canalVenda}</td>
                    <td className="py-2 px-3 text-muted-foreground">{row.regiao}</td>
                    <td className="py-2 px-3 text-center font-mono font-medium text-primary">{row.estado}</td>
                    <td className="py-2 px-3 text-muted-foreground truncate max-w-[180px]" title={row.clienteSegmento}>
                      {formatGrau(row.clienteSegmento)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">{formatNumber(row.lotes)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-foreground">{formatNumber(row.quantidade)}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatNumber(row.qtdInterestadual)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-foreground font-medium">
                      {formatPercent(row.taxaInterestadual)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/80 text-xs">
          <div className="text-muted-foreground">
            Página <span className="font-mono font-medium text-foreground">{page}</span> de{' '}
            <span className="font-mono font-medium text-foreground">{totalPages}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-7 px-2"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-7 px-2"
            >
              Próxima
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
