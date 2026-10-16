// js/chat-whatsapp.js - Central de Atendimento (Aba Chat) via Meta Cloud API Oficial
// Regras:
// 1. Somente texto (sem armazenamento de áudio, foto ou vídeo).
// 2. Exclusão automática de mensagens com mais de 45 dias.
// 3. Bloqueio automático após 24h da última mensagem recebida do crismando para garantir R$ 0,00 de cobrança extra na Meta.

let conversasChat = [];
let telefoneChatAtivo = null;
let timerPollingChat = null;
let mobileVisualizandoConversa = false;

function normalizarTelChat(tel) {
  if (typeof normalizarTelefoneWhatsApp === "function") {
    return normalizarTelefoneWhatsApp(tel, "83");
  }
  let limpo = String(tel || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!limpo) return "";
  if (limpo.startsWith("55") && (limpo.length === 12 || limpo.length === 13)) return limpo;
  if (limpo.length === 10 || limpo.length === 11) return "55" + limpo;
  if (limpo.length === 8 || limpo.length === 9) return "5583" + limpo;
  return limpo;
}

function telefonesIguaisChat(telA, telB) {
  const a = normalizarTelChat(telA);
  const b = normalizarTelChat(telB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 12 && b.length >= 12) {
    return a.substring(0, 4) === b.substring(0, 4) && a.slice(-8) === b.slice(-8);
  }
  return false;
}

function identificarCrismandoPorTelefone(telefone) {
  if (!crismandos || crismandos.length === 0) return null;
  return crismandos.find((c) => telefonesIguaisChat(c.telefone || "", telefone)) || null;
}

function formatarDataHoraChat(isoStr) {
  if (!isoStr) return "-";
  const dt = new Date(isoStr);
  if (isNaN(dt.getTime())) return "-";
  const hoje = new Date();
  const mesmoDia =
    dt.getDate() === hoje.getDate() &&
    dt.getMonth() === hoje.getMonth() &&
    dt.getFullYear() === hoje.getFullYear();

  const hora = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (mesmoDia) return `Hoje às ${hora}`;
  return `${dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${hora}`;
}

let canalRealtimeChat = null;
let ultimoIdMensagemChatConhecido = 0;

function criarHtmlBalaoMensagemChat(m) {
  const enviadaPorNos = m.direcao === "enviada";
  const horaMsg = formatarDataHoraChat(m.created_at);
  return `
    <div id="balao_msg_chat_${m.id}" style="display:flex;justify-content:${enviadaPorNos ? "flex-end" : "flex-start"};margin-bottom:10px;">
      <div style="background:${enviadaPorNos ? "#d9fdd3" : "#ffffff"};
                  color:#111b21;padding:10px 14px;border-radius:10px;
                  max-width:82%;box-shadow:0 1px 2px rgba(0,0,0,0.12);
                  border:${enviadaPorNos ? "1px solid #b9f6ca" : "1px solid #e0e0e0"};">
        <div style="font-size:13.5px;line-height:1.4;white-space:pre-wrap;word-break:break-word;">${escaparHtmlChat(m.mensagem_texto)}</div>
        <div style="text-align:right;font-size:10.5px;color:#667781;margin-top:4px;">
          ${horaMsg} ${enviadaPorNos ? "✓✓" : ""}
        </div>
      </div>
    </div>`;
}

