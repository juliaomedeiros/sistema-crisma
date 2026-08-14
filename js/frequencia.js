// js/frequencia.js - Módulo de Controle de Frequência e Presenças

let encontros = [];
let presencas = [];
let mapaFaltasAcumuladas = {}; // crismando_id -> qtd_faltas

async function carregarDadosFrequencia() {
  try {
    console.log("🔄 Carregando dados de frequência...");
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) return;

    // Carregar Encontros
    const { data: dataEncontros, error: errEncontros } = await supabase
      .from("encontros")
      .select("*")
      .order("data_encontro", { ascending: false });

    if (!errEncontros) {
      encontros = dataEncontros || [];
    } else {
      console.warn("Erro ou tabela encontros não encontrada:", errEncontros);
      encontros = [];
    }

    // Carregar Presenças
    const { data: dataPresencas, error: errPresencas } = await supabase
      .from("presencas")
      .select("*");

    if (!errPresencas) {
      presencas = dataPresencas || [];
    } else {
      console.warn("Erro ou tabela presencas não encontrada:", errPresencas);
      presencas = [];
    }

    calcularMapaFaltas();
    popularSelectEncontros();
    atualizarTabelaChamada();

  } catch (error) {
    console.error("Erro ao carregar dados de frequência:", error);
  }
}

function calcularMapaFaltas() {
  mapaFaltasAcumuladas = {};

  presencas.forEach(p => {
    if (p.status === "FALTA") {
      const cId = p.crismando_id;
      mapaFaltasAcumuladas[cId] = (mapaFaltasAcumuladas[cId] || 0) + 1;
    }
  });
}

function obterBadgeFaltas(qtdFaltas) {
  if (qtdFaltas >= 7) {
    return `<span style="background: #212529; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">⛔ Desligado (${qtdFaltas} faltas)</span>`;
  } else if (qtdFaltas === 6) {
    return `<span style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; animation: blink 1.5s infinite;">🔴 Alerta Crítico (6 faltas)</span>`;
  } else if (qtdFaltas === 5) {
    return `<span style="background: #e67e22; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">🟠 Atenção (5 faltas)</span>`;
  } else if (qtdFaltas >= 3) {
    return `<span style="background: #f1c40f; color: #333; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">🟡 Aviso (3-4 faltas)</span>`;
  } else {
    return `<span style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">✅ OK (${qtdFaltas} faltas)</span>`;
  }
}

function popularSelectEncontros() {
  const select = document.getElementById("selectEncontroChamada");
  if (!select) return;

  const valorAtual = select.value;
  select.innerHTML = '<option value="">-- Selecione ou crie um encontro --</option>';

  encontros.forEach(e => {
    const opt = document.createElement("option");
    opt.value = e.id;
    opt.textContent = `${e.data_encontro} - ${e.tema || "Encontro Sem Tema"}`;
    if (String(e.id) === String(valorAtual)) opt.selected = true;
    select.appendChild(opt);
  });
}

async function criarNovoEncontro() {
  const dataEncontro = document.getElementById("novaDataEncontro")?.value;
  const tema = document.getElementById("novoTemaEncontro")?.value?.trim() || "";
  const obs = document.getElementById("novaObsEncontro")?.value?.trim() || "";

  if (!dataEncontro) {
    alert("Por favor, selecione a data do encontro.");
    return;
  }

  try {
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const { data, error } = await supabase
      .from("encontros")
      .insert([{ data_encontro: dataEncontro, tema, observacao: obs }])
      .select();

    if (error) throw error;

    if (data && data.length > 0) {
      encontros.unshift(data[0]);
    }

    popularSelectEncontros();
    if (data && data[0]) {
      document.getElementById("selectEncontroChamada").value = data[0].id;
    }

    // Limpar campos
    document.getElementById("novoTemaEncontro").value = "";
    document.getElementById("novaObsEncontro").value = "";
    
    atualizarTabelaChamada();
    alert("✅ Encontro criado com sucesso! Agora você pode realizar a chamada.");

  } catch (error) {
    console.error("Erro ao criar encontro:", error);
    alert(`❌ Erro ao criar encontro: ${error.message || error}`);
  }
}

