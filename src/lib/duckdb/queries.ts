import { executeQuery, getManifest } from './database';
import { FilterState } from '../store';

export interface KpiData {
  totTransf: number;
  totInterestadual: number;
  taxaPonderada: number;
  mediaPorLote: number;
  totLotes: number;
}

export interface TemporalPoint {
  periodo: string;
  ano: number;
  mes?: number;
  trimestre?: number;
  nomeMes?: string;
  tipoEleicao?: string;
  quantidade: number;
  qtdInterestadual: number;
}

export interface CategoryPoint {
  categoria: string;
  quantidade: number;
  taxaInterestadual: number;
}

export interface RegionalPoint {
  regiao: string;
  estado: string;
  quantidade: number;
  qtdInterestadual: number;
  taxaInterestadual: number;
}

export interface ScatterPoint {
  quantidade: number;
  taxaInterestadual: number;
  canalVenda: string;
  lotes: number;
  categoria: string;
  regiao: string;
  estado: string;
}

export interface TableRow {
  id: number;
  anoMes: string;
  categoria: string;
  canalVenda: string;
  regiao: string;
  estado: string;
  clienteSegmento: string;
  lotes: number;
  quantidade: number;
  qtdInterestadual: number;
  taxaInterestadual: number;
}

/**
 * Carrega metadados e opções dinâmicas diretamente do banco DuckDB
 */
export async function loadInitialMetadata() {
  const manifest = await getManifest();

  // 1. Categorias (Faixas Etárias com ordem correta)
  const catRows = await executeQuery<{ descricao: string }>(
    `SELECT DISTINCT descricao FROM dim_faixa_etaria WHERE "key" > 0 ORDER BY codigo`
  );
  const categorias = catRows.map(r => r.descricao).filter(Boolean);

  // 2. Regiões e Estados com hierarquia real
  const muniRows = await executeQuery<{ regiao: string; uf: string }>(
    `SELECT DISTINCT regiao, uf FROM dim_municipio WHERE "key" > 0 AND regiao != 'Não informado' ORDER BY regiao, uf`
  );

  const estadosPorRegiao: Record<string, string[]> = {};
  const todosEstadosSet = new Set<string>();
  const regioesSet = new Set<string>();

  for (const row of muniRows) {
    if (!estadosPorRegiao[row.regiao]) {
      estadosPorRegiao[row.regiao] = [];
    }
    if (!estadosPorRegiao[row.regiao].includes(row.uf)) {
      estadosPorRegiao[row.regiao].push(row.uf);
    }
    todosEstadosSet.add(row.uf);
    regioesSet.add(row.regiao);
  }

  // 3. Canais (Gêneros)
  const genRows = await executeQuery<{ descricao: string }>(
    `SELECT DISTINCT descricao FROM dim_genero WHERE "key" > 0 ORDER BY "key"`
  );
  const canais = genRows.map(r => r.descricao).filter(Boolean);

  // 4. Segmentos (Grau de Instrução)
  const grauRows = await executeQuery<{ descricao: string }>(
    `SELECT DISTINCT descricao FROM dim_grau_instrucao WHERE "key" > 0 ORDER BY codigo`
  );
  const segmentos = grauRows.map(r => r.descricao).filter(Boolean);

  // 5. Anos da dim_data
  const anosRows = await executeQuery<{ ano: number }>(
    `SELECT DISTINCT ano FROM dim_data WHERE "key" > 0 AND ano BETWEEN 2022 AND 2026 ORDER BY ano`
  );
  const anos = anosRows.map(r => r.ano);

  return {
    anos: anos.length > 0 ? anos : [2022, 2023, 2024, 2025, 2026],
    categorias,
    regioes: Array.from(regioesSet),
    estadosPorRegiao,
    todosEstados: Array.from(todosEstadosSet),
    canais,
    segmentos,
    limites: {
      minData: '2022-01-01',
      maxData: '2026-07-01',
      minQtd: manifest.limites?.min_qtd || 1,
      maxQtd: manifest.limites?.max_qtd || 10473,
      minTaxa: manifest.limites?.min_taxa ?? 0,
      maxTaxa: manifest.limites?.max_taxa ?? 100,
      minLotes: manifest.limites?.min_lotes || 1,
      maxLotes: manifest.limites?.max_lotes || 6103,
    },
  };
}