// Processa instantaneamente qualquer nova mensagem que chegue via WebSocket Realtime ou polling incremental
async function processarNovaMensagemRecebidaEmTempoReal(novaMsg) {
  if (!novaMsg || !novaMsg.id) return;

  if (novaMsg.id > ultimoIdMensagemChatConhecido) {
    ultimoIdMensagemChatConhecido = novaMsg.id;
  }

  const telChave = normalizarTelChat(novaMsg.telefone);
  if (!telChave) return;

  let conv = conversasChat.find((c) => c.telefone === telChave);
  const crisVinculado = identificarCrismandoPorTelefone(telChave);
  const nomeExibicao = crisVinculado
    ? crisVinculado.nome
    : novaMsg.nome_contato || formatarTelefoneExibicao(telChave, "83");

  if (!conv) {
    conv = {
      telefone: telChave,
      crismandoId: crisVinculado ? crisVinculado.id : novaMsg.crismando_id || null,
      nome: nomeExibicao,
      mensagens: [],
      naoLidas: 0,
      ultimaMensagem: null,
      ultimaRecebidaEm: null,
      ultimoAvisoFila: null
    };
    conversasChat.unshift(conv);
  }

  // Evitar duplicação caso o Realtime e o polling peguem a mesma mensagem
  if (conv.mensagens.some((m) => String(m.id) === String(novaMsg.id))) {
    return;
  }

  const janelaEstavaAbertaAntes = calcularStatusJanela24h(conv.ultimaRecebidaEm).aberta;

  conv.mensagens.push(novaMsg);
  conv.ultimaMensagem = novaMsg;

  const conversaEstaAbertaNaTela =
    telefoneChatAtivo === telChave &&
    sessionStorage.getItem("abaAtivaCrisma") === "tabChat";

  if (novaMsg.direcao === "recebida") {
    conv.ultimaRecebidaEm = novaMsg.created_at;
    if (!conversaEstaAbertaNaTela && !novaMsg.lida) {
      conv.naoLidas += 1;
    }
  }

  // Reordenar lista de conversas colocando a mais recente no topo
  conversasChat.sort((a, b) => {
    if (b.naoLidas !== a.naoLidas) return b.naoLidas - a.naoLidas;
    const temChatA = a.mensagens.length > 0 ? 1 : 0;
    const temChatB = b.mensagens.length > 0 ? 1 : 0;
    if (temChatB !== temChatA) return temChatB - temChatA;
    const dataRefA = a.ultimaMensagem?.created_at || a.ultimoAvisoFila?.enviado_em || a.ultimoAvisoFila?.created_at || 0;
    const dataRefB = b.ultimaMensagem?.created_at || b.ultimoAvisoFila?.enviado_em || b.ultimoAvisoFila?.created_at || 0;
    return new Date(dataRefB).getTime() - new Date(dataRefA).getTime();
  });

  renderizarListaContatosChat();

  if (conversaEstaAbertaNaTela) {
    // Marcar como lida silenciosamente no banco
    if (novaMsg.direcao === "recebida" && !novaMsg.lida) {
      novaMsg.lida = true;
      conv.naoLidas = 0;
      const supabase = (typeof getSupabaseClient === "function" ? getSupabaseClient() : null) || window.supabaseClient;
      if (supabase) {
        supabase.from("mensagens_chat_whatsapp").update({ lida: true }).eq("id", novaMsg.id).then(() => {});
      }
    }

    const inputExistente = document.getElementById("inputTextoRespostaChat");
    const corpoMensagens = document.getElementById("corpoMensagensChatAtivo");

    // Se a janela estava bloqueada (🔒) e acabou de destravar (🟢) com esta mensagem, renderiza a janela completa para liberar o input!
    if (!janelaEstavaAbertaAntes || !inputExistente || !corpoMensagens) {
      await renderizarJanelaConversaAtiva(telChave, true);
    } else {
      // Se já estava aberta e o coordenador está com o teclado aberto no celular, insere APENAS o balão novo sem recriar o input!
      if (!document.getElementById(`balao_msg_chat_${novaMsg.id}`)) {
        corpoMensagens.insertAdjacentHTML("beforeend", criarHtmlBalaoMensagemChat(novaMsg));
        corpoMensagens.scrollTop = corpoMensagens.scrollHeight;
      }
    }
  }

  atualizarBadgeChatNaoLidas();
}

function iniciarEscutaRealtimeChat() {
  try {
    const supabase = (typeof getSupabaseClient === "function" ? getSupabaseClient() : null) || window.supabaseClient;
    if (!supabase || typeof supabase.channel !== "function") return;

    if (canalRealtimeChat) {
      supabase.removeChannel(canalRealtimeChat);
    }

    canalRealtimeChat = supabase
      .channel("canal-chat-whatsapp-tempo-real")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens_chat_whatsapp"
        },
        (payload) => {
          if (payload && payload.new) {
            processarNovaMensagemRecebidaEmTempoReal(payload.new);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("⚡ [Chat Realtime] Conectado em tempo real às mensagens do WhatsApp!");
        }
      });
  } catch (e) {
    console.warn("⚠️ Aviso ao iniciar Realtime do Chat:", e);
  }
}

