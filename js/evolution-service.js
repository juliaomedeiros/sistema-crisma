// js/evolution-service.js - Serviço REST Evolution Go (evolution-foundation/evolution-go) e Painel Inteligente de Cobrança em Background

window.disparoEmAndamento = false;
window.detalhesDisparoAtual = {
  total: 0,
  enviados: 0,
  falhas: 0,
  contatoAtual: '',
  pausaRestante: 0
};

// Envio de Texto via Supabase Edge Function (Proxy Seguro) com Fallback
async function enviarTextoEvolutionGo(telefone, mensagem) {
  try {
    const normalizarFn = (typeof normalizarTelefoneWhatsApp === 'function') 
      ? normalizarTelefoneWhatsApp 
      : (t) => {
          let n = String(t || '').replace(/\D/g, '').replace(/^0+/, '');
          if (!n) return '';
          if (n.startsWith('55') && (n.length === 12 || n.length === 13)) return n;
          if (n.length === 10 || n.length === 11) return '55' + n;
          if (n.length === 8 || n.length === 9) return '5583' + n;
          return n.startsWith('55') ? n : '55' + n;
        };

    const numFormatado = normalizarFn(telefone, "83");
    if (!numFormatado || numFormatado.length < 12) {
      console.warn("⚠️ Telefone inválido para envio:", telefone, "->", numFormatado);
      return false;
    }

    const supabaseInst = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;

    // 1. Tenta envio prioritário via Supabase Edge Function (Chave 100% segura no backend)
    if (supabaseInst && supabaseInst.functions) {
      try {
        const { data, error } = await supabaseInst.functions.invoke("enviar-whatsapp", {
          body: { telefone: numFormatado, mensagem: mensagem }
        });

        if (!error && data) {
          if (data.ok) {
            console.log(`✅ [Edge Function] Mensagem enviada com sucesso para ${numFormatado}`);
            return { ok: true };
          } else {
            console.warn(`⚠️ [Edge Function] Recusa de envio para ${numFormatado}:`, data.error || data);
            return {
              ok: false,
              isError463: Boolean(data.isError463 || data.errorCode === 463),
              errorCode: data.errorCode || 500,
              mensagemErro: data.error || "Recusa de envio via WhatsApp"
            };
          }
        }
        if (error) {
          console.warn("⚠️ [Edge Function] Erro HTTP na comunicação com Edge Function:", error);
        }
      } catch (fnErr) {
        console.warn("⚠️ [Edge Function] Exceção ao chamar Supabase Function. Tentando modo direto...", fnErr);
      }
    }

    // 2. Fallback Direto (caso a Edge Function ainda não esteja implantada)
    const envObj = typeof ENV !== 'undefined' ? ENV : null;
    const baseUrl = envObj?.EVOLUTION_GO_URL || envObj?.EVOLUTION_API_URL;
    const apiKey = envObj?.EVOLUTION_GO_API_KEY || envObj?.EVOLUTION_API_KEY;
    const instanceName = envObj?.EVOLUTION_GO_INSTANCE || envObj?.EVOLUTION_INSTANCE_NAME || "crisma-mae-rainha";

    if (!baseUrl || !apiKey || apiKey === "SUA_API_KEY_AQUI") {
      console.warn("⚠️ Evolution Go não configurado no env.js nem na Edge Function.");
      return false;
    }

    const urlPrimary = `${baseUrl.replace(/\/$/, "")}/send/text`;

    const payload = {
      instance: instanceName,
      number: numFormatado,
      text: mensagem,
      options: {
        delay: 1200,
        presence: "composing",
        linkPreview: false
      },
      textMessage: {
        text: mensagem
      }
    };

    let response = await fetch(urlPrimary, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (response.ok || response.status === 200 || response.status === 201) {
      console.log(`✅ [Modo Direto] Mensagem enviada com sucesso para ${numFormatado}`);
      return true;
    } else {
      const errTxt = await response.text();
      console.error(`❌ Falha no disparo via Evolution Go (${response.status}):`, errTxt);
      return false;
    }

  } catch (error) {
    console.error("❌ Erro na requisição para Evolution Go:", error);
    return false;
  }
}

// Alias para manter compatibilidade com chamadas anteriores
const enviarTextoEvolutionAPI = enviarTextoEvolutionGo;

// Algoritmo que filtra APENAS os crismandos que NÃO PAGARAM o mês em questão
function buscarCrismandosDevedores(nomeMesFiltro, anoFiltro) {
  if (!crismandos || crismandos.length === 0) return [];

  const devedores = [];

  crismandos.forEach((c) => {
    const pagou = pagamentos.some((p) => {
      if (p.crismando_id !== c.id) return false;
      const { mes, ano } = extrairMesAno(p);
      return mes === nomeMesFiltro && parseInt(ano) === parseInt(anoFiltro);
    });

    if (!pagou) {
      devedores.push({
        crismando: c,
        mes: nomeMesFiltro,
        ano: anoFiltro,
        valor: c.valor_mensal || 10.00
      });
    }
  });

  return devedores;
}

// Atualiza indicador de inadimplência no Dashboard
function atualizarIndicadorInadimplencia() {
  const dataHoje = new Date();
  const mesAtualNome = ORDEM_MESES[dataHoje.getMonth()];
  const anoAtualNum = dataHoje.getFullYear();

  const devedores = buscarCrismandosDevedores(mesAtualNome, anoAtualNum);

  const containerAlerta = document.getElementById("alertaInadimplenciaDashboard");
  if (containerAlerta) {
    if (devedores.length > 0) {
      containerAlerta.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffe8a1; padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px; color: #856404; font-size: 14px;">
            <span style="font-size: 18px;">⚠️</span>
            <strong>${devedores.length} crismando(s) com contribuição pendente em ${mesAtualNome}/${anoAtualNum}</strong>
          </div>
          <button class="btn btn-warning" style="padding: 6px 14px; font-size: 13px;" onclick="abrirPainelCobrancaInadimplentes('${mesAtualNome}', ${anoAtualNum})">
            📱 Gerar Lembretes de Cobrança (WhatsApp)
          </button>
        </div>
      `;
    } else {
      containerAlerta.innerHTML = `
        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 10px 18px; border-radius: 8px; margin-bottom: 20px; color: #155724; font-size: 14px;">
          🎉 <strong>Todos os crismandos estão em dia com a contribuição de ${mesAtualNome}/${anoAtualNum}!</strong>
        </div>
      `;
    }
  }
}

function abrirPainelCobrancaInadimplentes(mesFiltro, anoFiltro) {
  const devedores = buscarCrismandosDevedores(mesFiltro, anoFiltro);

  if (devedores.length === 0) {
    alert(`Nenhum crismando em débito para o mês de ${mesFiltro}/${anoFiltro}! Todos estão em dia.`);
    return;
  }

  let htmlLinhas = "";
  devedores.forEach((item, index) => {
    const c = item.crismando;
    const chkId = `chk_devedor_${c.id}`;
    htmlLinhas += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; background: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'};">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px;">
          <input type="checkbox" id="${chkId}" class="chk-devedor-item" value="${c.id}" data-nome="${c.nome}" data-tel="${c.telefone || ''}" data-mes="${item.mes}" data-ano="${item.ano}" data-valor="${item.valor}" checked>
          <div>
            <strong>${c.nome}</strong><br>
            <small style="color: #666;">📞 ${c.telefone || 'Sem telefone'} | Pendente: ${item.mes}/${item.ano} (R$ ${item.valor.toFixed(2).replace('.', ',')})</small>
          </div>
        </label>
        <button class="btn btn-info btn-indiv-whats" style="padding: 4px 10px; font-size: 12px;" onclick="enviarWhatsAppIndividualViaAPI(this, '${c.nome}', '${c.telefone}', '${item.mes}', ${item.ano}, ${item.valor})">
          📱 Enviar no Whats
        </button>
      </div>
    `;
  });

  // Remover modal pré-existente se houver
  const modalAntigo = document.getElementById("modalPainelCobranca");
  if (modalAntigo) modalAntigo.remove();

  const modal = document.createElement("div");
  modal.id = "modalPainelCobranca";
  modal.className = "modal";
  modal.style.display = "block";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 650px;">
      <span class="close" onclick="fecharModalCobranca()">&times;</span>
      <h3 style="color: #2c3e50; margin-bottom: 10px; text-align: center;">📱 Lembretes de Cobrança (WhatsApp) — ${mesFiltro}/${anoFiltro}</h3>
      <p style="font-size: 13px; color: #555; margin-bottom: 15px; text-align: center;">
        Abaixo estão exibidos <strong>apenas os ${devedores.length} crismando(s) inadimplentes</strong>. Desmarque quem não deve receber.
      </p>

      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <button class="btn btn-info" style="padding: 4px 10px; font-size: 12px;" onclick="toggleTodosDevedores(true)">☑️ Marcar Todos</button>
        <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px; background: #6c757d; color: white;" onclick="toggleTodosDevedores(false)">☐ Desmarcar Todos</button>
      </div>

      <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px;">
        ${htmlLinhas}
      </div>

      <div id="progressoDisparoContainer" style="display: ${window.disparoEmAndamento ? 'block' : 'none'}; background: #e3f2fd; padding: 12px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
        <strong style="color: #1976d2;" id="statusProgressoTexto">Disparo em andamento em segundo plano...</strong>
        <div style="background: #ccc; height: 10px; border-radius: 5px; margin-top: 8px; overflow: hidden;">
          <div id="barraProgressoDisparo" style="background: #27ae60; width: 0%; height: 100%; transition: width 0.3s;"></div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; gap: 10px;">
        <button class="btn btn-success" id="btnDispararLote" style="flex: 1;" onclick="iniciarDisparoLote('${mesFiltro}', ${anoFiltro})">
          🚀 Disparar Lembretes em Lote (Em Background)
        </button>
        <button class="btn btn-warning" id="btnCancelarDisparo" style="flex: 1; background: #e74c3c; display: ${window.disparoEmAndamento ? 'block' : 'none'};" onclick="cancelarDisparoEmAndamento()">
          🛑 Cancelar Disparo
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function fecharModalCobranca() {
  const modal = document.getElementById("modalPainelCobranca");
  if (modal) modal.remove();
  // NOTA: Fechar o modal NÃO cancela mais o disparo em lote! Ele continua rodando em segundo plano.
}

function toggleTodosDevedores(marcar) {
  const checkboxes = document.querySelectorAll(".chk-devedor-item");
  checkboxes.forEach(c => c.checked = marcar);
}

// Disparo Individual automatizado via API REST Evolution Go (sem abrir wa.me)
async function enviarWhatsAppIndividualViaAPI(btn, nome, telefone, mes, ano, valor) {
  let tel = telefone ? telefone.replace(/\D/g, "") : "";
  if (!tel) {
    alert(`O crismando ${nome} não possui telefone cadastrado.`);
    return;
  }

  const valorStr = parseFloat(valor).toFixed(2).replace(".", ",");
  const msg = `Olá, ${nome}. Passando para lembrar sobre a contribuição da Crisma de adultos do Santuário Mãe Rainha referente ao mês de *${mes}/${ano}* (Valor: R$ ${valorStr}). Se você já efetuou o pagamento recentemente, por favor desconsidere este aviso.\n\n"Que Deus abençoe você e sua família! 🙏`;

  const textoOriginal = btn.innerHTML;
  btn.disabled = true;
  btn.style.background = "#f39c12";
  btn.innerHTML = "⏳ Enviando...";

  const enviadoOk = await enviarTextoEvolutionGo(tel, msg);

  if (enviadoOk) {
    btn.innerHTML = "✅ Enviado!";
    btn.style.background = "#27ae60";
    btn.style.borderColor = "#27ae60";
  } else {
    btn.disabled = false;
    btn.style.background = "#e74c3c";
    btn.style.borderColor = "#e74c3c";
    btn.innerHTML = "❌ Erro! Tentar Novamente";
  }
}

function cancelarDisparoEmAndamento() {
  if (window.disparoEmAndamento) {
    window.disparoEmAndamento = false;
    alert("🛑 Disparo de lembretes cancelado pelo administrador!");
    removerBannerDisparo();
    
    const btnDisparar = document.getElementById("btnDispararLote");
    const btnCancelar = document.getElementById("btnCancelarDisparo");
    if (btnDisparar) btnDisparar.style.display = "block";
    if (btnCancelar) btnCancelar.style.display = "none";
  }
}

// Inicia disparo de cobrança em lote via Fila Backend Autônoma
async function iniciarDisparoLote(mesFiltro, anoFiltro) {
  const selecionados = Array.from(document.querySelectorAll(".chk-devedor-item:checked"));

  if (selecionados.length === 0) {
    alert("Nenhum crismando selecionado para envio.");
    return;
  }

  if (!confirm(`Deseja agendar o envio para os ${selecionados.length} crismandos selecionados?\n\n🛡️ O envio será realizado pelo SERVIDOR em segundo plano (até 60 mensagens/dia em horário comercial).\n💻 Você poderá fechar esta janela, mudar de aba ou desligar o computador.`)) {
    return;
  }

  const supabaseClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabaseClient) {
    alert("❌ Erro: Conexão com o Supabase não encontrada.");
    return;
  }

  const loteId = crypto.randomUUID();
  const registros = selecionados.map(item => {
    const nome = item.getAttribute("data-nome");
    const tel = item.getAttribute("data-tel") || "";
    const mes = item.getAttribute("data-mes");
    const ano = item.getAttribute("data-ano");
    const crismandoId = parseInt(item.value);
    const valor = parseFloat(item.getAttribute("data-valor")) || 10.00;
    const valorStr = valor.toFixed(2).replace(".", ",");
    const msg = `Olá, ${nome}. Passando para lembrar sobre a contribuição da Crisma referente ao mês de *${mes}/${ano}* (Valor: R$ ${valorStr}). Se você já efetuou o pagamento recentemente, por favor desconsidere este aviso.\n\n"O Senhor é o meu pastor; nada me faltará." - Salmo 23:1. Que Deus abençoe você e sua família! 🙏`;

    return {
      lote_id: loteId,
      crismando_id: crismandoId,
      nome_destinatario: nome,
      telefone: tel,
      tipo: 'cobranca',
      tipo_envio: 'cobranca',
      mensagem: msg,
      mensagem_texto: msg,
      status: 'pendente',
      prioridade: 4,
      tentativas: 0
    };
  });

  try {
    const { error } = await supabaseClient.from("fila_mensagens_whatsapp").insert(registros);
    if (error) throw error;

    fecharModalCobranca();

    alert(`✅ ${registros.length} lembrete(s) de cobrança foram agendados na fila do servidor com sucesso!\n\n🛡️ O worker do Supabase processará os envios automaticamente respeitando as regras Anti-Ban (60/dia).\n📱 Ao concluir o lote, o coordenador será notificado no WhatsApp.\n💻 Você pode fechar o sistema tranquilamente.`);

    if (typeof carregarMetricasFila === 'function') carregarMetricasFila();
    if (typeof carregarTabelaMensagensFila === 'function') carregarTabelaMensagensFila();

  } catch (err) {
    console.error("Erro ao enfileirar lembretes de cobrança:", err);
    alert(`❌ Erro ao agendar lembretes: ${err.message || err}`);
  }
}

// Renderiza a barra/banner flutuante de progresso em background no rodapé da SPA
function renderizarBannerDisparoBackground() {
  let banner = document.getElementById("bannerDisparoBackground");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "bannerDisparoBackground";
    banner.className = "banner-disparo-bg";
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span class="spinner-disparo" style="font-size: 20px;">📱</span>
        <div>
          <strong id="bannerProgressoTitulo" style="color: #2c3e50; font-size: 13px;">Disparo de Lembretes Ativo</strong><br>
          <small id="bannerProgressoStatus" style="color: #555; font-size: 12px;">Iniciando envio...</small>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 120px; background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
          <div id="bannerBarraProgresso" style="width: 0%; background: #27ae60; height: 100%; transition: width 0.3s;"></div>
        </div>
        <button class="btn btn-warning" style="padding: 4px 8px; font-size: 11px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="cancelarDisparoEmAndamento()">
          🛑 Cancelar
        </button>
      </div>
    </div>
  `;
  banner.style.display = "block";
}

function atualizarBannerDisparo(atual, total, nomeContato, tempoPausaSegundos) {
  const banner = document.getElementById("bannerDisparoBackground");
  if (!banner) return;

  const pct = Math.round((atual / total) * 100);
  const barra = document.getElementById("bannerBarraProgresso");
  const txtTitulo = document.getElementById("bannerProgressoTitulo");
  const txtStatus = document.getElementById("bannerProgressoStatus");

  if (barra) barra.style.width = `${pct}%`;
  if (txtTitulo) txtTitulo.textContent = `Disparo WhatsApp (${atual}/${total} — ${pct}%)`;

  if (tempoPausaSegundos > 0) {
    if (txtStatus) txtStatus.textContent = `Pausa Anti-Ban: aguardando ${tempoPausaSegundos}s... (Último: ${nomeContato})`;
  } else {
    if (txtStatus) txtStatus.textContent = `Enviando para: ${nomeContato}...`;
  }
}

function removerBannerDisparo() {
  const banner = document.getElementById("bannerDisparoBackground");
  if (banner) banner.remove();
}

// Disparo em lote de recibos acumulados durante o atendimento presencial do encontro
async function dispararRecibosPendentesDoDia() {
  if (!recibosPendentesEncontro || recibosPendentesEncontro.length === 0) {
    alert("Nenhum recibo pendente acumulado para envio.");
    return;
  }

  const qtd = recibosPendentesEncontro.length;
  if (!confirm(`Deseja agendar os ${qtd} recibo(s) acumulados do encontro?\n\n🛡️ O envio será realizado pelo SERVIDOR em segundo plano com proteção Anti-Ban.\n💻 Você pode fechar o sistema a qualquer momento.`)) {
    return;
  }

  const supabaseClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabaseClient) {
    alert("❌ Erro de conexão com o banco de dados.");
    return;
  }

  const loteId = crypto.randomUUID();
  const registros = recibosPendentesEncontro.map(item => {
    const nome = item.crismando ? item.crismando.nome : "Crismando";
    const tel = item.crismando ? item.crismando.telefone : "";
    return {
      lote_id: loteId,
      crismando_id: item.crismando?.id || null,
      nome_destinatario: nome,
      telefone: tel,
      tipo: 'recibo',
      tipo_envio: 'recibo',
      mensagem: item.mensagemTexto,
      mensagem_texto: item.mensagemTexto,
      status: 'pendente',
      prioridade: 3,
      tentativas: 0
    };
  });

  try {
    const { error } = await supabaseClient.from("fila_mensagens_whatsapp").insert(registros);
    if (error) throw error;

    recibosPendentesEncontro = [];
    atualizarContadorRecibosPendentes();

    alert(`✅ ${registros.length} recibo(s) agendados com sucesso na fila do servidor!\n\n🛡️ Os comprovantes serão enviados em segundo plano.\n📱 O coordenador será notificado no WhatsApp ao término do lote.`);

    if (typeof carregarMetricasFila === 'function') carregarMetricasFila();
    if (typeof carregarTabelaMensagensFila === 'function') carregarTabelaMensagensFila();

  } catch (err) {
    console.error("Erro ao agendar recibos:", err);
    alert(`❌ Erro ao agendar recibos: ${err.message || err}`);
  }
}

// =========================================================================
// SISTEMA DE DISPARO DE AVISOS E LEMBRETES EM LOTE VIA WHATSAPP (ANTI-BAN)
// =========================================================================

window.disparoAvisosEmAndamento = false;
window.disparoAvisosPausado = false;
window.cancelarDisparoAvisosFlag = false;

// Insere variável clicada pelo usuário na caixa de mensagem
function inserirVariavelAviso(variavel) {
  const textarea = document.getElementById("txtMensagemAvisoLote");
  if (!textarea) return;

  const start = textarea.selectionStart || textarea.value.length;
  const end = textarea.selectionEnd || textarea.value.length;
  const original = textarea.value;

  textarea.value = original.substring(0, start) + variavel + original.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + variavel.length;

  atualizarPreviewAviso();
}

// Atualiza o card de preview visual do WhatsApp
function atualizarPreviewAviso() {
  const textarea = document.getElementById("txtMensagemAvisoLote");
  const previewDiv = document.getElementById("previewTextoAviso");
  if (!textarea || !previewDiv) return;

  let texto = textarea.value || "Digite a mensagem acima para visualizar...";
  
  // Exemplo de crismando fictício para preview
  texto = texto.replace(/\{nome\}/g, "João Silva")
               .replace(/\{telefone\}/g, "(81) 98765-4321")
               .replace(/\{valor\}/g, "R$ 10,00");

  previewDiv.innerText = texto;
}

// Carrega lista de crismandos como destinatários marcáveis
function carregarDestinatariosAviso() {
  const container = document.getElementById("containerListaDestinatarios");
  const spanQtd = document.getElementById("qtdDestinatariosAviso");
  if (!container) return;

  container.innerHTML = "";

  if (!crismandos || crismandos.length === 0) {
    container.innerHTML = `<div style="color: #888; text-align: center; font-size: 13px; padding: 15px;">Nenhum crismando cadastrado.</div>`;
    if (spanQtd) spanQtd.innerText = "0";
    return;
  }

  let totalComWhats = 0;

  crismandos.forEach((c) => {
    const temTel = c.telefone && c.telefone.replace(/\D/g, "").length >= 8;
    if (temTel) totalComWhats++;

    const divItem = document.createElement("div");
    divItem.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 13px;";
    
    divItem.innerHTML = `
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0; width: 100%;">
        <input type="checkbox" class="chk-destinatario-aviso" value="${c.id}" ${temTel ? "checked" : "disabled"}>
        <span style="font-weight: 500; ${temTel ? "" : "color: #aaa;"}">${c.nome}</span>
      </label>
      <span style="font-size: 11px; ${temTel ? "color: #27ae60;" : "color: #e74c3c;"}">
        ${temTel ? c.telefone : "Sem telefone"}
      </span>
    `;
    container.appendChild(divItem);
  });

  if (spanQtd) spanQtd.innerText = totalComWhats.toString();
}

function marcarTodosDestinatariosAviso(marcar) {
  const checkboxes = document.querySelectorAll(".chk-destinatario-aviso:not([disabled])");
  checkboxes.forEach(chk => chk.checked = marcar);
}

// Inicia o processo de envio em lote com o protocolo Anti-Ban Meta
async function iniciarDisparoAvisosEmLote() {
  if (window.disparoAvisosEmAndamento) {
    alert("⚠️ Já existe um disparo de avisos em andamento!");
    return;
  }

  const textarea = document.getElementById("txtMensagemAvisoLote");
  const templateMensagem = textarea ? textarea.value.trim() : "";

  if (!templateMensagem) {
    alert("⚠️ Por favor, digite a mensagem do aviso antes de enviar.");
    return;
  }

  const checkboxes = document.querySelectorAll(".chk-destinatario-aviso:checked");
  const idsSelecionados = Array.from(checkboxes).map(chk => chk.value);

  if (idsSelecionados.length === 0) {
    alert("⚠️ Nenhum crismando foi selecionado para receber o aviso.");
    return;
  }

  const listaCrismandosAlvo = crismandos.filter(c => idsSelecionados.includes(c.id.toString()));

  if (!confirm(`Confirmar o agendamento do aviso para ${listaCrismandosAlvo.length} crismando(s)?\n\n🛡️ O envio será realizado pelo SERVIDOR em segundo plano (até 60 mensagens/dia em horário comercial).\n💻 Você pode fechar o sistema ou desligar o computador a qualquer momento.`)) {
    return;
  }

  const supabaseClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabaseClient) {
    alert("❌ Erro de conexão com o banco de dados.");
    return;
  }

  const loteId = crypto.randomUUID();
  const registros = listaCrismandosAlvo.map(c => {
    const tel = c.telefone || "";
    const nome = c.nome;
    const valor = (c.valor_mensal || 10.00).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const msgPersonalizada = templateMensagem
      .replace(/\{nome\}/g, nome)
      .replace(/\{telefone\}/g, tel)
      .replace(/\{valor\}/g, valor);

    return {
      lote_id: loteId,
      crismando_id: c.id,
      nome_destinatario: nome,
      telefone: tel,
      tipo: 'aviso_lote',
      tipo_envio: 'aviso_lote',
      mensagem: msgPersonalizada,
      mensagem_texto: msgPersonalizada,
      status: 'pendente',
      prioridade: 5,
      tentativas: 0
    };
  });

  try {
    const { error } = await supabaseClient.from("fila_mensagens_whatsapp").insert(registros);
    if (error) throw error;

    // Atualiza log visual da aba de avisos
    const containerProgresso = document.getElementById("containerProgressoAvisos");
    const logBox = document.getElementById("logDisparoAvisos");
    if (containerProgresso) containerProgresso.style.display = "block";
    if (logBox) {
      logBox.innerHTML = `[${new Date().toLocaleTimeString()}] 🚀 ${registros.length} aviso(s) agendados com sucesso na fila do servidor!\n[${new Date().toLocaleTimeString()}] 🛡️ Regra Anti-Ban ativa: até 60 envios/dia em horário comercial (08:00 às 20:00).\n[${new Date().toLocaleTimeString()}] 📱 O coordenador receberá notificação no WhatsApp ao finalizar o lote.\n[${new Date().toLocaleTimeString()}] 💻 Você pode fechar o navegador tranquilamente.`;
    }
    const elPct = document.getElementById("porcentagemProgressoAvisos");
    if (elPct) elPct.innerText = "100%";
    const elBarra = document.getElementById("barraProgressoAvisos");
    if (elBarra) elBarra.style.width = "100%";
    const elTotal = document.getElementById("metricTotalAvisos");
    if (elTotal) elTotal.innerText = registros.length;
    const elTimer = document.getElementById("metricTimerAvisos");
    if (elTimer) elTimer.innerText = "Fila Ativa";
    const elTitulo = document.getElementById("tituloProgressoAvisos");
    if (elTitulo) elTitulo.innerText = "✅ Agendado no Servidor!";

    alert(`✅ ${registros.length} aviso(s) foram agendados na fila do servidor com sucesso!\n\n🛡️ O envio será realizado a até 60 mensagens por dia no horário comercial (08:00 às 20:00).\n📱 Ao concluir o lote de 180 crismandos, o coordenador receberá o relatório no WhatsApp.\n💻 Você pode fechar o sistema tranquilamente.`);

    if (typeof carregarMetricasFila === 'function') carregarMetricasFila();
    if (typeof carregarTabelaMensagensFila === 'function') carregarTabelaMensagensFila();

  } catch (err) {
    console.error("Erro ao agendar avisos:", err);
    alert(`❌ Erro ao agendar avisos: ${err.message || err}`);
  }
}

function pausarDisparoAvisos() {
  const btn = document.getElementById("btnPausarDisparoAvisos");
  if (window.disparoAvisosPausado) {
    window.disparoAvisosPausado = false;
    if (btn) btn.innerText = "⏸️ Pausar Disparo";
  } else {
    window.disparoAvisosPausado = true;
    if (btn) btn.innerText = "▶️ Retomar Disparo";
  }
}

function cancelarDisparoAvisos() {
  if (confirm("Deseja realmente interromper e cancelar o disparo dos avisos restantes?")) {
    window.cancelarDisparoAvisosFlag = true;
    window.disparoAvisosPausado = false;
  }
}

// Check automático client-side para reprocessar mensagens reagendadas (463: 2h | 500: 35min)
async function checarEProcessarFilaReagendadaClientSide() {
  try {
    const supabaseClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
    if (!supabaseClient) return;

    const agora = new Date().toISOString();
    const { data: pendentes, error } = await supabaseClient
      .from("fila_mensagens_whatsapp")
      .select("*")
      .in("status", ["reagendado_463", "reagendado_500"])
      .lte("agendado_para", agora);

    if (error || !pendentes || pendentes.length === 0) return;

    console.log(`⏳ [Auto-Reenvio Background] Encontradas ${pendentes.length} mensagens reagendadas prontas para envio...`);

    for (const item of pendentes) {
      if (!item.telefone || !item.mensagem) continue;

      await supabaseClient.from("fila_mensagens_whatsapp").update({ status: "processando" }).eq("id", item.id);

      const res = await enviarTextoEvolutionGo(item.telefone, item.mensagem);
      const isOk = typeof res === 'boolean' ? res : (res && res.ok);

      if (isOk) {
        console.log(`✅ [Auto-Reenvio Background] Mensagem entregue com sucesso para ${item.telefone}`);
        await supabaseClient.from("fila_mensagens_whatsapp").update({
          status: "enviado",
          enviado_em: new Date().toISOString(),
          erro_log: null
        }).eq("id", item.id);
      } else {
        const tentativas = (item.tentativas || 1) + 1;
        const resObj = typeof res === 'object' ? res : {};

        if (tentativas >= 3) {
          console.warn(`❌ [Auto-Reenvio Background] Falha definitiva para ${item.telefone} após ${tentativas} tentativas.`);
          await supabaseClient.from("fila_mensagens_whatsapp").update({
            status: "falha_definitiva",
            tentativas: tentativas,
            erro_log: `Não foi possível entregar após ${tentativas} tentativas de reenvio. Verifique o número no WhatsApp.`
          }).eq("id", item.id);
        } else {
          // Determina se o erro foi 500 (35 min) ou 463 (1h / 60min)
          const is500 = resObj.errorCode >= 500 || resObj.isTimeout;
          const minutosAdicionais = is500 ? 35 : 60;
          const proximaData = new Date(Date.now() + minutosAdicionais * 60 * 1000).toISOString();

          await supabaseClient.from("fila_mensagens_whatsapp").update({
            status: is500 ? "reagendado_500" : "reagendado_463",
            agendado_para: proximaData,
            tentativas: tentativas,
            erro_log: is500 ? `Servidor instável (${resObj.errorCode || 500}). Reagendado para 35min.` : "WhatsApp recusou envio (463). Reagendado para 1 hora."
          }).eq("id", item.id);
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ Erro na checagem da fila reagendada:", err);
  }
}

// Notifica o usuário na tela sobre mensagens que falharam definitivamente ou estão pendentes de reenvio
async function verificarEFalarFalhasAoUsuario() {
  try {
    const supabaseClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
    if (!supabaseClient) return;

    const { data: falhas, error } = await supabaseClient
      .from("fila_mensagens_whatsapp")
      .select("*")
      .in("status", ["falha_definitiva", "falha"])
      .order("created_at", { ascending: false });

    if (error || !falhas || falhas.length === 0) return;

    // Verificar se há um container de alerta na tela principal ou criar um modal/banner de aviso
    console.log(`⚠️ Encontradas ${falhas.length} mensagens com falha no banco de dados.`);
    exibirAlertaFalhasEnvio(falhas);

  } catch (err) {
    console.warn("⚠️ Erro ao verificar falhas de envio:", err);
  }
}

function exibirAlertaFalhasEnvio(listaFalhas) {
  const modalAntigo = document.getElementById("modalAlertaFalhasWhatsapp");
  if (modalAntigo) modalAntigo.remove();

  let htmlLinhas = "";
  listaFalhas.forEach((item) => {
    const dataCriacao = item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-";
    htmlLinhas += `
      <tr style="font-size: 13px;">
        <td><strong>${item.nome_destinatario || "Crismando"}</strong></td>
        <td>${item.telefone || "Sem fone"}</td>
        <td><span class="badge" style="background: #e74c3c; color: white; padding: 2px 6px; border-radius: 4px;">${item.tipo || "aviso"}</span></td>
        <td style="color: #c0392b; font-size: 12px;">${item.erro_log || "Falha na entrega"}</td>
        <td><small>${dataCriacao}</small></td>
        <td>
          <button class="btn btn-warning" style="padding: 3px 8px; font-size: 11px;" onclick="tentarReenviarMensagemFalhada(${item.id})">🔄 Reenviar</button>
        </td>
      </tr>
    `;
  });

  const modal = document.createElement("div");
  modal.id = "modalAlertaFalhasWhatsapp";
  modal.className = "modal";
  modal.style.display = "block";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 750px;">
      <span class="close" onclick="document.getElementById('modalAlertaFalhasWhatsapp').remove()">&times;</span>
      <h3 style="color: #c0392b; text-align: center; margin-bottom: 10px;">⚠️ Relatório de Mensagens com Falha no WhatsApp</h3>
      <p style="font-size: 13px; color: #555; text-align: center; margin-bottom: 15px;">
        Foram encontradas <strong>${listaFalhas.length} mensagem(ns)</strong> que não puderam ser entregues após as tentativas automáticas.
      </p>

      <div class="table-container" style="max-height: 280px; overflow-y: auto; margin-bottom: 15px;">
        <table>
          <thead>
            <tr>
              <th>Destinatário</th>
              <th>Telefone</th>
              <th>Tipo</th>
              <th>Motivo da Falha</th>
              <th>Data</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${htmlLinhas}
          </tbody>
        </table>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button class="btn btn-secondary" style="background: #6c757d; color: white;" onclick="document.getElementById('modalAlertaFalhasWhatsapp').remove()">Entendido / Fechar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

async function tentarReenviarMensagemFalhada(idMensagem) {
  try {
    const supabaseClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
    if (!supabaseClient) return;

    const { data: item, error } = await supabaseClient
      .from("fila_mensagens_whatsapp")
      .select("*")
      .eq("id", idMensagem)
      .single();

    if (error || !item) {
      alert("Mensagem não encontrada.");
      return;
    }

    const res = await enviarTextoEvolutionGo(item.telefone, item.mensagem);
    const isOk = typeof res === 'boolean' ? res : (res && res.ok);

    if (isOk) {
      alert(`✅ Mensagem reenviada com sucesso para ${item.nome_destinatario}!`);
      await supabaseClient.from("fila_mensagens_whatsapp").update({
        status: "enviado",
        enviado_em: new Date().toISOString(),
        erro_log: null
      }).eq("id", idMensagem);

      const modal = document.getElementById("modalAlertaFalhasWhatsapp");
      if (modal) modal.remove();
      verificarEFalarFalhasAoUsuario();
    } else {
      alert(`❌ Nova tentativa falhou. Verifique se o número no WhatsApp é válido.`);
    }
  } catch (err) {
    alert(`Erro ao tentar reenviar: ${err.message || err}`);
  }
}

// Iniciar verificação da fila a cada 10 minutos no cliente
setInterval(checarEProcessarFilaReagendadaClientSide, 10 * 60 * 1000);
setTimeout(checarEProcessarFilaReagendadaClientSide, 5000);
setTimeout(verificarEFalarFalhasAoUsuario, 3000);


