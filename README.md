# Dashboard de Transferências Eleitorais (TSE)

Painel analítico multidimensional para exploração e análise dos microdados oficiais de transferência de domicílio eleitoral do Tribunal Superior Eleitoral (TSE), cobrindo o período de 2022 a 2026.

O projeto foi construído sobre uma modelagem dimensional em **Esquema Estrela (*Star Schema*)** e opera de forma **100% estática e serverless no navegador**, utilizando **DuckDB-WASM** para consultar arquivos **Parquet**. Não é necessário manter servidores de banco de dados (MySQL ou backend) em execução para que o painel funcione.

---

## 1. Visão Geral dos Dados e Modelagem

* **Volume de Dados:** 11.977.648 registros processados na tabela fato e 12.776.407 transferências totais auditadas.
* **Tabela Fato (`fato_transferencia`):** Contém as métricas de quantidade de eleitores transferidos, transferências interestaduais e número de lotes processados.
* **Dimensões Conformadas:**
  * `dim_data`: Calendário mensal cobrindo os ciclos eleitorais de 2022 a 2026.
  * `dim_municipio`: 5.760 municípios do Brasil e exterior, com atributos de UF e Macrorregião.
  * `dim_faixa_etaria`: 22 grupos etários oficiais do TSE.
  * `dim_grau_instrucao`: Níveis de escolaridade (de Analfabeto a Superior Completo).
  * `dim_genero`: Gênero declarado do eleitor.
  * Dimensões adicionais no modelo: Estado Civil, Cor/Raça, Identidade de Gênero, Comunidade Quilombola e Intérprete de Libras.

O esquema estrela completo, com detalhamento das chaves e DDL em SQL, pode ser inspecionado diretamente no botão **"Modelo Star Schema (ERD)"** no cabeçalho da aplicação.

---

## 2. Arquitetura Técnica

* **Front-end:** React 19, TypeScript, Vite e Tailwind CSS.
* **Motor OLAP In-Browser:** **DuckDB-WASM** executado em Web Worker com suporte a multithreading (`SharedArrayBuffer`), processando agregações analíticas (GROUP BY, filtros e paginação) em menos de 50 ms no cliente.
* **Armazenamento de Dados:** Arquivos Parquet particionados por ano com compressão ZSTD (`public/data/`), totalizando ~34 MB para a totalidade dos dados históricos.
* **Gráficos Interativos:** Apache ECharts com temas dedicados para modo claro e escuro.
* **Sincronização de Estado:** Filtros refletidos bidirecionalmente na **URL**, permitindo compartilhar links com qualquer combinação de filtros ativa.
* **Exportação no Navegador:** Geração direta de arquivos `.csv` (UTF-8 com BOM para Excel) e planilhas nativas `.xlsx`.

---

## 3. Recursos e Visualizações

1. **Cartões de Métricas (KPIs):**
   * Total de Eleitores Transferidos.
   * Migração Interestadual (volume com mudança de estado).
   * Taxa Interestadual Ponderada (`soma(interestadual) / soma(total)`).
   * Média de Eleitores por Lote de processamento.
   * Total de Lotes registrados na Fato.

2. **Evolução Temporal:**
   * Gráfico misto com barras de total de eleitores e linha de migração interestadual.
   * Navegação em drill-down por breadcrumb: **Ano → Trimestre → Mês**.

3. **Transferências por Faixa Etária:**
   * Gráfico de barras horizontais ordenado por concentração de eleitores.
   * Alternador entre visão **Top 10** e visualização completa com scroll das **22 faixas etárias**.

4. **Desempenho Regional por UF & Mapa do Brasil:**
   * Visão em barras das 27 UFs agrupadas por macrorregião.
   * Visão em **Mapa Vetorial do Brasil (SVG)** interativo: clique em qualquer estado para filtrar instantaneamente o painel.

5. **Dispersão (Volume vs Taxa Interestadual):**
   * Gráfico de dispersão cruzando volume de transferências com a porcentagem interestadual.
   * Segmentação por gênero e diâmetro dos pontos proporcional à quantidade de lotes.

6. **Tabela Analítica Paginada:**
   * Listagem detalhada dos registros da fato com paginação executada no DuckDB (`LIMIT / OFFSET`).
   * Ordenação por coluna (Ano/Mês, Faixa Etária, UF, Quantidade, Taxa Interestadual) e contador de registros filtrados.

7. **Barra Lateral de Filtros:**
   * Período entre datas inicial e final.
   * Seleção por ano civil (2022 a 2026).
   * Faixa etária, macrorregião e seleção em cascata de estados (UF).
   * Gênero e nível de escolaridade.
   * Filtros quantitativos de volume de eleitores, taxa interestadual mínima e número de lotes.

8. **Temas Claro e Escuro:**
   * Alternador nativo no cabeçalho com paleta de alto contraste, tipografia adaptada (Plus Jakarta Sans e Space Grotesk) e algarismos tabulares em todas as métricas numéricas.

---

## 4. Estrutura do Diretório

```
dashboard/
├── public/
│   ├── _headers            # Cabeçalhos COOP/COEP para DuckDB-WASM e cache de dados
│   ├── data/               # Arquivos Parquet particionados do DW e manifest.json
│   ├── duckdb/             # Binários e workers WebAssembly do DuckDB
│   └── geo/                # GeoJSON dos limites estaduais do Brasil
├── src/
│   ├── app/                # Componente principal (App) e cabeçalho (Header)
│   ├── components/ui/      # Componentes de interface base (botões, cards)
│   ├── features/           # Módulos do painel: charts, filters, kpis, table, modals, export
│   ├── lib/                # Inicialização do DuckDB, queries SQL, store e formatadores
│   └── theme/              # Configurações de estilo, CSS e temas do ECharts
├── index.html              # Ponto de entrada HTML
├── netlify.toml            # Configuração de SPA e headers para Netlify
├── vercel.json             # Configuração de SPA e headers para Vercel
├── package.json            # Dependências e scripts
└── vite.config.ts          # Configuração de build do Vite
```

---

## 5. Como Executar Localmente

### Pré-requisitos
* Node.js 18 ou superior.
* Gerenciador de pacotes `pnpm` (ou `npm` / `yarn`).

### Comandos

1. **Instalar as dependências:**
   ```bash
   pnpm install
   ```

2. **Iniciar o ambiente de desenvolvimento:**
   ```bash
   pnpm dev
   ```
   Acesse a URL informada no terminal (geralmente `http://localhost:5173`).

3. **Gerar a compilação de produção:**
   ```bash
   pnpm build
   ```
   Os arquivos compilados e minificados serão gerados na pasta `dist/`.

4. **Visualizar a build localmente:**
   ```bash
   pnpm preview
   ```

---

## 6. Publicação e Deploy

Como a aplicação é estática, o deploy pode ser feito em qualquer serviço de hospedagem estática gratuita:

### Vercel
1. Conecte o repositório no painel da Vercel.
2. Defina a pasta raiz como `2VA/dashboard` (se estiver em monorepo) ou `./`.
3. As configurações de build são detectadas automaticamente pelo Vite (`pnpm build`, pasta `dist`).
4. O arquivo `vercel.json` garante os cabeçalhos de segurança e a regra de reescrita para SPA (`/* -> /index.html`).

### Netlify
1. Conecte o repositório no Netlify.
2. Defina o comando de build como `pnpm build` e o diretório de publicação como `dist`.
3. O arquivo `netlify.toml` e o `public/_headers` aplicam automaticamente os cabeçalhos de multithreading e cache.
