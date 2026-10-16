// ─────────────────────────────────────────────
// CONSTANTE DE ORDEM DOS MESES
// ─────────────────────────────────────────────
const ORDEM_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// ─────────────────────────────────────────────
// NORMALIZAÇÃO E FORMATAÇÃO DE TELEFONE (DDD 83 PADRÃO)
// ─────────────────────────────────────────────

/**
 * Normaliza qualquer formato de telefone brasileiro para o formato internacional do WhatsApp (ex: 5583999999999)
 * @param {string|number} telefone 
 * @param {string} dddPadrao DDD padrão caso o número não possua (Padrão: 83 - Paraíba)
 * @returns {string} Número normalizado com DDI 55
 */
function normalizarTelefoneWhatsApp(telefone, dddPadrao = "83") {
  if (!telefone) return "";
  let numLimpo = String(telefone).replace(/\D/g, "");
  if (!numLimpo) return "";

  // Remove zeros à esquerda caso o usuário tenha digitado ex: 083...
  numLimpo = numLimpo.replace(/^0+/, "");

  // Caso 1: Já completo com DDI 55 (ex: 5583991846529 ou 558388888888 - 12 a 13 dígitos)
  if (numLimpo.startsWith("55") && (numLimpo.length === 12 || numLimpo.length === 13)) {
    return numLimpo;
  }

  // Caso 2: Já possui DDD (ex: 31991846529, 83991846529, 81979152181 - 10 ou 11 dígitos)
  if (numLimpo.length === 10 || numLimpo.length === 11) {
    return "55" + numLimpo;
  }

  // Caso 3: Número local sem DDD (ex: 986016110 ou 86016110 - 8 ou 9 dígitos) -> Injeta DDD padrão 83
  if (numLimpo.length === 8 || numLimpo.length === 9) {
    return "55" + dddPadrao + numLimpo;
  }

  // Caso 4: Fallback resiliente
  return numLimpo.startsWith("55") ? numLimpo : "55" + numLimpo;
}

/**
 * Formata telefone para exibição amigável: (XX) 9XXXX-XXXX ou (83) 9XXXX-XXXX
 */
function formatarTelefoneExibicao(telefone, dddPadrao = "83") {
  if (!telefone) return "";
  let numLimpo = String(telefone).replace(/\D/g, "").replace(/^0+/, "");
  if (!numLimpo) return "";

  // Se já tiver DDI 55, remove para formatar visualmente
  if (numLimpo.startsWith("55") && (numLimpo.length === 12 || numLimpo.length === 13)) {
    numLimpo = numLimpo.substring(2);
  }

  // Se tem apenas 8 ou 9 dígitos, injeta o DDD padrão
  if (numLimpo.length === 8 || numLimpo.length === 9) {
    numLimpo = dddPadrao + numLimpo;
  }

  if (numLimpo.length === 11) {
    return `(${numLimpo.substring(0, 2)}) ${numLimpo.substring(2, 7)}-${numLimpo.substring(7)}`;
  } else if (numLimpo.length === 10) {
    return `(${numLimpo.substring(0, 2)}) ${numLimpo.substring(2, 6)}-${numLimpo.substring(6)}`;
  }

  return telefone;
}

/**
 * Máscara inteligente para inputs de telefone no DOM
 */
function aplicarMascaraTelefoneDOM(input) {
  if (!input) return;

  input.addEventListener("input", function(e) {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 11) val = val.substring(0, 11);

    if (val.length === 0) {
      e.target.value = "";
    } else if (val.length <= 2) {
      e.target.value = `(${val}`;
    } else if (val.length <= 6) {
      e.target.value = `(${val.substring(0, 2)}) ${val.substring(2)}`;
    } else if (val.length <= 10) {
      e.target.value = `(${val.substring(0, 2)}) ${val.substring(2, 6)}-${val.substring(6)}`;
    } else {
      e.target.value = `(${val.substring(0, 2)}) ${val.substring(2, 7)}-${val.substring(7, 11)}`;
    }
  });

  input.addEventListener("blur", function(e) {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length === 8 || val.length === 9) {
      // Se o usuário digitou sem DDD, injeta o (83) automaticamente ao sair do campo
      e.target.value = formatarTelefoneExibicao(val, "83");
    }
  });
}

// ✅ Extrai mes e ano referentes à contribuição mensal (p.mes e p.ano)
function extrairMesAno(p) {
  if (!p) return { mes: null, ano: null };

  let mes = p.mes ? p.mes.trim() : null;
  if (mes) {
    mes = mes.charAt(0).toUpperCase() + mes.slice(1).toLowerCase();
  } else if (p.data_pagamento) {
    const d = new Date(p.data_pagamento + "T12:00:00");
    mes = ORDEM_MESES[d.getMonth()];
  }

  let ano = p.ano ? parseInt(p.ano) : (p.data_pagamento ? new Date(p.data_pagamento + "T12:00:00").getFullYear() : new Date().getFullYear());

  return { mes, ano };
}


function nomeMesPorNumero(mes) {
  const indice = parseInt(mes, 10) - 1;
  return ORDEM_MESES[indice] || mes;
}