window.termoBuscaChamada = "";
window.filtroStatusChamada = "TODOS";

function filtrarTabelaChamada() {
  const inp = document.getElementById("buscaCrismandoChamada");
  window.termoBuscaChamada = inp ? inp.value.trim().toLowerCase() : "";
  atualizarTabelaChamada();
}

function filtrarStatusChamada(status) {
  window.filtroStatusChamada = status;

  // Atualizar classe ativa nos chips de filtro
  document.querySelectorAll(".chip-filtro-chamada").forEach(btn => btn.classList.remove("active"));
  const btnAtivo = document.getElementById(`chipFiltro_${status}`);
  if (btnAtivo) btnAtivo.classList.add("active");

  atualizarTabelaChamada();
}

function marcarTodosPresentesChamada() {
  if (!crismandos || crismandos.length === 0) return;

  crismandos.forEach(c => {
    const radioP = document.querySelector(`input[name="status_presenca_${c.id}"][value="PRESENTE"]`);
    if (radioP) {
      radioP.checked = true;
      atualizarEstiloPílulasChamada(c.id);
    }
  });

  atualizarContadoresFiltrosChamada();
}

function atualizarEstiloPílulasChamada(crismandoId) {
  const radioChecked = document.querySelector(`input[name="status_presenca_${crismandoId}"]:checked`);
  const statusVal = radioChecked ? radioChecked.value : "PRESENTE";

  const pillP = document.getElementById(`pill_P_${crismandoId}`);
  const pillF = document.getElementById(`pill_F_${crismandoId}`);
  const pillJ = document.getElementById(`pill_J_${crismandoId}`);

  if (pillP) pillP.classList.toggle("active", statusVal === "PRESENTE");
  if (pillF) pillF.classList.toggle("active", statusVal === "FALTA");
  if (pillJ) pillJ.classList.toggle("active", statusVal === "JUSTIFICADO");

  atualizarContadoresFiltrosChamada();
}

function atualizarContadoresFiltrosChamada() {
  let cntTodos = 0;
  let cntP = 0;
  let cntF = 0;
  let cntJ = 0;

  if (crismandos) {
    cntTodos = crismandos.length;
    crismandos.forEach(c => {
      const radio = document.querySelector(`input[name="status_presenca_${c.id}"]:checked`);
      const val = radio ? radio.value : "PRESENTE";
      if (val === "PRESENTE") cntP++;
      else if (val === "FALTA") cntF++;
      else if (val === "JUSTIFICADO") cntJ++;
    });
  }

  const elTodos = document.getElementById("cntFiltro_TODOS");
  const elP = document.getElementById("cntFiltro_PRESENTE");
  const elF = document.getElementById("cntFiltro_FALTA");
  const elJ = document.getElementById("cntFiltro_JUSTIFICADO");

  if (elTodos) elTodos.textContent = cntTodos;
  if (elP) elP.textContent = cntP;
  if (elF) elF.textContent = cntF;
  if (elJ) elJ.textContent = cntJ;
}

