import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import os
import sys

# Importar camada de dados
sys.path.append(os.path.dirname(__file__))
from dados import executar_consulta

st.set_page_config(
    page_title="Painel de Transferência do Eleitorado (TSE)",
    page_icon="🗳️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilo visual moderno
st.markdown("""
<style>
    .main-header { font-size: 2.2rem; font-weight: 700; color: #1e3a8a; margin-bottom: 0.2rem; }
    .sub-header { font-size: 1.05rem; color: #475569; margin-bottom: 1.5rem; }
    .metric-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
    .insight-box { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 14px; border-radius: 4px; margin-top: 15px; }
</style>
""", unsafe_allow_html=True)

# Barra Lateral
st.sidebar.title("🗳️ Painel Analítico TSE")
st.sidebar.markdown("**Data Warehouse em Esquema Estrela**\nTransferência do Eleitorado (2022 a 2026)")

menu = st.sidebar.radio(
    "Navegação:",
    [
        "Visão Geral do Estudo de Caso",
        "Análise 1: Transferências por Ano e Mês",
        "Análise 2: Migração Inter-regional (Origem x Destino)",
        "Análise 3: Municípios que Mais Receberam no Nordeste",
        "Análise 4: Jovens e Escolaridade nas Capitais",
        "Análise 5: Cor/Raça e Gênero nas Regiões",
        "Análise 6: Quilombolas e Intérprete de Libras",
        "Análise 7: Saldo Migratório dos Estados",
        "Análise 8: Rota Histórica Nordeste e Sudeste"
    ]
)

st.sidebar.markdown("---")
st.sidebar.caption("Disciplina: Modelagem de Dados (2ª VA)\nUniversidade Federal Rural de Pernambuco (UFRPE)")

# -------------------------------------------------------------
# PÁGINA 1: VISÃO GERAL
# -------------------------------------------------------------
if menu == "Visão Geral do Estudo de Caso":
    st.markdown('<div class="main-header">Estudo de Caso: Transferência do Eleitorado Brasileiro</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Arquitetura de Data Warehouse Dimensional em Esquema Estrela baseada em Dados Abertos do Tribunal Superior Eleitoral (TSE)</div>', unsafe_allow_html=True)
    
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Registros na Fato", "11.977.648")
    col2.metric("Total de Transferências", "12.776.407")
    col3.metric("Dimensões Analíticas", "10")
    col4.metric("Período Coberto", "2022 a 2026")
    
    st.markdown("### Arquitetura e Modelagem Dimensional")
    st.markdown("""
    O Data Warehouse adota um **Esquema Estrela (Star Schema)** concebido para análises multidimensionais de alto desempenho:
    - **Tabela Fato Central:** `fato_transferencia`, consolidando a métrica quantitativa aditiva `quantidade`.
    - **Dimensão Temporal:** `dim_data` com granularidade mensal, trimestre, semestre e classificação de pleitos (eleição geral, municipal ou sem eleição).
    - **Dimensão Geográfica Desnormalizada:** `dim_municipio` utilizada com **papel duplo** (Município de Origem e Município de Destino), contemplando município, estado e macrorregião oficial do IBGE.
    - **Dimensões Sociodemográficas:** Perfil completo contemplando gênero, estado civil, faixa etária, grau de instrução, cor/raça, identidade de gênero, quilombola e intérprete de Libras.
    """)
    
    st.info("💡 **Dica:** Utilize o menu na barra lateral para explorar as 8 análises analíticas multidimensionais.")

# -------------------------------------------------------------
# ANÁLISE 1
# -------------------------------------------------------------
elif menu == "Análise 1: Transferências por Ano e Mês":
    st.markdown('<div class="main-header">Quantos eleitores transferiram o título em cada ano e mês?</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Acompanhar a evolução temporal mensal do fluxo de transferências eleitorais, separando anos de eleições gerais, eleições municipais e anos sem pleito.")
    
    col_f1, col_f2 = st.columns(2)
    anos_sel = col_f1.multiselect("Filtrar por Ano:", [2022, 2023, 2024, 2025, 2026], default=[2022, 2023, 2024, 2025, 2026])
    
    where_ano = f"WHERE d.ano IN ({','.join(map(str, anos_sel))})" if anos_sel else ""
    sql = f"""
    SELECT 
        d.ano AS "Ano",
        d.nome_mes AS "Mês",
        d.tipo_eleicao AS "Tipo de Eleição",
        SUM(f.quantidade) AS "Total de Transferências"
    FROM fato_transferencia f
    JOIN dim_data d ON f.data_key = d."key"
    {where_ano}
    GROUP BY d.ano, d.mes, d.nome_mes, d.tipo_eleicao
    ORDER BY d.ano, d.mes;
    """
    
    df = executar_consulta(sql)
    
    fig = px.line(df, x="Mês", y="Total de Transferências", color="Ano", markers=True,
                  title="Evolução Mensal das Transferências por Ano")
    st.plotly_chart(fig, use_container_width=True)
    
    st.dataframe(df, use_container_width=True)
    st.download_button("Baixar Dados (CSV)", df.to_csv(index=False).encode("utf-8"), "analise01.csv", "text/csv")
    
    st.markdown("""
    <div class="insight-box">
        <b>Análise dos Resultados:</b> Observa-se um pico expressivo de transferências eleitorais no primeiro semestre dos anos eleitorais (especialmente em abril e maio de 2022 e 2024), decorrente do fechamento oficial do cadastro eleitoral regulamentado pela legislação (150 dias antes do primeiro turno). Nos anos ímpares (2023 e 2025), o volume permanece regular e distribuído.<br><br>
        <i>Nota Metodológica sobre 2026:</i> A série histórica de 2026 encerra-se em julho porque a coleta dos microdados abertos no portal do TSE foi efetuada no início de agosto de 2026, de modo que a base oficial consolidada contempla os registros até julho do corrente ano.
    </div>
    """, unsafe_allow_html=True)

# -------------------------------------------------------------
# ANÁLISE 2
# -------------------------------------------------------------
elif menu == "Análise 2: Migração Inter-regional (Origem x Destino)":
    st.markdown('<div class="main-header">De qual região do país para qual região os eleitores se mudam?</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Mapear os fluxos migratórios inter-regionais no Brasil, confrontando as macrorregiões de origem e destino.")
    
    sql = """
    SELECT 
        mo.regiao AS "Região de Origem",
        md.regiao AS "Região de Destino",
        SUM(f.quantidade) AS "Total de Transferências"
    FROM fato_transferencia f
    JOIN dim_municipio mo ON f.municipio_origem_key = mo."key"
    JOIN dim_municipio md ON f.municipio_destino_key = md."key"
    GROUP BY mo.regiao, md.regiao
    ORDER BY "Total de Transferências" DESC;
    """
    df = executar_consulta(sql)
    
    pivot_df = df.pivot(index="Região de Origem", columns="Região de Destino", values="Total de Transferências").fillna(0)
    fig = px.imshow(pivot_df, text_auto=True, aspect="auto", color_continuous_scale="Blues",
                    title="Matriz de Migração Inter-regional (Volume de Eleitores)")
    st.plotly_chart(fig, use_container_width=True)
    
    st.dataframe(df, use_container_width=True)
    st.download_button("Baixar Dados (CSV)", df.to_csv(index=False).encode("utf-8"), "analise02.csv", "text/csv")
    
    st.markdown("""
    <div class="insight-box">
        <b>Análise dos Resultados:</b> A maior parte das transferências de domicílio eleitoral ocorre dentro da própria região geográfica (migração intra-regional), com destaque para o Sudeste e o Nordeste. Nas migrações inter-regionais de longa distância, a rota Nordeste para o Sudeste lidera o volume absoluto.
    </div>
    """, unsafe_allow_html=True)

# -------------------------------------------------------------
# ANÁLISE 3
# -------------------------------------------------------------
elif menu == "Análise 3: Municípios que Mais Receberam no Nordeste":
    st.markdown('<div class="main-header">Quais são os municípios que mais receberam eleitores no Nordeste?</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Identificar os polos atratores municipais no Nordeste e calcular sua participação percentual na região.")
    
    top_n = st.slider("Quantidade de cidades no ranking:", 5, 20, 10)
    
    sql = f"""
    SELECT 
        md.nome AS "Município de Destino",
        md.uf AS "UF",
        SUM(f.quantidade) AS "Total de Transferências",
        ROUND(SUM(f.quantidade) * 100.0 / SUM(SUM(f.quantidade)) OVER (), 2) AS "Percentual no Nordeste (%)"
    FROM fato_transferencia f
    JOIN dim_municipio md ON f.municipio_destino_key = md."key"
    WHERE md.regiao = 'Nordeste'
    GROUP BY md.nome, md.uf
    ORDER BY "Total de Transferências" DESC
    LIMIT {top_n};
    """
    df = executar_consulta(sql)
    
    fig = px.bar(df, x="Total de Transferências", y="Município de Destino", orientation="h", color="UF",
                 title="Municípios com Maior Volume de Entradas no Nordeste")
    fig.update_layout(yaxis={'categoryorder':'total ascending'})
    st.plotly_chart(fig, use_container_width=True)
    
    st.dataframe(df, use_container_width=True)
    st.download_button("Baixar Dados (CSV)", df.to_csv(index=False).encode("utf-8"), "analise03.csv", "text/csv")

# -------------------------------------------------------------
# ANÁLISE 4
# -------------------------------------------------------------
elif menu == "Análise 4: Jovens e Escolaridade nas Capitais":
    st.markdown('<div class="main-header">Qual a faixa etária e a escolaridade dos jovens que se mudam para as capitais?</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Avaliar o perfil educacional do eleitorado jovem (16 a 24 anos) migrando para as grandes metrópoles.")
    
    sql = """
    SELECT 
        fe.descricao AS "Faixa Etária",
        SUM(CASE WHEN gi.descricao LIKE '%SUPERIOR%' THEN f.quantidade ELSE 0 END) AS "Ensino Superior",
        SUM(CASE WHEN gi.descricao LIKE '%MÉDIO%' THEN f.quantidade ELSE 0 END) AS "Ensino Médio",
        SUM(CASE WHEN gi.descricao LIKE '%FUNDAMENTAL%' THEN f.quantidade ELSE 0 END) AS "Ensino Fundamental",
        SUM(CASE WHEN gi.descricao NOT LIKE '%SUPERIOR%' AND gi.descricao NOT LIKE '%MÉDIO%' AND gi.descricao NOT LIKE '%FUNDAMENTAL%' THEN f.quantidade ELSE 0 END) AS "Outros / Não Informado",
        SUM(f.quantidade) AS "Total de Jovens"
    FROM fato_transferencia f
    JOIN dim_faixa_etaria fe ON f.faixa_etaria_key = fe."key"
    JOIN dim_grau_instrucao gi ON f.grau_instrucao_key = gi."key"
    JOIN dim_municipio md ON f.municipio_destino_key = md."key"
    WHERE fe.codigo IN (1600, 1700, 1800, 1900, 2000, 2124)
      AND md.nome IN ('SÃO PAULO', 'RIO DE JANEIRO', 'BRASÍLIA', 'BELO HORIZONTE', 'SALVADOR', 'FORTALEZA', 'CURITIBA', 'RECIFE', 'PORTO ALEGRE', 'GOIÂNIA', 'MANAUS', 'BELÉM')
    GROUP BY fe.codigo, fe.descricao
    ORDER BY fe.codigo;
    """
    df = executar_consulta(sql)
    
    fig = px.bar(df, x="Faixa Etária", y=["Ensino Superior", "Ensino Médio", "Ensino Fundamental", "Outros / Não Informado"],
                 title="Distribuição dos Jovens Eleitores por Faixa Etária e Escolaridade nas Capitais",
                 barmode="stack")
    st.plotly_chart(fig, use_container_width=True)
    st.dataframe(df, use_container_width=True)
    st.download_button("Baixar Dados (CSV)", df.to_csv(index=False).encode("utf-8"), "analise04.csv", "text/csv")
    
    st.markdown("""
    <div class="insight-box">
        <b>Análise dos Resultados:</b> O contingente de jovens migrantes amplia-se expressivamente com o avanço da idade: 39 eleitores de 16 anos, 1.165 aos 17, 6.002 aos 18, 11.931 aos 19, 16.614 aos 20 anos e atinge o ápice de 102.927 eleitores no grupo de 21 a 24 anos. O Ensino Médio é a base educacional dominante (72.336 eleitores aos 21–24 anos), seguido pela rápida expansão do Ensino Superior (41.155 jovens aos 21–24 anos e 5.832 aos 20 anos), evidenciando a forte atração exercida pelas capitais para formação acadêmica e inserção profissional.
    </div>
    """, unsafe_allow_html=True)

# -------------------------------------------------------------
# ANÁLISE 5
# -------------------------------------------------------------
elif menu == "Análise 5: Cor/Raça e Gênero nas Regiões":
    st.markdown('<div class="main-header">Como se dividem cor/raça e gênero entre os eleitores que transferiram o título?</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Analisar a composição sociodemográfica da migração eleitoral no Brasil a partir do cruzamento entre raça/cor autodeclarada e gênero dos eleitores.")
    
    sql = """
    SELECT 
        cr.descricao AS "Cor ou Raça",
        SUM(CASE WHEN g.descricao = 'FEMININO' THEN f.quantidade ELSE 0 END) AS "Mulheres",
        SUM(CASE WHEN g.descricao = 'MASCULINO' THEN f.quantidade ELSE 0 END) AS "Homens",
        SUM(f.quantidade) AS "Total de Transferências",
        ROUND(SUM(f.quantidade) * 100.0 / SUM(SUM(f.quantidade)) OVER (), 2) AS "Participação (%)"
    FROM fato_transferencia f
    JOIN dim_cor_raca cr ON f.cor_raca_key = cr."key"
    JOIN dim_genero g ON f.genero_key = g."key"
    WHERE cr.descricao != 'Não informado'
    GROUP BY cr.codigo, cr.descricao
    ORDER BY "Total de Transferências" DESC;
    """
    df = executar_consulta(sql)
    
    fig = go.Figure()
    fig.add_trace(go.Bar(x=df["Cor ou Raça"], y=df["Mulheres"], name="Mulheres", marker_color="#ec4899"))
    fig.add_trace(go.Bar(x=df["Cor ou Raça"], y=df["Homens"], name="Homens", marker_color="#3b82f6"))
    fig.update_layout(barmode="group", title="Distribuição por Cor/Raça e Gênero do Eleitorado Migrante",
                      xaxis_title="Cor ou Raça Autodeclarada", yaxis_title="Total de Transferências")
    st.plotly_chart(fig, use_container_width=True)
    st.dataframe(df, use_container_width=True)
    st.download_button("Baixar Dados (CSV)", df.to_csv(index=False).encode("utf-8"), "analise05.csv", "text/csv")
    
    st.markdown("""
    <div class="insight-box">
        <b>Análise dos Resultados:</b> Eleitores autodeclarados pardos lideram as transferências eleitorais com 36,70% do total nacional (4,68 milhões de eleitores), seguidos pelo eleitorado branco com 25,62% e preto com 7,03%. Em todas as categorias raciais observa-se um leve predomínio de eleitoras do gênero feminino (52,5% do total geral de transferências).
    </div>
    """, unsafe_allow_html=True)

# -------------------------------------------------------------
# ANÁLISE 6
# -------------------------------------------------------------
elif menu == "Análise 6: Quilombolas e Intérprete de Libras":
    st.markdown('<div class="main-header">Quantos eleitores quilombolas e quantos que precisam de intérprete de Libras se mudam para cada estado?</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Acompanhar as migrações de grupos tradicionais e com demandas de acessibilidade comunicacional.")
    
    sql = """
    SELECT 
        md.estado AS "Estado de Destino",
        md.uf AS "UF",
        SUM(CASE WHEN q.descricao = 'SIM' THEN f.quantidade ELSE 0 END) AS "Eleitores Quilombolas",
        SUM(CASE WHEN il.descricao = 'SIM' THEN f.quantidade ELSE 0 END) AS "Necessitam de Libras"
    FROM fato_transferencia f
    JOIN dim_municipio md ON f.municipio_destino_key = md."key"
    JOIN dim_quilombola q ON f.quilombola_key = q."key"
    JOIN dim_interprete_libras il ON f.interprete_libras_key = il."key"
    WHERE q.descricao = 'SIM' OR il.descricao = 'SIM'
    GROUP BY md.estado, md.uf
    ORDER BY "Eleitores Quilombolas" DESC, "Necessitam de Libras" DESC;
    """
    df = executar_consulta(sql)
    fig = px.bar(df, x="UF", y=["Eleitores Quilombolas", "Necessitam de Libras"], barmode="group",
                 title="Migração de Comunidades Quilombolas e Eleitores que Demandam Libras")
    st.plotly_chart(fig, use_container_width=True)
    st.dataframe(df, use_container_width=True)

# -------------------------------------------------------------
# ANÁLISE 7
# -------------------------------------------------------------
elif menu == "Análise 7: Saldo Migratório dos Estados":
    st.markdown('<div class="main-header">Quais estados ganharam e quais perderam eleitores?</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Balanço migratório estadual líquido (entradas menos saídas por Unidade da Federação).")
    
    sql = """
    WITH Entradas AS (
        SELECT md.uf, md.estado, SUM(f.quantidade) AS total_entradas
        FROM fato_transferencia f
        JOIN dim_municipio md ON f.municipio_destino_key = md."key"
        GROUP BY md.uf, md.estado
    ),
    Saidas AS (
        SELECT mo.uf, SUM(f.quantidade) AS total_saidas
        FROM fato_transferencia f
        JOIN dim_municipio mo ON f.municipio_origem_key = mo."key"
        GROUP BY mo.uf
    )
    SELECT 
        e.estado AS "Estado",
        e.uf AS "UF",
        e.total_entradas AS "Total Recebido (Entradas)",
        COALESCE(s.total_saidas, 0) AS "Total Cedido (Saídas)",
        (e.total_entradas - COALESCE(s.total_saidas, 0)) AS "Saldo Migratório Líquido"
    FROM Entradas e
    LEFT JOIN Saidas s ON e.uf = s.uf
    ORDER BY "Saldo Migratório Líquido" DESC;
    """
    df = executar_consulta(sql)
    fig = px.bar(df, x="UF", y="Saldo Migratório Líquido", color="Saldo Migratório Líquido",
                 color_continuous_scale="RdYlGn", title="Saldo Migratório Líquido Eleitoral por Estado")
    st.plotly_chart(fig, use_container_width=True)
    st.dataframe(df, use_container_width=True)

# -------------------------------------------------------------
# ANÁLISE 8
# -------------------------------------------------------------
elif menu == "Análise 8: Rota Histórica Nordeste e Sudeste":
    st.markdown('<div class="main-header">Quantos eleitores foram do Nordeste para o Sudeste e quantos fizeram o caminho de volta, ano a ano?</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Avaliar a rota histórica Nordeste/Sudeste e comparar o fluxo de ida com a corrente de retorno.")
    
    sql = """
    SELECT 
        d.ano AS "Ano",
        SUM(CASE WHEN mo.regiao = 'Nordeste' AND md.regiao = 'Sudeste' THEN f.quantidade ELSE 0 END) AS "Nordeste para Sudeste",
        SUM(CASE WHEN mo.regiao = 'Sudeste' AND md.regiao = 'Nordeste' THEN f.quantidade ELSE 0 END) AS "Sudeste para Nordeste",
        SUM(CASE WHEN mo.regiao = 'Nordeste' AND md.regiao = 'Sudeste' THEN f.quantidade ELSE 0 END) -
        SUM(CASE WHEN mo.regiao = 'Sudeste' AND md.regiao = 'Nordeste' THEN f.quantidade ELSE 0 END) AS "Saldo Líquido (NE x SE)"
    FROM fato_transferencia f
    JOIN dim_data d ON f.data_key = d."key"
    JOIN dim_municipio mo ON f.municipio_origem_key = mo."key"
    JOIN dim_municipio md ON f.municipio_destino_key = md."key"
    WHERE (mo.regiao = 'Nordeste' AND md.regiao = 'Sudeste')
       OR (mo.regiao = 'Sudeste' AND md.regiao = 'Nordeste')
    GROUP BY d.ano
    ORDER BY d.ano ASC;
    """
    df = executar_consulta(sql)
    fig = go.Figure()
    fig.add_trace(go.Bar(x=df["Ano"], y=df["Nordeste para Sudeste"], name="Nordeste → Sudeste", marker_color="#ea580c"))
    fig.add_trace(go.Bar(x=df["Ano"], y=df["Sudeste para Nordeste"], name="Sudeste → Nordeste (Retorno)", marker_color="#0284c7"))
    fig.update_layout(barmode="group", title="Fluxo Comparativo: Nordeste vs. Sudeste Ano a Ano")
    st.plotly_chart(fig, use_container_width=True)
    st.dataframe(df, use_container_width=True)