/**
 * Constrói a cláusula WHERE a partir do estado dos filtros
 */
export function buildWhereClause(state: FilterState, tableAlias = 'c'): string {
  const clauses: string[] = ['1=1'];

  // 1. Período entre datas (AAAA-MM-DD -> data_key AAAAMM)
  if (state.startDate) {
    const startKey = Number(state.startDate.substring(0, 7).replace('-', ''));
    if (!isNaN(startKey)) clauses.push(`${tableAlias}.data_key >= ${startKey}`);
  }
  if (state.endDate) {
    const endKey = Number(state.endDate.substring(0, 7).replace('-', ''));
    if (!isNaN(endKey)) clauses.push(`${tableAlias}.data_key <= ${endKey}`);
  }

  // 2. Anos
  if (state.anos && state.anos.length > 0 && state.anos.length < state.opcoesDisponiveis.anos.length) {
    clauses.push(`${tableAlias}.ano IN (${state.anos.join(',')})`);
  }

  // 3. Categorias (Faixa Etária)
  if (state.categorias && state.categorias.length > 0 && state.categorias.length < state.opcoesDisponiveis.categorias.length) {
    const escaped = state.categorias.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
    clauses.push(`${tableAlias}.categoria IN (${escaped})`);
  }

  // 4 e 5. Região e Estados (UFs) em cascata
  if (!state.regioes || state.regioes.length === 0) {
    return 'WHERE 1=0'; // Nenhuma região ativa = resultado vazio
  }

  if (state.regioes.length < state.opcoesDisponiveis.regioes.length) {
    const escapedReg = state.regioes.map(r => `'${r.replace(/'/g, "''")}'`).join(',');
    clauses.push(`${tableAlias}.regiao IN (${escapedReg})`);
  }

  if (state.estados) {
    if (state.estados.length === 0) {
      return 'WHERE 1=0'; // Todas as UFs desmarcadas pelo usuário = resultado vazio
    }
    if (state.estados.length < state.opcoesDisponiveis.todosEstados.length) {
      const escapedUfs = state.estados.map(u => `'${u.replace(/'/g, "''")}'`).join(',');
      clauses.push(`${tableAlias}.estado IN (${escapedUfs})`);
    }
  }

  // 6. Canal de venda (Gênero)
  if (state.canais && state.canais.length > 0 && state.canais.length < state.opcoesDisponiveis.canais.length) {
    const escapedCan = state.canais.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
    clauses.push(`${tableAlias}.canal_venda IN (${escapedCan})`);
  }

  // 7. Segmento de clientes (Grau de instrução)
  if (state.segmentos && state.segmentos.length > 0 && state.segmentos.length < state.opcoesDisponiveis.segmentos.length) {
    const escapedSeg = state.segmentos.map(s => `'${s.replace(/'/g, "''")}'`).join(',');
    clauses.push(`${tableAlias}.cliente_segmento IN (${escapedSeg})`);
  }

  // 8. Sliders de Faixa (apenas filtrar se o usuário alterou dos limites naturais)
  const limites = state.opcoesDisponiveis?.limites;
  if (state.faixaQtd && limites) {
    const [minQ, maxQ] = state.faixaQtd;
    if (minQ > limites.minQtd || maxQ < limites.maxQtd) {
      clauses.push(`${tableAlias}.quantidade BETWEEN ${minQ} AND ${maxQ}`);
    }
  }
  if (state.faixaTaxa && limites) {
    const [minT, maxT] = state.faixaTaxa;
    if (minT > limites.minTaxa || maxT < limites.maxTaxa) {
      clauses.push(`${tableAlias}.taxa_interestadual BETWEEN ${minT} AND ${maxT}`);
    }
  }
  if (state.faixaLotes && limites) {
    const [minL, maxL] = state.faixaLotes;
    if (minL > limites.minLotes || maxL < limites.maxLotes) {
      clauses.push(`${tableAlias}.lotes BETWEEN ${minL} AND ${maxL}`);
    }
  }

  return `WHERE ${clauses.join(' AND ')}`;
}