// ─────────────────────────────────────────────
// TABELA PRINCIPAL
// ─────────────────────────────────────────────
function atualizarTabela() {
  const tbody = document.getElementById("corpoTabela");
  if (!tbody) return;
  tbody.innerHTML = "";

  const mesEscolhido = document.getElementById("mesPagamento")?.value || null;
  const anoEscolhido = document.getElementById("anoPagamento")?.value || null;

  let crismandosComPagamentoMes = 0;
  let crismandosSemPagamentoMes = 0;
  let valorTotalMes = 0;

  crismandos.forEach((crismando) => {
    const pagamentosCrismando = pagamentos.filter(
      (p) => p.crismando_id === crismando.id
    );

    const ultimoPagamento =
      pagamentosCrismando.length > 0
        ? pagamentosCrismando[pagamentosCrismando.length - 1]
        : null;

    const totalPago = pagamentosCrismando.reduce(
      (total, p) => total + parseFloat(p.valor || 0), 0
    );

    let status = "❌ Não Pagou";
    let valorPago = 0;
    let mesAnoTexto = "-";

    if (ultimoPagamento) {
      status = "✅ Pagou";
      valorPago = parseFloat(ultimoPagamento.valor);
      mesAnoTexto = ultimoPagamento.mes
        ? `${ultimoPagamento.mes}/${ultimoPagamento.ano || ""}`
        : "-";
    }

    let pagamentoNoMes = false;
    if (mesEscolhido && anoEscolhido) {
      const nomeMesFiltro = nomeMesPorNumero(mesEscolhido);
      const anoFiltro = parseInt(anoEscolhido);

      pagamentoNoMes = pagamentosCrismando.some(
        (p) => p.mes === nomeMesFiltro && parseInt(p.ano) === anoFiltro
      );

      if (pagamentoNoMes) {
        crismandosComPagamentoMes++;
        const pg = pagamentosCrismando.find(
          (p) => p.mes === nomeMesFiltro && parseInt(p.ano) === anoFiltro
        );
        valorTotalMes += parseFloat(pg.valor || 0);
        status = "✅ Pagou";
        valorPago = parseFloat(pg.valor);
        mesAnoTexto = `${pg.mes}/${pg.ano}`;
      } else {
        crismandosSemPagamentoMes++;
        status = "❌ Não Pagou";
        valorPago = 0;
      }
    }

    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${crismando.nome}</td>
      <td>${crismando.telefone || "-"}</td>
      <td>R$ ${(crismando.valor_mensal || 0).toFixed(2).replace(".", ",")}</td>
      <td>${status}</td>
      <td>R$ ${valorPago.toFixed(2).replace(".", ",")}</td>
      <td>${mesAnoTexto}</td>
      <td>R$ ${totalPago.toFixed(2).replace(".", ",")}</td>
    `;
  });

  const elPagaram = document.getElementById("crismandosComPagamento");
  if (elPagaram) elPagaram.textContent = crismandosComPagamentoMes;

  const elPendentes = document.getElementById("crismandosSemPagamento");
  if (elPendentes) elPendentes.textContent = crismandosSemPagamentoMes;

  const elValorMes = document.getElementById("valorTotalMes");
  if (elValorMes)
    elValorMes.textContent = `R$ ${valorTotalMes.toFixed(2).replace(".", ",")}`;
}

// ─────────────────────────────────────────────
// ESTATÍSTICAS
// ─────────────────────────────────────────────
function atualizarEstatisticas() {
  const elTotal = document.getElementById("totalCrismandos");
  if (elTotal) elTotal.textContent = crismandos.length;

  const totalArrecadado = pagamentos.reduce((acc, p) => {
    const val = parseFloat(p.valor);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const elArrecadado = document.getElementById("totalArrecadado");
  if (elArrecadado)
    elArrecadado.textContent = `R$ ${totalArrecadado.toFixed(2).replace(".", ",")}`;
}

// ─────────────────────────────────────────────
// SELECT DE CRISMANDOS (mantido para compatibilidade)
// ─────────────────────────────────────────────
function atualizarSelectCrismandos() {
  const select = document.getElementById("selectCrismando");
  if (!select) return;
  select.innerHTML = "";
  if (!crismandos || crismandos.length === 0) return;
  crismandos.forEach((crismando) => {
    if (crismando && crismando.id && crismando.nome) {
      const option = document.createElement("option");
      option.value = crismando.id;
      option.textContent = `${crismando.nome} - R$ ${(crismando.valor_mensal || 0).toFixed(2).replace(".", ",")}`;
      select.appendChild(option);
    }
  });
}

// ─────────────────────────────────────────────
// ✅ RELATÓRIO — POPULAR SELECT DINAMICAMENTE
// ─────────────────────────────────────────────
function popularSelectRelatorio() {
  const select = document.getElementById("selectMesRelatorio");
  if (!select) return;

  const valorAtual = select.value;

  const combinacoes = new Map();
  pagamentos.forEach((p) => {
    const { mes: mesNormalizado, ano: anoNorm } = extrairMesAno(p);
    if (!mesNormalizado || !anoNorm) return;
    const numMes = String(ORDEM_MESES.indexOf(mesNormalizado) + 1).padStart(2, "0");
    const chave = `${anoNorm}-${numMes}`;
    if (!combinacoes.has(chave)) {
      combinacoes.set(chave, { mes: mesNormalizado, ano: anoNorm, chave });
    }
  });

  const opcoes = Array.from(combinacoes.values()).sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano;
    return ORDEM_MESES.indexOf(a.mes) - ORDEM_MESES.indexOf(b.mes);
  });

  select.innerHTML = '<option value="">-- Selecione o mês --</option>';
  opcoes.forEach(({ mes, ano, chave }) => {
    const option = document.createElement("option");
    option.value = chave;
    option.textContent = `${mes}/${ano}`;
    if (option.value === valorAtual) option.selected = true;
    select.appendChild(option);
  });
}

// ─────────────────────────────────────────────
// UTILITÁRIOS DE DATA PARA RELATÓRIO DIÁRIO
// ─────────────────────────────────────────────
function extrairDataPagamentoISO(p) {
  if (!p) return "Sem data";
  if (p.data_pagamento && /^\d{4}-\d{2}-\d{2}/.test(String(p.data_pagamento).trim())) {
    return String(p.data_pagamento).trim().substring(0, 10);
  }
  if (p.created_at) {
    const dt = new Date(p.created_at);
    if (!isNaN(dt.getTime())) {
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    }
  }
  return p.data_pagamento ? String(p.data_pagamento).trim() : "Sem data";
}

function formatarDataBR(dataIso) {
  if (!dataIso || dataIso === "-" || dataIso === "Sem data") return dataIso || "-";
  const partes = String(dataIso).substring(0, 10).split("-");
  if (partes.length === 3 && partes[0].length === 4) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataIso;
}

function extrairHorarioRegistro(p) {
  if (!p || !p.created_at) return "-";
  const dt = new Date(p.created_at);
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────
// ESTORNO / EXCLUSÃO DE PAGAMENTO (MENSAL E DIÁRIO)
// Limpa também o recibo correspondente da fila para permitir novo envio se relançado
// ─────────────────────────────────────────────
async function limparRecibosEstornadosDaFila(supabase, crismandoId, listaReferenciasMesAno) {
  if (!supabase || !crismandoId || !listaReferenciasMesAno || listaReferenciasMesAno.length === 0) return;
  try {
    const { data: recibosCrismando } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("id, mensagem, dados_template")
      .eq("crismando_id", crismandoId)
      .eq("tipo", "recibo");

    if (!recibosCrismando || recibosCrismando.length === 0) return;

    const idsParaRemover = recibosCrismando
      .filter((r) => {
        const msg = String(r.mensagem || "");
        const paramsStr = JSON.stringify(r.dados_template || {});
        return listaReferenciasMesAno.some((ref) => ref && (msg.includes(ref) || paramsStr.includes(ref)));
      })
      .map((r) => r.id);

    if (idsParaRemover.length > 0) {
      await supabase
        .from("fila_mensagens_whatsapp")
        .delete()
        .in("id", idsParaRemover);
    }
  } catch (e) {
    console.warn("⚠️ Aviso ao limpar recibo estornado da fila:", e);
  }
}

async function estornarPagamento(pagamentoId, nomeCrismando, referenciaTexto, valor, origem = "mensal", dataDiaRef = "") {
  const valorFormatado = parseFloat(valor || 0).toFixed(2).replace(".", ",");
  const confirmar = confirm(
    `⚠️ CONFIRMAR ESTORNO DE PAGAMENTO\n\n` +
    `👤 Crismando: ${nomeCrismando}\n` +
    `📅 Referência: ${referenciaTexto}\n` +
    `💰 Valor: R$ ${valorFormatado}\n\n` +
    `Deseja realmente estornar/excluir este lançamento do sistema?`
  );
  if (!confirmar) return;

  try {
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const pgAlvo = (pagamentos || []).find((p) => String(p.id) === String(pagamentoId));
    const crismandoIdAlvo = pgAlvo ? pgAlvo.crismando_id : null;
    const refMesAno = pgAlvo ? `${extrairMesAno(pgAlvo).mes}/${extrairMesAno(pgAlvo).ano}` : referenciaTexto;

    const { error } = await supabase
      .from("pagamentos")
      .delete()
      .eq("id", pagamentoId);

    if (error) throw error;

    // Limpar o recibo correspondente da fila_mensagens_whatsapp para liberar novo envio futuro
    if (crismandoIdAlvo) {
      await limparRecibosEstornadosDaFila(supabase, crismandoIdAlvo, [refMesAno, referenciaTexto]);
    }

    pagamentos = (pagamentos || []).filter((p) => String(p.id) !== String(pagamentoId));

    atualizarTabela();
    atualizarEstatisticas();
    if (typeof atualizarEstatisticasFinanceiras === "function") atualizarEstatisticasFinanceiras();
    if (typeof atualizarGradeMeses === "function") atualizarGradeMeses();
    if (typeof popularSelectRelatorio === "function") popularSelectRelatorio();
    if (typeof carregarMetricasFila === "function") carregarMetricasFila();
    if (typeof carregarTabelaMensagensFila === "function") carregarTabelaMensagensFila();

    const campoPesquisa = document.getElementById("nomePesquisa");
    if (campoPesquisa && campoPesquisa.value.trim().length >= 2) {
      exibirResultadoPesquisa();
    }

    if (origem === "diario") {
      verRelatorioDiario(dataDiaRef);
    } else {
      gerarRelatorio();
    }

    alert(`✅ Pagamento de ${nomeCrismando} (${referenciaTexto} - R$ ${valorFormatado}) estornado com sucesso!`);
  } catch (err) {
    console.error("Erro ao estornar pagamento:", err);
    alert(`❌ Erro ao estornar pagamento: ${err.message || err}`);
  }
}

async function estornarPagamentosDiaCrismando(idsCsv, nomeCrismando, mesesTexto, valorTotal, dataDiaRef) {
  const ids = String(idsCsv).split(",").map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) return;

  if (ids.length === 1) {
    return estornarPagamento(ids[0], nomeCrismando, mesesTexto, valorTotal, "diario", dataDiaRef);
  }

  const valorFormatado = parseFloat(valorTotal || 0).toFixed(2).replace(".", ",");
  const confirmar = confirm(
    `⚠️ CONFIRMAR ESTORNO DE ATENDIMENTO NO DIA\n\n` +
    `👤 Crismando: ${nomeCrismando}\n` +
    `📅 Data do Recebimento: ${formatarDataBR(dataDiaRef)}\n` +
    `📆 Meses (${ids.length}): ${mesesTexto}\n` +
    `💰 Valor Total no Dia: R$ ${valorFormatado}\n\n` +
    `Deseja estornar todos os ${ids.length} meses lançados neste dia para ${nomeCrismando}?\n` +
    `(Dica: se quiser estornar apenas 1 mês específico, clique no "✖" ao lado do próprio mês na coluna de meses)`
  );
  if (!confirmar) return;

  try {
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const setIds = new Set(ids.map(String));
    const pgsAlvo = (pagamentos || []).filter((p) => setIds.has(String(p.id)));
    const crismandoIdAlvo = pgsAlvo.length > 0 ? pgsAlvo[0].crismando_id : null;
    const refsMeses = pgsAlvo.map((p) => `${extrairMesAno(p).mes}/${extrairMesAno(p).ano}`);

    const { error } = await supabase
      .from("pagamentos")
      .delete()
      .in("id", ids);

    if (error) throw error;

    // Limpar os recibos correspondentes da fila_mensagens_whatsapp para liberar novo envio futuro
    if (crismandoIdAlvo) {
      await limparRecibosEstornadosDaFila(supabase, crismandoIdAlvo, [...refsMeses, mesesTexto]);
    }

    pagamentos = (pagamentos || []).filter((p) => !setIds.has(String(p.id)));

    atualizarTabela();
    atualizarEstatisticas();
    if (typeof atualizarEstatisticasFinanceiras === "function") atualizarEstatisticasFinanceiras();
    if (typeof atualizarGradeMeses === "function") atualizarGradeMeses();
    if (typeof popularSelectRelatorio === "function") popularSelectRelatorio();
    if (typeof carregarMetricasFila === "function") carregarMetricasFila();
    if (typeof carregarTabelaMensagensFila === "function") carregarTabelaMensagensFila();

    const campoPesquisa = document.getElementById("nomePesquisa");
    if (campoPesquisa && campoPesquisa.value.trim().length >= 2) {
      exibirResultadoPesquisa();
    }

    verRelatorioDiario(dataDiaRef);
    alert(`✅ Pagamentos do dia ${formatarDataBR(dataDiaRef)} de ${nomeCrismando} (R$ ${valorFormatado}) estornados com sucesso!`);
  } catch (err) {
    console.error("Erro ao estornar pagamentos do dia:", err);
    alert(`❌ Erro ao estornar pagamentos: ${err.message || err}`);
  }
}

// ─────────────────────────────────────────────
// ✅ RELATÓRIO — VER RELATÓRIO MENSAL
// ─────────────────────────────────────────────
function gerarRelatorio() {
  const select = document.getElementById("selectMesRelatorio");
  const elementoRelatorio = document.getElementById("relatorioGerado");
  if (!elementoRelatorio) return;

  if (!select || !select.value) {
    elementoRelatorio.innerHTML = "<p>⚠️ Selecione um mês para gerar o relatório.</p>";
    return;
  }

  const [anoStr, mesNumStr] = select.value.split("-");
  const anoFiltro = parseInt(anoStr);
  const nomeMesFiltro = ORDEM_MESES[parseInt(mesNumStr) - 1];

  if (!crismandos || crismandos.length === 0) {
    elementoRelatorio.innerHTML = "<p>📋 Nenhum crismando cadastrado ainda.</p>";
    return;
  }

  let crismandosComPagamento = 0;
  let crismandosSemPagamento = 0;
  let valorTotalMes = 0;
  let linhasTabela = "";

  crismandos.forEach((crismando) => {
    const pg = pagamentos.find((p) => {
      if (p.crismando_id !== crismando.id) return false;
      const { mes, ano } = extrairMesAno(p);
      return mes === nomeMesFiltro && ano === anoFiltro;
    });

    let status, valorPago, dataPagamento, acaoHtml;
    const nomeEscapado = (crismando.nome || "").replace(/'/g, "\\'");

    if (pg) {
      status = "✅ Pagou";
      valorPago = parseFloat(pg.valor || 0);
      dataPagamento = formatarDataBR(extrairDataPagamentoISO(pg));
      crismandosComPagamento++;
      valorTotalMes += valorPago;
      acaoHtml = `
        <button onclick="estornarPagamento('${pg.id}', '${nomeEscapado}', '${nomeMesFiltro}/${anoFiltro}', ${valorPago}, 'mensal')"
                style="background:#e74c3c;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:bold;"
                title="Estornar/excluir este pagamento caso tenha sido lançado por engano">
          🗑️ Estornar
        </button>`;
    } else {
      status = "❌ Não Pagou";
      valorPago = 0;
      dataPagamento = "-";
      crismandosSemPagamento++;
      acaoHtml = `<span style="color:#aaa;">-</span>`;
    }

    linhasTabela += `
      <tr style="${pg ? "background:#eaffea;" : ""}">
        <td>${crismando.nome}</td>
        <td>${crismando.telefone || "-"}</td>
        <td>R$ ${(crismando.valor_mensal || 0).toFixed(2).replace(".", ",")}</td>
        <td>${status}</td>
        <td>R$ ${valorPago.toFixed(2).replace(".", ",")}</td>
        <td>${dataPagamento}</td>
        <td style="text-align:center;">${acaoHtml}</td>
      </tr>`;
  });

  const taxaPagamento = crismandos.length > 0
    ? ((crismandosComPagamento / crismandos.length) * 100).toFixed(1)
    : "0.0";

  elementoRelatorio.innerHTML = `
    <div style="display:flex;gap:15px;flex-wrap:wrap;margin-bottom:15px;">
      <div class="stat-box">👥 Total: <strong>${crismandos.length}</strong></div>
      <div class="stat-box">✅ Pagaram: <strong>${crismandosComPagamento}</strong></div>
      <div class="stat-box">⏳ Pendentes: <strong>${crismandosSemPagamento}</strong></div>
      <div class="stat-box">💰 Arrecadado: <strong>R$ ${valorTotalMes.toFixed(2).replace(".", ",")}</strong></div>
      <div class="stat-box">📊 Taxa: <strong>${taxaPagamento}%</strong></div>
    </div>
    <table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead style="background:#2c3e50;color:white;">
        <tr>
          <th>Nome</th><th>Telefone</th><th>Valor Mensal</th>
          <th>Status ${nomeMesFiltro}/${anoFiltro}</th>
          <th>Valor Pago</th><th>Data Pagamento</th><th style="text-align:center;">Ações</th>
        </tr>
      </thead>
      <tbody>${linhasTabela}</tbody>
    </table>
    <p style="margin-top:10px;font-size:12px;color:#666;">
      📅 Relatório de ${nomeMesFiltro}/${anoFiltro} gerado em:
      ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}
    </p>`;
}

// ─────────────────────────────────────────────
// 🆕 RELATÓRIO POR DIA (RASTREABILIDADE DE REUNIÃO E CAIXA)
// ─────────────────────────────────────────────
let valorArrecadadoDigitadoCache = "";
let modoConferenciaCaixaCache = "dia";

function obterGruposPagamentosPorDia() {
  const mapaDias = {};

  (pagamentos || []).forEach((p) => {
    const dataIso = extrairDataPagamentoISO(p);
    if (!mapaDias[dataIso]) {
      mapaDias[dataIso] = {
        dataIso,
        dataBR: formatarDataBR(dataIso),
        totalDia: 0,
        qtdParcelas: 0,
        crismandosSet: new Set(),
        pagamentosLista: []
      };
    }
    const valorNum = parseFloat(p.valor || 0) || 0;
    mapaDias[dataIso].totalDia += valorNum;
    mapaDias[dataIso].qtdParcelas += 1;
    if (p.crismando_id) mapaDias[dataIso].crismandosSet.add(p.crismando_id);
    mapaDias[dataIso].pagamentosLista.push(p);
  });

  return Object.values(mapaDias).sort((a, b) => {
    if (a.dataIso === "Sem data") return 1;
    if (b.dataIso === "Sem data") return -1;
    return b.dataIso.localeCompare(a.dataIso);
  });
}

function verRelatorioDiario(dataEscolhida = "") {
  const elementoRelatorio = document.getElementById("relatorioGerado");
  if (!elementoRelatorio) return;

  if (!pagamentos || pagamentos.length === 0) {
    elementoRelatorio.innerHTML = "<p>📋 Nenhum pagamento registrado ainda para gerar o relatório por dia.</p>";
    return;
  }

  const diasComPagamento = obterGruposPagamentosPorDia();
  if (diasComPagamento.length === 0) {
    elementoRelatorio.innerHTML = "<p>📋 Nenhuma data de pagamento encontrada.</p>";
    return;
  }

  let diaAtivoObj = diasComPagamento.find((d) => d.dataIso === dataEscolhida);
  if (!diaAtivoObj) {
    diaAtivoObj = diasComPagamento[0];
  }
  const dataAtiva = diaAtivoObj.dataIso;

  const totalGeralSistema = (pagamentos || []).reduce((acc, p) => acc + (parseFloat(p.valor || 0) || 0), 0);

  // Opções do select de datas que tiveram pagamentos
  let opcoesSelectDatas = "";
  let cardsDatasHtml = "";

  diasComPagamento.forEach((d) => {
    const qtdPessoas = d.crismandosSet.size;
    const selecionado = d.dataIso === dataAtiva ? "selected" : "";
    const totalFmt = d.totalDia.toFixed(2).replace(".", ",");
    opcoesSelectDatas += `<option value="${d.dataIso}" ${selecionado}>📅 ${d.dataBR} — ${qtdPessoas} pessoa(s) / ${d.qtdParcelas} mês(es) — R$ ${totalFmt}</option>`;

    const ativoCard = d.dataIso === dataAtiva;
    cardsDatasHtml += `
      <div onclick="verRelatorioDiario('${d.dataIso}')"
           style="background:${ativoCard ? "#2c3e50" : "#ffffff"};
                  color:${ativoCard ? "#ffffff" : "#2c3e50"};
                  border:2px solid ${ativoCard ? "#f39c12" : "#dce1e7"};
                  border-radius:8px;padding:10px 14px;cursor:pointer;min-width:145px;
                  text-align:center;box-shadow:0 2px 5px rgba(0,0,0,0.06);transition:all 0.2s;">
        <div style="font-weight:bold;font-size:14px;">📅 ${d.dataBR}</div>
        <div style="font-size:12px;opacity:0.9;margin:3px 0;">👥 ${qtdPessoas} pessoa(s) (${d.qtdParcelas} m)</div>
        <div style="font-weight:bold;font-size:14px;color:${ativoCard ? "#f1c40f" : "#27ae60"};">R$ ${totalFmt}</div>
      </div>`;
  });

  // Agrupar os pagamentos do dia ativo por crismando para facilitar a conferência de quem entregou dinheiro na reunião
  const porCrismandoNoDia = {};
  diaAtivoObj.pagamentosLista.forEach((p) => {
    const cid = p.crismando_id || "desconhecido";
    if (!porCrismandoNoDia[cid]) {
      const crisObj = (crismandos || []).find((c) => String(c.id) === String(cid));
      porCrismandoNoDia[cid] = {
        crismandoId: cid,
        nome: crisObj ? crisObj.nome : `Crismando #${cid}`,
        telefone: crisObj ? crisObj.telefone || "-" : "-",
        itens: [],
        valorTotalDia: 0,
        ultimoTimestamp: 0,
        horarioTexto: "-"
      };
    }

    const valorParc = parseFloat(p.valor || 0) || 0;
    const { mes, ano } = extrairMesAno(p);
    porCrismandoNoDia[cid].itens.push({
      id: p.id,
      mes: mes || p.mes || "-",
      ano: ano || p.ano || "-",
      valor: valorParc,
      created_at: p.created_at
    });
    porCrismandoNoDia[cid].valorTotalDia += valorParc;

    if (p.created_at) {
      const ts = new Date(p.created_at).getTime();
      if (!isNaN(ts) && ts >= porCrismandoNoDia[cid].ultimoTimestamp) {
        porCrismandoNoDia[cid].ultimoTimestamp = ts;
        porCrismandoNoDia[cid].horarioTexto = extrairHorarioRegistro(p);
      }
    }
  });

  // Ordenar por horário de atendimento (mais recente ou ordem alfabética se não tiver horário)
  const listaAtendimentosDia = Object.values(porCrismandoNoDia).sort((a, b) => {
    if (b.ultimoTimestamp !== a.ultimoTimestamp) return b.ultimoTimestamp - a.ultimoTimestamp;
    return a.nome.localeCompare(b.nome);
  });

  let linhasTabelaDia = "";
  listaAtendimentosDia.forEach((item, index) => {
    const nomeEscapado = (item.nome || "").replace(/'/g, "\\'");

    // Ordenar meses cronologicamente dentro do atendimento
    item.itens.sort((a, b) => {
      if (parseInt(a.ano) !== parseInt(b.ano)) return parseInt(a.ano) - parseInt(b.ano);
      return ORDEM_MESES.indexOf(a.mes) - ORDEM_MESES.indexOf(b.mes);
    });

    const badgesMesesHtml = item.itens.map((it) => {
      const refMesAno = `${it.mes}/${it.ano}`;
      const valItFmt = it.valor.toFixed(2).replace(".", ",");
      return `
        <span style="display:inline-flex;align-items:center;gap:5px;background:#e8f5e9;border:1px solid #a5d6a7;color:#1b5e20;padding:3px 8px;border-radius:12px;font-size:12px;margin:2px;">
          <strong>${refMesAno}</strong> (R$ ${valItFmt})
          <button onclick="estornarPagamento('${it.id}', '${nomeEscapado}', '${refMesAno}', ${it.valor}, 'diario', '${dataAtiva}')"
                  style="background:#c62828;color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;line-height:18px;cursor:pointer;padding:0;text-align:center;"
                  title="Estornar apenas o mês ${refMesAno} de ${item.nome}">✖</button>
        </span>`;
    }).join(" ");

    const idsCsv = item.itens.map((it) => it.id).join(",");
    const mesesResumoTexto = item.itens.map((it) => `${it.mes}/${it.ano}`).join(", ");
    const valorTotalPessoaFmt = item.valorTotalDia.toFixed(2).replace(".", ",");

    linhasTabelaDia += `
      <tr>
        <td style="text-align:center;color:#666;font-weight:bold;">${index + 1}</td>
        <td><strong>${item.nome}</strong></td>
        <td>${item.telefone}</td>
        <td>${badgesMesesHtml}</td>
        <td style="text-align:center;font-weight:bold;">${item.itens.length}</td>
        <td style="color:#27ae60;font-weight:bold;font-size:14px;">R$ ${valorTotalPessoaFmt}</td>
        <td style="text-align:center;color:#555;">${item.horarioTexto}</td>
        <td style="text-align:center;">
          <button onclick="estornarPagamentosDiaCrismando('${idsCsv}', '${nomeEscapado}', '${mesesResumoTexto}', ${item.valorTotalDia}, '${dataAtiva}')"
                  style="background:#e74c3c;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:bold;"
                  title="Estornar recebimento deste crismando neste dia">
            🗑️ Estornar
          </button>
        </td>
      </tr>`;
  });

  elementoRelatorio.innerHTML = `
    <div style="background:#ffffff;border:2px solid #f39c12;border-radius:10px;padding:18px;margin-bottom:20px;box-shadow:0 3px 10px rgba(0,0,0,0.06);">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <h4 style="margin:0;color:#2c3e50;font-size:16px;">📅 Relatório por Dia e Conferência de Caixa</h4>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="baixarExcelDiario('${dataAtiva}')"
                  style="background:#27ae60;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">
            📥 Baixar Excel do Dia (${diaAtivoObj.dataBR})
          </button>
          <button onclick="document.getElementById('relatorioGerado').innerHTML='';"
                  style="background:#7f8c8d;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;">
            ✖ Fechar
          </button>
        </div>
      </div>

      <!-- Painel de Conferência: Valor Arrecadado vs Sistema -->
      <div style="background:#fffdf6;border:1px solid #f5d76e;border-radius:8px;padding:14px;margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;align-items:end;">
          <div>
            <label for="inputValorArrecadadoConferencia" style="font-size:13px;color:#2c3e50;margin-bottom:4px;">
              💵 Valor Arrecadado (R$):
            </label>
            <input type="number" id="inputValorArrecadadoConferencia" step="0.01" placeholder="Digite o valor contado em mãos..."
                   value="${valorArrecadadoDigitadoCache}"
                   oninput="atualizarConferenciaValorArrecadado(${diaAtivoObj.totalDia}, ${totalGeralSistema}, '${diaAtivoObj.dataBR}')"
                   style="padding:9px 12px;font-size:15px;font-weight:bold;border:2px solid #f39c12;border-radius:6px;width:100%;">
          </div>
          <div>
            <label for="selectModoConferenciaCaixa" style="font-size:13px;color:#2c3e50;margin-bottom:4px;">
              🔍 Comparar Valor Arrecadado com:
            </label>
            <select id="selectModoConferenciaCaixa"
                    onchange="atualizarConferenciaValorArrecadado(${diaAtivoObj.totalDia}, ${totalGeralSistema}, '${diaAtivoObj.dataBR}')"
                    style="padding:9px 12px;font-size:14px;border:2px solid #bdc3c7;border-radius:6px;width:100%;">
              <option value="dia" ${modoConferenciaCaixaCache === "dia" ? "selected" : ""}>📅 Registrado no Dia (${diaAtivoObj.dataBR}): R$ ${diaAtivoObj.totalDia.toFixed(2).replace(".", ",")}</option>
              <option value="geral" ${modoConferenciaCaixaCache === "geral" ? "selected" : ""}>🏦 Registrado Geral (Acumulado): R$ ${totalGeralSistema.toFixed(2).replace(".", ",")}</option>
            </select>
          </div>
        </div>
        <div id="resultadoConferenciaValorArrecadado" style="margin-top:12px;"></div>
      </div>

      <!-- Seletor e Cards de Datas com Pagamentos -->
      <div style="margin-bottom:15px;">
        <label for="selectDataRelatorioDiario" style="font-size:13px;color:#2c3e50;margin-bottom:6px;">
          📆 Escolha a data que houve pagamentos (${diasComPagamento.length} dia(s) com registro):
        </label>
        <select id="selectDataRelatorioDiario" onchange="verRelatorioDiario(this.value)"
                style="width:100%;max-width:460px;padding:9px 12px;border:2px solid #2c3e50;border-radius:6px;font-size:14px;font-weight:bold;margin-bottom:12px;">
          ${opcoesSelectDatas}
        </select>

        <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;">
          ${cardsDatasHtml}
        </div>
      </div>

      <!-- Resumo do Dia Selecionado -->
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin:15px 0;">
        <div class="stat-box" style="background:#eef6ff;padding:10px 14px;border-radius:8px;border-left:4px solid #3498db;">
          📅 Data: <strong>${diaAtivoObj.dataBR}</strong>
        </div>
        <div class="stat-box" style="background:#e8f8f5;padding:10px 14px;border-radius:8px;border-left:4px solid #1abc9c;">
          👥 Crismandos que Pagaram no Dia: <strong>${diaAtivoObj.crismandosSet.size}</strong>
        </div>
        <div class="stat-box" style="background:#fef9e7;padding:10px 14px;border-radius:8px;border-left:4px solid #f1c40f;">
          📆 Mensalidades Quitadas no Dia: <strong>${diaAtivoObj.qtdParcelas}</strong>
        </div>
        <div class="stat-box" style="background:#eaffea;padding:10px 14px;border-radius:8px;border-left:4px solid #27ae60;">
          💰 Total Registrado no Dia: <strong style="color:#1b5e20;font-size:15px;">R$ ${diaAtivoObj.totalDia.toFixed(2).replace(".", ",")}</strong>
        </div>
      </div>

      <!-- Tabela Detalhada de Quem Pagou no Dia -->
      <div class="table-container" style="margin-top:10px;">
        <table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead style="background:#2c3e50;color:white;">
            <tr>
              <th style="width:40px;text-align:center;">#</th>
              <th>Crismando</th>
              <th>Telefone</th>
              <th>Mês(es) Quitado(s) neste Dia</th>
              <th style="text-align:center;">Qtd. Meses</th>
              <th>Valor Pago no Dia</th>
              <th style="text-align:center;">Horário</th>
              <th style="text-align:center;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTabelaDia}
          </tbody>
        </table>
      </div>

      <p style="margin-top:10px;font-size:12px;color:#666;">
        💡 <strong>Dica de Rastreabilidade:</strong> Se um crismando pagou mais de 1 mês no mesmo dia e você quiser estornar apenas um mês lançado por engano, clique no botão vermelho <strong>✖</strong> dentro do próprio mês. Para estornar todo o pagamento da pessoa no dia, clique em <strong>🗑️ Estornar</strong>.
      </p>
    </div>
  `;

  atualizarConferenciaValorArrecadado(diaAtivoObj.totalDia, totalGeralSistema, diaAtivoObj.dataBR);
}

