import os
import duckdb
import pandas as pd
from sqlalchemy import create_engine

# Modo de conexão: 'parquet' (padrão nuvem) ou 'mysql' (local)
DW_MODE = os.getenv("DW_MODE", "parquet")

MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASS = os.getenv("MYSQL_PASS", "")
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_DB = os.getenv("MYSQL_DB", "tse_dw")

_duckdb_con = None

def get_duckdb_connection():
    global _duckdb_con
    if _duckdb_con is None:
        _duckdb_con = duckdb.connect()
        # Limite conservador de memória para nuvem (512MB)
        _duckdb_con.execute("PRAGMA memory_limit = '512MB';")
        _duckdb_con.execute("PRAGMA threads = 2;")
        
        # Determinar caminho base de dados
        base_dir = os.path.dirname(__file__)
        data_dir = os.path.join(base_dir, "data")
        
        # Registrar views das dimensões
        dims = ["dim_data", "dim_municipio", "dim_genero", "dim_estado_civil", "dim_faixa_etaria",
                "dim_grau_instrucao", "dim_cor_raca", "dim_identidade_genero", "dim_quilombola", "dim_interprete_libras"]
        for d in dims:
            p_file = os.path.join(data_dir, f"{d}.parquet").replace("\\", "/")
            _duckdb_con.execute(f"CREATE VIEW IF NOT EXISTS {d} AS SELECT * FROM '{p_file}';")
            
        # Registrar view da fato sobre as partições particionadas por ano (2022 a 2026)
        fato_pattern = os.path.join(data_dir, "fato_[0-9]*.parquet").replace("\\", "/")
        _duckdb_con.execute(f"CREATE VIEW IF NOT EXISTS fato_transferencia AS SELECT * FROM read_parquet('{fato_pattern}');")
    return _duckdb_con

def _corrigir_encoding_texto(df: pd.DataFrame) -> pd.DataFrame:
    """Corrige sequências '????' geradas por perda de encoding na origem."""
    for col in df.select_dtypes(include=["object", "string"]).columns:
        df[col] = (
            df[col]
            .astype(str)
            .str.replace("????", "çã", regex=False)
            .str.replace("??", "ã", regex=False)
        )
    return df


def executar_consulta(sql_query: str) -> pd.DataFrame:
    """Executa a consulta SQL no backend ativo (DuckDB/Parquet ou MySQL)."""
    if DW_MODE == "mysql":
        engine = create_engine(f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASS}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}")
        with engine.connect() as conn:
            # Ativar ANSI_QUOTES para compatibilidade com aspas duplas em "key"
            conn.execute("SET SESSION sql_mode = CONCAT(@@sql_mode, ',ANSI_QUOTES');")
            df = pd.read_sql(sql_query, conn)
            return _corrigir_encoding_texto(df)
    else:
        con = get_duckdb_connection()
        df = con.execute(sql_query).fetchdf()
        return _corrigir_encoding_texto(df)
