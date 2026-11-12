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
    .main-header { font-size: 2.2rem; font-weight: 700; color: #3b82f6; margin-bottom: 0.2rem; }
    .sub-header { font-size: 1.05rem; opacity: 0.8; margin-bottom: 1.5rem; }
    .metric-card { background-color: #f8fafc; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
    .insight-box { background-color: #eff6ff; color: #0f172a; border-left: 4px solid #2563eb; padding: 14px; border-radius: 4px; margin-top: 15px; }
</style>
""", unsafe_allow_html=True)

# Barra Lateral
st.sidebar.title("🗳️ Painel do Eleitorado (TSE)")
st.sidebar.markdown("**Transferência de Título no Brasil (2022 a 2026)**")

menu = st.sidebar.radio(
    "Escolha o que deseja ver:",
    [
        "Visão Geral",
        "Análise 1: Transferências por Ano e Mês",
        "Análise 2: Mudanças entre Regiões (Origem x Destino)",
        "Análise 3: Cidades que Mais Receberam no Nordeste",
        "Análise 4: Jovens e Escolaridade nas Capitais",
        "Análise 5: Cor/Raça e Gênero nas Regiões",
        "Análise 6: Quilombolas e Intérprete de Libras",
        "Análise 7: Saldo dos Estados (Quem Ganhou x Perdeu)",
        "Análise 8: Rota Nordeste e Sudeste",
        "Comparador de Estados",
        "Explorador Livre (Perfil do Eleitor)",
        "Simulador de Rotas (Origem → Destino)"
    ]
)

st.sidebar.markdown("---")
st.sidebar.subheader("🔍 Filtros Globais (Visão Geral)")

@st.cache_data(ttl=3600)
def carregar_opcoes_filtros():
    anos = executar_consulta('SELECT DISTINCT ano FROM dim_data ORDER BY ano;')["ano"].tolist()
    regioes = executar_consulta('SELECT DISTINCT regiao FROM dim_municipio WHERE regiao IS NOT NULL ORDER BY regiao;')["regiao"].tolist()
    ufs = executar_consulta('SELECT DISTINCT uf FROM dim_municipio WHERE uf IS NOT NULL ORDER BY uf;')["uf"].tolist()
    eleicoes = executar_consulta('SELECT DISTINCT tipo_eleicao FROM dim_data WHERE tipo_eleicao IS NOT NULL ORDER BY tipo_eleicao;')["tipo_eleicao"].tolist()
    return anos, regioes, ufs, eleicoes

op_anos, op_regioes, op_ufs, op_eleicoes = carregar_opcoes_filtros()

f_anos = st.sidebar.multiselect("Anos:", op_anos, default=op_anos, key="g_anos")
f_eleicao = st.sidebar.multiselect("Tipo de Eleição:", op_eleicoes, default=op_eleicoes, key="g_eleicao")
f_reg_orig = st.sidebar.multiselect("Região de Origem:", op_regioes, default=[], key="g_reg_orig")
f_reg_dest = st.sidebar.multiselect("Região de Destino:", op_regioes, default=[], key="g_reg_dest")
f_uf_dest = st.sidebar.multiselect("Estado de Destino (UF):", op_ufs, default=[], key="g_uf_dest")

def montar_where_global():
    conds = []
    if f_anos:
        conds.append(f"d.ano IN ({','.join(map(str, f_anos))})")
    if f_eleicao:
        vals = ",".join(f"'{e}'" for e in f_eleicao)
        conds.append(f"d.tipo_eleicao IN ({vals})")
    if f_reg_orig:
        vals = ",".join(f"'{r}'" for r in f_reg_orig)
        conds.append(f"mo.regiao IN ({vals})")
    if f_reg_dest:
        vals = ",".join(f"'{r}'" for r in f_reg_dest)
        conds.append(f"md.regiao IN ({vals})")
    if f_uf_dest:
        vals = ",".join(f"'{u}'" for u in f_uf_dest)
        conds.append(f"md.uf IN ({vals})")
    return ("WHERE " + " AND ".join(conds)) if conds else ""

st.sidebar.markdown("---")
st.sidebar.caption("Disciplina: Modelagem de Dados (2ª VA)\nUniversidade Federal Rural de Pernambuco (UFRPE)")

# -------------------------------------------------------------
# PÁGINA 1: VISÃO GERAL
# -------------------------------------------------------------
if menu == "Visão Geral":
    st.markdown('<div class="main-header">Transferência de Título do Eleitorado Brasileiro</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Painel interativo com dados abertos do Tribunal Superior Eleitoral (TSE) de 2022 a 2026</div>', unsafe_allow_html=True)

    where_g = montar_where_global()
    sql_kpi = f"""
    SELECT
        COALESCE(SUM(f.quantidade), 0) AS total,
        COUNT(*) AS registros
    FROM fato_transferencia f
    JOIN dim_data d ON f.data_key = d."key"
    JOIN dim_municipio mo ON f.municipio_origem_key = mo."key"
    JOIN dim_municipio md ON f.municipio_destino_key = md."key"
    {where_g};
    """
    kpi_df = executar_consulta(sql_kpi)
    total_transf = int(kpi_df["total"].iloc[0])
    total_reg = int(kpi_df["registros"].iloc[0])

    sql_top_uf = f"""
    SELECT md.uf AS uf, SUM(f.quantidade) AS total
    FROM fato_transferencia f
    JOIN dim_data d ON f.data_key = d."key"
    JOIN dim_municipio mo ON f.municipio_origem_key = mo."key"
    JOIN dim_municipio md ON f.municipio_destino_key = md."key"
    {where_g}
    GROUP BY md.uf
    ORDER BY total DESC
    LIMIT 1;
    """
    top_uf_df = executar_consulta(sql_top_uf)
    top_uf = top_uf_df["uf"].iloc[0] if not top_uf_df.empty else "-"

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Transferências (Filtro Atual)", f"{total_transf:,}".replace(",", "."))
    col2.metric("Linhas Analisadas", f"{total_reg:,}".replace(",", "."))
    col3.metric("Estado que Mais Recebeu", top_uf)
    col4.metric("Período Analisado", "2022 a 2026")

    st.markdown("### Relação entre Chegadas e Saídas por Estado")
    sql_disp = f"""
    SELECT
        uf AS "Estado",
        regiao AS "Região",
        SUM(chegaram) AS "Eleitores que Chegaram",
        SUM(sairam) AS "Eleitores que Saíram"
    FROM (
        SELECT md.uf AS uf, md.regiao AS regiao, SUM(f.quantidade) AS chegaram, 0 AS sairam
        FROM fato_transferencia f
        JOIN dim_data d ON f.data_key = d."key"
        JOIN dim_municipio mo ON f.municipio_origem_key = mo."key"
        JOIN dim_municipio md ON f.municipio_destino_key = md."key"
        {where_g}
        GROUP BY md.uf, md.regiao
        UNION ALL
        SELECT mo.uf AS uf, mo.regiao AS regiao, 0 AS chegaram, SUM(f.quantidade) AS sairam
        FROM fato_transferencia f
        JOIN dim_data d ON f.data_key = d."key"
        JOIN dim_municipio mo ON f.municipio_origem_key = mo."key"
        JOIN dim_municipio md ON f.municipio_destino_key = md."key"
        {where_g}
        GROUP BY mo.uf, mo.regiao
    ) t
    GROUP BY uf, regiao;
    """
    df_disp = executar_consulta(sql_disp)
    if not df_disp.empty:
        fig_disp = px.scatter(
            df_disp,
            x="Eleitores que Saíram",
            y="Eleitores que Chegaram",
            color="Região",
            text="Estado",
            title="Cada ponto é um estado: quanto mais para cima, mais eleitores chegaram; quanto mais para a direita, mais saíram"
        )
        fig_disp.update_traces(textposition="top center", marker=dict(size=10))
        st.plotly_chart(fig_disp, use_container_width=True)

    with st.expander("📐 Ver como os dados estão organizados (Esquema Estrela)"):
        st.markdown("""
        Os dados foram organizados no formato **Esquema Estrela** (uma tabela principal central ligada a várias tabelas de apoio):
        - **Tabela Principal (Fato):** `fato_transferencia`, que guarda a quantidade de eleitores que mudaram de cidade.
        - **Tabela de Datas:** `dim_data`, com ano, mês e se houve eleição (geral, municipal ou sem eleição).
        - **Tabela de Cidades:** `dim_municipio`, usada tanto para a cidade de **origem** quanto para a cidade de **destino**.
        - **Tabelas de Perfil do Eleitor:** gênero, estado civil, faixa de idade, escolaridade, cor/raça, identidade de gênero, quilombola e intérprete de Libras.
        """)

    st.info("💡 **Dica:** Use os filtros na barra lateral para atualizar os números acima ou escolha uma das análises no menu.")

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
elif menu == "Análise 2: Mudanças entre Regiões (Origem x Destino)":
    st.markdown('<div class="main-header">De qual região do país para qual região os eleitores se mudam?</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Mostrar as mudanças de eleitores entre as regiões do Brasil (origem e destino).")
    
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
        <b>Análise dos Resultados:</b> A maior parte das transferências de título acontece dentro da própria região (mudanças entre cidades ou estados vizinhos), com destaque para o Sudeste e o Nordeste. Já nas mudanças de longa distância entre regiões diferentes, a rota do Nordeste para o Sudeste é a que tem mais eleitores.
    </div>
    """, unsafe_allow_html=True)

# -------------------------------------------------------------
# ANÁLISE 3
# -------------------------------------------------------------
elif menu == "Análise 3: Cidades que Mais Receberam no Nordeste":
    st.markdown('<div class="main-header">Quais são as cidades que mais receberam eleitores no Nordeste?</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Mostrar as cidades do Nordeste que mais atraíram eleitores e quanto cada uma representa do total da região.")
    
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
elif menu == "Análise 7: Saldo dos Estados (Quem Ganhou x Perdeu)":
    st.markdown('<div class="main-header">Quais estados ganharam e quais perderam eleitores?</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Mostrar o saldo de eleitores de cada estado (quantos chegaram menos quantos saíram).")
    
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
elif menu == "Análise 8: Rota Nordeste e Sudeste":
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


# -------------------------------------------------------------
# COMPARADOR DE ESTADOS
# -------------------------------------------------------------
elif menu == "Comparador de Estados":
    st.markdown('<div class="main-header">Comparador de Estados</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Escolha dois estados para comparar lado a lado quantos eleitores chegaram, quantos saíram e qual foi o saldo.")

    ufs_df = executar_consulta('SELECT DISTINCT uf AS "UF" FROM dim_municipio WHERE uf IS NOT NULL ORDER BY uf;')
    lista_ufs = ufs_df["UF"].tolist()

    col_u1, col_u2 = st.columns(2)
    uf_a = col_u1.selectbox("Primeiro Estado (UF):", lista_ufs, index=lista_ufs.index("SP") if "SP" in lista_ufs else 0)
    uf_b = col_u2.selectbox("Segundo Estado (UF):", lista_ufs, index=lista_ufs.index("BA") if "BA" in lista_ufs else 1)

    sql_comp = f"""
    SELECT
        uf AS "Estado",
        SUM(chegaram) AS "Eleitores que Chegaram",
        SUM(sairam) AS "Eleitores que Saíram",
        SUM(chegaram) - SUM(sairam) AS "Saldo (Chegaram - Saíram)"
    FROM (
        SELECT md.uf AS uf, SUM(f.quantidade) AS chegaram, 0 AS sairam
        FROM fato_transferencia f
        JOIN dim_municipio md ON f.municipio_destino_key = md."key"
        WHERE md.uf IN ('{uf_a}', '{uf_b}')
        GROUP BY md.uf
        UNION ALL
        SELECT mo.uf AS uf, 0 AS chegaram, SUM(f.quantidade) AS sairam
        FROM fato_transferencia f
        JOIN dim_municipio mo ON f.municipio_origem_key = mo."key"
        WHERE mo.uf IN ('{uf_a}', '{uf_b}')
        GROUP BY mo.uf
    ) t
    GROUP BY uf
    ORDER BY uf;
    """
    df_comp = executar_consulta(sql_comp)
    fig_comp = go.Figure()
    fig_comp.add_trace(go.Bar(x=df_comp["Estado"], y=df_comp["Eleitores que Chegaram"], name="Chegaram", marker_color="#16a34a"))
    fig_comp.add_trace(go.Bar(x=df_comp["Estado"], y=df_comp["Eleitores que Saíram"], name="Saíram", marker_color="#dc2626"))
    fig_comp.update_layout(barmode="group", title=f"Comparação de Entradas e Saídas: {uf_a} vs {uf_b}")
    st.plotly_chart(fig_comp, use_container_width=True)
    st.dataframe(df_comp, use_container_width=True)

# -------------------------------------------------------------
# EXPLORADOR LIVRE (PERFIL DO ELEITOR)
# -------------------------------------------------------------
elif menu == "Explorador Livre (Perfil do Eleitor)":
    st.markdown('<div class="main-header">Explorador Livre: Perfil do Eleitor</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Escolha uma característica dos eleitores (idade, escolaridade, cor/raça, gênero, etc.) e veja o total de transferências.")

    dimensoes = {
        "Faixa de Idade": ("dim_faixa_etaria", "faixa_etaria_key", "descricao"),
        "Escolaridade": ("dim_grau_instrucao", "grau_instrucao_key", "descricao"),
        "Cor / Raça": ("dim_cor_raca", "cor_raca_key", "descricao"),
        "Gênero": ("dim_genero", "genero_key", "descricao"),
        "Estado Civil": ("dim_estado_civil", "estado_civil_key", "descricao"),
        "Quilombola": ("dim_quilombola", "quilombola_key", "descricao"),
        "Intérprete de Libras": ("dim_interprete_libras", "interprete_libras_key", "descricao"),
    }

    col_e1, col_e2 = st.columns(2)
    escolha = col_e1.selectbox("Escolha a característica:", list(dimensoes.keys()))
    anos_exp = col_e2.multiselect("Filtrar por Ano (opcional):", [2022, 2023, 2024, 2025, 2026], default=[2022, 2023, 2024, 2025, 2026])

    tabela, fk_col, desc_col = dimensoes[escolha]
    where_exp = f"WHERE dt.ano IN ({','.join(map(str, anos_exp))})" if anos_exp else ""
    sql_exp = f"""
    SELECT
        d.{desc_col} AS "{escolha}",
        SUM(f.quantidade) AS "Total de Transferências"
    FROM fato_transferencia f
    JOIN {tabela} d ON f.{fk_col} = d."key"
    JOIN dim_data dt ON f.data_key = dt."key"
    {where_exp}
    GROUP BY d.{desc_col}
    ORDER BY "Total de Transferências" DESC;
    """
    df_exp = executar_consulta(sql_exp)
    fig_exp = px.bar(df_exp, x="Total de Transferências", y=escolha, orientation="h", title=f"Transferências por {escolha}")
    fig_exp.update_layout(yaxis={"categoryorder": "total ascending"})
    st.plotly_chart(fig_exp, use_container_width=True)
    st.dataframe(df_exp, use_container_width=True)


# -------------------------------------------------------------
# SIMULADOR DE ROTAS (ORIGEM -> DESTINO)
# -------------------------------------------------------------
elif menu == "Simulador de Rotas (Origem → Destino)":
    st.markdown('<div class="main-header">Simulador de Rotas (De Onde Para Onde)</div>', unsafe_allow_html=True)
    st.markdown("**Objetivo:** Escolha um estado de origem e descubra para quais cidades os eleitores mais se mudaram (ou o contrário).")

    col_r1, col_r2 = st.columns(2)
    direcao = col_r1.radio("O que você quer ver?", ["Para onde foram os eleitores que saíram de...", "De onde vieram os eleitores que chegaram em..."])
    uf_sel = col_r2.selectbox("Escolha o Estado (UF):", op_ufs, index=op_ufs.index("PE") if "PE" in op_ufs else 0)

    if direcao.startswith("Para onde"):
        sql_rota = f"""
        SELECT
            md.municipio || ' (' || md.uf || ')' AS "Cidade de Destino",
            md.regiao AS "Região de Destino",
            SUM(f.quantidade) AS "Total de Eleitores"
        FROM fato_transferencia f
        JOIN dim_municipio mo ON f.municipio_origem_key = mo."key"
        JOIN dim_municipio md ON f.municipio_destino_key = md."key"
        WHERE mo.uf = '{uf_sel}'
        GROUP BY md.municipio, md.uf, md.regiao
        ORDER BY "Total de Eleitores" DESC
        LIMIT 15;
        """
        eixo_y = "Cidade de Destino"
        titulo_r = f"Top 15 cidades que mais receberam eleitores saindo de {uf_sel}"
    else:
        sql_rota = f"""
        SELECT
            mo.municipio || ' (' || mo.uf || ')' AS "Cidade de Origem",
            mo.regiao AS "Região de Origem",
            SUM(f.quantidade) AS "Total de Eleitores"
        FROM fato_transferencia f
        JOIN dim_municipio mo ON f.municipio_origem_key = mo."key"
        JOIN dim_municipio md ON f.municipio_destino_key = md."key"
        WHERE md.uf = '{uf_sel}'
        GROUP BY mo.municipio, mo.uf, mo.regiao
        ORDER BY "Total de Eleitores" DESC
        LIMIT 15;
        """
        eixo_y = "Cidade de Origem"
        titulo_r = f"Top 15 cidades de onde mais saíram eleitores para {uf_sel}"

    df_rota = executar_consulta(sql_rota)
    fig_rota = px.bar(df_rota, x="Total de Eleitores", y=eixo_y, color=df_rota.columns[1], orientation="h", title=titulo_r)
    fig_rota.update_layout(yaxis={"categoryorder": "total ascending"})
    st.plotly_chart(fig_rota, use_container_width=True)
    st.dataframe(df_rota, use_container_width=True)
    st.download_button("📥 Baixar Tabela (CSV)", df_rota.to_csv(index=False).encode("utf-8"), file_name=f"rotas_{uf_sel}.csv", mime="text/csv")
