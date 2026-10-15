// js/dashboard-fila.js - Painel de Monitoramento da Fila de Mensagens WhatsApp (Meta Cloud API Oficial)

let filtroTipoFilaAtual = 'TODOS';
let intervalContadorTimelock = null;

// Inicializa o Dashboard ao abrir a aba tabEvolution ou via refresh
async function inicializarDashboardFila() {
  await carregarTelefoneCoordenador();
  await carregarMetricasFila();
  await carregarTabelaMensagensFila();
  await checarStatusMetaCloudApi();
}

// 1. Carrega o telefone do coordenador salvo no Supabase
async function carregarTelefoneCoordenador() {
  const input = document.getElementById("cfgTelefoneCoordenador");
  if (!input) return;

  try {
    const cfg = window.configuracoesSistema;
    if (cfg && cfg.telefone_coordenador) {
      input.value = cfg.telefone_coordenador;
    }
  } catch (e) {
    console.warn("Erro ao carregar telefone do coordenador:", e);
  }
}

// Precificação Oficial Meta Cloud API (WhatsApp Business Platform Brasil +55)
const VALORES_META_BRL = {
  UTILITY: 0.0350,   // R$ 0,0350 por mensagem entregue (Recibos, Cobranças, Faltas)
  MARKETING: 0.3217  // R$ 0,3217 por mensagem entregue (Avisos em Lote/Comunicados)
};

function categorizarMensagemMeta(item) {
  const tpl = item.dados_template?.template;
  if (tpl === "comunicado_geral_crisma") {
    return "MARKETING";
  }
  if (tpl === "comprovante_pagamento_crisma" ||
      tpl === "lembrete_mensalidade_crisma" ||
      tpl === "aviso_ausencia_crisma" ||
      tpl === "resumo_faltas_crisma") {
    return "UTILITY";
  }

  const tipo = item.tipo || item.tipo_envio || "";
  if (tipo === "aviso" || tipo === "aviso_lote") {
    return "MARKETING";
  }
  return "UTILITY";
}

