import duckdb
import os
import sys

# Testar se a importação do app e dos dados funciona 100%
sys.path.append("2VA/app")
from dados import executar_consulta

print(">>> Testando execução das 8 consultas via app/dados.py...")

sql_files = sorted([f for f in os.listdir("2VA/analises/sql") if f.endswith(".sql")])
for sf in sql_files:
    with open(f"2VA/analises/sql/{sf}", "r", encoding="utf-8") as f:
        sql = f.read()
    df = executar_consulta(sql)
    print(f"  {sf}: OK ({len(df)} linhas retornadas)")

print(">>> Teste de fumaça concluído com 100% de sucesso!")
