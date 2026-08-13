// js/evolution-service.js - Serviço REST Evolution Go (evolution-foundation/evolution-go) e Painel Inteligente de Cobrança

window.disparoEmAndamento = false;

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

    const url = `${baseUrl.replace(/\/$/, "")}/message/sendText/${instanceName}`;

    const payload = {
      number: numFormatado,
      options: {
        delay: 1200,
        presence: "composing",
        linkPreview: false
      },
      textMessage: {
        text: mensagem
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
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
        <button class="btn btn-info" style="padding: 4px 8px; font-size: 11px;" onclick="abrirWhatsAppIndividual('${c.nome}', '${c.telefone}', '${item.mes}', ${item.ano}, ${item.valor})">
          📱 Enviar no Whats
        </button>
      </div>
    `;
  });

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

      <div id="progressoDisparoContainer" style="display: none; background: #e3f2fd; padding: 12px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
        <strong style="color: #1976d2;" id="statusProgressoTexto">Iniciando disparo...</strong>
        <div style="background: #ccc; height: 10px; border-radius: 5px; margin-top: 8px; overflow: hidden;">
          <div id="barraProgressoDisparo" style="background: #27ae60; width: 0%; height: 100%; transition: width 0.3s;"></div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; gap: 10px;">
        <button class="btn btn-success" id="btnDispararLote" style="flex: 1;" onclick="iniciarDisparoLote('${mesFiltro}', ${anoFiltro})">
          🚀 Disparar Lembretes em Lote (Evolution Go)
        </button>
        <button class="btn btn-warning" id="btnCancelarDisparo" style="flex: 1; background: #e74c3c; display: none;" onclick="cancelarDisparoEmAndamento()">
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
  cancelarDisparoEmAndamento();
}

function toggleTodosDevedores(marcar) {
  const checkboxes = document.querySelectorAll(".chk-devedor-item");
  checkboxes.forEach(c => c.checked = marcar);
}

function abrirWhatsAppIndividual(nome, telefone, mes, ano, valor) {
  let tel = telefone ? telefone.replace(/\D/g, "") : "";
  if (!tel) {
    alert("Crismando não possui telefone cadastrado.");
    return;
  }

  const valorStr = parseFloat(valor).toFixed(2).replace(".", ",");
  const msg = `Olá, ${nome}. Passando para lembrar sobre a contribuição da Crisma referente ao mês de *${mes}/${ano}* (Valor: R$ ${valorStr}). Se você já efetuou o pagamento recentemente, por favor desconsidere este aviso.\n\n"O Senhor é o meu pastor; nada me faltará." - Salmo 23:1. Que Deus abençoe você e sua família! 🙏`;

  const telFormatado = tel.startsWith("55") ? tel : "55" + tel;
  const url = `https://wa.me/${telFormatado}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

function cancelarDisparoEmAndamento() {
  if (window.disparoEmAndamento) {
    window.disparoEmAndamento = false;
    alert("🛑 Disparo de lembretes cancelado pelo administrador!");
    
    const btnDisparar = document.getElementById("btnDispararLote");
    const btnCancelar = document.getElementById("btnCancelarDisparo");
    if (btnDisparar) btnDisparar.style.display = "block";
    if (btnCancelar) btnCancelar.style.display = "none";
  }
}

async function iniciarDisparoLote(mesFiltro, anoFiltro) {
  const selecionados = Array.from(document.querySelectorAll(".chk-devedor-item:checked"));

  if (selecionados.length === 0) {
    alert("Nenhum crismando selecionado para envio.");
    return;
  }

  if (!confirm(`Deseja realmente disparar lembretes para os ${selecionados.length} crismandos selecionados?\n\nO envio utilizará o mecanismo Anti-Ban com intervalo randômico (15s a 45s) entre mensagens via Evolution Go.`)) {
    return;
  }

  window.disparoEmAndamento = true;

  const btnDisparar = document.getElementById("btnDispararLote");
  const btnCancelar = document.getElementById("btnCancelarDisparo");
  const containerProgresso = document.getElementById("progressoDisparoContainer");
  const txtProgresso = document.getElementById("statusProgressoTexto");
  const barraProgresso = document.getElementById("barraProgressoDisparo");

  if (btnDisparar) btnDisparar.style.display = "none";
  if (btnCancelar) btnCancelar.style.display = "block";
  if (containerProgresso) containerProgresso.style.display = "block";

  let enviadosComSucesso = 0;
  let falhas = 0;
  const total = selecionados.length;

  for (let i = 0; i < total; i++) {
    if (!window.disparoEmAndamento) {
      console.log("🛑 Disparo interrompido pelo usuário.");
      break;
    }

    const item = selecionados[i];
    const nome = item.getAttribute("data-nome");
    const tel = item.getAttribute("data-tel");
    const mes = item.getAttribute("data-mes");
    const ano = item.getAttribute("data-ano");
    const valor = parseFloat(item.getAttribute("data-valor")) || 10.00;
    const valorStr = valor.toFixed(2).replace(".", ",");

    const msg = `Olá, ${nome}. Passando para lembrar sobre a contribuição da Crisma referente ao mês de *${mes}/${ano}* (Valor: R$ ${valorStr}). Se você já efetuou o pagamento recentemente, por favor desconsidere este aviso.\n\n"O Senhor é o meu pastor; nada me faltará." - Salmo 23:1. Que Deus abençoe você e sua família! 🙏`;

    const pct = Math.round(((i + 1) / total) * 100);
    if (barraProgresso) barraProgresso.style.width = `${pct}%`;
    if (txtProgresso) txtProgresso.textContent = `Enviando ${i + 1} de ${total}: ${nome}...`;

    const enviadoOk = await enviarTextoEvolutionGo(tel, msg);

    if (enviadoOk) {
      enviadosComSucesso++;
    } else {
      falhas++;
      console.warn(`Disparo para ${nome} via Evolution Go falhou.`);
    }

    if (i < total - 1 && window.disparoEmAndamento) {
      const delaySegundos = Math.floor(Math.random() * (45 - 15 + 1)) + 15;
      for (let s = delaySegundos; s > 0; s--) {
        if (!window.disparoEmAndamento) break;
        if (txtProgresso) {
          txtProgresso.textContent = `Pausa Anti-Ban: aguardando ${s}s antes de enviar para o próximo (${i + 2}/${total})...`;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  window.disparoEmAndamento = false;

  if (txtProgresso) txtProgresso.textContent = `✅ Disparo concluído! ${enviadosComSucesso} enviados, ${falhas} falhas/manuais.`;
  if (btnDisparar) btnDisparar.style.display = "block";
  if (btnCancelar) btnCancelar.style.display = "none";

  alert(`🏁 Processo de disparo finalizado via Evolution Go!\n\n✅ Sucessos: ${enviadosComSucesso}\n⚠️ Falhas: ${falhas}`);
}