function atualizarTabelaChamada() {
  const tbody = document.getElementById("corpoTabelaChamada");
  if (!tbody) return;

  tbody.innerHTML = "";

  const encontroId = parseInt(document.getElementById("selectEncontroChamada")?.value || 0);

  if (!crismandos || crismandos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888;">Nenhum crismando cadastrado.</td></tr>`;
    atualizarContadoresFiltrosChamada();
    return;
  }

  // Filtrar presenças salvas para este encontro específico
  const presencasDoEncontro = presencas.filter(p => p.encontro_id === encontroId);

  const termo = window.termoBuscaChamada || "";
  const filtroStatus = window.filtroStatusChamada || "TODOS";

  let crismandosExibidos = crismandos.filter(c => {
    // Filtro por nome
    const bateNome = !termo || c.nome.toLowerCase().includes(termo);
    if (!bateNome) return false;

    // Filtro por status selecionado
    const pSalva = presencasDoEncontro.find(p => p.crismando_id === c.id);
    const radioElem = document.querySelector(`input[name="status_presenca_${c.id}"]:checked`);
    const statusAtual = radioElem ? radioElem.value : (pSalva ? pSalva.status : "PRESENTE");

    if (filtroStatus === "TODOS") return true;
    return statusAtual === filtroStatus;
  });

  if (crismandosExibidos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888; padding: 20px;">Nenhum crismando encontrado para os filtros aplicados.</td></tr>`;
    atualizarContadoresFiltrosChamada();
    return;
  }

  crismandosExibidos.forEach(c => {
    const qtdFaltas = mapaFaltasAcumuladas[c.id] || 0;
    const badgeHTML = obterBadgeFaltas(qtdFaltas);

    // Buscar presença já salva se existir
    const pSalva = presencasDoEncontro.find(p => p.crismando_id === c.id);
    const statusSalvo = pSalva ? pSalva.status : "PRESENTE";

    const tr = document.createElement("tr");
    tr.id = `linha_chamada_${c.id}`;

    tr.innerHTML = `
      <td><strong>${c.nome}</strong></td>
      <td>${c.telefone || "-"}</td>
      <td>${badgeHTML}</td>
      <td>
        <div class="radio-group-chamada">
          <label id="pill_P_${c.id}" class="radio-pill-item pill-presente ${statusSalvo === 'PRESENTE' ? 'active' : ''}">
            <input type="radio" name="status_presenca_${c.id}" value="PRESENTE" ${statusSalvo === 'PRESENTE' ? 'checked' : ''} onchange="atualizarEstiloPílulasChamada(${c.id})">
            P
          </label>

          <label id="pill_F_${c.id}" class="radio-pill-item pill-falta ${statusSalvo === 'FALTA' ? 'active' : ''}">
            <input type="radio" name="status_presenca_${c.id}" value="FALTA" ${statusSalvo === 'FALTA' ? 'checked' : ''} onchange="atualizarEstiloPílulasChamada(${c.id})">
            F
          </label>

          <label id="pill_J_${c.id}" class="radio-pill-item pill-justificado ${statusSalvo === 'JUSTIFICADO' ? 'active' : ''}">
            <input type="radio" name="status_presenca_${c.id}" value="JUSTIFICADO" ${statusSalvo === 'JUSTIFICADO' ? 'checked' : ''} onchange="atualizarEstiloPílulasChamada(${c.id})">
            J
          </label>
        </div>
      </td>
      <td>
        <input type="text" id="obs_presenca_${c.id}" placeholder="Obs (opcional)" value="${pSalva?.observacao || ''}" style="padding:5px 8px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px; width: 100%;">
      </td>
    `;

    tbody.appendChild(tr);
  });

  atualizarContadoresFiltrosChamada();
}