/**
 * Consulta os 5 KPIs recalculados reativamente
 */
export async function queryKpis(state: FilterState): Promise<KpiData> {
  const where = buildWhereClause(state, 'c');
  const sql = `
    SELECT 
      COALESCE(SUM(quantidade), 0) AS totTransf,
      COALESCE(SUM(qtd_interestadual), 0) AS totInterestadual,
      ROUND(COALESCE(SUM(qtd_interestadual) * 100.0 / NULLIF(SUM(quantidade), 0), 0), 2) AS taxaPonderada,
      ROUND(COALESCE(SUM(quantidade) * 1.0 / NULLIF(SUM(lotes), 0), 0), 2) AS mediaPorLote,
      COALESCE(SUM(lotes), 0) AS totLotes
    FROM cubo c
    ${where};
  `;
  const res = await executeQuery<any>(sql);
  const row = res[0] || {};
  return {
    totTransf: Number(row.totTransf ?? row.tottransf) || 0,
    totInterestadual: Number(row.totInterestadual ?? row.totinterestadual) || 0,
    taxaPonderada: Number(row.taxaPonderada ?? row.taxaponderada) || 0,
    mediaPorLote: Number(row.mediaPorLote ?? row.mediaporlote) || 0,
    totLotes: Number(row.totLotes ?? row.totlotes) || 0,
  };
}

/**
 * Gráfico 1: Evolução temporal mensal (Barras + Linha) com suporte a Drill-down
 */
export async function queryTemporal(state: FilterState): Promise<TemporalPoint[]> {
  const where = buildWhereClause(state, 'c');

  if (state.drillTemporal === 'ano') {
    const sql = `
      SELECT 
        ano::VARCHAR AS periodo,
        ano,
        SUM(quantidade) AS quantidade,
        SUM(qtd_interestadual) AS qtdInterestadual
      FROM cubo c
      ${where}
      GROUP BY ano
      ORDER BY ano ASC;
    `;
    const res = await executeQuery<any>(sql);
    return res.map(r => ({
      periodo: String(r.periodo),
      ano: Number(r.ano),
      quantidade: Number(r.quantidade) || 0,
      qtdInterestadual: Number(r.qtdInterestadual) || 0,
    }));
  }

  if (state.drillTemporal === 'trimestre') {
    const sql = `
      SELECT 
        (ano || '-T' || trimestre) AS periodo,
        ano,
        trimestre,
        SUM(quantidade) AS quantidade,
        SUM(qtd_interestadual) AS qtdInterestadual
      FROM cubo c
      ${where}
      GROUP BY ano, trimestre
      ORDER BY ano ASC, trimestre ASC;
    `;
    const res = await executeQuery<any>(sql);
    return res.map(r => ({
      periodo: String(r.periodo),
      ano: Number(r.ano),
      trimestre: Number(r.trimestre),
      quantidade: Number(r.quantidade) || 0,
      qtdInterestadual: Number(r.qtdInterestadual ?? r.qtdinterestadual) || 0,
    }));
  }

  // Padrão: Mês
  const sql = `
    SELECT 
      (ano || '-' || LPAD(mes::VARCHAR, 2, '0')) AS periodo,
      ano,
      mes,
      nome_mes AS nomeMes,
      tipo_eleicao AS tipoEleicao,
      SUM(quantidade) AS quantidade,
      SUM(qtd_interestadual) AS qtdInterestadual
    FROM cubo c
    ${where}
    GROUP BY ano, mes, nome_mes, tipo_eleicao
    ORDER BY ano ASC, mes ASC;
  `;
  const res = await executeQuery<any>(sql);
  return res.map(r => ({
    periodo: String(r.periodo),
    ano: Number(r.ano),
    mes: Number(r.mes),
    nomeMes: r.nomeMes ?? r.nomemes,
    tipoEleicao: r.tipoEleicao ?? r.tipoeleicao,
    quantidade: Number(r.quantidade) || 0,
    qtdInterestadual: Number(r.qtdInterestadual ?? r.qtdinterestadual) || 0,
  }));
}

