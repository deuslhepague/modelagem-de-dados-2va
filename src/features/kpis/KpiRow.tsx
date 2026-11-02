import React from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { formatNumber, formatCompact, formatPercent } from '../../lib/format';
import { KpiData } from '../../lib/duckdb/queries';
import { Users, ArrowRightLeft, Percent, Calculator, Layers } from 'lucide-react';

interface KpiRowProps {
  data: KpiData | null;
  isLoading?: boolean;
}

export const KpiRow: React.FC<KpiRowProps> = ({ data, isLoading }) => {
  const cards = [
    {
      title: 'Total de Transferências',
      value: data ? formatCompact(data.totTransf) : '0',
      exactValue: data ? formatNumber(data.totTransf) : '0',
      description: 'Fato Transferências',
      icon: Users,
      badgeColor: 'text-blue-500 bg-blue-500/10',
    },
    {
      title: 'Migração Interestadual',
      value: data ? formatCompact(data.totInterestadual) : '0',
      exactValue: data ? formatNumber(data.totInterestadual) : '0',
      description: 'Entre Estados Diferentes',
      icon: ArrowRightLeft,
      badgeColor: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      title: 'Taxa Interestadual',
      value: data ? formatPercent(data.taxaPonderada, 1) : '0,0%',
      exactValue: data ? `${data.taxaPonderada.toFixed(2)}%` : '0,00%',
      description: 'Proporção Interestadual',
      icon: Percent,
      badgeColor: 'text-indigo-500 bg-indigo-500/10',
    },
    {
      title: 'Média por Lote',
      value: data ? formatNumber(data.mediaPorLote, 2) : '0,00',
      exactValue: data ? `${data.mediaPorLote.toFixed(3)} eleitores/lote` : '0',
      description: 'Eleitores por Registro',
      icon: Calculator,
      badgeColor: 'text-amber-500 bg-amber-500/10',
    },
    {
      title: 'Lotes Registrados',
      value: data ? formatCompact(data.totLotes) : '0',
      exactValue: data ? formatNumber(data.totLotes) : '0',
      description: 'Registros na Fato',
      icon: Layers,
      badgeColor: 'text-purple-500 bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className="relative overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-1 rounded ${card.badgeColor}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-2 py-1">
                  <div className="h-7 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span
                      className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums cursor-default"
                      title={`Valor exato: ${card.exactValue}`}
                    >
                      {card.value}
                    </span>
                    {card.value !== card.exactValue && (
                      <span className="text-[11px] text-muted-foreground font-mono" title={card.exactValue}>
                        ({card.exactValue})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-normal leading-relaxed pt-0.5" title={card.description}>
                    {card.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