async function salvarChamadaEncontro() {
  const encontroId = parseInt(document.getElementById("selectEncontroChamada")?.value || 0);

  if (!encontroId) {
    alert("Por favor, selecione um encontro antes de salvar a chamada.");
    return;
  }

  const encontroSel = encontros.find(e => e.id === encontroId);
  const dataEncontroStr = encontroSel ? encontroSel.data_encontro : new Date().toLocaleDateString('pt-BR');

  try {
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const presencasParaSalvar = [];
    const crismandosFaltosos = [];

    crismandos.forEach(c => {
      const radioChecked = document.querySelector(`input[name="status_presenca_${c.id}"]:checked`);
      const status = radioChecked ? radioChecked.value : "PRESENTE";
      const obs = document.getElementById(`obs_presenca_${c.id}`)?.value?.trim() || "";

      presencasParaSalvar.push({
        encontro_id: encontroId,
        crismando_id: c.id,
        status,
        observacao: obs
      });

      if (status === "FALTA") {
        // Nova contagem incluindo esta falta se ainda não contada
        const jaTinhaFaltaSalva = presencas.some(p => p.encontro_id === encontroId && p.crismando_id === c.id && p.status === "FALTA");
        const faltasAtuais = mapaFaltasAcumuladas[c.id] || 0;
        const faltasAtualizadas = jaTinhaFaltaSalva ? faltasAtuais : faltasAtuais + 1;

        crismandosFaltosos.push({ crismando: c, totalFaltas: faltasAtualizadas });
      }
    });

    // Apagar presenças existentes deste encontro para sobrescrever (upsert limpo)
    await supabase.from("presencas").delete().eq("encontro_id", encontroId);

    // Inserir chamadas
    const { data, error } = await supabase.from("presencas").insert(presencasParaSalvar).select();
    if (error) throw error;

    // Recarregar presenças
    const { data: dataP } = await supabase.from("presencas").select("*");
    presencas = dataP || [];

    calcularMapaFaltas();
    atualizarTabelaChamada();

    alert(`✅ Chamada salva com sucesso para o encontro de ${dataEncontroStr}!`);

    // Notificar faltosos via modal/opção de WhatsApp
    if (crismandosFaltosos.length > 0) {
      exibirModalNotificacaoFaltas(crismandosFaltosos, dataEncontroStr);
    }

  } catch (error) {
    console.error("Erro ao salvar chamada:", error);
    alert(`❌ Erro ao salvar chamada: ${error.message || error}`);
  }
}