async function verificarNovasMensagensIncremental() {
  try {
    if (document.hidden) return;
    const supabase = (typeof getSupabaseClient === "function" ? getSupabaseClient() : null) || window.supabaseClient;
    if (!supabase) return;

    const { data, error } = await supabase
      .from("mensagens_chat_whatsapp")
      .select("*")
      .gt("id", ultimoIdMensagemChatConhecido)
      .order("id", { ascending: true })
      .limit(20);

    if (!error && data && data.length > 0) {
      for (const m of data) {
        await processarNovaMensagemRecebidaEmTempoReal(m);
      }
    }
  } catch (_) {}
}

// Executa limpeza preventiva de mensagens > 45 dias, conecta o WebSocket Realtime e inicia sincronização rápida
async function inicializarModuloChatWhatsApp() {
  await limparMensagensChatAntigas45Dias();
  await atualizarBadgeChatNaoLidas();
  iniciarEscutaRealtimeChat();

  // Fallback rápido (a cada 4 segundos quando a aba Chat está aberta no celular/tablet)
  setInterval(() => {
    const abaAtiva = sessionStorage.getItem("abaAtivaCrisma");
    if (abaAtiva === "tabChat") {
      verificarNovasMensagensIncremental();
    }
  }, 4000);

  // Atualização de badge global a cada 15 segundos quando o coordenador está em outras abas
  setInterval(() => {
    const abaAtiva = sessionStorage.getItem("abaAtivaCrisma");
    if (abaAtiva !== "tabChat") {
      atualizarBadgeChatNaoLidas();
    }
  }, 15000);
}

async function limparMensagensChatAntigas45Dias() {
  try {
    const supabase = (typeof getSupabaseClient === "function" ? getSupabaseClient() : null) || window.supabaseClient;
    if (!supabase) return;

    const limite45Dias = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("mensagens_chat_whatsapp")
      .delete()
      .lt("created_at", limite45Dias);
  } catch (_) {
    // Silencioso caso a tabela ainda não tenha sido criada no banco
  }
}