function atualizarConferenciaValorArrecadado(totalDia, totalGeral, dataBR) {
  const inputEl = document.getElementById("inputValorArrecadadoConferencia");
  const selectModo = document.getElementById("selectModoConferenciaCaixa");
  const boxResultado = document.getElementById("resultadoConferenciaValorArrecadado");
  if (!boxResultado) return;

  const modo = selectModo ? selectModo.value : "dia";
  modoConferenciaCaixaCache = modo;
  valorArrecadadoDigitadoCache = inputEl ? inputEl.value : "";

  const valorEsperadoSistema = modo === "geral" ? totalGeral : totalDia;
  const rotuloComparacao = modo === "geral" ? "Total Registrado Geral" : `Total Registrado no Dia (${dataBR})`;

  if (!inputEl || inputEl.value.trim() === "") {
    boxResultado.innerHTML = `
      <div style="font-size:13px;color:#666;background:#f8f9fa;padding:8px 12px;border-radius:6px;border:1px dashed #ccc;">
        ℹ️ Digite no campo <strong>Valor Arrecadado (R$)</strong> acima a quantia física que você tem em mãos para conferir automaticamente com o <strong>${rotuloComparacao} (R$ ${valorEsperadoSistema.toFixed(2).replace(".", ",")})</strong>.
      </div>`;
    return;
  }

  const valorInformado = parseFloat(inputEl.value);
  if (isNaN(valorInformado) || valorInformado < 0) {
    boxResultado.innerHTML = "";
    return;
  }

  const diferenca = Math.round((valorInformado - valorEsperadoSistema) * 100) / 100;
  const valInformadoFmt = valorInformado.toFixed(2).replace(".", ",");
  const valSistemaFmt = valorEsperadoSistema.toFixed(2).replace(".", ",");
  const difAbsFmt = Math.abs(diferenca).toFixed(2).replace(".", ",");
  const valPadraoMensal = parseFloat(window.configuracoesSistema?.valor_mensal_padrao || 10) || 10;
  const qtdMensalidadesEquiv = (Math.abs(diferenca) / valPadraoMensal).toFixed(1).replace(".0", "");

  if (Math.abs(diferenca) < 0.01) {
    boxResultado.innerHTML = `
      <div style="background:#e8f5e9;border:1px solid #4caf50;color:#1b5e20;padding:10px 14px;border-radius:6px;font-size:13px;">
        ✅ <strong>CAIXA BATENDO EXATO! (Diferença: R$ 0,00)</strong><br>
        O Valor Arrecadado informado (<strong>R$ ${valInformadoFmt}</strong>) confere exatamente com o ${rotuloComparacao} (<strong>R$ ${valSistemaFmt}</strong>).
      </div>`;
  } else if (diferenca > 0) {
    boxResultado.innerHTML = `
      <div style="background:#fff8e1;border:1px solid #ffb300;color:#5d4037;padding:10px 14px;border-radius:6px;font-size:13px;">
        ⚠️ <strong>SOBRA EM MÃOS: + R$ ${difAbsFmt} a mais do que consta no sistema</strong><br>
        • Valor Arrecadado em Mãos: <strong>R$ ${valInformadoFmt}</strong> | ${rotuloComparacao}: <strong>R$ ${valSistemaFmt}</strong><br>
        💡 <em>Diagnóstico: Há R$ ${difAbsFmt} (aprox. ${qtdMensalidadesEquiv} mensalidade(s)) recebidos em dinheiro que ainda <strong>não foram registrados</strong> no sistema.</em>
      </div>`;
  } else {
    boxResultado.innerHTML = `
      <div style="background:#ffebee;border:1px solid #ef5350;color:#b71c1c;padding:10px 14px;border-radius:6px;font-size:13px;">
        🚨 <strong>FALTA EM MÃOS: - R$ ${difAbsFmt} a menos do que consta no sistema</strong><br>
        • Valor Arrecadado em Mãos: <strong>R$ ${valInformadoFmt}</strong> | ${rotuloComparacao}: <strong>R$ ${valSistemaFmt}</strong><br>
        💡 <em>Diagnóstico: O sistema tem R$ ${difAbsFmt} (aprox. ${qtdMensalidadesEquiv} mensalidade(s)) registrados a mais do que o dinheiro físico. Confira na tabela abaixo se algum mês foi marcado em duplicidade/engano e clique em <strong>🗑️ Estornar</strong>.</em>
      </div>`;
  }
}