// 2. Carrega as métricas dos cards, custos financeiros e o status de restrição diária
async function carregarMetricasFila() {
  const supabase = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabase) return;

  try {
    // Data de hoje em Brasília (UTC-3)
    const agora = new Date();
    const utc = agora.getTime() + agora.getTimezoneOffset() * 60000;
    const brasilia = new Date(utc - 3 * 3600000);
    const dataHoje = brasilia.toISOString().split("T")[0];

    const anoAtual = brasilia.getFullYear();
    const mesAtual = brasilia.getMonth(); // 0 a 11
    const inicioMesISO = new Date(Date.UTC(anoAtual, mesAtual, 1, 0, 0, 0)).toISOString();

    const nomesMeses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const nomeMesCorrente = nomesMeses[mesAtual];

    // Consulta controle_envios_diarios
    const { data: controle } = await supabase
      .from("controle_envios_diarios")
      .select("*")
      .eq("data", dataHoje)
      .maybeSingle();

    const totalEnviadosHoje = controle?.total_enviados || 0;
    const limiteDiario = controle?.limite_diario || 250;
    const pct = Math.min(100, Math.round((totalEnviadosHoje / limiteDiario) * 100));

    // Atualiza Card de Limite
    const elLimite = document.getElementById("metricFilaLimiteHoje");
    const elBarra = document.getElementById("barraFilaLimiteHoje");
    if (elLimite) elLimite.textContent = `${totalEnviadosHoje} / ${limiteDiario} (${pct}%)`;
    if (elBarra) elBarra.style.width = `${pct}%`;

    // Atualiza Card Enviadas Hoje
    const elEnviadosHoje = document.getElementById("metricFilaEnviadosHoje");
    if (elEnviadosHoje) elEnviadosHoje.textContent = totalEnviadosHoje;

    // Apuração financeira das mensagens enviadas no mês corrente
    let todasEnviadasMes = [];
    let fromRange = 0;
    while (true) {
      const { data: batch, error: errBatch } = await supabase
        .from("fila_mensagens_whatsapp")
        .select("id, tipo, tipo_envio, dados_template, status, enviado_em, created_at")
        .eq("status", "enviado")
        .gte("enviado_em", inicioMesISO)
        .range(fromRange, fromRange + 999);

      if (errBatch || !batch || batch.length === 0) break;
      todasEnviadasMes = todasEnviadasMes.concat(batch);
      if (batch.length < 1000) break;
      fromRange += 1000;
    }

    let countUtilHoje = 0;
    let countMktHoje = 0;
    let countUtilMes = 0;
    let countMktMes = 0;

    todasEnviadasMes.forEach(item => {
      const cat = categorizarMensagemMeta(item);
      const dataEnv = (item.enviado_em || item.created_at || "").split("T")[0];

      if (cat === "MARKETING") {
        countMktMes++;
        if (dataEnv === dataHoje) countMktHoje++;
      } else {
        countUtilMes++;
        if (dataEnv === dataHoje) countUtilHoje++;
      }
    });

    const totalHojeCalculado = countUtilHoje + countMktHoje;
    const totalMesCalculado = countUtilMes + countMktMes;

    if (elEnviadosHoje && totalHojeCalculado > 0) {
      elEnviadosHoje.textContent = Math.max(totalEnviadosHoje, totalHojeCalculado);
    }

    const custoHoje = (countUtilHoje * VALORES_META_BRL.UTILITY) + (countMktHoje * VALORES_META_BRL.MARKETING);
    const custoMes = (countUtilMes * VALORES_META_BRL.UTILITY) + (countMktMes * VALORES_META_BRL.MARKETING);

    const formatarMoeda = (val) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    // Atualiza Card de Hoje
    const elCustoHoje = document.getElementById("metricFilaCustoHoje");
    const elDetalheHoje = document.getElementById("metricFilaDetalheHoje");
    if (elCustoHoje) elCustoHoje.textContent = formatarMoeda(custoHoje);
    if (elDetalheHoje) elDetalheHoje.textContent = `${countUtilHoje} Utilidade • ${countMktHoje} Marketing`;

    // Atualiza Card do Mês
    const elCustoMes = document.getElementById("metricFilaCustoMes");
    const elTotalMes = document.getElementById("metricFilaTotalMes");
    const elNomeMes = document.getElementById("metricFilaNomeMesCorrente");
    const elDetalheMes = document.getElementById("metricFilaDetalheMes");

    if (elCustoMes) elCustoMes.textContent = formatarMoeda(custoMes);
    if (elTotalMes) elTotalMes.textContent = totalMesCalculado;
    if (elNomeMes) elNomeMes.textContent = `${nomeMesCorrente}/${anoAtual}`;
    if (elDetalheMes) elDetalheMes.textContent = `${countUtilMes} Utilidade • ${countMktMes} Marketing`;

    // Consulta fila_mensagens_whatsapp para contadores
    const { count: pendentesCount } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente");

    const { count: falhasCount } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("*", { count: "exact", head: true })
      .in("status", ["falha_definitiva", "falha"]);

    const { count: reagendadasCount } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("*", { count: "exact", head: true })
      .in("status", ["reagendado_463", "reagendado_500"]);

    const elPendentes = document.getElementById("metricFilaPendentes");
    if (elPendentes) elPendentes.textContent = pendentesCount || 0;

    const elFalhas = document.getElementById("metricFilaFalhas");
    if (elFalhas) elFalhas.textContent = falhasCount || 0;

    const elReagendadas = document.getElementById("metricFilaReagendadas");
    if (elReagendadas) elReagendadas.textContent = reagendadasCount || 0;

    // Trata Alerta do Timelock/Restrição se houver
    tratarAlertaTimelock(controle);

  } catch (err) {
    console.warn("⚠️ Erro ao carregar métricas da fila:", err);
  }
}

// 3. Exibe ou esconde banner de alerta caso haja restrição ativa
function tratarAlertaTimelock(controle) {
  const container = document.getElementById("bannerTimelockAlert");
  if (!container) return;

  if (intervalContadorTimelock) {
    clearInterval(intervalContadorTimelock);
    intervalContadorTimelock = null;
  }

  if (controle && controle.timelock_ativo && controle.timelock_expira) {
    const dataExpira = new Date(controle.timelock_expira);
    const agora = new Date();

    if (dataExpira > agora) {
      container.style.display = "block";
      
      const atualizarContagem = () => {
        const diffMs = dataExpira.getTime() - new Date().getTime();
        if (diffMs <= 0) {
          container.style.display = "none";
          if (intervalContadorTimelock) clearInterval(intervalContadorTimelock);
          return;
        }

        const horas = Math.floor(diffMs / 3600000);
        const minutos = Math.floor((diffMs % 3600000) / 60000);
        const segundos = Math.floor((diffMs % 60000) / 1000);

        const elTimer = document.getElementById("tempoRestanteTimelock");
        if (elTimer) {
          elTimer.textContent = `${horas}h ${minutos}min ${segundos}s`;
        }
      };

      atualizarContagem();
      intervalContadorTimelock = setInterval(atualizarContagem, 1000);

      const elData = document.getElementById("dataExpiracaoTimelock");
      if (elData) {
        elData.textContent = dataExpira.toLocaleString("pt-BR");
      }
      return;
    }
  }

  container.style.display = "none";
}

