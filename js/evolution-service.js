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
    const numLimpo = telefone.replace(/\D/g, "");
    if (!numLimpo) {
      console.warn("⚠️ Telefone inválido para envio.");
      return false;
    }

    const supabaseInst = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;

    // 1. Tenta envio prioritário via Supabase Edge Function (Chave 100% segura no backend)
    if (supabaseInst && supabaseInst.functions) {
      try {
        const { data, error } = await supabaseInst.functions.invoke("enviar-whatsapp", {
          body: { telefone: numLimpo, mensagem: mensagem }
        });

        if (!error && data) {
          console.log(`✅ [Edge Function] Mensagem enviada com sucesso para ${numLimpo}`);
          return true;
        }
        if (error) {
          console.warn("⚠️ [Edge Function] Erro retornado pela função. Tentando modo direto...", error);
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

    const numFormatado = numLimpo.startsWith("55") ? numLimpo : "55" + numLimpo;
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

// Inicia disparo em lote em segundo plano (background worker da SPA)
async function iniciarDisparoLote(mesFiltro, anoFiltro) {
  if (window.disparoEmAndamento) {
    alert("⚠️ Já existe um disparo em lote em andamento no momento.");
    return;
  }

  const selecionados = Array.from(document.querySelectorAll(".chk-devedor-item:checked"));

  if (selecionados.length === 0) {
    alert("Nenhum crismando selecionado para envio.");
    return;
  }

  if (!confirm(`Deseja iniciar o disparo para os ${selecionados.length} crismandos selecionados?\n\nO envio rodará em SEGUNDO PLANO na aplicação. Você poderá fechar esta janela, mudar de aba e registrar pagamentos livremente durante os envios.`)) {
    return;
  }

  window.disparoEmAndamento = true;

  // Fechar modal para permitir navegação livre pelo sistema
  fecharModalCobranca();

  // Exibir banner de controle no rodapé fixo
  renderizarBannerDisparoBackground();

  let enviadosComSucesso = 0;
  let falhas = 0;
  const total = selecionados.length;

  for (let i = 0; i < total; i++) {
    if (!window.disparoEmAndamento) {
      console.log("🛑 Disparo interrompido pelo usuário.");
      break;
    }

    // RENOVAR SESSÃO DO USUÁRIO A CADA MENSAGEM (KEEP-ALIVE)
    if (window.auth && typeof window.auth.renovarSessao === "function") {
      window.auth.renovarSessao();
    }

    const item = selecionados[i];
    const nome = item.getAttribute("data-nome");
    const tel = item.getAttribute("data-tel");
    const mes = item.getAttribute("data-mes");
    const ano = item.getAttribute("data-ano");
    const valor = parseFloat(item.getAttribute("data-valor")) || 10.00;
    const valorStr = valor.toFixed(2).replace(".", ",");

    const msg = `Olá, ${nome}. Passando para lembrar sobre a contribuição da Crisma referente ao mês de *${mes}/${ano}* (Valor: R$ ${valorStr}). Se você já efetuou o pagamento recentemente, por favor desconsidere este aviso.\n\n"O Senhor é o meu pastor; nada me faltará." - Salmo 23:1. Que Deus abençoe você e sua família! 🙏`;

    atualizarBannerDisparo(i + 1, total, nome, 0);

    const enviadoOk = await enviarTextoEvolutionGo(tel, msg);

    if (enviadoOk) {
      enviadosComSucesso++;
    } else {
      falhas++;
      console.warn(`Disparo para ${nome} via Evolution Go falhou.`);
    }

    // Intervalo Anti-Ban (15s a 45s) entre mensagens
    if (i < total - 1 && window.disparoEmAndamento) {
      const delaySegundos = Math.floor(Math.random() * (45 - 15 + 1)) + 15;
      for (let s = delaySegundos; s > 0; s--) {
        if (!window.disparoEmAndamento) break;
        
        // RENOVAR SESSÃO CONTINUAMENTE DURANTE A PAUSA
        if (window.auth && typeof window.auth.renovarSessao === "function") {
          window.auth.renovarSessao();
        }

        atualizarBannerDisparo(i + 1, total, nome, s);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  window.disparoEmAndamento = false;

  if (enviadosComSucesso + falhas > 0) {
    const msgFinal = `🏁 Disparo de lembretes em segundo plano concluído!\n\n✅ Sucessos: ${enviadosComSucesso}\n⚠️ Falhas: ${falhas}`;
    alert(msgFinal);
  }

  removerBannerDisparo();
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

  if (window.disparoEmAndamento) {
    alert("⚠️ Já existe um disparo em lote em andamento no momento.");
    return;
  }

  const qtd = recibosPendentesEncontro.length;
  if (!confirm(`Deseja disparar os ${qtd} recibo(s) acumulados do encontro?\n\nOs recibos serão enviados via WhatsApp em SEGUNDO PLANO com mecanismo Anti-Ban.`)) {
    return;
  }

  window.disparoEmAndamento = true;
  renderizarBannerDisparoBackground();

  const supabaseClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  let enviadosOk = 0;
  let falhas = 0;

  // Recarregar do Supabase para garantir a fila mais atual
  await carregarRecibosPendentesLocal();
  const listaFila = [...recibosPendentesEncontro];

  for (let i = 0; i < listaFila.length; i++) {
    if (!window.disparoEmAndamento) {
      console.log("🛑 Disparo de recibos interrompido pelo usuário.");
      break;
    }

    if (window.auth && typeof window.auth.renovarSessao === "function") {
      window.auth.renovarSessao();
    }

    const item = listaFila[i];
    const nome = item.crismando ? item.crismando.nome : "Crismando";
    const tel = item.crismando ? item.crismando.telefone : "";

    atualizarBannerDisparo(i + 1, listaFila.length, nome, 0);

    // Marcar como processando no Supabase
    if (supabaseClient && item.id) {
      await supabaseClient.from("fila_mensagens_whatsapp").update({ status: "processando" }).eq("id", item.id);
    }

    let ok = false;
    if (tel) {
      ok = await enviarTextoEvolutionGo(tel, item.mensagemTexto);
    }

    if (ok) {
      enviadosOk++;
      if (supabaseClient && item.id) {
        await supabaseClient.from("fila_mensagens_whatsapp").update({ 
          status: "enviado", 
          enviado_em: new Date().toISOString() 
        }).eq("id", item.id);
      }
      const idx = recibosPendentesEncontro.indexOf(item);
      if (idx > -1) recibosPendentesEncontro.splice(idx, 1);
    } else {
      falhas++;
      if (supabaseClient && item.id) {
        await supabaseClient.from("fila_mensagens_whatsapp").update({ 
          status: "falha", 
          erro_log: tel ? "Erro ao disparar via Evolution Go" : "Sem telefone cadastrado" 
        }).eq("id", item.id);
      }
    }

    atualizarContadorRecibosPendentes();

    if (i < listaFila.length - 1 && window.disparoEmAndamento) {
      const delaySegundos = Math.floor(Math.random() * (45 - 15 + 1)) + 15;
      for (let s = delaySegundos; s > 0; s--) {
        if (!window.disparoEmAndamento) break;
        if (window.auth && typeof window.auth.renovarSessao === "function") {
          window.auth.renovarSessao();
        }
        atualizarBannerDisparo(i + 1, listaFila.length, nome, s);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  window.disparoEmAndamento = false;
  removerBannerDisparo();

  alert(`🏁 Disparo dos recibos do encontro concluído!\n\n✅ Sucessos: ${enviadosOk}\n⚠️ Falhas/Sem telefone: ${falhas}`);
  await carregarRecibosPendentesLocal();
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

  if (!confirm(`Confirmar o envio do aviso para ${listaCrismandosAlvo.length} crismando(s)?\n\n🛡️ Proteção Anti-Ban Meta ativada (delays randômicos e pausas por lote).`)) {
    return;
  }

  window.disparoAvisosEmAndamento = true;
  window.disparoAvisosPausado = false;
  window.cancelarDisparoAvisosFlag = false;

  document.getElementById("btnIniciarDisparoAvisos").style.display = "none";
  document.getElementById("btnPausarDisparoAvisos").style.display = "inline-block";
  document.getElementById("btnCancelarDisparoAvisos").style.display = "inline-block";
  document.getElementById("containerProgressoAvisos").style.display = "block";

  const logBox = document.getElementById("logDisparoAvisos");
  if (logBox) logBox.innerHTML = `[${new Date().toLocaleTimeString()}] 🚀 Iniciando disparo de avisos em lote...\n`;

  let sucessos = 0;
  let falhas = 0;
  const total = listaCrismandosAlvo.length;

  document.getElementById("metricTotalAvisos").innerText = total;
  document.getElementById("metricSucessosAvisos").innerText = "0";
  document.getElementById("metricFalhasAvisos").innerText = "0";

  for (let i = 0; i < total; i++) {
    if (window.cancelarDisparoAvisosFlag) {
      if (logBox) logBox.innerHTML += `[${new Date().toLocaleTimeString()}] 🛑 Disparo cancelado pelo usuário.\n`;
      break;
    }

    while (window.disparoAvisosPausado) {
      document.getElementById("tituloProgressoAvisos").innerText = "⏸️ Disparo Pausado";
      document.getElementById("metricTimerAvisos").innerText = "Pausado";
      await new Promise(r => setTimeout(r, 1000));
      if (window.cancelarDisparoAvisosFlag) break;
    }

    if (window.cancelarDisparoAvisosFlag) break;
    document.getElementById("tituloProgressoAvisos").innerText = "📡 Disparando Avisos via WhatsApp...";

    const crismando = listaCrismandosAlvo[i];
    const tel = crismando.telefone;
    const nome = crismando.nome;
    const valor = (crismando.valor_mensal || 10.00).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const msgPersonalizada = templateMensagem
      .replace(/\{nome\}/g, nome)
      .replace(/\{telefone\}/g, tel || "")
      .replace(/\{valor\}/g, valor);

    const pct = Math.round(((i) / total) * 100);
    document.getElementById("porcentagemProgressoAvisos").innerText = `${pct}%`;
    document.getElementById("barraProgressoAvisos").style.width = `${pct}%`;

    if (window.auth && typeof window.auth.renovarSessao === "function") {
      window.auth.renovarSessao();
    }

    if (logBox) {
      logBox.innerHTML += `[${new Date().toLocaleTimeString()}] 📱 Enviando (${i + 1}/${total}) para ${nome}... `;
      logBox.scrollTop = logBox.scrollHeight;
    }

    let ok = false;
    if (tel) {
      ok = await enviarTextoEvolutionGo(tel, msgPersonalizada);
    }

    if (ok) {
      sucessos++;
      document.getElementById("metricSucessosAvisos").innerText = sucessos;
      if (logBox) logBox.innerHTML += `✅ OK!\n`;
    } else {
      falhas++;
      document.getElementById("metricFalhasAvisos").innerText = falhas;
      if (logBox) logBox.innerHTML += `❌ FALHA!\n`;
    }

    if (i < total - 1 && !window.cancelarDisparoAvisosFlag) {
      if ((i + 1) % 10 === 0) {
        const tempoPausaLote = 120;
        if (logBox) {
          logBox.innerHTML += `[${new Date().toLocaleTimeString()}] 🛡️ Pausa de descanso Anti-Ban Meta (10 mensagens). Aguardando ${tempoPausaLote}s...\n`;
          logBox.scrollTop = logBox.scrollHeight;
        }

        for (let s = tempoPausaLote; s > 0; s--) {
          if (window.cancelarDisparoAvisosFlag) break;
          document.getElementById("metricTimerAvisos").innerText = `${s}s (Pausa de Lote)`;
          await new Promise(r => setTimeout(r, 1000));
        }
      } else {
        const delaySegundos = Math.floor(Math.random() * (45 - 15 + 1)) + 15;
        for (let s = delaySegundos; s > 0; s--) {
          if (window.cancelarDisparoAvisosFlag) break;
          document.getElementById("metricTimerAvisos").innerText = `${s}s`;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }

  const pctFinal = 100;
  document.getElementById("porcentagemProgressoAvisos").innerText = `${pctFinal}%`;
  document.getElementById("barraProgressoAvisos").style.width = `${pctFinal}%`;
  document.getElementById("metricTimerAvisos").innerText = "Concluído";
  document.getElementById("tituloProgressoAvisos").innerText = "🏁 Disparo Concluído!";

  window.disparoAvisosEmAndamento = false;
  window.disparoAvisosPausado = false;
  window.cancelarDisparoAvisosFlag = false;

  document.getElementById("btnIniciarDisparoAvisos").style.display = "inline-block";
  document.getElementById("btnPausarDisparoAvisos").style.display = "none";
  document.getElementById("btnCancelarDisparoAvisos").style.display = "none";

  if (logBox) logBox.innerHTML += `[${new Date().toLocaleTimeString()}] 🏁 Lote finalizado! ✅ Sucessos: ${sucessos} | ⚠️ Falhas: ${falhas}\n`;

  alert(`🏁 Disparo de avisos concluído!\n\n✅ Enviados com sucesso: ${sucessos}\n⚠️ Falhas ou sem telefone: ${falhas}`);
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