function baixarExcelDiario(dataIso) {
  const diasComPagamento = obterGruposPagamentosPorDia();
  const diaObj = diasComPagamento.find((d) => d.dataIso === dataIso);
  if (!diaObj || diaObj.pagamentosLista.length === 0) {
    alert("Nenhum pagamento encontrado para a data selecionada.");
    return;
  }

  const dados = [
    ["Data do Pagamento", "Crismando", "Telefone", "Mês Quitado", "Ano", "Valor Pago (R$)", "Horário Registro"]
  ];

  diaObj.pagamentosLista.forEach((p) => {
    const crismando = (crismandos || []).find((c) => String(c.id) === String(p.crismando_id));
    const { mes, ano } = extrairMesAno(p);
    dados.push([
      diaObj.dataBR,
      crismando ? crismando.nome : `Crismando #${p.crismando_id}`,
      crismando ? crismando.telefone || "" : "",
      mes || p.mes || "",
      ano || p.ano || "",
      parseFloat(p.valor || 0),
      extrairHorarioRegistro(p)
    ]);
  });

  dados.push([]);
  dados.push(["RESUMO DO DIA", diaObj.dataBR, `Crismandos: ${diaObj.crismandosSet.size}`, `Mensalidades: ${diaObj.qtdParcelas}`, "TOTAL DO DIA:", diaObj.totalDia, ""]);

  const ws = XLSX.utils.aoa_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  const nomeAba = `Caixa_${diaObj.dataIso}`.substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, nomeAba);
  XLSX.writeFile(wb, `relatorio_diario_caixa_${diaObj.dataIso}.xlsx`);
}

