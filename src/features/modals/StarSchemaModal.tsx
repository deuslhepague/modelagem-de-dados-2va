import React, { useState } from 'react';
import { X, Database, Table, Layers, Key, FileCode, Copy, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';

interface DimensionInfo {
  nome: string;
  titulo: string;
  tipo: string;
  chaves: string;
  atributos: string;
  registros: string;
  cor: string;
}

const DIMENSOES: DimensionInfo[] = [
  {
    nome: 'dim_data',
    titulo: 'Dimensão Tempo / Data',
    tipo: 'Conforme / Temporal',
    chaves: 'key (PK)',
    atributos: 'ano, mes, nome_mes, trimestre, semestre, ano_mes, tipo_eleicao',
    registros: '241 linhas (2008 a 2027 + chave zero)',
    cor: 'border-blue-500/30 text-blue-500 bg-blue-500/10',
  },
  {
    nome: 'dim_municipio',
    titulo: 'Dimensão Geográfica (Município)',
    tipo: 'Desnormalizada (SCD Tipo 2)',
    chaves: 'key (PK), codigo (NK)',
    atributos: 'nome, uf, estado, regiao, data_inicio, data_fim, versao, atual',
    registros: '5.760 municípios do Brasil e Exterior',
    cor: 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10',
  },
  {
    nome: 'dim_faixa_etaria',
    titulo: 'Faixa Etária do Eleitor',
    tipo: 'Demográfica Conforme',
    chaves: 'key (PK), codigo (NK)',
    atributos: 'descricao (22 grupos: "16 anos", "35 a 39 anos", etc.)',
    registros: '22 faixas etárias + chave zero',
    cor: 'border-purple-500/30 text-purple-500 bg-purple-500/10',
  },
  {
    nome: 'dim_genero',
    titulo: 'Gênero / Sexo Biológico',
    tipo: 'Demográfica Conforme',
    chaves: 'key (PK), codigo (NK)',
    atributos: 'descricao (MASCULINO, FEMININO, NÃO INFORMADO)',
    registros: '3 registros + chave zero',
    cor: 'border-amber-500/30 text-amber-500 bg-amber-500/10',
  },
  {
    nome: 'dim_grau_instrucao',
    titulo: 'Escolaridade do Eleitor',
    tipo: 'Demográfica Conforme',
    chaves: 'key (PK), codigo (NK)',
    atributos: 'descricao (Analfabeto, Fundamental, Médio, Superior)',
    registros: '8 graus de instrução + chave zero',
    cor: 'border-pink-500/30 text-pink-500 bg-pink-500/10',
  },
  {
    nome: 'dim_estado_civil',
    titulo: 'Estado Civil do Eleitor',
    tipo: 'Demográfica Conforme',
    chaves: 'key (PK), codigo (NK)',
    atributos: 'descricao (Solteiro, Casado, Divorciado, Viúvo)',
    registros: '5 categorias + chave zero',
    cor: 'border-cyan-500/30 text-cyan-500 bg-cyan-500/10',
  },
  {
    nome: 'dim_cor_raca',
    titulo: 'Cor ou Raça Autodeclarada',
    tipo: 'Demográfica Conforme',
    chaves: 'key (PK), codigo (NK)',
    atributos: 'descricao (Branca, Preta, Parda, Amarela, Indígena)',
    registros: '6 categorias + chave zero',
    cor: 'border-rose-500/30 text-rose-500 bg-rose-500/10',
  },
  {
    nome: 'dim_identidade_genero',
    titulo: 'Identidade de Gênero',
    tipo: 'Social Conforme',
    chaves: 'key (PK), codigo (NK)',
    atributos: 'descricao (Cisgênero, Transgênero, Não Informado)',
    registros: '3 registros + chave zero',
    cor: 'border-violet-500/30 text-violet-500 bg-violet-500/10',
  },
  {
    nome: 'dim_quilombola',
    titulo: 'Comunidade Quilombola',
    tipo: 'Social Booleana',
    chaves: 'key (PK), codigo (NK)',
    atributos: 'descricao (Sim, Não, Não Informado)',
    registros: '3 registros + chave zero',
    cor: 'border-orange-500/30 text-orange-500 bg-orange-500/10',
  },
  {
    nome: 'dim_interprete_libras',
    titulo: 'Necessidade Intérprete Libras',
    tipo: 'Acessibilidade Booleana',
    chaves: 'key (PK), codigo (NK)',
    atributos: 'descricao (Sim, Não, Não Informado)',
    registros: '3 registros + chave zero',
    cor: 'border-teal-500/30 text-teal-500 bg-teal-500/10',
  },
];

const DDL_SNIPPET = `CREATE TABLE fato_transferencia (
  data_key               INT UNSIGNED NOT NULL,
  municipio_destino_key  INT UNSIGNED NOT NULL,
  municipio_origem_key   INT UNSIGNED NOT NULL,
  faixa_etaria_key       INT UNSIGNED NOT NULL,
  genero_key             INT UNSIGNED NOT NULL,
  grau_instrucao_key     INT UNSIGNED NOT NULL,
  estado_civil_key       INT UNSIGNED NOT NULL,
  cor_raca_key           INT UNSIGNED NOT NULL,
  identidade_genero_key  INT UNSIGNED NOT NULL,
  quilombola_key         INT UNSIGNED NOT NULL,
  interprete_libras_key  INT UNSIGNED NOT NULL,
  quantidade             INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (
    data_key, municipio_destino_key, municipio_origem_key,
    faixa_etaria_key, genero_key, grau_instrucao_key,
    estado_civil_key, cor_raca_key, identidade_genero_key,
    quilombola_key, interprete_libras_key
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

interface StarSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StarSchemaModal: React.FC<StarSchemaModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(DDL_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-background border border-border rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Modelo Star Schema (ERD) · Data Warehouse TSE
              </h2>
              <p className="text-xs text-muted-foreground">
                Esquema Estrela dimensional: 1 Fato Central conectada a 10 Dimensões
              </p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Cartão da Tabela Fato Central */}
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Centro da Estrela (Grão Atômico)</span>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2 mt-0.5">
                    <Table className="w-4 h-4 text-primary" />
                    fato_transferencia
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-card px-2.5 py-1 rounded border border-border">
                    11.977.648 linhas
                  </span>
                  <span className="font-mono text-xs bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded border border-emerald-500/20 font-semibold">
                    12.776.407 eleitores
                  </span>
                </div>
              </div>
              <CardDescription className="text-xs">
                Cada linha representa um lote homogêneo de transferências no mesmo mês, com origem, destino e perfil demográfico idênticos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-card p-2.5 rounded border border-border space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    Chaves Estrangeiras (FKs):
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    11 FKs apontando para as chaves substitutas das 10 dimensões (com município_origem e município_destino como role-playing).
                  </p>
                </div>
                <div className="bg-card p-2.5 rounded border border-border space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-500" />
                    Métrica Aditiva:
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    <code className="font-mono font-bold text-foreground">quantidade</code>: contagem exata de eleitores transferidos (SUM totalmente aditiva).
                  </p>
                </div>
                <div className="bg-card p-2.5 rounded border border-border space-y-1 sm:col-span-2 lg:col-span-1">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-500" />
                    Chave Primária Composta:
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    PK formada pelas 11 chaves estrangeiras combinadas, garantindo unicidade perfeita e eliminando duplicações cadastrais.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grid das 10 Dimensões */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              10 Tabelas de Dimensões Conectadas (1:N)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {DIMENSOES.map((dim, i) => (
                <Card key={i} className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <CardContent className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Table className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs font-bold text-foreground">{dim.nome}</span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${dim.cor}`}>
                        {dim.tipo}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-primary">{dim.titulo}</div>
                    <div className="space-y-1 text-xs">
                      <div className="text-muted-foreground">
                        <strong>Chaves:</strong> <code className="font-mono text-foreground">{dim.chaves}</code>
                      </div>
                      <div className="text-muted-foreground">
                        <strong>Atributos:</strong> <span className="font-mono text-[11px] text-foreground">{dim.atributos}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Volume: {dim.registros}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Código DDL SQL */}
          <Card className="bg-slate-950 text-slate-100 border-slate-800">
            <CardHeader className="py-2.5 px-4 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>01_dw_create.sql (DDL da Tabela Fato)</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs h-7 text-slate-300 hover:text-white">
                {copied ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                {copied ? 'Copiado!' : 'Copiar DDL'}
              </Button>
            </CardHeader>
            <CardContent className="p-4 font-mono text-xs leading-relaxed overflow-x-auto text-indigo-300">
              <pre className="whitespace-pre">{DDL_SNIPPET}</pre>
            </CardContent>
          </Card>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-3 border-t border-border bg-card/60 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar Visualizador
          </Button>
        </div>
      </div>
    </div>
  );
};