async function atualizarBadgeChatNaoLidas() {
  try {
    const supabase = (typeof getSupabaseClient === "function" ? getSupabaseClient() : null) || window.supabaseClient;
    if (!supabase) return;

    const { count, error } = await supabase
      .from("mensagens_chat_whatsapp")
      .select("id", { count: "exact", head: true })
      .eq("direcao", "recebida")
      .eq("lida", false);

    if (error) return;

    const badge = document.getElementById("badgeChatNaoLidas");
    if (badge) {
      const qtd = count || 0;
      if (qtd > 0) {
        badge.textContent = qtd > 99 ? "99+" : String(qtd);
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    }
  } catch (_) {}
}

async function abrirAbaChatWhatsApp() {
  await carregarConversasChat(true);
}

async function carregarConversasChat(mostrarLoading = false) {
  const containerLista = document.getElementById("listaContatosChat");
  if (!containerLista) return;

  if (mostrarLoading && conversasChat.length === 0) {
    containerLista.innerHTML = `<div style="padding:20px;text-align:center;color:#666;font-size:13px;">🔄 Carregando conversas...</div>`;
  }

  try {
    const supabase = (typeof getSupabaseClient === "function" ? getSupabaseClient() : null) || window.supabaseClient;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const { data, error } = await supabase
      .from("mensagens_chat_whatsapp")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1000);

    if (error) {
      if (error.code === "42P01" || (error.message && error.message.includes("does not exist"))) {
        containerLista.innerHTML = `
          <div style="padding:18px;text-align:center;color:#b71c1c;background:#ffebee;margin:10px;border-radius:8px;font-size:13px;">
            ⚠️ <strong>Tabela do Chat ainda não ativada no Supabase.</strong><br><br>
            Execute o script <code>supabase/setup_chat_whatsapp.sql</code> no SQL Editor do Supabase para ativar o recebimento de mensagens.
          </div>`;
        return;
      }
      throw error;
    }

    const mensagens = data || [];
    const mapa = {};

    // 1. Carregar todas as mensagens de chat (respostas recebidas dos crismandos e respostas enviadas pelo coordenador)
    mensagens.forEach((m) => {
      if (m.id && m.id > ultimoIdMensagemChatConhecido) {
        ultimoIdMensagemChatConhecido = m.id;
      }
      const telChave = normalizarTelChat(m.telefone);
      if (!telChave) return;

      const crisVinculado = identificarCrismandoPorTelefone(telChave);
      const nomeExibicao = crisVinculado
        ? crisVinculado.nome
        : m.nome_contato || formatarTelefoneExibicao(telChave, "83");

      if (!mapa[telChave]) {
        mapa[telChave] = {
          telefone: telChave,
          crismandoId: crisVinculado ? crisVinculado.id : m.crismando_id || null,
          nome: nomeExibicao,
          mensagens: [],
          naoLidas: 0,
          ultimaMensagem: null,
          ultimaRecebidaEm: null,
          ultimoAvisoFila: null
        };
      }

      mapa[telChave].mensagens.push(m);
      mapa[telChave].ultimaMensagem = m;

      if (m.direcao === "recebida") {
        mapa[telChave].ultimaRecebidaEm = m.created_at;
        if (!m.lida) {
          mapa[telChave].naoLidas += 1;
        }
      }
    });

    // 2. Buscar também os últimos avisos/recibos automáticos enviados na fila_mensagens_whatsapp
    // para que o coordenador já veja na aba Chat para quem o sistema enviou mensagem recentemente
    const { data: ultimosAvisosEnviados } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("id, crismando_id, nome_destinatario, telefone, tipo, tipo_envio, mensagem, dados_template, status, enviado_em, created_at")
      .eq("status", "enviado")
      .order("created_at", { ascending: false })
      .limit(80);

    if (ultimosAvisosEnviados && ultimosAvisosEnviados.length > 0) {
      ultimosAvisosEnviados.forEach((av) => {
        const telChave = normalizarTelChat(av.telefone);
        if (!telChave) return;

        const crisVinculado = identificarCrismandoPorTelefone(telChave);
        const nomeExibicao = crisVinculado
          ? crisVinculado.nome
          : av.nome_destinatario || formatarTelefoneExibicao(telChave, "83");

        if (!mapa[telChave]) {
          mapa[telChave] = {
            telefone: telChave,
            crismandoId: crisVinculado ? crisVinculado.id : av.crismando_id || null,
            nome: nomeExibicao,
            mensagens: [],
            naoLidas: 0,
            ultimaMensagem: null,
            ultimaRecebidaEm: null,
            ultimoAvisoFila: av
          };
        } else if (!mapa[telChave].ultimoAvisoFila) {
          mapa[telChave].ultimoAvisoFila = av;
        }
      });
    }

    // Ordenar colocando primeiro quem tem mensagens não lidas, depois quem respondeu no chat mais recentemente, depois os avisos automáticos recentes
    conversasChat = Object.values(mapa).sort((a, b) => {
      if (b.naoLidas !== a.naoLidas) return b.naoLidas - a.naoLidas;
      const temChatA = a.mensagens.length > 0 ? 1 : 0;
      const temChatB = b.mensagens.length > 0 ? 1 : 0;
      if (temChatB !== temChatA) return temChatB - temChatA;

      const dataRefA = a.ultimaMensagem?.created_at || a.ultimoAvisoFila?.enviado_em || a.ultimoAvisoFila?.created_at || 0;
      const dataRefB = b.ultimaMensagem?.created_at || b.ultimoAvisoFila?.enviado_em || b.ultimoAvisoFila?.created_at || 0;
      return new Date(dataRefB).getTime() - new Date(dataRefA).getTime();
    });

    renderizarListaContatosChat();

    if (telefoneChatAtivo) {
      const aindaExiste = conversasChat.find((c) => c.telefone === telefoneChatAtivo);
      if (aindaExiste) {
        await renderizarJanelaConversaAtiva(telefoneChatAtivo, false);
      }
    }
  } catch (err) {
    console.error("Erro ao carregar conversas do chat:", err);
    containerLista.innerHTML = `<div style="padding:15px;color:#e74c3c;font-size:13px;">❌ Erro ao carregar chat: ${err.message || err}</div>`;
  }
}