// ─────────────────────────────────────────────
// ✅ RELATÓRIO COMPLETO — CARDS POR ANO/MÊS
// ─────────────────────────────────────────────
function verRelatorioCompleto() {
  const elementoRelatorio = document.getElementById("relatorioGerado");
  if (!elementoRelatorio) return;

  if (!pagamentos || pagamentos.length === 0) {
    elementoRelatorio.innerHTML = "<p>Nenhum pagamento registrado ainda.</p>";
    return;
  }

  // Agrupa por ANO + MÊS
  const grupos = {};
  pagamentos.forEach((p) => {
    const { mes: mesNormalizado, ano: anoNorm } = extrairMesAno(p);
    if (!mesNormalizado || !anoNorm) return;
    const chave = `${anoNorm}-${mesNormalizado}`;
    if (!grupos[chave]) {
      grupos[chave] = { mes: mesNormalizado, ano: anoNorm, total: 0, qtd: 0 };
    }
    grupos[chave].total += parseFloat(p.valor || 0);
    grupos[chave].qtd++;
  });

  const ordenados = Object.values(grupos).sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano;
    return ORDEM_MESES.indexOf(a.mes) - ORDEM_MESES.indexOf(b.mes);
  });

  const porAno = {};
  ordenados.forEach((item) => {
    if (!porAno[item.ano]) porAno[item.ano] = [];
    porAno[item.ano].push(item);
  });

  let html = "";
  Object.keys(porAno).sort().forEach((ano) => {
    html += `<h3 style="margin:20px 0 10px;color:#2c3e50;">📅 ${ano}</h3>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;">`;
    porAno[ano].forEach(({ mes, total, qtd }) => {
      const numMes = String(ORDEM_MESES.indexOf(mes) + 1).padStart(2, "0");
      html += `
        <div onclick="selecionarMesRelatorio('${mes}', ${ano})"
             style="background:#3498db;color:white;border-radius:8px;
                    padding:12px 16px;text-align:center;min-width:130px;
                    cursor:pointer;transition:opacity 0.2s;"
             onmouseover="this.style.opacity='0.85'"
             onmouseout="this.style.opacity='1'">
          <strong>${mes}</strong><br>
          <small>${qtd} pagamentos</small><br>
          <small>R$ ${total.toFixed(2).replace(".", ",")}</small>
        </div>`;
    });
    html += `</div>`;
  });

  html += `
    <div style="margin-top:15px;">
      <button onclick="baixarExcelCompleto()" style="background:#27ae60;color:white;
              border:none;padding:10px 20px;border-radius:6px;cursor:pointer;margin-right:10px;">
        📥 Baixar Excel Completo
      </button>
      <button onclick="popularSelectRelatorio(); document.getElementById('relatorioGerado').innerHTML='';"
              style="background:#7f8c8d;color:white;border:none;
                     padding:10px 20px;border-radius:6px;cursor:pointer;">
        🔙 Voltar à Seleção
      </button>
    </div>
    <p style="margin-top:10px;font-size:12px;color:#666;">
      📅 Relatório geral gerado em:
      ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}
    </p>`;

  elementoRelatorio.innerHTML = html;
}

