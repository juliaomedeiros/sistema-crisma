// js/dashboard-fila.js - Painel de Monitoramento da Fila de Mensagens WhatsApp e Controle Anti-Ban

let filtroTipoFilaAtual = 'TODOS';
let intervalContadorTimelock = null;

// Inicializa o Dashboard ao abrir a aba tabEvolution ou via refresh
async function inicializarDashboardFila() {
  await carregarTelefoneCoordenador();
  await carregarMetricasFila();
  await carregarTabelaMensagensFila();
  await checarStatusInstanciaEvolution();
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

// 2. Carrega as métricas dos cards e o status de restrição (Timelock)
async function carregarMetricasFila() {
  const supabase = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabase) return;

  try {
    // Data de hoje em Brasília (UTC-3)
    const agora = new Date();
    const utc = agora.getTime() + agora.getTimezoneOffset() * 60000;
    const brasilia = new Date(utc - 3 * 3600000);
    const dataHoje = brasilia.toISOString().split("T")[0];

    // Consulta controle_envios_diarios
    const { data: controle } = await supabase
      .from("controle_envios_diarios")
      .select("*")
      .eq("data", dataHoje)
      .maybeSingle();

    const totalEnviadosHoje = controle?.total_enviados || 0;
    const limiteDiario = controle?.limite_diario || 60;
    const pct = Math.min(100, Math.round((totalEnviadosHoje / limiteDiario) * 100));

    // Atualiza Card de Limite
    const elLimite = document.getElementById("metricFilaLimiteHoje");
    const elBarra = document.getElementById("barraFilaLimiteHoje");
    if (elLimite) elLimite.textContent = `${totalEnviadosHoje} / ${limiteDiario} (${pct}%)`;
    if (elBarra) elBarra.style.width = `${pct}%`;

    // Atualiza Card Enviadas Hoje
    const elEnviadosHoje = document.getElementById("metricFilaEnviadosHoje");
    if (elEnviadosHoje) elEnviadosHoje.textContent = totalEnviadosHoje;

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

    // Trata Alerta do Timelock
    tratarAlertaTimelock(controle);

  } catch (err) {
    console.warn("⚠️ Erro ao carregar métricas da fila:", err);
  }
}

// 3. Exibe ou esconde o banner de alerta caso a conta esteja em Timelock
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

// 4. Carrega a tabela com histórico e status detalhado das mensagens
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

  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">⏳ Carregando mensagens da fila...</td></tr>`;

  const supabase = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabase) return;

  try {
    let query = supabase
      .from("fila_mensagens_whatsapp")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);

    if (tipoFiltro !== 'TODOS') {
      query = query.or(`tipo.eq.${tipoFiltro},tipo_envio.eq.${tipoFiltro}`);
    }

    const { data: itens, error } = await query;

    if (error || !itens || itens.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #888;">Nenhuma mensagem encontrada neste filtro.</td></tr>`;
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
      }

      let statusBadge = "";
      let acaoBotao = "—";

      if (item.status === "enviado") {
        statusBadge = `<span class="badge" style="background: #27ae60; color: white; padding: 3px 8px; border-radius: 4px;">✅ Enviado</span>`;
      } else if (item.status === "pendente") {
        statusBadge = `<span class="badge" style="background: #f39c12; color: white; padding: 3px 8px; border-radius: 4px;">⏳ Na Fila</span>`;
      } else if (item.status === "processando") {
        statusBadge = `<span class="badge" style="background: #3498db; color: white; padding: 3px 8px; border-radius: 4px;">⚡ Enviando...</span>`;
      } else if (item.status === "falha_definitiva" || item.status === "falha") {
        statusBadge = `<span class="badge" style="background: #e74c3c; color: white; padding: 3px 8px; border-radius: 4px;">❌ Falha</span>`;
        acaoBotao = `<button class="btn btn-warning" style="padding: 3px 8px; font-size: 11px;" onclick="reenviarMensagemFila(${item.id})">🔄 Reenviar</button>`;
      } else if (item.status === "reagendado_463" || item.status === "reagendado_500") {
        const tempoFalta = item.agendado_para ? new Date(item.agendado_para).toLocaleTimeString("pt-BR") : "em breve";
        statusBadge = `<span class="badge" style="background: #8e44ad; color: white; padding: 3px 8px; border-radius: 4px;">⏳ Reagendado (${tempoFalta})</span>`;
        acaoBotao = `<button class="btn btn-info" style="padding: 3px 8px; font-size: 11px;" onclick="forcarEnvioMensagemReagendada(${item.id})">⚡ Forçar Agora</button>`;
      }

      const dataStr = item.created_at ? new Date(item.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "-";
      const erroDesc = item.erro_log || (item.status === "enviado" ? "Entregue com sucesso" : "Aguardando envio");

      html += `
        <tr style="font-size: 13px;">
          <td><strong>${item.nome_destinatario || "Crismando"}</strong></td>
          <td>${item.telefone || "-"}</td>
          <td><span style="color: ${tipoCor}; font-weight: 600;">${tipoLabel}</span></td>
          <td>${statusBadge}</td>
          <td style="max-width: 250px; font-size: 12px; color: ${item.status.includes('falha') ? '#c0392b' : '#555'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${erroDesc}">
            ${erroDesc}
          </td>
          <td>${acaoBotao}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

  } catch (err) {
    console.warn("⚠️ Erro ao listar tabela da fila:", err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #e74c3c;">Erro ao carregar mensagens. Tente atualizar.</td></tr>`;
  }
}