function renderizarListaContatosChat() {
  const containerLista = document.getElementById("listaContatosChat");
  if (!containerLista) return;

  const termoBusca = (document.getElementById("inputBuscaContatoChat")?.value || "").trim().toLowerCase();

  const filtradas = conversasChat.filter((c) => {
    if (!termoBusca) return true;
    return (
      c.nome.toLowerCase().includes(termoBusca) ||
      c.telefone.includes(termoBusca) ||
      (c.ultimaMensagem?.mensagem_texto || "").toLowerCase().includes(termoBusca) ||
      (c.ultimoAvisoFila?.mensagem || "").toLowerCase().includes(termoBusca)
    );
  });

  if (filtradas.length === 0) {
    containerLista.innerHTML = `
      <div style="padding:25px 15px;text-align:center;color:#7f8c8d;font-size:13px;">
        📭 Nenhuma conversa encontrada.<br>
        <small style="display:block;margin-top:6px;">Assim que um crismando receber ou responder a algum aviso, recibo ou cobrança, aparecerá aqui automaticamente.</small>
      </div>`;
    return;
  }

  let html = "";
  filtradas.forEach((conv) => {
    const ativo = conv.telefone === telefoneChatAtivo;
    const statusJanela = calcularStatusJanela24h(conv.ultimaRecebidaEm);

    let previa = "";
    let dataRefIso = "";
    if (conv.ultimaMensagem) {
      previa = (conv.ultimaMensagem.direcao === "enviada" ? "Você: " : "💬 ") + conv.ultimaMensagem.mensagem_texto;
      dataRefIso = conv.ultimaMensagem.created_at;
    } else if (conv.ultimoAvisoFila) {
      previa = "🤖 Aviso enviado: " + (conv.ultimoAvisoFila.mensagem || "Template oficial");
      dataRefIso = conv.ultimoAvisoFila.enviado_em || conv.ultimoAvisoFila.created_at;
    }

    const previaCurta = previa.length > 48 ? previa.substring(0, 48) + "..." : previa;
    const horaUltima = dataRefIso ? formatarDataHoraChat(dataRefIso) : "";

    html += `
      <div class="chat-contact-item ${ativo ? "active" : ""}" onclick="selecionarConversaChat('${conv.telefone}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:6px;">
          <strong style="color:#2c3e50;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            👤 ${conv.nome}
          </strong>
          <small style="color:#7f8c8d;font-size:11px;white-space:nowrap;">${horaUltima}</small>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span style="color:${conv.naoLidas > 0 ? "#111b21" : "#667781"};font-weight:${conv.naoLidas > 0 ? "bold" : "normal"};font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${escaparHtmlChat(previaCurta)}
          </span>
          <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
            <span title="${statusJanela.aberta ? "Janela gratuita 24h aberta (Crismando respondeu)" : "Janela 24h fechada (Aguardando resposta do crismando)"}" style="font-size:11px;">
              ${statusJanela.aberta ? "🟢" : "🔒"}
            </span>
            ${conv.naoLidas > 0 ? `<span style="background:#25d366;color:white;border-radius:12px;padding:2px 7px;font-size:11px;font-weight:bold;">${conv.naoLidas}</span>` : ""}
          </div>
        </div>
      </div>`;
  });

  containerLista.innerHTML = html;
}

function calcularStatusJanela24h(ultimaRecebidaEmIso) {
  if (!ultimaRecebidaEmIso) {
    return { aberta: false, msRestantes: 0, textoRestante: "Encerrada" };
  }
  const tsUltima = new Date(ultimaRecebidaEmIso).getTime();
  if (isNaN(tsUltima)) {
    return { aberta: false, msRestantes: 0, textoRestante: "Encerrada" };
  }

  const limite24hMs = 24 * 60 * 60 * 1000;
  const decorrido = Date.now() - tsUltima;
  const restante = limite24hMs - decorrido;

  if (restante <= 0) {
    return { aberta: false, msRestantes: 0, textoRestante: "Encerrada (passou de 24h)" };
  }

  const horas = Math.floor(restante / (60 * 60 * 1000));
  const minutos = Math.floor((restante % (60 * 60 * 1000)) / (60 * 1000));
  return {
    aberta: true,
    msRestantes: restante,
    textoRestante: `${horas}h ${minutos}min restantes`
  };
}

