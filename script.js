/* === [SISTEMA] CONSULTORIA CAVEs ELEIÇÕES 2026 === */
/* --- [Módulo] script.js - Lógica Reativa, Gráficos, Mapa SVG e Dossiê --- */

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  /* === [CAPÍTULO 1] ESTADO GLOBAL E REFERÊNCIAS DO DOM === */

  const state = {
    activeTab: "tab-01",
    selectedUF: null,
    theme: document.body.getAttribute("data-theme") || "light",
    filters: {
      regiao: "ALL",
      porte: "ALL",
      uf: "ALL",
      estudoCaso: "ALL",
      contextual: {}
    },
    table: {
      search: "",
      columnGroup: "ALL",
      currentPage: 1,
      itemsPerPage: 10
    },
    charts: {} // Armazena instâncias ativas do Chart.js para destruição controlada
  };

  // Cache dos elementos do DOM
  const dom = {
    themeToggle: document.getElementById("theme-toggle"),
    btnOpenMobileFilter: document.getElementById("btn-open-mobile-filter"),
    btnCloseSidebar: document.getElementById("btn-close-sidebar"),
    sidebar: document.getElementById("sidebar"),
    mainContent: document.getElementById("main-content"),
    tabs: document.querySelectorAll(".tabs-nav__item"),
    tabPanels: document.querySelectorAll(".tab-panel"),
    filterRegiao: document.getElementById("filter-regiao"),
    filterPorte: document.getElementById("filter-porte"),
    filterUF: document.getElementById("filter-uf"),
    filterEstudoCaso: document.getElementById("filter-estudo-caso"),
    btnResetFilters: document.getElementById("btn-reset-filters"),
    contextualTitle: document.getElementById("contextual-filter-title"),
    contextualTabName: document.getElementById("contextual-tab-name"),
    contextualContainer: document.getElementById("contextual-filters-container"),
    cavesLocalSearch: document.getElementById("caves-local-search"),
    cavesNavList: document.getElementById("caves-nav-list"),
    cavesNavCounter: document.getElementById("caves-nav-counter"),
    cavesRegionChips: document.querySelectorAll(".region-chip"),
    cavesDossierHeader: document.getElementById("caves-dossier-header"),
    cavesDossierPillars: document.getElementById("caves-dossier-pillars"),
    btnOpenFullDossier: document.getElementById("btn-open-full-dossier"),
    dossierModal: document.getElementById("dossier-modal"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    btnCloseModalFooter: document.getElementById("btn-close-modal-footer"),
    modalTreUf: document.getElementById("modal-tre-uf"),
    modalTreTipo: document.getElementById("modal-tre-tipo"),
    modalDossierTitle: document.getElementById("dossier-modal-title"),
    modalTreMeta: document.getElementById("modal-tre-meta"),
    modalDossierContent: document.getElementById("modal-dossier-content"),
    tableSearchInput: document.getElementById("table-search-input"),
    tableColumnGroupFilter: document.getElementById("table-column-group-filter"),
    btnExportCsv: document.getElementById("btn-export-csv"),
    tableRecordsCounter: document.getElementById("table-records-counter"),
    dataTableHeader: document.getElementById("data-table-head"),
    dataTableBody: document.getElementById("data-table-body"),
    pgFirst: document.getElementById("pg-first"),
    pgPrev: document.getElementById("pg-prev"),
    pgNext: document.getElementById("pg-next"),
    pgLast: document.getElementById("pg-last"),
    pgPageIndicator: document.getElementById("pg-page-indicator"),
    tooltip: document.getElementById("cave-tooltip"),
    tooltipText: document.getElementById("cave-tooltip-text")
  };

  /* === [CAPÍTULO 2] FORMATADORES E FUNÇÕES AUXILIARES === */

  function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return Number(num).toLocaleString("pt-BR");
  }

  function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return "R$ 0,00";
    return Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatPercent(val) {
    if (val === null || val === undefined || isNaN(val)) return "0%";
    return Math.round(val) + "%";
  }

  function getThemeColors() {
    const isDark = state.theme === "dark";
    return {
      text: isDark ? "#F1F5F9" : "#1A2733",
      text2: isDark ? "#CBD5E1" : "#4A5B6E",
      border: isDark ? "#334155" : "#CDE0F5",
      primary: isDark ? "#3399FF" : "#0073E6",
      primaryLight: isDark ? "#66B2FF" : "#4D9FFF",
      primaryFaded: isDark ? "#132338" : "#E6F0FA",
      grid: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
      palette: [
        "#0073E6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899",
        "#06B6D4", "#F97316", "#14B8A6", "#6366F1", "#84CC16"
      ]
    };
  }

  function countMultiSelect(dataset, fieldKey) {
    const counts = {};
    dataset.forEach(function (row) {
      const val = row[fieldKey];
      if (typeof val === "string" && val.trim().length > 0) {
        val.split(";").forEach(function (item) {
          const limpo = item.trim();
          if (limpo && limpo.toLowerCase() !== "não se aplica" && limpo.toLowerCase() !== "não") {
            counts[limpo] = (counts[limpo] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }

  /* === [CAPÍTULO 3] MOTOR DE FILTRAGEM REATIVA === */

  function getFilteredData() {
    const rawData = window.CAVE_DATA || [];

    return rawData.filter(function (row) {
      // 1. Filtro de Região
      if (state.filters.regiao !== "ALL" && row.regiao !== state.filters.regiao) {
        return false;
      }
      // 2. Filtro de Porte
      if (state.filters.porte !== "ALL" && row.porte !== state.filters.porte) {
        return false;
      }
      // 3. Filtro de UF específica
      if (state.filters.uf !== "ALL" && row.tre !== state.filters.uf) {
        return false;
      }
      // 4. Filtro de Estudos de Caso
      if (state.filters.estudoCaso === "ONLY" && !row.estudo_caso) {
        return false;
      }

      // 5. Filtros Contextuais da Aba Ativa
      const ctx = state.filters.contextual;
      for (const key in ctx) {
        if (ctx[key] && ctx[key] !== "ALL") {
          const val = row[key];
          if (typeof val === "string") {
            if (val.indexOf(";") !== -1) {
              if (val.indexOf(ctx[key]) === -1) return false;
            } else if (val !== ctx[key]) {
              return false;
            }
          } else if (val !== ctx[key]) {
            return false;
          }
        }
      }

      return true;
    });
  }

  function populateUFFilter() {
    const rawData = window.CAVE_DATA || [];
    dom.filterUF.innerHTML = '<option value="ALL">Todos os 24 Tribunais</option>';
    
    // Ordena alfabeticamente pela UF
    const ufs = rawData.map(function (d) { return d.tre; }).sort();
    ufs.forEach(function (uf) {
      const opt = document.createElement("option");
      opt.value = uf;
      const estadoNome = window.CAVE_CONFIG.nomesUFs[uf] || uf;
      opt.textContent = uf + " - " + estadoNome;
      dom.filterUF.appendChild(opt);
    });
  }

  function updateContextualFiltersUI() {
    dom.contextualContainer.innerHTML = "";
    state.filters.contextual = {};

    let html = "";
    let tabLabel = "Geral";

    switch (state.activeTab) {
      case "tab-02":
        tabLabel = "Governança";
        html = `
          <div class="form-group">
            <label for="ctx-maturidade" class="form-label has-tooltip" data-field-key="q04_maturidade_governanca">Maturidade em Governança</label>
            <select id="ctx-maturidade" class="form-select" data-ctx-key="q04_maturidade_governanca">
              <option value="ALL">Todos os Níveis</option>
              <option value="Muito alto">Muito Alto</option>
              <option value="Alto">Alto</option>
              <option value="Médio">Médio</option>
              <option value="Baixo">Baixo</option>
            </select>
          </div>
          <div class="form-group">
            <label for="ctx-planejamento" class="form-label has-tooltip" data-field-key="q02_planejamento_formal">Planejamento Formal</label>
            <select id="ctx-planejamento" class="form-select" data-ctx-key="q02_planejamento_formal">
              <option value="ALL">Todos</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
              <option value="Parcialmente">Parcialmente</option>
            </select>
          </div>
        `;
        break;

      case "tab-03":
        tabLabel = "Fiscalização";
        html = `
          <div class="form-group">
            <label for="ctx-dificuldade-bio" class="form-label has-tooltip" data-field-key="q12_dificuldade_voluntarios_bio">Dificuldade com Voluntários</label>
            <select id="ctx-dificuldade-bio" class="form-select" data-ctx-key="q12_dificuldade_voluntarios_bio">
              <option value="ALL">Todas as Avaliações</option>
              <option value="Baixo">Baixo</option>
              <option value="Médio">Médio</option>
              <option value="Alto">Alto</option>
            </select>
          </div>
        `;
        break;

      case "tab-04":
        tabLabel = "Logística";
        html = `
          <div class="form-group">
            <label for="ctx-ocorrencia-log" class="form-label has-tooltip" data-field-key="q21_ocorrencia_logistica">Ocorrência Logística no Pleito</label>
            <select id="ctx-ocorrencia-log" class="form-select" data-ctx-key="q21_ocorrencia_logistica">
              <option value="ALL">Todos</option>
              <option value="Sim">Houve Ocorrência (Sim)</option>
              <option value="Não">Sem Ocorrências (Não)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="ctx-substituicao" class="form-label has-tooltip" data-field-key="q23_estrategia_substituicao_urnas">Estratégia de Substituição</label>
            <select id="ctx-substituicao" class="form-select" data-ctx-key="q23_estrategia_substituicao_urnas">
              <option value="ALL">Todos</option>
              <option value="Sim">Possui Estratégia (Sim)</option>
              <option value="Não">Não Possui (Não)</option>
            </select>
          </div>
        `;
        break;

      case "tab-05":
        tabLabel = "Apoio à Votação Paralela";
        html = `
          <div class="form-group">
            <label for="ctx-falhas-savp" class="form-label has-tooltip" data-field-key="q36_falhas_savp">Falhas Relevantes no SAVP</label>
            <select id="ctx-falhas-savp" class="form-select" data-ctx-key="q36_falhas_savp">
              <option value="ALL">Todos</option>
              <option value="Sim">Houve Falha (Sim)</option>
              <option value="Não">Sem Falhas (Não)</option>
            </select>
          </div>
        `;
        break;

      case "tab-06":
        tabLabel = "Força de Trabalho";
        html = `
          <div class="form-group">
            <label for="ctx-capacitacao" class="form-label has-tooltip" data-field-key="q28_avaliacao_capacitacao">Avaliação da Capacitação</label>
            <select id="ctx-capacitacao" class="form-select" data-ctx-key="q28_avaliacao_capacitacao">
              <option value="ALL">Todas as Notas</option>
              <option value="Excelente">Excelente</option>
              <option value="Boa">Boa</option>
              <option value="Adequada">Adequada</option>
            </select>
          </div>
        `;
        break;

      case "tab-07":
        tabLabel = "Dados & Métricas";
        html = `
          <div class="form-group">
            <label for="ctx-series" class="form-label has-tooltip" data-field-key="q52_serie_historica">Mantém Série Histórica</label>
            <select id="ctx-series" class="form-select" data-ctx-key="q52_serie_historica">
              <option value="ALL">Todos</option>
              <option value="Sim, abrangendo mais de uma eleição">Mais de uma eleição</option>
              <option value="Sim, apenas do último pleito">Apenas do último pleito</option>
              <option value="Não">Não mantém</option>
            </select>
          </div>
        `;
        break;

      default:
        tabLabel = "Visão Geral";
        html = `<p class="card__desc">Nenhum filtro específico aplicável a esta visão.</p>`;
        break;
    }

    dom.contextualTabName.textContent = tabLabel;
    dom.contextualContainer.innerHTML = html;

    // Vincula eventos aos novos selects contextuais
    const ctxSelects = dom.contextualContainer.querySelectorAll("select");
    ctxSelects.forEach(function (select) {
      select.addEventListener("change", function () {
        const key = select.getAttribute("data-ctx-key");
        state.filters.contextual[key] = select.value;
        refreshActiveTab();
      });
    });

    initTooltips();
  }

  function refreshActiveTab() {
    const filtered = getFilteredData();
    renderHeaderStats(filtered);

    switch (state.activeTab) {
      case "tab-01":
        renderTab01(filtered);
        break;
      case "tab-02":
        renderTab02(filtered);
        break;
      case "tab-03":
        renderTab03(filtered);
        break;
      case "tab-04":
        renderTab04(filtered);
        break;
      case "tab-05":
        renderTab05(filtered);
        break;
      case "tab-06":
        renderTab06(filtered);
        break;
      case "tab-07":
        renderTab07(filtered);
        break;
      case "tab-08":
        renderTab08(filtered);
        break;
    }
  }

  function resetFilters() {
    state.filters.regiao = "ALL";
    state.filters.porte = "ALL";
    state.filters.uf = "ALL";
    state.filters.estudoCaso = "ALL";
    state.filters.contextual = {};

    dom.filterRegiao.value = "ALL";
    dom.filterPorte.value = "ALL";
    dom.filterUF.value = "ALL";
    dom.filterEstudoCaso.value = "ALL";

    updateContextualFiltersUI();
    refreshActiveTab();
  }

  /* === [CAPÍTULO 4] NAVEGAÇÃO DE ABAS & TRANSIÇÕES GSAP === */

  function switchTab(targetTabId) {
    if (state.activeTab === targetTabId) return;

    // Atualiza estado
    state.activeTab = targetTabId;

    // Atualiza classes dos botões
    dom.tabs.forEach(function (btn) {
      const isActive = btn.getAttribute("data-tab") === targetTabId;
      btn.classList.toggle("tabs-nav__item--active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    // Reset de rolagem estrito
    window.scrollTo(0, 0);
    dom.mainContent.scrollTop = 0;

    // Atualiza painéis com GSAP
    dom.tabPanels.forEach(function (panel) {
      const isTarget = panel.id === "view-" + targetTabId;
      if (isTarget) {
        panel.classList.add("tab-panel--active");
        if (window.gsap) {
          gsap.fromTo(panel, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" });
        }
      } else {
        panel.classList.remove("tab-panel--active");
      }
    });

    // Se estiver em mobile, fecha o drawer lateral se aberto
    dom.sidebar.classList.remove("sidebar--open");

    // Atualiza controles contextuais e re-renderiza
    updateContextualFiltersUI();
    refreshActiveTab();
  }

  function renderHeaderStats(dataset) {
    const countEl = document.getElementById("header-total-tres");
    if (countEl) {
      countEl.textContent = dataset.length;
    }
  }

  /* === [CAPÍTULO 5] RENDERIZADORES DE ABAS E CHART.JS === */

  function destroyChart(key) {
    if (state.charts[key]) {
      state.charts[key].destroy();
      delete state.charts[key];
    }
  }

  // Variável de controle local da macrorregião no navegador
  let localRegionFilter = "ALL";
  let localSearchQuery = "";

  // --- ABA 01: PANORAMA NACIONAL (MASTER-DETAIL) ---
  function renderTab01(data) {
    let totSecoes = 0;
    let totUrnasAnt = 0;
    let totUrnas2026 = 0;
    let totBio2026 = 0;
    let totInvestido = 0;

    data.forEach(function (d) {
      totSecoes += (d.secoes_estado || 0);
      totUrnasAnt += (d.urnas_auditadas_ultimo || 0);
      totUrnas2026 += (d.urnas_auditadas_2026 || 0);
      totBio2026 += (d.urnas_bio_2026 || 0);
      totInvestido += (d.q33_valor_contratacoes_num || 0);
    });

    const elSecoes = document.getElementById("kpi-total-secoes");
    if (elSecoes) elSecoes.textContent = formatNumber(totSecoes);

    const elUrnasAnt = document.getElementById("kpi-urnas-ultimo");
    if (elUrnasAnt) elUrnasAnt.textContent = formatNumber(totUrnasAnt);

    const elUrnas2026 = document.getElementById("kpi-urnas-2026");
    if (elUrnas2026) elUrnas2026.textContent = formatNumber(totUrnas2026);

    const elBio = document.getElementById("kpi-urnas-bio");
    if (elBio) elBio.textContent = formatNumber(totBio2026);

    const elTotalInvest = document.getElementById("kpi-total-investido");
    if (elTotalInvest) elTotalInvest.textContent = formatCurrency(totInvestido);

    // Garante que haja um tribunal selecionado inicialmente
    if (!state.selectedUF && data.length > 0) {
      state.selectedUF = data[0].tre;
    }

    renderCavesNavList(data);
    renderExecutiveDossier();
  }

  function renderCavesNavList(data) {
    if (!dom.cavesNavList) return;

    // Filtra pela macrorregião selecionada e ordena alfabeticamente pelo nome do estado
    const filtered = data
      .filter(function (d) {
        return localRegionFilter === "ALL" || d.regiao === localRegionFilter;
      })
      .sort(function (a, b) {
        return (a.nome_estado || a.tre).localeCompare(b.nome_estado || b.tre, "pt-BR");
      });

    if (dom.cavesNavCounter) {
      dom.cavesNavCounter.textContent = filtered.length + " Tribunais";
    }

    if (filtered.length === 0) {
      dom.cavesNavList.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text3); font-size: 0.9rem;">Nenhum tribunal encontrado para esta região.</div>';
      return;
    }

    let html = "";
    filtered.forEach(function (item) {
      const isSelected = item.tre === state.selectedUF;
      const logStatusClass = item.q21_ocorrencia_logistica === "Sim" ? "cave-status-dot--red" : "cave-status-dot--green";
      const logTitle = item.q21_ocorrencia_logistica === "Sim" ? "Houve ocorrência logística no pleito" : "Sem ocorrências logísticas";

      html += `
        <div class="cave-item ${isSelected ? 'cave-item--selected' : ''}" data-uf="${item.tre}" role="button" tabindex="0">
          <div class="cave-item__left">
            <div class="cave-item__uf">${item.tre}</div>
            <div class="cave-item__info">
              <span class="cave-item__name">${item.nome_estado}</span>
              <span class="cave-item__meta">Região ${item.regiao} • Porte ${item.porte}</span>
            </div>
          </div>
          <div class="cave-item__right">
            <span class="cave-status-dot ${logStatusClass}" title="${logTitle}"></span>
          </div>
        </div>
      `;
    });

    dom.cavesNavList.innerHTML = html;

    // Vincula eventos de clique e teclado (Enter) em cada cartão
    dom.cavesNavList.querySelectorAll(".cave-item").forEach(function (card) {
      card.addEventListener("click", function () {
        const uf = card.getAttribute("data-uf");
        selectUF(uf);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const uf = card.getAttribute("data-uf");
          selectUF(uf);
        }
      });
    });
  }

  function selectUF(uf) {
    state.selectedUF = uf;
    if (dom.filterUF) {
      dom.filterUF.value = uf;
    }
    const allData = getFilteredData();
    renderCavesNavList(allData);
    renderExecutiveDossier();
  }

  function renderExecutiveDossier() {
    if (!dom.cavesDossierHeader || !dom.cavesDossierPillars) return;

    const rawData = window.CAVE_DATA || [];
    const item = rawData.find(function (d) { return d.tre === state.selectedUF; });

    if (!item) {
      dom.cavesDossierHeader.innerHTML = '<div style="padding: 20px; color: var(--text3);">Selecione um tribunal na lista ao lado.</div>';
      dom.cavesDossierPillars.innerHTML = "";
      if (dom.btnOpenFullDossier) dom.btnOpenFullDossier.disabled = true;
      return;
    }

    if (dom.btnOpenFullDossier) dom.btnOpenFullDossier.disabled = false;

    // Cabeçalho Institucional do Tribunal Ativo
    dom.cavesDossierHeader.innerHTML = `
      <div class="caves-dossier__header-top">
        <span class="caves-dossier__uf-pill">${item.tre}</span>
      </div>
      <h3 class="caves-dossier__state-name">Tribunal Regional Eleitoral de ${item.nome_estado}</h3>
      <div class="caves-dossier__state-meta">
        Região <strong>${item.regiao}</strong> • Porte <strong>${item.porte}</strong> • <strong>${formatNumber(item.secoes_estado)}</strong> seções eleitorais
      </div>
    `;

    // 6 Pilares Temáticos Unificados (Correspondência 1:1 com as Abas do Menu)
    dom.cavesDossierPillars.innerHTML = `
      <!-- Pilar 1: Governança -->
      <div class="pillar-card">
        <div class="pillar-card__title">
          <i class="fa-solid fa-landmark" aria-hidden="true"></i>
          Governança
        </div>
        <div class="pillar-metric-list">
          <div class="pillar-metric">
            <span class="pillar-metric__label">Maturidade Declarada:</span>
            <span class="pillar-metric__val">${item.q04_maturidade_governanca}</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Planejamento Formal:</span>
            <span class="pillar-metric__val">${item.q02_planejamento_formal}</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Unidade Responsável:</span>
            <span class="pillar-metric__val">${item.q01_unidade_resp}</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Procedimento de Sucessão:</span>
            <span class="pillar-metric__val">${item.q03_procedimento_sucessao}</span>
          </div>
        </div>
      </div>

      <!-- Pilar 2: Fiscalização -->
      <div class="pillar-card">
        <div class="pillar-card__title">
          <i class="fa-solid fa-users-viewfinder" aria-hidden="true"></i>
          Fiscalização
        </div>
        <div class="pillar-metric-list">
          <div class="pillar-metric">
            <span class="pillar-metric__label">Partidos no Sorteio:</span>
            <span class="pillar-metric__val">${item.q14_2_partidos_presentes} presentes</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Entidades no Sorteio:</span>
            <span class="pillar-metric__val">${item.q14_4_entidades_presentes} presentes</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Dificuldade c/ Voluntários:</span>
            <span class="pillar-metric__val">${item.q12_dificuldade_voluntarios_bio}</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Urnas com Biometria (2026):</span>
            <span class="pillar-metric__val">${formatNumber(item.urnas_bio_2026)}</span>
          </div>
        </div>
      </div>

      <!-- Pilar 3: Logística -->
      <div class="pillar-card">
        <div class="pillar-card__title">
          <i class="fa-solid fa-truck" aria-hidden="true"></i>
          Logística
        </div>
        <div class="pillar-metric-list">
          <div class="pillar-metric">
            <span class="pillar-metric__label">Ocorrência no Pleito:</span>
            <span class="pillar-metric__val" style="color: ${item.q21_ocorrencia_logistica === 'Sim' ? 'var(--color-conclusion)' : 'var(--color-start)'};">
              ${item.q21_ocorrencia_logistica}
            </span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Substituição de Urnas:</span>
            <span class="pillar-metric__val">${item.q23_estrategia_substituicao_urnas}</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Distribuição Regional:</span>
            <span class="pillar-metric__val">${item.q26_distribuicao_regional_secoes}</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Total em Contratações:</span>
            <span class="pillar-metric__val">${item.q33_valor_contratacoes}</span>
          </div>
        </div>
      </div>

      <!-- Pilar 4: Apoio à Votação Paralela -->
      <div class="pillar-card">
        <div class="pillar-card__title">
          <i class="fa-solid fa-server" aria-hidden="true"></i>
          Apoio à Votação Paralela
        </div>
        <div class="pillar-metric-list">
          <div class="pillar-metric">
            <span class="pillar-metric__label">Falhas no SAVP:</span>
            <span class="pillar-metric__val">${item.q36_falhas_savp}</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Falhas na Gravação:</span>
            <span class="pillar-metric__val">${item.q37_falhas_gravacao && item.q37_falhas_gravacao.indexOf('Sim') !== -1 ? 'Sim' : 'Não'}</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Falhas na Transmissão:</span>
            <span class="pillar-metric__val">${item.q38_falhas_transmissao && item.q38_falhas_transmissao.indexOf('Sim') !== -1 ? 'Sim' : 'Não'}</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Modelos do TSE:</span>
            <span class="pillar-metric__val">${item.q44_utilidade_modelos_tse}</span>
          </div>
        </div>
      </div>

      <!-- Pilar 5: Força de Trabalho -->
      <div class="pillar-card">
        <div class="pillar-card__title">
          <i class="fa-solid fa-user-gear" aria-hidden="true"></i>
          Força de Trabalho
        </div>
        <div class="pillar-metric-list">
          <div class="pillar-metric">
            <span class="pillar-metric__label">Auxiliares de Auditoria:</span>
            <span class="pillar-metric__val">${formatNumber(item.q47_3_auxiliares_auditoria)} pessoas</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Mesas de Trabalho:</span>
            <span class="pillar-metric__val">${item.q49_mesas_trabalho} mesas</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Pessoas por Mesa:</span>
            <span class="pillar-metric__val">${item.q48_pessoas_por_mesa} operadores</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Monitora Fadiga:</span>
            <span class="pillar-metric__val">${item.q60_fadiga_operacional}</span>
          </div>
        </div>
      </div>

      <!-- Pilar 6: Maturidade de Dados -->
      <div class="pillar-card">
        <div class="pillar-card__title">
          <i class="fa-solid fa-chart-pie" aria-hidden="true"></i>
          Maturidade de Dados
        </div>
        <div class="pillar-metric-list">
          <div class="pillar-metric">
            <span class="pillar-metric__label">Bases Estruturadas:</span>
            <span class="pillar-metric__val">${item.q50_bases_estruturadas}</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Série Histórica:</span>
            <span class="pillar-metric__val">${item.q52_serie_historica && item.q52_serie_historica.indexOf('Sim') !== -1 ? 'Sim' : 'Não'}</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Mede Produtividade:</span>
            <span class="pillar-metric__val">${item.q55_produtividade_equipes}</span>
          </div>
          <div class="pillar-metric">
            <span class="pillar-metric__label">Análise de Tendências:</span>
            <span class="pillar-metric__val">${item.q64_analise_periodica}</span>
          </div>
        </div>
      </div>
    `;
  }

  // --- ABA 02: GOVERNANÇA & RISCOS ---
  function renderTab02(data) {
    const total = data.length || 1;
    let altaGov = 0, planFormal = 0, unDed = 0, sucessao = 0;

    data.forEach(function (d) {
      if (d.q04_maturidade_governanca === "Alto" || d.q04_maturidade_governanca === "Muito alto") altaGov++;
      if (d.q02_planejamento_formal === "Sim") planFormal++;
      if (d.q01_unidade_resp === "Sim") unDed++;
      if (d.q03_procedimento_sucessao === "Sim") sucessao++;
    });

    document.getElementById("kpi-gov-alta-pct").textContent = formatPercent((altaGov / total) * 100);
    document.getElementById("kpi-gov-plan-pct").textContent = formatPercent((planFormal / total) * 100);
    document.getElementById("kpi-gov-unidade-pct").textContent = formatPercent((unDed / total) * 100);
    document.getElementById("kpi-gov-sucessao-pct").textContent = formatPercent((sucessao / total) * 100);

    const colors = getThemeColors();

    // Gráfico 1: Maturidade (Rosca)
    destroyChart("govMaturidade");
    const matCounts = { "Muito alto": 0, "Alto": 0, "Médio": 0, "Baixo": 0 };
    data.forEach(function (d) {
      if (matCounts[d.q04_maturidade_governanca] !== undefined) {
        matCounts[d.q04_maturidade_governanca]++;
      }
    });

    const ctxMat = document.getElementById("chart-gov-maturidade");
    if (ctxMat) {
      state.charts.govMaturidade = new Chart(ctxMat, {
        type: "doughnut",
        data: {
          labels: Object.keys(matCounts),
          datasets: [{
            data: Object.values(matCounts),
            backgroundColor: ["#005BB5", "#0073E6", "#66B2FF", "#CBD5E1"],
            borderColor: colors.border,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { color: colors.text, boxWidth: 14 } }
          }
        }
      });
    }

    // Gráfico 2: Riscos Críticos (Barras Horizontais)
    destroyChart("govRiscos");
    const riscosCount = countMultiSelect(data, "q07_riscos_criticos");
    const sortedRiscos = Object.entries(riscosCount).sort(function (a, b) { return b[1] - a[1]; });

    const ctxRiscos = document.getElementById("chart-gov-riscos");
    if (ctxRiscos) {
      state.charts.govRiscos = new Chart(ctxRiscos, {
        type: "bar",
        data: {
          labels: sortedRiscos.map(function (r) { return r[0]; }),
          datasets: [{
            label: "Menções",
            data: sortedRiscos.map(function (r) { return r[1]; }),
            backgroundColor: colors.primary,
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text2, stepSize: 1 }, grid: { color: colors.grid } },
            y: { ticks: { color: colors.text, autoSkip: false }, grid: { display: false } }
          }
        }
      });
    }

    // Gráfico 3: Ações de Transparência
    destroyChart("govTransparencia");
    const transpCount = countMultiSelect(data, "q18_acoes_transparencia");
    const sortedTransp = Object.entries(transpCount).sort(function (a, b) { return b[1] - a[1]; });

    const ctxTransp = document.getElementById("chart-gov-transparencia");
    if (ctxTransp) {
      state.charts.govTransparencia = new Chart(ctxTransp, {
        type: "bar",
        data: {
          labels: sortedTransp.map(function (t) { return t[0]; }),
          datasets: [{
            label: "Tribunais que adotam",
            data: sortedTransp.map(function (t) { return t[1]; }),
            backgroundColor: colors.palette[1],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text2, stepSize: 2 }, grid: { color: colors.grid } },
            y: { ticks: { color: colors.text, autoSkip: false }, grid: { display: false } }
          }
        }
      });
    }
  }

  // --- ABA 03: SOCIEDADE & FISCALIZAÇÃO ---
  function renderTab03(data) {
    let convPart = 0, presSort = 0, presExec = 0;
    let bioSim = 0, bioNao = 0;

    data.forEach(function (d) {
      convPart += (d.q14_1_partidos_convidados || 0);
      presSort += (d.q14_2_partidos_presentes || 0);
      presExec += (d.q14_5_partidos_execucao || 0);
      if (d.q10_meta_biometria === "Sim") bioSim++;
      else bioNao++;
    });

    document.getElementById("kpi-partidos-convidados").textContent = formatNumber(convPart);
    document.getElementById("kpi-partidos-presentes-sorteio").textContent = formatNumber(presSort);
    document.getElementById("kpi-taxa-sorteio-partidos").textContent = "Taxa de presença: " + (convPart > 0 ? ((presSort / convPart) * 100).toFixed(1) : 0) + "%";
    document.getElementById("kpi-partidos-execucao").textContent = formatNumber(presExec);
    document.getElementById("kpi-taxa-execucao-partidos").textContent = "Taxa de execução: " + (convPart > 0 ? ((presExec / convPart) * 100).toFixed(1) : 0) + "%";

    const colors = getThemeColors();

    // Mini Gráfico Donut de Meta de Biometria (Sim vs Não)
    destroyChart("miniBioMeta");
    const ctxMiniBio = document.getElementById("chart-mini-bio-meta");
    const legendMiniBio = document.getElementById("kpi-mini-bio-legend");
    if (ctxMiniBio) {
      state.charts.miniBioMeta = new Chart(ctxMiniBio, {
        type: "doughnut",
        data: {
          labels: ["Sim", "Não"],
          datasets: [{
            data: [bioSim, bioNao],
            backgroundColor: ["#10B981", "#64748B"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          plugins: { legend: { display: false }, tooltip: { enabled: true } }
        }
      });

      if (legendMiniBio) {
        const totalBio = bioSim + bioNao || 1;
        legendMiniBio.innerHTML = `
          <div class="kpi-mini-legend-item">
            <span class="kpi-mini-legend-dot" style="background:#10B981;"></span>
            <span>Sim: ${bioSim} (${((bioSim / totalBio) * 100).toFixed(0)}%)</span>
          </div>
          <div class="kpi-mini-legend-item">
            <span class="kpi-mini-legend-dot" style="background:#64748B;"></span>
            <span>Não: ${bioNao} (${((bioNao / totalBio) * 100).toFixed(0)}%)</span>
          </div>
        `;
      }
    }

    // Gráfico Funil Partidos
    destroyChart("funilPartidos");
    const ctxFunilPart = document.getElementById("chart-funil-partidos");
    if (ctxFunilPart) {
      state.charts.funilPartidos = new Chart(ctxFunilPart, {
        type: "bar",
        data: {
          labels: ["Convites a Partidos", "Presentes no Sorteio", "Presentes na Execução"],
          datasets: [{
            data: [convPart, presSort, presExec],
            backgroundColor: ["#005BB5", "#0073E6", "#10B981"],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text }, grid: { display: false } },
            y: { ticks: { color: colors.text2 }, grid: { color: colors.grid } }
          }
        }
      });
    }

    // Gráfico Entidades Fiscalizadoras
    destroyChart("funilEntidades");
    let convEnt = 0, presSortEnt = 0, presExecEnt = 0;
    data.forEach(function (d) {
      convEnt += (d.q14_3_entidades_convidadas || 0);
      presSortEnt += (d.q14_4_entidades_presentes || 0);
      presExecEnt += (d.q14_6_entidades_execucao || 0);
    });

    const ctxEnt = document.getElementById("chart-funil-entidades");
    if (ctxEnt) {
      state.charts.funilEntidades = new Chart(ctxEnt, {
        type: "bar",
        data: {
          labels: ["Entidades Convidadas", "Presentes no Sorteio", "Presentes na Execução"],
          datasets: [{
            data: [convEnt, presSortEnt, presExecEnt],
            backgroundColor: ["#4F46E5", "#6366F1", "#06B6D4"],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text }, grid: { display: false } },
            y: { ticks: { color: colors.text2 }, grid: { color: colors.grid } }
          }
        }
      });
    }

    // Gráfico Dificuldade Biometria
    destroyChart("bioDificuldade");
    const bioDifCounts = { "Baixo": 0, "Médio": 0, "Alto": 0 };
    data.forEach(function (d) {
      if (bioDifCounts[d.q12_dificuldade_voluntarios_bio] !== undefined) {
        bioDifCounts[d.q12_dificuldade_voluntarios_bio]++;
      }
    });

    const ctxBioDif = document.getElementById("chart-bio-dificuldade");
    if (ctxBioDif) {
      state.charts.bioDificuldade = new Chart(ctxBioDif, {
        type: "pie",
        data: {
          labels: ["Baixo", "Médio", "Alto"],
          datasets: [{
            data: [bioDifCounts["Baixo"], bioDifCounts["Médio"], bioDifCounts["Alto"]],
            backgroundColor: ["#10B981", "#F59E0B", "#E11D48"],
            borderColor: colors.border
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { color: colors.text } } }
        }
      });
    }

    // Gráfico Fatores que Dificultam Fiscais
    destroyChart("fatoresFiscais");
    const fiscaisCount = countMultiSelect(data, "q16_fatores_dificultam_entidades");
    const sortedFiscais = Object.entries(fiscaisCount).sort(function (a, b) { return b[1] - a[1]; });

    const ctxFiscais = document.getElementById("chart-fatores-fiscais");
    if (ctxFiscais) {
      state.charts.fatoresFiscais = new Chart(ctxFiscais, {
        type: "bar",
        data: {
          labels: sortedFiscais.map(function (f) { return f[0]; }),
          datasets: [{
            data: sortedFiscais.map(function (f) { return f[1]; }),
            backgroundColor: colors.palette[2],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text2, stepSize: 1 }, grid: { color: colors.grid } },
            y: { ticks: { color: colors.text, autoSkip: false }, grid: { display: false } }
          }
        }
      });
    }
  }

  // --- ABA 04: CUSTÓDIA, LOGÍSTICA & CUSTOS ---
  function renderTab04(data) {
    const total = data.length || 1;
    let ocLog = 0, subUrnas = 0, regSecoes = 0, somaCustos = 0;

    data.forEach(function (d) {
      if (d.q21_ocorrencia_logistica === "Sim") ocLog++;
      if (d.q23_estrategia_substituicao_urnas === "Sim") subUrnas++;
      if (d.q26_distribuicao_regional_secoes === "Sim") regSecoes++;
      somaCustos += (d.q33_valor_contratacoes_num || 0);
    });

    document.getElementById("kpi-logistica-ocorrencias").textContent = ocLog;
    document.getElementById("kpi-logistica-contingencia-pct").textContent = formatPercent((subUrnas / total) * 100);
    document.getElementById("kpi-logistica-regional-pct").textContent = formatPercent((regSecoes / total) * 100);
    
    // Apresenta o Valor Total das Contratações de apoio aos testes
    const elCustoTotal = document.getElementById("kpi-custo-medio-urna");
    if (elCustoTotal) elCustoTotal.textContent = formatCurrency(somaCustos);

    const colors = getThemeColors();

    // Gráfico Checklist Transporte
    destroyChart("logControles");
    const controlesCount = countMultiSelect(data, "q20_controles_transporte");
    const sortedControles = Object.entries(controlesCount).sort(function (a, b) { return b[1] - a[1]; });

    const ctxLogCont = document.getElementById("chart-logistica-controles");
    if (ctxLogCont) {
      state.charts.logControles = new Chart(ctxLogCont, {
        type: "bar",
        data: {
          labels: sortedControles.map(function (c) { return c[0]; }),
          datasets: [{
            label: "TREs que adotam",
            data: sortedControles.map(function (c) { return c[1]; }),
            backgroundColor: colors.primary,
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text2, stepSize: 2 }, grid: { color: colors.grid } },
            y: { ticks: { color: colors.text, autoSkip: false }, grid: { display: false } }
          }
        }
      });
    }

    // Gráfico de Barras Horizontais: Investimento Ordenado por Tribunal
    destroyChart("custoDispersao");
    const sortedCustos = data.slice().sort(function (a, b) {
      return (b.q33_valor_contratacoes_num || 0) - (a.q33_valor_contratacoes_num || 0);
    });

    const ctxDisp = document.getElementById("chart-custo-dispersao");
    if (ctxDisp) {
      state.charts.custoDispersao = new Chart(ctxDisp, {
        type: "bar",
        data: {
          labels: sortedCustos.map(function (d) { return d.tre; }),
          datasets: [{
            label: "Investimento Contratual",
            data: sortedCustos.map(function (d) { return d.q33_valor_contratacoes_num || 0; }),
            backgroundColor: colors.primary,
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return formatCurrency(ctx.raw);
                }
              }
            }
          },
          scales: {
            x: {
              ticks: {
                color: colors.text2,
                callback: function (val) {
                  return "R$ " + (val >= 1000000 ? (val / 1000000).toFixed(1) + "M" : (val / 1000).toFixed(0) + "k");
                }
              },
              grid: { color: colors.grid }
            },
            y: { ticks: { color: colors.text, autoSkip: false }, grid: { display: false } }
          }
        }
      });
    }

    // Gráfico Fatores Exclusão Seções
    destroyChart("exclusaoSecoes");
    const exclCount = countMultiSelect(data, "q25_fatores_exclusao_secoes");
    const sortedExcl = Object.entries(exclCount).sort(function (a, b) { return b[1] - a[1]; });

    const ctxExcl = document.getElementById("chart-exclusao-secoes");
    if (ctxExcl) {
      state.charts.exclusaoSecoes = new Chart(ctxExcl, {
        type: "bar",
        data: {
          labels: sortedExcl.map(function (e) { return e[0]; }),
          datasets: [{
            data: sortedExcl.map(function (e) { return e[1]; }),
            backgroundColor: colors.palette[4],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text2, stepSize: 2 }, grid: { color: colors.grid } },
            y: { ticks: { color: colors.text, autoSkip: false }, grid: { display: false } }
          }
        }
      });
    }
  }

  // --- ABA 05: SISTEMAS, CONTINGÊNCIA & EVIDÊNCIAS ---
  function renderTab05(data) {
    const total = data.length || 1;
    let falhasSavp = 0, falhasGrav = 0, falhasTrans = 0, utilTse = 0;

    data.forEach(function (d) {
      if (d.q36_falhas_savp === "Sim") falhasSavp++;
      if (d.q37_falhas_gravacao && d.q37_falhas_gravacao.indexOf("Sim") !== -1) falhasGrav++;
      if (d.q38_falhas_transmissao && d.q38_falhas_transmissao.indexOf("Sim") !== -1) falhasTrans++;
      if (d.q44_utilidade_modelos_tse === "Alta" || d.q44_utilidade_modelos_tse === "Muito alta") utilTse++;
    });

    document.getElementById("kpi-savp-falhas").textContent = falhasSavp;
    document.getElementById("kpi-gravacao-falhas").textContent = falhasGrav;
    document.getElementById("kpi-transmissao-falhas").textContent = falhasTrans;
    document.getElementById("kpi-tse-modelos-pct").textContent = formatPercent((utilTse / total) * 100);

    const colors = getThemeColors();

    // Gráfico Suporte TSE
    destroyChart("suporteTse");
    const suporteScores = {
      "Clareza": { ms: 0, s: 0, r: 0, ins: 0 },
      "Tempestividade": { ms: 0, s: 0, r: 0, ins: 0 },
      "Disponibilidade": { ms: 0, s: 0, r: 0, ins: 0 },
      "Suporte Técnico": { ms: 0, s: 0, r: 0, ins: 0 }
    };

    data.forEach(function (d) {
      function addScore(metricKey, val) {
        if (!val) return;
        if (val.indexOf("Muito Satisfatório") !== -1) suporteScores[metricKey].ms++;
        else if (val.indexOf("Satisfatório") !== -1) suporteScores[metricKey].s++;
        else if (val.indexOf("Regular") !== -1) suporteScores[metricKey].r++;
        else if (val.indexOf("Insatisfatório") !== -1) suporteScores[metricKey].ins++;
      }
      addScore("Clareza", d.q09_1_clareza_orientacoes);
      addScore("Tempestividade", d.q09_2_tempestividade_respostas);
      addScore("Disponibilidade", d.q09_3_disponibilidade_esclarecimentos);
      addScore("Suporte Técnico", d.q09_4_suporte_tecnico);
    });

    const ctxSup = document.getElementById("chart-suporte-tse");
    if (ctxSup) {
      state.charts.suporteTse = new Chart(ctxSup, {
        type: "bar",
        data: {
          labels: Object.keys(suporteScores),
          datasets: [
            { label: "Muito Satisfatório", data: Object.values(suporteScores).map(function (s) { return s.ms; }), backgroundColor: "#10B981" },
            { label: "Satisfatório", data: Object.values(suporteScores).map(function (s) { return s.s; }), backgroundColor: "#3B82F6" },
            { label: "Regular", data: Object.values(suporteScores).map(function (s) { return s.r; }), backgroundColor: "#F59E0B" },
            { label: "Insatisfatório", data: Object.values(suporteScores).map(function (s) { return s.ins; }), backgroundColor: "#E11D48" }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { color: colors.text, boxWidth: 12 } } },
          scales: {
            x: { stacked: true, ticks: { color: colors.text }, grid: { display: false } },
            y: { stacked: true, ticks: { color: colors.text2, stepSize: 5 }, grid: { color: colors.grid } }
          }
        }
      });
    }

    // Gráfico Contingência Tecnológica
    destroyChart("contingenciaTec");
    const contCount = countMultiSelect(data, "q39_contingencia_tecnologica");
    const sortedCont = Object.entries(contCount).sort(function (a, b) { return b[1] - a[1]; });

    const ctxCont = document.getElementById("chart-contingencia-tec");
    if (ctxCont) {
      state.charts.contingenciaTec = new Chart(ctxCont, {
        type: "bar",
        data: {
          labels: sortedCont.map(function (c) { return c[0]; }),
          datasets: [{
            data: sortedCont.map(function (c) { return c[1]; }),
            backgroundColor: colors.palette[5],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text2, stepSize: 2 }, grid: { color: colors.grid } },
            y: { ticks: { color: colors.text, autoSkip: false }, grid: { display: false } }
          }
        }
      });
    }

    // Gráfico Melhorias SAVP
    destroyChart("savpMelhorias");
    const savpCount = countMultiSelect(data, "q35_aspectos_melhoria_savp");
    const sortedSavp = Object.entries(savpCount).sort(function (a, b) { return b[1] - a[1]; });

    const ctxSavp = document.getElementById("chart-savp-melhorias");
    if (ctxSavp) {
      state.charts.savpMelhorias = new Chart(ctxSavp, {
        type: "bar",
        data: {
          labels: sortedSavp.map(function (s) { return s[0]; }),
          datasets: [{
            data: sortedSavp.map(function (s) { return s[1]; }),
            backgroundColor: colors.primaryLight,
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text2, stepSize: 1 }, grid: { color: colors.grid } },
            y: { ticks: { color: colors.text, autoSkip: false }, grid: { display: false } }
          }
        }
      });
    }
  }

  // --- ABA 06: PESSOAS, EQUIPES & CAPACITAÇÃO ---
  function renderTab06(data) {
    const total = data.length || 1;
    let totAux = 0, somaPessoasMesa = 0, capBoa = 0, fadigaMon = 0;

    data.forEach(function (d) {
      totAux += (d.q47_3_auxiliares_auditoria || 0);
      somaPessoasMesa += (d.q48_pessoas_por_mesa || 0);
      if (d.q28_avaliacao_capacitacao === "Excelente" || d.q28_avaliacao_capacitacao === "Boa") capBoa++;
      if (d.q60_fadiga_operacional === "Sim") fadigaMon++;
    });

    document.getElementById("kpi-total-auxiliares").textContent = formatNumber(totAux);
    document.getElementById("kpi-media-pessoas-mesa").textContent = (somaPessoasMesa / total).toFixed(1);
    document.getElementById("kpi-capacitacao-pct").textContent = formatPercent((capBoa / total) * 100);
    document.getElementById("kpi-fadiga-pct").textContent = formatPercent((fadigaMon / total) * 100);

    const colors = getThemeColors();

    // Gráfico Força de Trabalho por Função
    destroyChart("forcaTrabalho");
    let juizes = 0, caveMembros = 0, seguranca = 0, apoio = 0, outros = 0;
    data.forEach(function (d) {
      juizes += (d.q47_1_juizes_auxiliares || 0);
      caveMembros += (d.q47_2_integrantes_cave || 0);
      seguranca += (d.q47_4_profissionais_seguranca || 0);
      apoio += (d.q47_5_apoio_administrativo || 0);
      outros += (d.q47_6_outras_pessoas || 0);
    });

    const ctxForca = document.getElementById("chart-forca-trabalho");
    if (ctxForca) {
      state.charts.forcaTrabalho = new Chart(ctxForca, {
        type: "bar",
        data: {
          labels: ["Auxiliares Auditoria", "Apoio Administrativo", "Segurança", "Membros CAVE", "Outros", "Juízes"],
          datasets: [{
            data: [totAux, apoio, seguranca, caveMembros, outros, juizes],
            backgroundColor: colors.palette,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text }, grid: { display: false } },
            y: { ticks: { color: colors.text2 }, grid: { color: colors.grid } }
          }
        }
      });
    }

    // Gráfico Erros Operacionais (Q31 Tratada)
    destroyChart("errosOperacionais");
    const errosCount = countMultiSelect(data, "q31_fatores_erros_operacionais");
    const sortedErros = Object.entries(errosCount).sort(function (a, b) { return b[1] - a[1]; });

    const ctxErros = document.getElementById("chart-erros-operacionais");
    if (ctxErros) {
      state.charts.errosOperacionais = new Chart(ctxErros, {
        type: "bar",
        data: {
          labels: sortedErros.map(function (e) { return e[0]; }),
          datasets: [{
            data: sortedErros.map(function (e) { return e[1]; }),
            backgroundColor: colors.palette[6],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text2, stepSize: 1 }, grid: { color: colors.grid } },
            y: { ticks: { color: colors.text, autoSkip: false }, grid: { display: false } }
          }
        }
      });
    }
  }

  // --- ABA 07: MATURIDADE DE DADOS & MÉTRICAS ---
  function renderTab07(data) {
    const total = data.length || 1;
    let estruturados = 0, historico = 0, produtividade = 0, analiseTend = 0;

    data.forEach(function (d) {
      if (d.q50_bases_estruturadas === "Sim") estruturados++;
      if (d.q52_serie_historica && d.q52_serie_historica.indexOf("Sim") !== -1) historico++;
      if (d.q55_produtividade_equipes === "Sim") produtividade++;
      if (d.q64_analise_periodica === "Sim") analiseTend++;
    });

    document.getElementById("kpi-dados-estruturados-pct").textContent = formatPercent((estruturados / total) * 100);
    document.getElementById("kpi-dados-historico-pct").textContent = formatPercent((historico / total) * 100);
    document.getElementById("kpi-dados-produtividade-pct").textContent = formatPercent((produtividade / total) * 100);
    document.getElementById("kpi-dados-tendencias-pct").textContent = formatPercent((analiseTend / total) * 100);

    const colors = getThemeColors();

    // Gráfico Indicadores de Governança Analítica
    destroyChart("maturidadeDados");
    let metricasFormais = 0, classifErros = 0, dimensEquipe = 0;
    data.forEach(function (d) {
      if (d.q53_indicadores_metricas === "Sim") metricasFormais++;
      if (d.q59_classificacao_erros === "Sim") classifErros++;
      if (d.q57_indicadores_dimensionamento === "Sim") dimensEquipe++;
    });

    const ctxMatDados = document.getElementById("chart-maturidade-dados");
    if (ctxMatDados) {
      state.charts.maturidadeDados = new Chart(ctxMatDados, {
        type: "bar",
        data: {
          labels: ["Bases Estruturadas", "Série Histórica", "Acompanha Produtividade", "Métricas Formais", "Classifica Erros", "Dimensiona por Dados"],
          datasets: [{
            data: [estruturados, historico, produtividade, metricasFormais, classifErros, dimensEquipe],
            backgroundColor: colors.primary,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text }, grid: { display: false } },
            y: { ticks: { color: colors.text2, stepSize: 2 }, grid: { color: colors.grid } }
          }
        }
      });
    }

    // Gráfico Aspectos Consolidados
    destroyChart("registrosConsolidados");
    const regCount = countMultiSelect(data, "q54_registros_estatisticos");
    const sortedReg = Object.entries(regCount).sort(function (a, b) { return b[1] - a[1]; });

    const ctxReg = document.getElementById("chart-registros-consolidados");
    if (ctxReg) {
      state.charts.registrosConsolidados = new Chart(ctxReg, {
        type: "bar",
        data: {
          labels: sortedReg.map(function (r) { return r[0]; }),
          datasets: [{
            data: sortedReg.map(function (r) { return r[1]; }),
            backgroundColor: colors.palette[3],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text2, stepSize: 2 }, grid: { color: colors.grid } },
            y: { ticks: { color: colors.text, autoSkip: false }, grid: { display: false } }
          }
        }
      });
    }
  }

  // --- ABA 08: MATRIZ COMPLETA DE DADOS (TELA CHEIA) ---
  function renderTab08(data) {
    const dict = window.CAVE_DICTIONARY || {};
    const query = state.table.search.toLowerCase().trim();
    const allKeys = Object.keys(dict);

    // Filtrar Linhas por Busca Textual Universal
    const tableRows = data.filter(function (row) {
      if (!query) return true;
      for (let i = 0; i < allKeys.length; i++) {
        const val = row[allKeys[i]];
        if (val !== null && val !== undefined) {
          if (String(val).toLowerCase().indexOf(query) !== -1) {
            return true;
          }
        }
      }
      return false;
    });

    const counterEl = document.getElementById("table-records-counter");
    if (counterEl) {
      counterEl.textContent = tableRows.length + " tribunais exibidos";
    }

    // 1. Renderizar Cabeçalhos com Tooltips
    let theadHtml = "<tr>";
    allKeys.forEach(function (k) {
      const item = dict[k] || { nomeReduzido: k, nomeCompleto: k };
      theadHtml += '<th role="columnheader"><span class="has-tooltip" data-field-key="' + k + '" tabindex="0">' + item.nomeReduzido + "</span></th>";
    });
    theadHtml += "</tr>";
    dom.dataTableHeader.innerHTML = theadHtml;

    // 2. Renderizar Todas as Linhas (Sem Paginação Artificial)
    let tbodyHtml = "";
    if (tableRows.length === 0) {
      tbodyHtml = '<tr><td colspan="' + allKeys.length + '" style="text-align:center; padding:30px;">Nenhum registro encontrado para a pesquisa informada.</td></tr>';
    } else {
      tableRows.forEach(function (row) {
        tbodyHtml += '<tr data-uf="' + row.tre + '" style="cursor:pointer;" title="Clique para inspecionar o Dossiê">';
        allKeys.forEach(function (k) {
          let val = row[k];
          if (val === null || val === undefined) val = "-";
          else if (typeof val === "number" && k.indexOf("valor") !== -1) val = formatCurrency(val);
          else if (typeof val === "number" && (k.indexOf("secoes") !== -1 || k.indexOf("urnas") !== -1)) val = formatNumber(val);

          tbodyHtml += "<td>" + val + "</td>";
        });
        tbodyHtml += "</tr>";
      });
    }
    dom.dataTableBody.innerHTML = tbodyHtml;

    // Adiciona evento de clique para abrir Dossiê da CAVE
    dom.dataTableBody.querySelectorAll("tr[data-uf]").forEach(function (tr) {
      tr.addEventListener("click", function () {
        const uf = tr.getAttribute("data-uf");
        openDossierModal(uf);
      });
    });

    initTooltips();
  }

  /* === [CAPÍTULO 6] GESTÃO DE ESTADO DO PANORAMA NACIONAL === */
  // As funções de renderização do Panorama (renderCavesNavList, selectUF e renderExecutiveDossier)
  // foram unificadas no Capítulo 5 para garantir sincronia e ciclo de vida reativo.

  /* === [CAPÍTULO 7] MODAL & BOTTOM SHEET (DOSSIÊ COMPLETO) === */

  function openDossierModal(uf) {
    const rawData = window.CAVE_DATA || [];
    const item = rawData.find(function (d) { return d.tre === uf; });
    if (!item) return;

    dom.modalTreUf.textContent = item.tre;
    dom.modalDossierTitle.textContent = "Tribunal Regional Eleitoral de " + item.nome_estado;
    dom.modalTreMeta.textContent = "Região " + item.regiao + " • Porte " + item.porte + " (" + formatNumber(item.secoes_estado) + " seções eleitorais)";

    const isPilot = window.CAVE_CONFIG.estudosDeCaso.indexOf(item.tre) !== -1;
    dom.modalTreTipo.textContent = isPilot ? "Estudo de Caso (Visita Técnica)" : "Diagnóstico CAVE 2026";

    dom.modalDossierContent.innerHTML = `
      <!-- Pilar 1: Governança -->
      <section class="dossier-group">
        <h3 class="dossier-group__title"><i class="fa-solid fa-landmark" style="margin-right:6px;"></i>Governança</h3>
        <div class="dossier-grid">
          <div class="dossier-item">
            <div class="dossier-item__label">Maturidade em Governança</div>
            <div class="dossier-item__val">${item.q04_maturidade_governanca}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Planejamento Formal</div>
            <div class="dossier-item__val">${item.q02_planejamento_formal}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Unidade Responsável Dedicada</div>
            <div class="dossier-item__val">${item.q01_unidade_resp}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Procedimento de Sucessão</div>
            <div class="dossier-item__val">${item.q03_procedimento_sucessao}</div>
          </div>
        </div>
      </section>

      <!-- Pilar 2: Fiscalização -->
      <section class="dossier-group">
        <h3 class="dossier-group__title"><i class="fa-solid fa-users-viewfinder" style="margin-right:6px;"></i>Fiscalização</h3>
        <div class="dossier-grid">
          <div class="dossier-item">
            <div class="dossier-item__label">Partidos no Sorteio</div>
            <div class="dossier-item__val">${item.q14_1_partidos_convidados} convidados / ${item.q14_2_partidos_presentes} presentes</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Entidades no Sorteio</div>
            <div class="dossier-item__val">${item.q14_3_entidades_convidadas} convidadas / ${item.q14_4_entidades_presentes} presentes</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Acompanhamento da Execução</div>
            <div class="dossier-item__val">${item.q14_5_partidos_execucao_nota || item.q14_5_partidos_execucao} partidos / ${item.q14_6_entidades_execucao} entidades</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Urnas com Biometria (2026)</div>
            <div class="dossier-item__val">${item.urnas_bio_2026} previstas (Dificuldade: ${item.q12_dificuldade_voluntarios_bio})</div>
          </div>
        </div>
      </section>

      <!-- Pilar 3: Logística -->
      <section class="dossier-group">
        <h3 class="dossier-group__title"><i class="fa-solid fa-truck" style="margin-right:6px;"></i>Logística</h3>
        <div class="dossier-grid">
          <div class="dossier-item">
            <div class="dossier-item__label">Ocorrência Logística no Pleito</div>
            <div class="dossier-item__val">${item.q21_ocorrencia_logistica}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Estratégia de Substituição de Urnas</div>
            <div class="dossier-item__val">${item.q23_estrategia_substituicao_urnas}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Critério de Distribuição Regional</div>
            <div class="dossier-item__val">${item.q26_distribuicao_regional_secoes}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Total em Contratações</div>
            <div class="dossier-item__val">${item.q33_valor_contratacoes}</div>
          </div>
        </div>
      </section>

      <!-- Pilar 4: Apoio à Votação Paralela -->
      <section class="dossier-group">
        <h3 class="dossier-group__title"><i class="fa-solid fa-server" style="margin-right:6px;"></i>Apoio à Votação Paralela</h3>
        <div class="dossier-grid">
          <div class="dossier-item">
            <div class="dossier-item__label">Falhas Observadas no SAVP</div>
            <div class="dossier-item__val">${item.q36_falhas_savp}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Falhas na Gravação</div>
            <div class="dossier-item__val">${item.q37_falhas_gravacao || 'Não'}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Falhas na Transmissão</div>
            <div class="dossier-item__val">${item.q38_falhas_transmissao || 'Não'}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Utilidade dos Modelos do TSE</div>
            <div class="dossier-item__val">${item.q44_utilidade_modelos_tse}</div>
          </div>
        </div>
      </section>

      <!-- Pilar 5: Força de Trabalho -->
      <section class="dossier-group">
        <h3 class="dossier-group__title"><i class="fa-solid fa-user-gear" style="margin-right:6px;"></i>Força de Trabalho</h3>
        <div class="dossier-grid">
          <div class="dossier-item">
            <div class="dossier-item__label">Auxiliares de Auditoria</div>
            <div class="dossier-item__val">${formatNumber(item.q47_3_auxiliares_auditoria)} pessoas</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Mesas de Trabalho Utilizadas</div>
            <div class="dossier-item__val">${item.q49_mesas_trabalho} mesas (${item.q48_pessoas_por_mesa} pessoas/mesa)</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Avaliação da Capacitação</div>
            <div class="dossier-item__val">${item.q28_avaliacao_capacitacao}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Monitoramento de Fadiga</div>
            <div class="dossier-item__val">${item.q60_fadiga_operacional}</div>
          </div>
        </div>
      </section>

      <!-- Pilar 6: Maturidade de Dados -->
      <section class="dossier-group">
        <h3 class="dossier-group__title"><i class="fa-solid fa-chart-pie" style="margin-right:6px;"></i>Maturidade de Dados</h3>
        <div class="dossier-grid">
          <div class="dossier-item">
            <div class="dossier-item__label">Bases Estruturadas e Painéis</div>
            <div class="dossier-item__val">${item.q50_bases_estruturadas}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Manutenção de Série Histórica</div>
            <div class="dossier-item__val">${item.q52_serie_historica || 'Não'}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Acompanhamento de Produtividade</div>
            <div class="dossier-item__val">${item.q55_produtividade_equipes}</div>
          </div>
          <div class="dossier-item">
            <div class="dossier-item__label">Análise de Tendências e Lições</div>
            <div class="dossier-item__val">${item.q64_analise_periodica}</div>
          </div>
        </div>
      </section>
    `;

    dom.dossierModal.classList.add("open");
    dom.dossierModal.setAttribute("aria-hidden", "false");
  }

  function closeDossierModal() {
    dom.dossierModal.classList.remove("open");
    dom.dossierModal.setAttribute("aria-hidden", "true");
  }

  /* === [CAPÍTULO 8] SISTEMA DE MICRO-TOOLTIPS DINÂMICOS === */

  function initTooltips() {
    const tooltipTargets = document.querySelectorAll(".has-tooltip");
    const dict = window.CAVE_DICTIONARY || {};

    tooltipTargets.forEach(function (el) {
      el.removeEventListener("mouseenter", handleTooltipEnter);
      el.removeEventListener("mousemove", handleTooltipMove);
      el.removeEventListener("mouseleave", handleTooltipLeave);

      el.addEventListener("mouseenter", handleTooltipEnter);
      el.addEventListener("mousemove", handleTooltipMove);
      el.addEventListener("mouseleave", handleTooltipLeave);
    });
  }

  function handleTooltipEnter(e) {
    const key = e.currentTarget.getAttribute("data-field-key");
    const dict = window.CAVE_DICTIONARY || {};
    const item = dict[key];

    if (!item) return;

    // Remove defensivamente qualquer elemento residual de cabeçalho do tooltip
    const oldBadge = dom.tooltip ? dom.tooltip.querySelector(".cave-tooltip__badge, #cave-tooltip-dimensao") : null;
    if (oldBadge) {
      oldBadge.remove();
    }

    if (dom.tooltipText) {
      dom.tooltipText.textContent = item.nomeCompleto;
    }

    dom.tooltip.classList.add("cave-tooltip--visible");
    dom.tooltip.setAttribute("aria-hidden", "false");
    positionTooltip(e);
  }

  function handleTooltipMove(e) {
    positionTooltip(e);
  }

  function handleTooltipLeave() {
    dom.tooltip.classList.remove("cave-tooltip--visible");
    dom.tooltip.setAttribute("aria-hidden", "true");
  }

  function positionTooltip(e) {
    const x = e.clientX + 14;
    const y = e.clientY + 14;

    const tooltipWidth = dom.tooltip.offsetWidth || 300;
    const tooltipHeight = dom.tooltip.offsetHeight || 80;

    let posX = x;
    let posY = y;

    // Limites de tela horizontais
    if (posX + tooltipWidth > window.innerWidth - 16) {
      posX = e.clientX - tooltipWidth - 14;
    }

    // Limites de tela verticais
    if (posY + tooltipHeight > window.innerHeight - 16) {
      posY = e.clientY - tooltipHeight - 14;
    }

    dom.tooltip.style.left = posX + "px";
    dom.tooltip.style.top = posY + "px";
  }

  /* === [CAPÍTULO 9] EXPORTAÇÃO CSV DA TABELA === */

  function exportTableToCSV() {
    const data = getFilteredData();
    const dict = window.CAVE_DICTIONARY || {};
    const keys = Object.keys(dict);

    let csvContent = "\uFEFF"; // BOM para suporte a acentos no Excel

    // Cabeçalhos (Nomes Reduzidos)
    const headerRow = keys.map(function (k) {
      return '"' + (dict[k].nomeReduzido || k).replace(/"/g, '""') + '"';
    }).join(";");
    csvContent += headerRow + "\r\n";

    // Linhas
    data.forEach(function (row) {
      const line = keys.map(function (k) {
        let val = row[k];
        if (val === null || val === undefined) val = "";
        return '"' + String(val).replace(/"/g, '""') + '"';
      }).join(";");
      csvContent += line + "\r\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Questionario_CAVEs_Eleicoes_2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /* === [CAPÍTULO 10] VINCULAÇÃO DE EVENTOS & BOOTSTRAP === */

  function bindEvents() {
    // 1. Alternador de Abas
    dom.tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const tabId = btn.getAttribute("data-tab");
        switchTab(tabId);
      });
    });

    // 2. Filtros Globais
    dom.filterRegiao.addEventListener("change", function () {
      state.filters.regiao = dom.filterRegiao.value;
      refreshActiveTab();
    });

    dom.filterPorte.addEventListener("change", function () {
      state.filters.porte = dom.filterPorte.value;
      refreshActiveTab();
    });

    dom.filterUF.addEventListener("change", function () {
      state.filters.uf = dom.filterUF.value;
      if (dom.filterUF.value !== "ALL") {
        selectUF(dom.filterUF.value);
      }
      refreshActiveTab();
    });

    dom.filterEstudoCaso.addEventListener("change", function () {
      state.filters.estudoCaso = dom.filterEstudoCaso.value;
      refreshActiveTab();
    });

    dom.btnResetFilters.addEventListener("click", resetFilters);

    // 3. Pílulas de Macrorregião do Navegador com Sincronização Imediata e Ordem Alfabética
    if (dom.cavesRegionChips) {
      dom.cavesRegionChips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          dom.cavesRegionChips.forEach(function (c) { c.classList.remove("region-chip--active"); });
          chip.classList.add("region-chip--active");
          localRegionFilter = chip.getAttribute("data-region");

          const allData = getFilteredData();
          const filtered = allData
            .filter(function (d) {
              return localRegionFilter === "ALL" || d.regiao === localRegionFilter;
            })
            .sort(function (a, b) {
              return (a.nome_estado || a.tre).localeCompare(b.nome_estado || b.tre, "pt-BR");
            });

          // Se o tribunal atualmente selecionado não pertence à nova região filtrada, seleciona o primeiro alfabeticamente
          if (filtered.length > 0) {
            const currentBelongs = filtered.some(function (d) { return d.tre === state.selectedUF; });
            if (!currentBelongs) {
              state.selectedUF = filtered[0].tre;
              if (dom.filterUF) dom.filterUF.value = filtered[0].tre;
            }
          }

          renderCavesNavList(allData);
          renderExecutiveDossier();
        });
      });
    }

    // 5. Botão para Abrir Dossiê Completo
    dom.btnOpenFullDossier.addEventListener("click", function () {
      if (state.selectedUF) {
        openDossierModal(state.selectedUF);
      }
    });

    // 6. Fechamento de Modal
    dom.btnCloseModal.addEventListener("click", closeDossierModal);
    dom.btnCloseModalFooter.addEventListener("click", closeDossierModal);
    dom.dossierModal.addEventListener("click", function (e) {
      if (e.target === dom.dossierModal) closeDossierModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && dom.dossierModal.classList.contains("open")) {
        closeDossierModal();
      }
    });

    // Função auxiliar para sincronizar texto, aria-label e tema visual
    function updateThemeUI(theme) {
      state.theme = theme;
      document.body.setAttribute("data-theme", theme);

      const labelEl = dom.themeToggle ? dom.themeToggle.querySelector(".btn-theme-toggle__text") : null;
      if (labelEl) {
        // Quando está escuro, o botão convida a mudar para o Modo Claro
        labelEl.textContent = theme === "dark" ? "Modo Claro" : "Modo Escuro";
      }

      if (dom.themeToggle) {
        dom.themeToggle.setAttribute(
          "aria-label",
          theme === "dark" ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"
        );
      }
    }

    // 7. Alternador de Tema Claro/Escuro
    dom.themeToggle.addEventListener("click", function () {
      const nextTheme = state.theme === "light" ? "dark" : "light";
      updateThemeUI(nextTheme);
      try {
        localStorage.setItem("cave_theme", nextTheme);
      } catch (err) {
        // Ignora restrições locais de arquivo
      }
      refreshActiveTab();
    });

    // Recupera tema salvo ou inicializa o rótulo do tema padrão
    try {
      const savedTheme = localStorage.getItem("cave_theme");
      if (savedTheme) {
        updateThemeUI(savedTheme);
      } else {
        updateThemeUI(state.theme);
      }
    } catch (e) {
      updateThemeUI(state.theme);
    }

    // 8. Mobile Sidebar Drawer
    dom.btnOpenMobileFilter.addEventListener("click", function () {
      dom.sidebar.classList.add("sidebar--open");
    });
    dom.btnCloseSidebar.addEventListener("click", function () {
      dom.sidebar.classList.remove("sidebar--open");
    });

    // 9. Controles da Tabela (Aba 8)
    if (dom.tableSearchInput) {
      dom.tableSearchInput.addEventListener("input", function () {
        state.table.search = dom.tableSearchInput.value;
        renderTab08(getFilteredData());
      });
    }

    if (dom.btnExportCsv) {
      dom.btnExportCsv.addEventListener("click", exportTableToCSV);
    }

    // Alternador para Recolher/Exibir Barra Lateral na Matriz (Modo Foco)
    const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
    const txtToggleSidebar = document.getElementById("btn-toggle-sidebar-text");
    const appLayout = document.querySelector(".app-layout");

    if (btnToggleSidebar && appLayout) {
      btnToggleSidebar.addEventListener("click", function () {
        const isCollapsed = appLayout.classList.toggle("app-layout--sidebar-collapsed");
        if (txtToggleSidebar) {
          txtToggleSidebar.textContent = isCollapsed ? "Exibir Filtros" : "Ocultar Filtros";
        }
      });
    }
  }

  // --- Inicialização do Sistema ---
  function init() {
    populateUFFilter();
    bindEvents();
    updateContextualFiltersUI();
    refreshActiveTab();
    initTooltips();
  }

  init();
});
/* === [FIM DO ARQUIVO script.js] === */