/**
 * Gráfico 2: Barra horizontal por categoria ordenada
 */
export async function queryCategories(state: FilterState): Promise<CategoryPoint[]> {
  const where = buildWhereClause(state, 'c');
  const sql = `
    SELECT 
      categoria,
      SUM(quantidade) AS quantidade,
      ROUND(SUM(qtd_interestadual) * 100.0 / NULLIF(SUM(quantidade), 0), 1) AS taxaInterestadual
    FROM cubo c
    ${where}
    GROUP BY categoria
    ORDER BY quantidade ASC;
  `;
  const res = await executeQuery<any>(sql);
  return res.map(r => ({
    categoria: r.categoria,
    quantidade: Number(r.quantidade) || 0,
    taxaInterestadual: Number(r.taxaInterestadual ?? r.taxainterestadual) || 0,
  }));
}

/**
 * Gráfico 3: Desempenho regional por Estado e Região
 */
export async function queryRegional(state: FilterState): Promise<RegionalPoint[]> {
  const where = buildWhereClause(state, 'c');
  const sql = `
    SELECT 
      regiao,
      estado,
      SUM(quantidade) AS quantidade,
      SUM(qtd_interestadual) AS qtdInterestadual,
      ROUND(SUM(qtd_interestadual) * 100.0 / NULLIF(SUM(quantidade), 0), 1) AS taxaInterestadual
    FROM cubo c
    ${where}
    GROUP BY regiao, estado
    ORDER BY quantidade DESC;
  `;
  const res = await executeQuery<any>(sql);
  return res.map(r => ({
    regiao: r.regiao,
    estado: r.estado,
    quantidade: Number(r.quantidade) || 0,
    qtdInterestadual: Number(r.qtdInterestadual ?? r.qtdinterestadual) || 0,
    taxaInterestadual: Number(r.taxaInterestadual ?? r.taxainterestadual) || 0,
  }));
}

/**
 * Gráfico 4: Diagrama de Dispersão (Transferências vs Taxa por Canal/Gênero)
 */
export async function queryScatter(state: FilterState): Promise<ScatterPoint[]> {
  const where = buildWhereClause(state, 'c');
  const sql = `
    SELECT 
      SUM(quantidade) AS quantidade,
      ROUND(SUM(qtd_interestadual) * 100.0 / NULLIF(SUM(quantidade), 0), 2) AS taxaInterestadual,
      canal_venda AS canalVenda,
      SUM(lotes) AS lotes,
      categoria,
      regiao,
      estado
    FROM cubo c
    ${where}
    GROUP BY canal_venda, categoria, regiao, estado
    HAVING SUM(quantidade) > 0
    ORDER BY quantidade DESC
    LIMIT 3000;
  `;
  const res = await executeQuery<any>(sql);
  return res.map(r => ({
    quantidade: Number(r.quantidade),
    taxaInterestadual: Number(r.taxaInterestadual ?? r.taxainterestadual),
    canalVenda: r.canalVenda ?? r.canalvenda,
    lotes: Number(r.lotes),
    categoria: r.categoria,
    regiao: r.regiao,
    estado: r.estado,
  }));
}

/**
 * Tabela Detalhada com paginação e ordenação no próprio motor DuckDB
 */