async function buscarUltimoAvisoAutomaticoCrismando(crismandoId, telefone) {
  try {
    const supabase = (typeof getSupabaseClient === "function" ? getSupabaseClient() : null) || window.supabaseClient;
    if (!supabase) return null;

    let query = supabase
      .from("fila_mensagens_whatsapp")
      .select("id, tipo, tipo_envio, mensagem, dados_template, status, enviado_em, created_at, telefone")
      .eq("status", "enviado")
      .order("created_at", { ascending: false })
      .limit(15);

    if (crismandoId) {
      const { data } = await query.eq("crismando_id", crismandoId);
      if (data && data.length > 0) return data[0];
    }

    // Fallback pelo número de telefone caso crismando_id seja nulo
    const { data: recentes } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("id, tipo, tipo_envio, mensagem, dados_template, status, enviado_em, created_at, telefone")
      .eq("status", "enviado")
      .order("created_at", { ascending: false })
      .limit(50);

    if (recentes && recentes.length > 0) {
      return recentes.find((item) => telefonesIguaisChat(item.telefone || "", telefone)) || null;
    }
  } catch (e) {
    console.warn("Não foi possível consultar último aviso automático:", e);
  }
  return null;
}

async function selecionarConversaChat(telefone) {
  telefoneChatAtivo = telefone;
  mobileVisualizandoConversa = true;
  atualizarModoResponsivoChat();
  renderizarListaContatosChat();
  await marcarMensagensComoLidas(telefone);
  await renderizarJanelaConversaAtiva(telefone, true);
}

function voltarParaListaChatMobile() {
  mobileVisualizandoConversa = false;
  atualizarModoResponsivoChat();
}

function atualizarModoResponsivoChat() {
  const wrapper = document.getElementById("chatWrapperResponsivo");
  if (!wrapper) return;
  if (mobileVisualizandoConversa) {
    wrapper.classList.add("mobile-chat-open");
  } else {
    wrapper.classList.remove("mobile-chat-open");
  }
}

async function marcarMensagensComoLidas(telefone) {
  try {
    const conv = conversasChat.find((c) => c.telefone === telefone);
    if (!conv || conv.naoLidas === 0) return;

    const idsNaoLidos = conv.mensagens
      .filter((m) => m.direcao === "recebida" && !m.lida)
      .map((m) => m.id);

    conv.naoLidas = 0;
    conv.mensagens.forEach((m) => {
      if (m.direcao === "recebida") m.lida = true;
    });
    renderizarListaContatosChat();

    const supabase = (typeof getSupabaseClient === "function" ? getSupabaseClient() : null) || window.supabaseClient;
    if (supabase && idsNaoLidos.length > 0) {
      await supabase
        .from("mensagens_chat_whatsapp")
        .update({ lida: true })
        .in("id", idsNaoLidos);
    }
    await atualizarBadgeChatNaoLidas();
  } catch (e) {
    console.warn("Erro ao marcar mensagens como lidas:", e);
  }
}