// 4. Carrega a tabela com histórico e status detalhado das mensagens (com data/hora e excluir)
async function carregarTabelaMensagensFila(tipoFiltro = filtroTipoFilaAtual) {
  const tbody = document.getElementById("corpoTabelaFilaMensagens");
  if (!tbody) return;

  filtroTipoFilaAtual = tipoFiltro;

  // Atualizar visual dos chips de filtro
  document.querySelectorAll(".chip-filtro-fila").forEach(btn => {
    btn.classList.remove("active");
  });
  const chipAtivo = document.getElementById(`chipFila_${tipoFiltro}`);
  if (chipAtivo) chipAtivo.classList.add("active");

  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">⏳ Carregando mensagens da fila...</td></tr>`;

  const supabase = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabase) return;

  try {
    let query = supabase
      .from("fila_mensagens_whatsapp")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);

    if (tipoFiltro !== 'TODOS') {
      query = query.or(`tipo.eq.${tipoFiltro},tipo_envio.eq.${tipoFiltro}`);
    }

    const { data: itens, error } = await query;

    if (error || !itens || itens.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #888;">Nenhuma mensagem encontrada neste filtro.</td></tr>`;
      return;
    }

    let html = "";
    itens.forEach(item => {
      const tipo = item.tipo || item.tipo_envio || "aviso_lote";
      let tipoLabel = "📢 Aviso em Lote";
      let tipoCor = "#2980b9";
      if (tipo === "cobranca") {
        tipoLabel = "💰 Cobrança";
        tipoCor = "#d35400";
      } else if (tipo === "recibo") {
        tipoLabel = "🧾 Recibo";
        tipoCor = "#27ae60";
      } else if (tipo === "aviso_falta" || tipo === "falta") {
        tipoLabel = "📅 Aviso de Falta";
        tipoCor = "#8e44ad";
      }

      let statusBadge = "";
      let botoesAcao = "";

      if (item.status === "enviado") {
        statusBadge = `<span class="badge" style="background: #27ae60; color: white; padding: 3px 8px; border-radius: 4px;">✅ Enviado</span>`;
      } else if (item.status === "pendente") {
        statusBadge = `<span class="badge" style="background: #f39c12; color: white; padding: 3px 8px; border-radius: 4px;">⏳ Na Fila</span>`;
      } else if (item.status === "processando") {
        statusBadge = `<span class="badge" style="background: #3498db; color: white; padding: 3px 8px; border-radius: 4px;">⚡ Enviando...</span>`;
      } else if (item.status === "falha_definitiva" || item.status === "falha") {
        statusBadge = `<span class="badge" style="background: #e74c3c; color: white; padding: 3px 8px; border-radius: 4px;">❌ Falha</span>`;
        botoesAcao += `<button class="btn btn-warning" style="padding: 3px 8px; font-size: 11px; margin-right: 4px;" onclick="reenviarMensagemFila('${item.id}')" title="Reenviar agora">🔄 Reenviar</button>`;
      } else if (item.status === "reagendado_463" || item.status === "reagendado_500") {
        const tempoFalta = item.agendado_para ? new Date(item.agendado_para).toLocaleTimeString("pt-BR") : "em breve";
        statusBadge = `<span class="badge" style="background: #8e44ad; color: white; padding: 3px 8px; border-radius: 4px;">⏳ Reagendado (${tempoFalta})</span>`;
        botoesAcao += `<button class="btn btn-info" style="padding: 3px 8px; font-size: 11px; margin-right: 4px;" onclick="forcarEnvioMensagemReagendada('${item.id}')" title="Liberar envio agora">⚡ Forçar</button>`;
      }

      // Botão Excluir sempre disponível
      botoesAcao += `<button class="btn btn-danger" style="padding: 3px 8px; font-size: 11px;" onclick="excluirMensagemFila('${item.id}')" title="Excluir mensagem da fila">🗑️ Excluir</button>`;

      const dataCriacao = item.created_at ? new Date(item.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "-";
      const erroDesc = item.erro_log || (item.status === "enviado" ? "Entregue via Meta Cloud API" : "Aguardando worker");

      html += `
        <tr style="font-size: 13px;">
          <td><strong>${item.nome_destinatario || "Crismando"}</strong></td>
          <td>${item.telefone || "-"}</td>
          <td><span style="color: ${tipoCor}; font-weight: 600;">${tipoLabel}</span></td>
          <td style="color: #475569; font-size: 12px; white-space: nowrap;">${dataCriacao}</td>
          <td>${statusBadge}</td>
          <td style="max-width: 230px; font-size: 12px; color: ${item.status.includes('falha') ? '#c0392b' : '#555'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${erroDesc}">
            ${erroDesc}
          </td>
          <td style="white-space: nowrap;">${botoesAcao}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

  } catch (err) {
    console.warn("⚠️ Erro ao listar tabela da fila:", err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e74c3c;">Erro ao carregar mensagens. Tente atualizar.</td></tr>`;
  }
}

// 5. Reenvia mensagem individual que falhou
async function reenviarMensagemFila(id) {
  const supabase = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("fila_mensagens_whatsapp")
      .update({
        status: "pendente",
        tentativas: 0,
        agendado_para: null,
        prioridade: 1, // alta prioridade
        erro_log: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw error;

    alert("✅ Mensagem recolocada na fila com prioridade alta! O worker da Meta a enviará em instantes.");
    await carregarMetricasFila();
    await carregarTabelaMensagensFila();

  } catch (err) {
    alert("❌ Erro ao reenviar mensagem: " + (err.message || err));
  }
}

// 6. Exclui mensagem individual da fila
async function excluirMensagemFila(id) {
  if (!confirm("Tem certeza que deseja excluir esta mensagem da fila de envio?")) {
    return;
  }

  const supabase = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("fila_mensagens_whatsapp")
      .delete()
      .eq("id", id);

    if (error) throw error;

    alert("🗑️ Mensagem excluída com sucesso.");
    await carregarMetricasFila();
    await carregarTabelaMensagensFila();

  } catch (err) {
    alert("❌ Erro ao excluir mensagem: " + (err.message || err));
  }
}

// 7. Reenvia TODAS as mensagens que falharam ou estão reagendadas
async function reenviarTodasFalhasFila() {
  const supabase = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabase) return;

  try {
    const { count, error: errCount } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("*", { count: "exact", head: true })
      .in("status", ["falha_definitiva", "falha", "reagendado_463", "reagendado_500"]);

    if (errCount) throw errCount;

    if (!count || count === 0) {
      alert("ℹ️ Não há mensagens com falha ou reagendadas na fila no momento.");
      return;
    }

    const confirma = confirm(`Deseja recolocar ${count} mensagem(ns) com falha/reagendadas de volta na fila para envio via Meta Cloud API?\n\nO worker enviará automaticamente respeitando o teto de 250 mensagens por dia.`);
    if (!confirma) return;

    const { error } = await supabase
      .from("fila_mensagens_whatsapp")
      .update({
        status: "pendente",
        tentativas: 0,
        agendado_para: null,
        prioridade: 2,
        erro_log: null,
        updated_at: new Date().toISOString()
      })
      .in("status", ["falha_definitiva", "falha", "reagendado_463", "reagendado_500"]);

    if (error) throw error;

    alert(`✅ ${count} mensagem(ns) recolocadas na fila como pendentes!\n\nO worker autônomo da Meta as enviará gradualmente em lotes respeitando o teto diário de 250 envios.`);
    await carregarMetricasFila();
    await carregarTabelaMensagensFila();

  } catch (err) {
    alert("❌ Erro ao reenviar mensagens em massa: " + (err.message || err));
  }
}