export async function queryTable(
  state: FilterState,
  page = 1,
  pageSize = 10,
  sortCol = 'quantidade',
  sortDir: 'ASC' | 'DESC' = 'DESC'
): Promise<{ rows: TableRow[]; total: number }> {
  const where = buildWhereClause(state, 'c');
  const offset = (page - 1) * pageSize;

  const validCols: Record<string, string> = {
    anoMes: 'ano, mes',
    categoria: 'categoria',
    canalVenda: 'canal_venda',
    regiao: 'regiao',
    estado: 'estado',
    clienteSegmento: 'cliente_segmento',
    lotes: 'SUM(lotes)',
    quantidade: 'SUM(quantidade)',
    qtdInterestadual: 'SUM(qtd_interestadual)',
    taxaInterestadual: 'taxa_interestadual',
  };

  const orderBy = validCols[sortCol] || 'SUM(quantidade)';

  const countSql = `
    SELECT COUNT(*) AS total FROM (
      SELECT 1 FROM cubo c ${where}
      GROUP BY ano, mes, categoria, canal_venda, regiao, estado, cliente_segmento
    );
  `;
  const countRes = await executeQuery<any>(countSql);
  const total = Number(countRes[0]?.total ?? countRes[0]?.TOTAL ?? 0);

  if (total === 0) {
    return { rows: [], total: 0 };
  }

  const sql = `
    SELECT 
      ROW_NUMBER() OVER () AS id,
      (ano || '-' || LPAD(mes::VARCHAR, 2, '0')) AS anoMes,
      categoria,
      canal_venda AS canalVenda,
      regiao,
      estado,
      cliente_segmento AS clienteSegmento,
      SUM(lotes)::INTEGER AS lotes,
      SUM(quantidade)::INTEGER AS quantidade,
      SUM(qtd_interestadual)::INTEGER AS qtdInterestadual,
      ROUND(SUM(qtd_interestadual) * 100.0 / NULLIF(SUM(quantidade), 0), 1) AS taxaInterestadual
    FROM cubo c
    ${where}
    GROUP BY ano, mes, categoria, canal_venda, regiao, estado, cliente_segmento
    ORDER BY ${orderBy} ${sortDir}
    LIMIT ${pageSize} OFFSET ${offset};
  `;

  const rawRows = await executeQuery<any>(sql);
  const rows: TableRow[] = rawRows.map((r, i) => ({
    id: Number(r.id ?? i + 1),
    anoMes: String(r.anoMes ?? r.anomes ?? ''),
    categoria: String(r.categoria ?? ''),
    canalVenda: String(r.canalVenda ?? r.canalvenda ?? ''),
    regiao: String(r.regiao ?? ''),
    estado: String(r.estado ?? ''),
    clienteSegmento: String(r.clienteSegmento ?? r.clientesegmento ?? ''),
    lotes: Number(r.lotes ?? 0),
    quantidade: Number(r.quantidade ?? 0),
    qtdInterestadual: Number(r.qtdInterestadual ?? r.qtdinterestadual ?? 0),
    taxaInterestadual: Number(r.taxaInterestadual ?? r.taxainterestadual ?? 0),
  }));

  return { rows, total };
}

/**
 * Consulta para Exportação em CSV/Excel
 */
export async function queryExportRows(state: FilterState, maxRows = 200000): Promise<any[]> {
  const where = buildWhereClause(state, 'c');
  const sql = `
    SELECT 
      (ano || '-' || LPAD(mes::VARCHAR, 2, '0')) AS "Mês/Ano",
      ano AS "Ano",
      mes AS "Mês",
      tipo_eleicao AS "Tipo de Eleição",
      regiao AS "Região Destino",
      estado AS "UF Destino",
      categoria AS "Faixa Etária",
      canal_venda AS "Gênero",
      cliente_segmento AS "Grau de Instrução",
      SUM(lotes)::INTEGER AS "Lotes Registrados",
      SUM(quantidade)::INTEGER AS "Total de Eleitores",
      SUM(qtd_interestadual)::INTEGER AS "Migração Interestadual",
      ROUND(SUM(qtd_interestadual) * 100.0 / NULLIF(SUM(quantidade), 0), 2) AS "Taxa Interestadual (%)"
    FROM cubo c
    ${where}
    GROUP BY ano, mes, tipo_eleicao, regiao, estado, categoria, canal_venda, cliente_segmento
    ORDER BY ano, mes, "Total de Eleitores" DESC
    LIMIT ${maxRows};
  `;
  return executeQuery(sql);
}