function escaparHtmlChat(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function renderizarJanelaConversaAtiva(telefone, rolarParaFinal = true) {
  const painelDireito = document.getElementById("painelConversaChatAtiva");
  if (!painelDireito) return;

  const conv = conversasChat.find((c) => c.telefone === telefone);
  if (!conv) {
    painelDireito.innerHTML = `
      <div style="height:100%;display:flex;align-items:center;justify-content:center;color:#7f8c8d;padding:20px;text-align:center;">
        👈 Selecione uma conversa ao lado para visualizar o histórico e responder.
      </div>`;
    return;
  }

  const inputExistente = document.getElementById("inputTextoRespostaChat");
  const rascunhoAtual = inputExistente ? inputExistente.value : "";

  const statusJanela = calcularStatusJanela24h(conv.ultimaRecebidaEm);
  const telFormatadoVisual = typeof formatarTelefoneExibicao === "function"
    ? formatarTelefoneExibicao(conv.telefone, "83")
    : conv.telefone;

  // Buscar SOMENTE o último aviso automático enviado pelo sistema para dar contexto
  const ultimoAvisoAuto = await buscarUltimoAvisoAutomaticoCrismando(conv.crismandoId, conv.telefone);

  let cardUltimoAvisoHtml = "";
  if (ultimoAvisoAuto) {
    const dataAviso = formatarDataHoraChat(ultimoAvisoAuto.enviado_em || ultimoAvisoAuto.created_at);
    const textoAviso = ultimoAvisoAuto.mensagem || `[Template enviado: ${ultimoAvisoAuto.dados_template?.template || ultimoAvisoAuto.tipo || "Aviso"}]`;
    cardUltimoAvisoHtml = `
      <div style="background:#fff8e1;border:1px solid #ffe082;border-left:4px solid #f39c12;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12.5px;color:#4e342e;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px;flex-wrap:wrap;">
          <strong>🤖 Último aviso automático enviado pelo sistema (Contexto)</strong>
          <span style="font-size:11px;color:#795548;">📅 ${dataAviso}</span>
        </div>
        <div style="white-space:pre-wrap;line-height:1.35;color:#3e2723;">${escaparHtmlChat(textoAviso)}</div>
      </div>`;
  }

  let baloesHtml = "";
  conv.mensagens.forEach((m) => {
    baloesHtml += criarHtmlBalaoMensagemChat(m);
  });

  // Barra de status da Janela de 24h e Rodapé de Envio (com bloqueio estrito se passou de 24h)
  let barraJanelaHtml = "";
  let rodapeEnvioHtml = "";

  if (statusJanela.aberta) {
    barraJanelaHtml = `
      <div style="background:#e8f5e9;border-bottom:1px solid #c8e6c9;color:#1b5e20;padding:7px 14px;font-size:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
        <span>🟢 <strong>Janela Gratuita de 24h Aberta:</strong> Você pode responder livremente sem custo de template.</span>
        <strong>⏳ ${statusJanela.textoRestante}</strong>
      </div>`;

    rodapeEnvioHtml = `
      <form onsubmit="enviarRespostaChat(event, '${conv.telefone}')" style="display:flex;gap:8px;padding:12px;background:#f0f2f5;border-top:1px solid #ddd;align-items:center;">
        <input type="text" id="inputTextoRespostaChat"
               placeholder="Digite sua resposta em texto (Gratuito dentro das 24h)..."
               value="${escaparHtmlChat(rascunhoAtual)}"
               autocomplete="off"
               style="flex:1;padding:11px 14px;border-radius:20px;border:1px solid #ccc;font-size:14px;background:#fff;margin:0;">
        <button type="submit" id="btnEnviarMsgChat"
                style="background:#25d366;color:white;border:none;border-radius:20px;padding:11px 18px;font-weight:bold;font-size:14px;cursor:pointer;white-space:nowrap;">
          📤 Enviar
        </button>
      </form>`;
  } else {
    const linkWaMe = `https://wa.me/${conv.telefone}`;
    barraJanelaHtml = `
      <div style="background:#ffebee;border-bottom:1px solid #ffcdd2;color:#b71c1c;padding:8px 14px;font-size:12px;">
        🔒 <strong>Janela Gratuita de 24h Encerrada:</strong> Passaram mais de 24h desde a última mensagem deste crismando. Para evitar qualquer cobrança extra na Meta, o envio foi bloqueado.
        <em>(Se o crismando responder a algum novo aviso automático no futuro, esta janela reabrirá por +24h automaticamente).</em>
      </div>`;

    rodapeEnvioHtml = `
      <div style="padding:12px;background:#f8f9fa;border-top:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <span style="font-size:12.5px;color:#666;">
          🔒 <strong>Envio bloqueado pela trava de custo zero (>24h).</strong>
        </span>
        <a href="${linkWaMe}" target="_blank" rel="noopener noreferrer"
           style="background:#27ae60;color:white;text-decoration:none;padding:9px 14px;border-radius:6px;font-size:12.5px;font-weight:bold;display:inline-block;">
          📲 Responder pelo meu WhatsApp Pessoal (Grátis)
        </a>
      </div>`;
  }

  painelDireito.innerHTML = `
    <!-- Cabeçalho do Contato -->
    <div style="background:#2c3e50;color:white;padding:12px 15px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;">
        <button type="button" class="btn-voltar-chat-mobile" onclick="voltarParaListaChatMobile()"
                style="background:rgba(255,255,255,0.18);color:white;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:13px;font-weight:bold;">
          ⬅️ Voltar
        </button>
        <div style="overflow:hidden;">
          <div style="font-weight:bold;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">👤 ${conv.nome}</div>
          <div style="font-size:12px;opacity:0.85;">📞 ${telFormatadoVisual}</div>
        </div>
      </div>
      <button type="button" onclick="carregarConversasChat(true)"
              style="background:rgba(255,255,255,0.15);color:white;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;">
        🔄 Atualizar
      </button>
    </div>

    ${barraJanelaHtml}

    <!-- Histórico da Conversa + Último Aviso Automático -->
    <div id="corpoMensagensChatAtivo" style="flex:1;overflow-y:auto;padding:15px;background:#efeae2;">
      ${cardUltimoAvisoHtml}
      ${baloesHtml}
    </div>

    ${rodapeEnvioHtml}
  `;

  if (rolarParaFinal) {
    const corpo = document.getElementById("corpoMensagensChatAtivo");
    if (corpo) corpo.scrollTop = corpo.scrollHeight;
  }
}

async function enviarRespostaChat(event, telefone) {
  if (event) event.preventDefault();

  const conv = conversasChat.find((c) => c.telefone === telefone);
  if (!conv) return;

  // Dupla verificação da trava de 24h antes de disparar
  const statusJanela = calcularStatusJanela24h(conv.ultimaRecebidaEm);
  if (!statusJanela.aberta) {
    alert("🔒 A janela gratuita de 24h para este crismando já encerrou. O envio foi bloqueado para não gerar cobrança na Meta.");
    await renderizarJanelaConversaAtiva(telefone, false);
    return;
  }

  const input = document.getElementById("inputTextoRespostaChat");
  const btn = document.getElementById("btnEnviarMsgChat");
  const texto = input ? input.value.trim() : "";

  if (!texto) return;

  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳...";
  }

  try {
    const supabaseUrl = (typeof ENV !== "undefined" && ENV.SUPABASE_URL)
      ? ENV.SUPABASE_URL
      : "https://yqqpugheqqknpbetysme.supabase.co";
    const supabaseAnonKey = (typeof ENV !== "undefined" && ENV.SUPABASE_ANON_KEY)
      ? ENV.SUPABASE_ANON_KEY
      : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxcXB1Z2hlcXFrbnBiZXR5c21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTkwNTUsImV4cCI6MjA2NTc3NTA1NX0.Q89vTdLgodaIsuLiIB6JijJPuzyrcRNPoTwUJ_gUQV4";

    const response = await fetch(`${supabaseUrl}/functions/v1/enviar-whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        telefone: conv.telefone,
        mensagem: texto,
        modoTextoLivre: true // Garante envio como texto livre gratuito 24h (NUNCA usa template pago)
      }),
    });

    const resultado = await response.json();
    if (!response.ok || !resultado?.ok) {
      throw new Error(resultado?.error || "Falha ao enviar resposta pela Meta Cloud API.");
    }

    const supabase = (typeof getSupabaseClient === "function" ? getSupabaseClient() : null) || window.supabaseClient;
    let msgSalva = null;
    if (supabase) {
      const { data: inserida } = await supabase
        .from("mensagens_chat_whatsapp")
        .insert([
          {
            crismando_id: conv.crismandoId || null,
            telefone: conv.telefone,
            nome_contato: conv.nome,
            direcao: "enviada",
            mensagem_texto: texto,
            meta_message_id: resultado.messageId || null,
            lida: true,
          },
        ])
        .select()
        .single();
      msgSalva = inserida;
    }

    if (input) {
      input.value = "";
      input.focus();
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = "📤 Enviar";
    }

    if (msgSalva) {
      await processarNovaMensagemRecebidaEmTempoReal(msgSalva);
    } else {
      await carregarConversasChat(false);
    }
  } catch (err) {
    console.error("Erro ao enviar resposta no chat:", err);
    alert(`❌ Não foi possível enviar a mensagem: ${err.message || err}`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = "📤 Enviar";
    }
  }
}