// 5. Reenvia mensagem que falhou (volta o status para 'pendente' com prioridade 1)
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
        prioridade: 1, // alta prioridade para sair na próxima rodada
        erro_log: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw error;

    alert("✅ Mensagem recolocada na fila com prioridade alta! O worker a enviará em instantes.");
    await carregarMetricasFila();
    await carregarTabelaMensagensFila();

  } catch (err) {
    alert("❌ Erro ao reenviar mensagem: " + (err.message || err));
  }
}

// 6. Força o envio imediato de mensagem reagendada
async function forcarEnvioMensagemReagendada(id) {
  const supabase = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("fila_mensagens_whatsapp")
      .update({
        agendado_para: new Date().toISOString(), // agora
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

// 7. Checa a conexão da instância com a Evolution Go via HTTP
async function checarStatusInstanciaEvolution() {
  const badge = document.getElementById("badgeInstanciaStatus");
  const txtDesc = document.getElementById("txtInstanciaDetalhes");
  if (!badge) return;

  badge.className = "badge";
  badge.style.background = "#f39c12";
  badge.textContent = "⏳ Testando conexão...";

  const envObj = typeof ENV !== 'undefined' ? ENV : null;
  const baseUrl = envObj?.EVOLUTION_GO_URL || "http://144.22.164.103:8080/";
  const apiKey = envObj?.EVOLUTION_GO_API_KEY || "julius_zap_evogo_2026";
  const instance = envObj?.EVOLUTION_GO_INSTANCE || "crisma-mae-rainha";

  try {
    const cleanUrl = baseUrl.replace(/\/+$/, "");
    const url = `${cleanUrl}/instance/connectionState/${instance}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      method: "GET",
      headers: { "apikey": apiKey },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const state = data?.instance?.state || data?.state || "open";

      if (state === "open" || state === "connected") {
        badge.style.background = "#27ae60";
        badge.textContent = "🟢 Conectado e Operacional";
        if (txtDesc) txtDesc.textContent = `Instância: ${instance} | WhatsApp pareado pronto para envios.`;
      } else if (state === "connecting" || state === "qr") {
        badge.style.background = "#f39c12";
        badge.textContent = "🟡 Aguardando QR Code / Pareamento";
        if (txtDesc) txtDesc.textContent = `Instância: ${instance} | Sessão aguardando leitura de QR Code.`;
      } else {
        badge.style.background = "#e74c3c";
        badge.textContent = `🔴 Desconectado (${state})`;
        if (txtDesc) txtDesc.textContent = `Instância: ${instance} | Necessário re-parear no WhatsApp.`;
      }
    } else {
      badge.style.background = "#e74c3c";
      badge.textContent = `🔴 Instância Offline (${res.status})`;
      if (txtDesc) txtDesc.textContent = `Servidor Evolution Go retornou status ${res.status}.`;
    }

  } catch (err) {
    badge.style.background = "#e74c3c";
    badge.textContent = "🔴 Servidor Inacessível";
    if (txtDesc) txtDesc.textContent = `Não foi possível alcançar o servidor Evolution Go (${baseUrl}).`;
  }
}
