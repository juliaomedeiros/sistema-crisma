// js/evolution-service.js - Serviço REST Evolution Go (evolution-foundation/evolution-go) e Painel Inteligente de Cobrança em Background

window.disparoEmAndamento = false;
window.detalhesDisparoAtual = {
  total: 0,
  enviados: 0,
  falhas: 0,
  contatoAtual: '',
  pausaRestante: 0
};

// Envio de Texto via API REST do Evolution Go (compatível com Golang v0.7.x e Node API v1/v2)
async function enviarTextoEvolutionGo(telefone, mensagem) {
  try {
    const baseUrl = ENV?.EVOLUTION_GO_URL || ENV?.EVOLUTION_API_URL;
    const apiKey = ENV?.EVOLUTION_GO_API_KEY || ENV?.EVOLUTION_API_KEY;
    const instanceName = ENV?.EVOLUTION_GO_INSTANCE || ENV?.EVOLUTION_INSTANCE_NAME || "crisma-mae-rainha";

    if (!baseUrl || !apiKey || apiKey === "SUA_API_KEY_AQUI") {
      console.warn("⚠️ Configurações do Evolution Go não preenchidas no env.js");
      return false;
    }

    const numLimpo = telefone.replace(/\D/g, "");
    const numFormatado = numLimpo.startsWith("55") ? numLimpo : "55" + numLimpo;

    // Rota oficial do Evolution Go em Golang v0.7.x (/send/text)
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

    // Fallback 1: Rota /message/sendText
    if (response.status === 404) {
      console.warn("⚠️ Endpoint /send/text retornou 404. Tentando rota /message/sendText...");
      const urlFallback1 = `${baseUrl.replace(/\/$/, "")}/message/sendText`;
      response = await fetch(urlFallback1, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": apiKey
        },
        body: JSON.stringify(payload)
      });
    }

    // Fallback 2: Rota legada Node /message/sendText/{instance}
    if (response.status === 404) {
      console.warn("⚠️ Endpoint /message/sendText retornou 404. Tentando rota /message/sendText/" + instanceName);
      const urlFallback2 = `${baseUrl.replace(/\/$/, "")}/message/sendText/${instanceName}`;
      response = await fetch(urlFallback2, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": apiKey
        },
        body: JSON.stringify(payload)
      });
    }

    if (response.ok || response.status === 200 || response.status === 201) {
      console.log(`✅ Mensagem enviada com sucesso para ${numFormatado} via Evolution Go`);
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
            📱 Gerar Lembretes de Cobrança (Evolution Go)
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
      <h3 style="color: #2c3e50; margin-bottom: 10px; text-align: center;">📱 Lembretes de Cobrança (Evolution Go) — ${mesFiltro}/${anoFiltro}</h3>
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
  if (!confirm(`Deseja disparar os ${qtd} recibo(s) acumulados do encontro?\n\nOs recibos serão enviados via Evolution Go em SEGUNDO PLANO com mecanismo Anti-Ban.`)) {
    return;
  }

  window.disparoEmAndamento = true;
  renderizarBannerDisparoBackground();

  let enviadosOk = 0;
  let falhas = 0;
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
    const nome = item.crismando.nome;
    const tel = item.crismando.telefone;

    atualizarBannerDisparo(i + 1, listaFila.length, nome, 0);

    if (tel) {
      const ok = await enviarTextoEvolutionGo(tel, item.mensagemTexto);
      if (ok) {
        enviadosOk++;
        // Remover item enviado da fila de pendentes
        const idx = recibosPendentesEncontro.indexOf(item);
        if (idx > -1) recibosPendentesEncontro.splice(idx, 1);
      } else {
        falhas++;
      }
    } else {
      falhas++;
      console.warn(`Crismando ${nome} não tem telefone.`);
    }

    if (typeof salvarRecibosPendentesLocal === "function") {
      salvarRecibosPendentesLocal();
    } else {
      atualizarContadorRecibosPendentes();
    }

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
}