function exibirModalNotificacaoFaltas(faltosos, dataEncontroStr) {
  let htmlTextos = "";

  faltosos.forEach((item, index) => {
    const c = item.crismando;
    const totalF = item.totalFaltas;
    const msg = `Olá, ${c.nome}. Registramos a sua ausência no encontro da Crisma do dia *${dataEncontroStr}*. Lembramos que o limite tolerado pela coordenação é de 7 faltas e no momento você possui *${totalF} falta(s)* acumulada(s).\n\n"Eu sou o caminho, a verdade e a vida." - João 14:6. Contamos com sua presença no próximo encontro! 🙏`;

    htmlTextos += `
      <div style="border-bottom: 1px solid #eee; padding-bottom: 12px; margin-bottom: 12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:5px;">
          <strong>👤 ${c.nome} (Total: ${totalF} faltas)</strong>
          <button id="btnEnvFalta_${index}" class="btn btn-warning" style="padding: 4px 10px; font-size: 12px;" onclick="enviarAvisoFaltaIndividual(this, '${c.nome}', '${c.telefone || ''}', '${dataEncontroStr}', ${totalF})">
            📱 Enviar Aviso via Evolution Go
          </button>
        </div>
        <div style="background: #f8f9fa; padding: 8px; border-radius: 5px; font-size: 12px; margin-top: 5px; color: #555;">${msg}</div>
      </div>
    `;
  });

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "modalNotificacaoFaltas";
  modal.style.display = "block";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 650px;">
      <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
      <h3 style="color: #c0392b; margin-bottom: 10px; text-align: center;">📱 Notificações de Ausência (${faltosos.length})</h3>
      <p style="font-size: 13px; color: #555; margin-bottom: 15px;">Os crismandos abaixo receberam registro de falta neste encontro. Dispare os avisos via WhatsApp Evolution Go:</p>
      
      <div style="max-height: 350px; overflow-y: auto; margin-bottom: 15px; padding-right: 5px;">${htmlTextos}</div>
      
      <div style="display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
        <button class="btn btn-success" style="flex: 1;" onclick="dispararAvisosFaltaEmLote('${dataEncontroStr}')">
          🚀 Disparar Todos Avisos de Falta via Evolution Go (Background)
        </button>
        <button class="btn btn-secondary" style="background:#6c757d; color:white;" onclick="this.parentElement.parentElement.parentElement.remove()">
          Fechar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Disparo individual de aviso de falta via Evolution Go REST API
async function enviarAvisoFaltaIndividual(btn, nome, telefone, dataEncontroStr, totalFaltas) {
  let tel = telefone ? telefone.replace(/\D/g, "") : "";
  if (!tel) {
    alert(`O crismando ${nome} não possui telefone cadastrado.`);
    return;
  }

  const msg = `Olá, ${nome}. Registramos a sua ausência no encontro da Crisma do dia *${dataEncontroStr}*. Lembramos que o limite tolerado pela coordenação é de 7 faltas e no momento você possui *${totalFaltas} falta(s)* acumulada(s).\n\n"Eu sou o caminho, a verdade e a vida." - João 14:6. Contamos com sua presença no próximo encontro! 🙏`;

  btn.disabled = true;
  btn.style.background = "#f39c12";
  btn.innerHTML = "⏳ Enviando...";

  const ok = await enviarTextoEvolutionGo(tel, msg);

  if (ok) {
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

// Disparo em lote dos avisos de falta em background via Evolution Go
async function dispararAvisosFaltaEmLote(dataEncontroStr) {
  const modal = document.getElementById("modalNotificacaoFaltas");
  if (modal) modal.remove();

  // Encontrar crismandos faltosos do encontro atual
  const encontroId = parseInt(document.getElementById("selectEncontroChamada")?.value || 0);
  const presencasDoEncontro = presencas.filter(p => p.encontro_id === encontroId && p.status === "FALTA");

  if (presencasDoEncontro.length === 0) {
    alert("Nenhuma falta registrada para este encontro.");
    return;
  }

  const listaFaltosos = [];
  presencasDoEncontro.forEach(p => {
    const c = crismandos.find(cr => cr.id === p.crismando_id);
    if (c && c.telefone) {
      const totalF = mapaFaltasAcumuladas[c.id] || 1;
      const msg = `Olá, ${c.nome}. Registramos a sua ausência no encontro da Crisma do dia *${dataEncontroStr}*. Lembramos que o limite tolerado pela coordenação é de 7 faltas e no momento você possui *${totalF} falta(s)* acumulada(s).\n\n"Eu sou o caminho, a verdade e a vida." - João 14:6. Contamos com sua presença no próximo encontro! 🙏`;
      listaFaltosos.push({ crismando: c, mensagemTexto: msg });
    }
  });

  if (listaFaltosos.length === 0) {
    alert("Nenhum dos crismandos faltosos possui telefone cadastrado.");
    return;
  }

  if (window.disparoEmAndamento) {
    alert("⚠️ Já existe um disparo em lote em andamento. Aguarde a conclusão.");
    return;
  }

  window.disparoEmAndamento = true;
  renderizarBannerDisparoBackground();

  let enviados = 0;
  for (let i = 0; i < listaFaltosos.length; i++) {
    if (!window.disparoEmAndamento) break;

    if (window.auth && typeof window.auth.renovarSessao === "function") {
      window.auth.renovarSessao();
    }

    const item = listaFaltosos[i];
    atualizarBannerDisparo(i + 1, listaFaltosos.length, item.crismando.nome, 0);

    const ok = await enviarTextoEvolutionGo(item.crismando.telefone, item.mensagemTexto);
    if (ok) enviados++;

    if (i < listaFaltosos.length - 1 && window.disparoEmAndamento) {
      const delay = Math.floor(Math.random() * (45 - 15 + 1)) + 15;
      for (let s = delay; s > 0; s--) {
        if (!window.disparoEmAndamento) break;
        if (window.auth && typeof window.auth.renovarSessao === "function") {
          window.auth.renovarSessao();
        }
        atualizarBannerDisparo(i + 1, listaFaltosos.length, item.crismando.nome, s);
        await new Promise(res => setTimeout(res, 1000));
      }
    }
  }

  window.disparoEmAndamento = false;
  removerBannerDisparo();

  alert(`🏁 Disparo dos avisos de falta concluído!\n\n✅ Mensagens entregues: ${enviados}`);
}