// ✅ Ao clicar num card, seleciona o mês/ano e gera relatório detalhado
function selecionarMesRelatorio(mes, ano) {
  const numMes = String(ORDEM_MESES.indexOf(mes) + 1).padStart(2, "0");
  const select = document.getElementById("selectMesRelatorio");
  if (select) {
    select.value = `${ano}-${numMes}`;
    gerarRelatorio();
  }
}

// ─────────────────────────────────────────────
// BAIXAR EXCEL DO MÊS SELECIONADO
// ─────────────────────────────────────────────
function baixarExcel() {
  const select = document.getElementById("selectMesRelatorio");
  if (!select || !select.value) {
    alert("Selecione um mês primeiro.");
    return;
  }

  const [anoStr, mesNumStr] = select.value.split("-");
  const anoFiltro = parseInt(anoStr);
  const nomeMesFiltro = ORDEM_MESES[parseInt(mesNumStr) - 1];

  const dados = [["Nome", "Telefone", "Valor Mensal", "Status", "Valor Pago", "Data Pagamento"]];

  crismandos.forEach((crismando) => {
    const pg = pagamentos.find(
      (p) =>
        p.crismando_id === crismando.id &&
        p.mes === nomeMesFiltro &&
        parseInt(p.ano) === anoFiltro
    );
    dados.push([
      crismando.nome,
      crismando.telefone || "",
      crismando.valor_mensal || 0,
      pg ? "Pagou" : "Não Pagou",
      pg ? parseFloat(pg.valor) : 0,
      pg ? pg.data_pagamento || "" : "",
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${nomeMesFiltro}-${anoFiltro}`);
  XLSX.writeFile(wb, `relatorio_${nomeMesFiltro}_${anoFiltro}.xlsx`);
}

// ─────────────────────────────────────────────
// BAIXAR EXCEL COMPLETO (todos os anos/meses)
// ─────────────────────────────────────────────
function baixarExcelCompleto() {
  if (!pagamentos || pagamentos.length === 0) {
    alert("Nenhum pagamento registrado.");
    return;
  }

  const dados = [["Nome", "Telefone", "Mês", "Ano", "Valor Pago", "Data Pagamento"]];

  const ordenados = [...pagamentos].sort((a, b) => {
    if (parseInt(a.ano) !== parseInt(b.ano)) return parseInt(a.ano) - parseInt(b.ano);
    return ORDEM_MESES.indexOf(a.mes) - ORDEM_MESES.indexOf(b.mes);
  });

  ordenados.forEach((p) => {
    const crismando = crismandos.find((c) => c.id === p.crismando_id);
    dados.push([
      crismando ? crismando.nome : "Desconhecido",
      crismando ? crismando.telefone || "" : "",
      p.mes || "",
      p.ano || "",
      parseFloat(p.valor || 0),
      p.data_pagamento || "",
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório Completo");
  XLSX.writeFile(wb, `relatorio_completo_crisma.xlsx`);
}

// ─────────────────────────────────────────────
// PESQUISAR CRISMANDO
// ─────────────────────────────────────────────
function pesquisarCrismandoPorNome(nome) {
  const nomeLower = nome.toLowerCase().trim();
  return crismandos
    .filter((c) => c.nome.toLowerCase().includes(nomeLower))
    .map((c) => {
      const pagamentosCrismando = pagamentos.filter(
        (p) => String(p.crismando_id) === String(c.id)
      );
      const mesesPagos = pagamentosCrismando.map((p) => {
        const { mes, ano } = extrairMesAno(p);
        return `${mes}/${ano || ""}`;
      });
      return { crismando: c, pagamentos: pagamentosCrismando, mesesPagos };
    });
}

function exibirResultadoPesquisa() {
  const nomePesquisa = document.getElementById("nomePesquisa")?.value?.trim();
  const container = document.getElementById("resultadoPesquisa");
  if (!container) return;

  if (!nomePesquisa || nomePesquisa.length < 2) {
    container.innerHTML = "<p>Digite o nome do crismando para pesquisar.</p>";
    return;
  }

  const resultados = pesquisarCrismandoPorNome(nomePesquisa);
  if (resultados.length === 0) {
    container.innerHTML = `<p>Nenhum crismando encontrado com o nome "${nomePesquisa}".</p>`;
    return;
  }

  const anoInicioCiclo = parseInt(window.configuracoesSistema?.ano_inicio_ciclo || 2026);

  let html = "";
  resultados.forEach((res) => {
    const c = res.crismando;
    const pgs = res.pagamentos;

    // Descobrir todos os anos que possuem pagamentos registrados no banco para este crismando
    const anosDefinidos = Array.from(new Set(pgs.map(p => extrairMesAno(p).ano).filter(Boolean)));
    if (!anosDefinidos.includes(anoInicioCiclo)) anosDefinidos.push(anoInicioCiclo);
    anosDefinidos.sort((a, b) => a - b);

    let matrizAnualHTML = "";
    anosDefinidos.forEach((ano) => {
      matrizAnualHTML += `<div style="margin-top: 15px;">`;
      matrizAnualHTML += `<strong style="color: #2c3e50; font-size: 14px;">📅 Status das Contribuições em ${ano}:</strong>`;
      matrizAnualHTML += `<div class="grid-anual-matriz">`;

      ORDEM_MESES.forEach((mesNome) => {
        const pgEncontrado = pgs.find((p) => {
          const { mes, ano: a } = extrairMesAno(p);
          return mes === mesNome && parseInt(a) === ano;
        });

        if (pgEncontrado) {
          const valFormatted = parseFloat(pgEncontrado.valor || 0).toFixed(2).replace(".", ",");
          const dtFormatted = pgEncontrado.data_pagamento || "-";
          matrizAnualHTML += `
            <div class="card-mes-anual pago">
              <strong>✅ ${mesNome}</strong><br>
              <small>R$ ${valFormatted}</small><br>
              <small style="opacity: 0.8;">${dtFormatted}</small>
            </div>`;
        } else {
          matrizAnualHTML += `
            <div class="card-mes-anual pendente">
              <strong>❌ ${mesNome}</strong><br>
              <small>Pendente</small>
            </div>`;
        }
      });

      matrizAnualHTML += `</div></div>`;
    });

    html += ` 
      <div style="border:1px solid #ddd;padding:15px;margin:15px 0;border-radius:10px;background:#ffffff;box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <h4 style="margin-top:0;color:#2c3e50;font-size: 1.1em;">👤 ${c.nome}</h4>
        <p><strong>📞 Telefone:</strong> ${c.telefone || "-"}</p>
        <p><strong>💰 Valor Mensal de Contribuição:</strong> R$ ${(c.valor_mensal || window.configuracoesSistema?.valor_mensal_padrao || 10).toFixed(2).replace(".", ",")}</p>
        
        ${matrizAnualHTML}
      </div>`;
  });

  container.innerHTML = html;
}


// ─────────────────────────────────────────────
// VALIDAÇÃO DE TELEFONES
// ─────────────────────────────────────────────
function validarTelefones() {
  const container = document.getElementById("resultadoValidacao");
  if (!container) return;

  if (!crismandos || crismandos.length === 0) {
    container.innerHTML = "<p>Nenhum crismando cadastrado.</p>";
    return;
  }

  let html = `<table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead style="background:#2c3e50;color:white;">
      <tr><th>Nome</th><th>Telefone Cadastrado</th><th>Telefone Formatado (WhatsApp)</th><th>Status</th></tr>
    </thead><tbody>`;

  crismandos.forEach((c) => {
    const tel = (c.telefone || "").replace(/\D/g, "");
    const valido = tel.length >= 8 && tel.length <= 13;
    const formatadoVisual = formatarTelefoneExibicao(c.telefone, "83");
    const normalizadoWhats = normalizarTelefoneWhatsApp(c.telefone, "83");
    
    html += `
      <tr style="${valido ? "" : "background:#fff0f0;"}">
        <td><strong>${c.nome}</strong></td>
        <td>${c.telefone || "<span style='color:#e74c3c;'>Não cadastrado</span>"}</td>
        <td><code>${valido ? `${formatadoVisual} (${normalizadoWhats})` : "-"}</code></td>
        <td>${valido ? "✅ Válido" : "⚠️ Inválido"}</td>
      </tr>`;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

// ─────────────────────────────────────────────
// COMPROVANTES VÁLIDOS
// ─────────────────────────────────────────────
async function exibirComprovantesValidos() {
  const container = document.getElementById("listaComprovantes");
  if (!container) return;

  try {
    if (!codigosAutenticacao || codigosAutenticacao.length === 0) {
      container.innerHTML = "<p>Nenhum comprovante válido encontrado.</p>";
      return;
    }

    let html = `<p>Total: <strong>${codigosAutenticacao.length}</strong> comprovante(s)</p>`;
    html += `<table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead style="background:#2c3e50;color:white;">
        <tr><th>Código</th><th>Nome</th><th>Mês/Ano</th><th>Valor</th><th>Validade</th></tr>
      </thead><tbody>`;

    codigosAutenticacao.forEach((c) => {
      html += `
        <tr>
          <td><code>${c.codigo}</code></td>
          <td>${c.nome_crismando || "-"}</td>
          <td>${c.mes || "-"}/${c.ano || "-"}</td>
          <td>R$ ${parseFloat(c.valor || 0).toFixed(2).replace(".", ",")}</td>
          <td>${c.data_vencimento ? new Date(c.data_vencimento).toLocaleDateString("pt-BR") : "-"}</td>
        </tr>`;
    });

    html += "</tbody></table>";
    html += `<p style="margin-top:10px;font-size:12px;color:#666;">
      💡 Estes códigos podem ser usados para validar comprovantes de pagamento.</p>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p>Ocorreu um erro ao buscar os comprovantes: <strong>${error.message}</strong></p>`;
  }
}