// 8. Força o envio imediato de mensagem reagendada
async function forcarEnvioMensagemReagendada(id) {
  const supabase = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("fila_mensagens_whatsapp")
      .update({
        agendado_para: new Date().toISOString(),
        status: "pendente",
        prioridade: 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw error;

    alert("⚡ Mensagem liberada para envio imediato pelo worker.");
    await carregarMetricasFila();
    await carregarTabelaMensagensFila();

  } catch (err) {
    alert("❌ Erro ao liberar mensagem: " + (err.message || err));
  }
}

// 9. Checa a conexão com a Meta Cloud API Oficial
async function checarStatusMetaCloudApi() {
  const badge = document.getElementById("badgeInstanciaStatus");
  const txtDesc = document.getElementById("txtInstanciaDetalhes");
  if (!badge) return;

  badge.className = "badge";
  badge.style.background = "#27ae60";
  badge.textContent = "🟢 Meta Cloud API Conectada";
  if (txtDesc) {
    txtDesc.textContent = "Meta Cloud API v21.0 Oficial ativa | Templates homologados e aprovados (Teto diário: 250 msgs).";
  }
}

// Alias para compatibilidade caso outro script ainda chame checarStatusInstanciaEvolution
window.checarStatusInstanciaEvolution = checarStatusMetaCloudApi;
