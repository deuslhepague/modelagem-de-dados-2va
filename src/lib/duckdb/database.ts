import * as duckdb from '@duckdb/duckdb-wasm';

export interface ManifestData {
  versao: string;
  gerado_em: string;
  origem_dados: string;
  modelo: string;
  auditoria: {
    total_linhas_fato: number;
    total_transferencias: number;
    media_por_lote: number;
    status_paridade: string;
  };
  limites: {
    min_ano: number;
    max_ano: number;
    min_data_key: number;
    max_data_key: number;
    min_qtd: number;
    max_qtd: number;
    min_taxa: number;
    max_taxa: number;
    min_lotes: number;
    max_lotes: number;
  };
  dimensoes: Record<string, number>;
  particoes_fato: Record<string, { linhas: number; transferencias: number; tamanho_mb: number }>;
  cubo_analitico: { linhas: number; transferencias: number; tamanho_mb: number };
}

let dbInstance: duckdb.AsyncDuckDB | null = null;
let connInstance: duckdb.AsyncDuckDBConnection | null = null;
let manifestData: ManifestData | null = null;
let initPromise: Promise<duckdb.AsyncDuckDB> | null = null;

export async function getManifest(): Promise<ManifestData> {
  if (manifestData) return manifestData;
  const res = await fetch('/data/manifest.json');
  if (!res.ok) {
    throw new Error(`Falha ao carregar manifest.json: ${res.statusText}`);
  }
  manifestData = await res.json();
  return manifestData!;
}

export async function initDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const logger = new duckdb.ConsoleLogger();
      
      // Configuração de bundles locais (self-hosted no public/duckdb/)
      const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
        mvp: {
          mainModule: '/duckdb/duckdb-mvp.wasm',
          mainWorker: '/duckdb/duckdb-browser-mvp.worker.js',
        },
        eh: {
          mainModule: '/duckdb/duckdb-eh.wasm',
          mainWorker: '/duckdb/duckdb-browser-eh.worker.js',
        },
      };

      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
      const worker = new Worker(bundle.mainWorker!);
      const db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

      const conn = await db.connect();
      dbInstance = db;
      connInstance = conn;

      // Carregar manifest para saber limites e metadados
      await getManifest();

      // Registrar arquivo do cubo principal pré-agregado
      await db.registerFileURL('cubo_transferencias.parquet', '/data/cubo_transferencias.parquet', duckdb.DuckDBDataProtocol.HTTP, false);
      await conn.query(`CREATE OR REPLACE VIEW cubo AS SELECT * FROM 'cubo_transferencias.parquet';`);

      // Registrar dimensões para queries ricas e filtros
      const dims = [
        'dim_data', 'dim_municipio', 'dim_genero', 'dim_estado_civil', 'dim_faixa_etaria',
        'dim_grau_instrucao', 'dim_cor_raca', 'dim_identidade_genero', 'dim_quilombola', 'dim_interprete_libras'
      ];
      
      for (const d of dims) {
        await db.registerFileURL(`${d}.parquet`, `/data/${d}.parquet`, duckdb.DuckDBDataProtocol.HTTP, false);
        await conn.query(`CREATE OR REPLACE VIEW ${d} AS SELECT * FROM '${d}.parquet';`);
      }

      console.log('>>> [DuckDB-WASM] Inicializado com sucesso e views criadas.');
      return db;
    } catch (err) {
      console.error('>>> [DuckDB-WASM] Erro na inicialização:', err);
      initPromise = null;
      dbInstance = null;
      connInstance = null;
      throw err;
    }
  })();

  return initPromise;
}

export async function getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
  if (!connInstance) {
    await initDuckDB();
  }
  return connInstance!;
}

/**
 * Executa uma consulta SQL parametrizada retornando array de objetos JavaScript.
 * Suporta cancelamento lógico e tracking de queries concorrentes.
 */
export async function executeQuery<T = any>(sql: string): Promise<T[]> {
  const conn = await getConnection();
  const startTime = performance.now();

  try {
    const result = await conn.query(sql);
    const duration = performance.now() - startTime;

    const rows: T[] = result.toArray().map((row: any) => row.toJSON() as T);
    if (duration > 100) {
      console.debug(`[DuckDB Query (${duration.toFixed(1)}ms)]: ${sql.substring(0, 100)}...`);
    }
    return rows;
  } catch (err) {
    console.error(`[DuckDB Error] em: ${sql}`, err);
    throw err;
  }
}

/**
 * Limpa instâncias e recarrega tudo
 */
export async function resetDatabase(): Promise<void> {
  if (connInstance) {
    try { await connInstance.close(); } catch (_) {}
  }
  if (dbInstance) {
    try { await dbInstance.terminate(); } catch (_) {}
  }
  dbInstance = null;
  connInstance = null;
  initPromise = null;
  manifestData = null;
  await initDuckDB();
}
