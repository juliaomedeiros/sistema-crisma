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
    const statusUpper = String(p.status || "").trim().toUpperCase();
    if (statusUpper === "FALTA") {
      const cId = String(p.crismando_id);
      mapaFaltasAcumuladas[cId] = (mapaFaltasAcumuladas[cId] || 0) + 1;
    }
  });

  const totalFaltososGeral = Object.values(mapaFaltasAcumuladas).filter(q => q >= 1).length;
  const elCntPanorama = document.getElementById("cntPanoramaFaltosos");
  if (elCntPanorama) elCntPanorama.textContent = totalFaltososGeral;
}

function obterBadgeFaltas(qtdFaltas) {
  const textoFalta = qtdFaltas === 1 ? "1 falta" : `${qtdFaltas} faltas`;

  if (qtdFaltas >= 7) {
    return `<span style="background: #212529; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">⛔ Desligado (${textoFalta})</span>`;
  } else if (qtdFaltas === 6) {
    return `<span style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; animation: blink 1.5s infinite;">🔴 Alerta Crítico (${textoFalta})</span>`;
  } else if (qtdFaltas === 5) {
    return `<span style="background: #e67e22; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">🟠 Atenção (${textoFalta})</span>`;
  } else if (qtdFaltas >= 3) {
    return `<span style="background: #f1c40f; color: #333; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">🟡 Aviso (${textoFalta})</span>`;
  } else {
    return `<span style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">✅ OK (${textoFalta})</span>`;
  }
}

function popularSelectEncontros() {
  const select = document.getElementById("selectEncontroChamada");
  if (!select) return;

  const valorAtual = select.value;
  select.innerHTML = '<option value="">📋 Visão Geral da Turma (Selecione um encontro para chamada)</option>';

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
    if (error && (error.code === "42501" || (error.message && error.message.includes("row-level security")))) {
      alert(
        "⚠️ Permissão negada no banco de dados (RLS)!\n\n" +
        "A tabela 'encontros' do Supabase exige configuração de permissão (Row Level Security).\n" +
        "Por favor, acesse o SQL Editor no Supabase e execute:\n\n" +
        "ALTER TABLE encontros DISABLE ROW LEVEL SECURITY;"
      );
    } else {
      alert(`❌ Erro ao criar encontro: ${error.message || error}`);
    }
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
  const encontroId = parseInt(document.getElementById("selectEncontroChamada")?.value || 0);
  if (!encontroId) {
    alert("Por favor, selecione um encontro para realizar a chamada.");
    return;
  }
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

  const encontroId = parseInt(document.getElementById("selectEncontroChamada")?.value || 0);

  if (crismandos) {
    cntTodos = crismandos.length;
    if (encontroId) {
      crismandos.forEach(c => {
        const radio = document.querySelector(`input[name="status_presenca_${c.id}"]:checked`);
        const val = radio ? radio.value : "PRESENTE";
        if (val === "PRESENTE") cntP++;
        else if (val === "FALTA") cntF++;
        else if (val === "JUSTIFICADO") cntJ++;
      });
    }
  }

  const elTodos = document.getElementById("cntFiltro_TODOS");
  const elP = document.getElementById("cntFiltro_PRESENTE");
  const elF = document.getElementById("cntFiltro_FALTA");
  const elJ = document.getElementById("cntFiltro_JUSTIFICADO");

  if (elTodos) elTodos.textContent = cntTodos;
  if (elP) elP.textContent = cntP;
  if (elF) elF.textContent = cntF;
  if (elJ) elJ.textContent = cntJ;

  const totalFaltososGeral = Object.values(mapaFaltasAcumuladas || {}).filter(q => q >= 1).length;
  const elCntPanorama = document.getElementById("cntPanoramaFaltosos");
  if (elCntPanorama) elCntPanorama.textContent = totalFaltososGeral;
}

function atualizarTabelaChamada() {
  const tbody = document.getElementById("corpoTabelaChamada");
  if (!tbody) return;

  tbody.innerHTML = "";

  const selectEncontro = document.getElementById("selectEncontroChamada");
  const encontroId = parseInt(selectEncontro?.value || 0);

  const btnMarcar = document.getElementById("btnMarcarTodosPresentes");
  const btnSalvar = document.getElementById("btnSalvarChamada");
  const tituloTabela = document.getElementById("tituloTabelaChamada");

  const termo = window.termoBuscaChamada || "";
  const filtroStatus = window.filtroStatusChamada || "TODOS";

  if (!crismandos || crismandos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888;">Nenhum crismando cadastrado.</td></tr>`;
    atualizarContadoresFiltrosChamada();
    return;
  }

  // =========================================================================
  // MODO 1: VISÃO GERAL DA TURMA (Nenhum encontro selecionado)
  // =========================================================================
  if (!encontroId) {
    if (tituloTabela) tituloTabela.innerHTML = `📋 Panorama Geral de Faltas Acumuladas no Ciclo`;
    if (btnMarcar) { btnMarcar.disabled = true; btnMarcar.style.opacity = "0.5"; btnMarcar.style.cursor = "not-allowed"; }
    if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.style.opacity = "0.5"; btnSalvar.style.cursor = "not-allowed"; }

    let crismandosExibidos = crismandos.filter(c => {
      return !termo || c.nome.toLowerCase().includes(termo);
    });

    if (crismandosExibidos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888; padding: 20px;">Nenhum crismando encontrado para "${termo}".</td></tr>`;
      atualizarContadoresFiltrosChamada();
      return;
    }

    crismandosExibidos.forEach(c => {
      const qtdFaltas = mapaFaltasAcumuladas[String(c.id)] || 0;
      const badgeHTML = obterBadgeFaltas(qtdFaltas);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${c.nome}</strong></td>
        <td>${c.telefone || "-"}</td>
        <td>${badgeHTML}</td>
        <td>
          <span style="font-size: 12px; color: #64748b; italic;">ℹ️ Selecione um encontro acima para lançar a chamada</span>
        </td>
        <td>
          <span style="font-size: 12px; color: #94a3b8;">-</span>
        </td>
      `;
      tbody.appendChild(tr);
    });

    atualizarContadoresFiltrosChamada();
    return;
  }

  // =========================================================================
  // MODO 2: CHAMADA ATIVA DO ENCONTRO SELECIONADO
  // =========================================================================
  const encontroSel = encontros.find(e => e.id === encontroId);
  const dataTemaStr = encontroSel ? `${encontroSel.data_encontro} - ${encontroSel.tema || "Sem tema"}` : "";

  if (tituloTabela) tituloTabela.innerHTML = `📝 Chamada do Encontro: <span style="color:#2980b9;">${dataTemaStr}</span>`;
  if (btnMarcar) { btnMarcar.disabled = false; btnMarcar.style.opacity = "1"; btnMarcar.style.cursor = "pointer"; }
  if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.style.opacity = "1"; btnSalvar.style.cursor = "pointer"; }

  // Filtrar presenças salvas para este encontro específico
  const presencasDoEncontro = presencas.filter(p => String(p.encontro_id) === String(encontroId));

  let crismandosExibidos = crismandos.filter(c => {
    // Filtro por nome
    const bateNome = !termo || c.nome.toLowerCase().includes(termo);
    if (!bateNome) return false;

    // Filtro por status selecionado
    const pSalva = presencasDoEncontro.find(p => String(p.crismando_id) === String(c.id));
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
    const qtdFaltas = mapaFaltasAcumuladas[String(c.id)] || 0;
    const badgeHTML = obterBadgeFaltas(qtdFaltas);

    // Buscar presença já salva se existir
    const pSalva = presencasDoEncontro.find(p => String(p.crismando_id) === String(c.id));
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
    if (error && (error.code === "42501" || (error.message && error.message.includes("row-level security")))) {
      alert(
        "⚠️ Permissão negada no banco de dados (RLS)!\n\n" +
        "A tabela 'presencas' do Supabase exige configuração de permissão (Row Level Security).\n" +
        "Por favor, acesse o SQL Editor no Supabase e execute:\n\n" +
        "ALTER TABLE presencas DISABLE ROW LEVEL SECURITY;"
      );
    } else {
      alert(`❌ Erro ao salvar chamada: ${error.message || error}`);
    }
  }
}

// Modal de Notificação de Ausências do Encontro (com checkboxes e envio assíncrono para fila do servidor)
function exibirModalNotificacaoFaltas(faltosos, dataEncontroStr) {
  let htmlCards = "";

  faltosos.forEach((item, index) => {
    const c = item.crismando;
    const totalF = item.totalFaltas;
    const temTel = !!(c.telefone && c.telefone.replace(/\D/g, "").length >= 8);
    const msg = `Olá, ${c.nome}. Registramos a sua ausência no encontro da Crisma do dia *${dataEncontroStr}*. Lembramos que o limite tolerado pela coordenação é de 7 faltas e no momento você possui *${totalF} falta(s)* acumulada(s).\n\n"Eu sou o caminho, a verdade e a vida." - João 14:6. Contamos com sua presença no próximo encontro! 🙏`;

    htmlCards += `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: ${temTel ? '#ffffff' : '#fff5f5'};">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; margin: 0; font-weight: bold; color: #1e293b;">
            <input type="checkbox" class="chk-faltoso-modal" 
              data-id="${c.id}" 
              data-nome="${c.nome}" 
              data-tel="${c.telefone || ''}" 
              data-faltas="${totalF}" 
              ${temTel ? 'checked' : 'disabled'} 
              onchange="atualizarContagemFaltososModal()">
            <span>👤 ${c.nome}</span>
          </label>
          <div style="display:flex; align-items:center; gap:8px;">
            ${obterBadgeFaltas(totalF)}
            <span style="font-size: 12px; color: ${temTel ? '#64748b' : '#e74c3c'};">${c.telefone || '⚠️ Sem telefone'}</span>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 8px; border-radius: 6px; font-size: 11px; margin-top: 8px; color: #475569; border-left: 3px solid #3b82f6;">
          ${msg}
        </div>
      </div>
    `;
  });

  const modalExistente = document.getElementById("modalNotificacaoFaltas");
  if (modalExistente) modalExistente.remove();

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "modalNotificacaoFaltas";
  modal.style.display = "block";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 680px; max-height: 90vh; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px;">
        <h3 style="color: #c0392b; margin: 0;">📱 Notificar Ausências no WhatsApp (${faltosos.length})</h3>
        <span class="close" style="cursor: pointer; font-size: 24px; font-weight: bold; color: #64748b;" onclick="fecharModalNotificacaoFaltas()">&times;</span>
      </div>

      <p style="font-size: 13px; color: #475569; margin: 0 0 12px 0;">
        Encontro de <strong>${dataEncontroStr}</strong>. Selecione os crismandos que receberão o aviso de falta. O envio é realizado pelo <strong>servidor em segundo plano</strong> via Meta Cloud API Oficial.
      </p>

      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; background: #f1f5f9; padding: 8px 12px; border-radius: 6px;">
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-sm btn-info" style="padding: 4px 10px; font-size: 12px;" onclick="marcarTodosFaltososModal(true)">☑️ Marcar Todos</button>
          <button type="button" class="btn btn-sm btn-secondary" style="padding: 4px 10px; font-size: 12px; background: #64748b; color: white;" onclick="marcarTodosFaltososModal(false)">⬜ Desmarcar Todos</button>
        </div>
        <span style="font-size: 13px; font-weight: bold; color: #1e293b;">
          Selecionados: <span id="lblQtdFaltososSelecionados" style="color: #2563eb;">0</span> de ${faltosos.length}
        </span>
      </div>
      
      <div id="listaCardsFaltososModal" style="flex: 1; overflow-y: auto; padding-right: 5px; max-height: 400px;">
        ${htmlCards}
      </div>
      
      <div style="display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        <button class="btn btn-success" id="btnConfirmarEnvioFaltas" style="flex: 1; min-width: 200px;" onclick="enfileirarAvisosFaltaChamada('${dataEncontroStr}')">
          🚀 Enviar Selecionados para Fila do Servidor (<span id="lblBtnQtdFaltas">0</span>)
        </button>
        <button class="btn btn-secondary" style="background:#64748b; color:white;" onclick="fecharModalNotificacaoFaltas()">
          Fechar / Não Notificar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  atualizarContagemFaltososModal();
}

function fecharModalNotificacaoFaltas() {
  const modal = document.getElementById("modalNotificacaoFaltas");
  if (modal) modal.remove();
}

function marcarTodosFaltososModal(marcar) {
  const checkboxes = document.querySelectorAll(".chk-faltoso-modal:not(:disabled)");
  checkboxes.forEach(chk => chk.checked = marcar);
  atualizarContagemFaltososModal();
}

function atualizarContagemFaltososModal() {
  const selecionados = document.querySelectorAll(".chk-faltoso-modal:checked");
  const qtd = selecionados.length;
  const lbl = document.getElementById("lblQtdFaltososSelecionados");
  const lblBtn = document.getElementById("lblBtnQtdFaltas");
  const btn = document.getElementById("btnConfirmarEnvioFaltas");

  if (lbl) lbl.textContent = qtd;
  if (lblBtn) lblBtn.textContent = qtd;
  if (btn) btn.disabled = (qtd === 0);
}

// Enfileira os avisos de ausência na fila_mensagens_whatsapp do Supabase
async function enfileirarAvisosFaltaChamada(dataEncontroStr) {
  const selecionados = Array.from(document.querySelectorAll(".chk-faltoso-modal:checked"));
  if (selecionados.length === 0) {
    alert("Nenhum crismando selecionado para envio.");
    return;
  }

  const supabase = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabase) {
    alert("❌ Erro de conexão com o Supabase.");
    return;
  }

  const btn = document.getElementById("btnConfirmarEnvioFaltas");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Enfileirando mensagens...";
  }

  try {
    const loteId = crypto.randomUUID();
    const usuarioAtual = (window.auth && window.auth.currentUser) ? window.auth.currentUser.nome : "Coordenador";

    const registros = selecionados.map(chk => {
      const id = parseInt(chk.getAttribute("data-id"));
      const nome = chk.getAttribute("data-nome");
      const tel = (chk.getAttribute("data-tel") || "").replace(/\D/g, "");
      const totalF = chk.getAttribute("data-faltas") || "1";
      const msgTexto = `Olá, ${nome}. Registramos a sua ausência no encontro da Crisma do dia *${dataEncontroStr}*. Lembramos que o limite tolerado pela coordenação é de 7 faltas e no momento você possui *${totalF} falta(s)* acumulada(s).\n\n"Eu sou o caminho, a verdade e a vida." - João 14:6. Contamos com sua presença no próximo encontro! 🙏`;

      return {
        lote_id: loteId,
        crismando_id: id,
        nome_destinatario: nome,
        telefone: tel,
        tipo: "aviso_falta",
        tipo_envio: "aviso_falta",
        mensagem: msgTexto,
        dados_template: {
          template: "aviso_ausencia_crisma",
          params: [nome, dataEncontroStr, String(totalF)]
        },
        status: "pendente",
        prioridade: 2,
        tentativas: 0,
        criado_por: usuarioAtual
      };
    });

    const { error } = await supabase.from("fila_mensagens_whatsapp").insert(registros);
    if (error) throw error;

    fecharModalNotificacaoFaltas();

    alert(
      `✅ ${registros.length} aviso(s) de falta adicionado(s) com sucesso à fila do servidor!\n\n` +
      `🛡️ O servidor enviará automaticamente em segundo plano via Meta Cloud API Oficial (teto seguro de 250/dia).\n` +
      `💻 Você não precisa ficar esperando. O status pode ser acompanhado na aba '⚙️ Servidor WhatsApp' filtrando por 'Faltas'.`
    );

    if (typeof carregarMetricasFila === "function") carregarMetricasFila();
    if (typeof carregarTabelaMensagensFila === "function") carregarTabelaMensagensFila();

  } catch (err) {
    console.error("Erro ao enfileirar avisos de falta:", err);
    alert(`❌ Erro ao adicionar avisos de falta na fila: ${err.message || err}`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = `🚀 Enviar Selecionados para Fila do Servidor (${selecionados.length})`;
    }
  }
}

// =========================================================================
// PANORAMA GERAL DE FALTOSOS (TODOS OS ENCONTROS)
// =========================================================================

function abrirModalPanoramaFaltosos() {
  if (!crismandos || crismandos.length === 0) {
    alert("Nenhum crismando cadastrado no sistema.");
    return;
  }

  // Filtrar apenas quem tem pelo menos 1 falta acumulada
  const faltososGerais = crismandos
    .filter(c => (mapaFaltasAcumuladas[String(c.id)] || 0) >= 1)
    .map(c => ({
      crismando: c,
      totalFaltas: mapaFaltasAcumuladas[String(c.id)] || 0
    }))
    .sort((a, b) => b.totalFaltas - a.totalFaltas); // Ordenar decrescente por gravidade

  if (faltososGerais.length === 0) {
    alert("🎉 Parabéns! Nenhum crismando possui faltas registradas até o momento.\nA turma está 100% presente em todos os encontros!");
    return;
  }

  let htmlLinhas = "";
  faltososGerais.forEach(item => {
    const c = item.crismando;
    const totalF = item.totalFaltas;
    const temTel = !!(c.telefone && c.telefone.replace(/\D/g, "").length >= 8);

    htmlLinhas += `
      <tr class="linha-panorama-faltoso" data-nome="${c.nome.toLowerCase()}">
        <td style="text-align: center;">
          <input type="checkbox" class="chk-panorama-faltoso"
            data-id="${c.id}"
            data-nome="${c.nome}"
            data-tel="${c.telefone || ''}"
            data-faltas="${totalF}"
            ${temTel ? 'checked' : 'disabled'}
            onchange="atualizarContagemPanoramaFaltosos()">
        </td>
        <td><strong>${c.nome}</strong></td>
        <td><span style="font-size: 12px; color: ${temTel ? '#334155' : '#ef4444'};">${c.telefone || 'Sem telefone'}</span></td>
        <td style="text-align: center;">${obterBadgeFaltas(totalF)}</td>
      </tr>
    `;
  });

  const modalExistente = document.getElementById("modalPanoramaFaltosos");
  if (modalExistente) modalExistente.remove();

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "modalPanoramaFaltosos";
  modal.style.display = "block";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 750px; max-height: 90vh; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px;">
        <h3 style="color: #e67e22; margin: 0;">📊 Panorama Geral de Faltosos da Crisma (${faltososGerais.length})</h3>
        <span class="close" style="cursor: pointer; font-size: 24px; font-weight: bold; color: #64748b;" onclick="fecharModalPanoramaFaltosos()">&times;</span>
      </div>

      <p style="font-size: 13px; color: #475569; margin: 0 0 12px 0;">
        Lista consolidada de crismandos com faltas acumuladas em todo o ciclo. Selecione os alunos para disparar o resumo de faltas via WhatsApp Meta Cloud API Oficial (template <code>resumo_faltas_crisma</code>).
      </p>

      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; background: #fff7ed; border: 1px solid #ffedd5; padding: 10px 12px; border-radius: 6px;">
        <input type="text" id="buscaInputPanorama" placeholder="🔍 Filtrar por nome..." oninput="filtrarListaPanoramaFaltosos()" style="padding: 6px 12px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 6px; width: 220px;">
        
        <div style="display: flex; gap: 8px; align-items: center;">
          <button type="button" class="btn btn-sm btn-info" style="padding: 4px 10px; font-size: 12px;" onclick="marcarTodosPanorama(true)">☑️ Marcar Todos</button>
          <button type="button" class="btn btn-sm btn-secondary" style="padding: 4px 10px; font-size: 12px; background: #64748b; color: white;" onclick="marcarTodosPanorama(false)">⬜ Desmarcar Todos</button>
          <span style="font-size: 13px; font-weight: bold; color: #1e293b; margin-left: 5px;">
            Selecionados: <span id="lblQtdSelecionadosPanorama" style="color: #ea580c;">0</span> de ${faltososGerais.length}
          </span>
        </div>
      </div>

      <div class="table-container" style="flex: 1; overflow-y: auto; max-height: 400px; border: 1px solid #e2e8f0; border-radius: 6px;">
        <table>
          <thead>
            <tr style="background: #f8fafc; position: sticky; top: 0; z-index: 1;">
              <th style="width: 40px; text-align: center;">Sel.</th>
              <th>Crismando</th>
              <th>Telefone</th>
              <th style="text-align: center;">Faltas Acumuladas</th>
            </tr>
          </thead>
          <tbody id="corpoTabelaPanoramaFaltosos">
            ${htmlLinhas}
          </tbody>
        </table>
      </div>

      <div style="display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        <button class="btn btn-warning" id="btnDispararResumoFaltas" style="flex: 1; min-width: 220px; background: #e67e22; color: white;" onclick="enfileirarResumoFaltasGerais()">
          🚀 Enviar Resumo de Faltas dos Selecionados (<span id="lblBtnQtdResumoFaltas">0</span>)
        </button>
        <button class="btn btn-secondary" style="background: #64748b; color: white;" onclick="fecharModalPanoramaFaltosos()">
          Fechar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  atualizarContagemPanoramaFaltosos();
}

function fecharModalPanoramaFaltosos() {
  const modal = document.getElementById("modalPanoramaFaltosos");
  if (modal) modal.remove();
}

function marcarTodosPanorama(marcar) {
  const checkboxes = document.querySelectorAll(".chk-panorama-faltoso:not(:disabled)");
  checkboxes.forEach(chk => {
    const tr = chk.closest("tr");
    if (!tr || tr.style.display !== "none") {
      chk.checked = marcar;
    }
  });
  atualizarContagemPanoramaFaltosos();
}

function filtrarListaPanoramaFaltosos() {
  const termo = (document.getElementById("buscaInputPanorama")?.value || "").trim().toLowerCase();
  const linhas = document.querySelectorAll(".linha-panorama-faltoso");
  linhas.forEach(linha => {
    const nome = linha.getAttribute("data-nome") || "";
    linha.style.display = nome.includes(termo) ? "" : "none";
  });
  atualizarContagemPanoramaFaltosos();
}

function atualizarContagemPanoramaFaltosos() {
  const selecionados = document.querySelectorAll(".chk-panorama-faltoso:checked");
  const qtd = selecionados.length;
  const lbl = document.getElementById("lblQtdSelecionadosPanorama");
  const lblBtn = document.getElementById("lblBtnQtdResumoFaltas");
  const btn = document.getElementById("btnDispararResumoFaltas");

  if (lbl) lbl.textContent = qtd;
  if (lblBtn) lblBtn.textContent = qtd;
  if (btn) btn.disabled = (qtd === 0);
}

// Disparo do resumo de faltas para a fila do Supabase com o template resumo_faltas_crisma
async function enfileirarResumoFaltasGerais() {
  const selecionados = Array.from(document.querySelectorAll(".chk-panorama-faltoso:checked"));
  if (selecionados.length === 0) {
    alert("Nenhum crismando selecionado.");
    return;
  }

  const confirma = confirm(`Deseja agendar o resumo de faltas para ${selecionados.length} crismando(s)?\n\n🛡️ As mensagens serão enviadas em segundo plano pelo servidor via Meta Cloud API Oficial com o template 'resumo_faltas_crisma'.`);
  if (!confirma) return;

  const supabase = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null) || window.supabaseClient;
  if (!supabase) {
    alert("❌ Erro de conexão com o Supabase.");
    return;
  }

  const btn = document.getElementById("btnDispararResumoFaltas");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Enfileirando mensagens...";
  }

  try {
    const loteId = crypto.randomUUID();
    const usuarioAtual = (window.auth && window.auth.currentUser) ? window.auth.currentUser.nome : "Coordenador";

    const registros = selecionados.map(chk => {
      const id = parseInt(chk.getAttribute("data-id"));
      const nome = chk.getAttribute("data-nome");
      const tel = (chk.getAttribute("data-tel") || "").replace(/\D/g, "");
      const totalF = chk.getAttribute("data-faltas") || "1";
      const msgTexto = `Olá, ${nome}. Segue o seu resumo de frequência na Crisma de Adultos: você possui atualmente *${totalF} falta(s)* acumulada(s).\n\nLembramos que o limite tolerado pela coordenação é de 7 faltas. Contamos com a sua dedicação e presença nos próximos encontros! 🙏`;

      return {
        lote_id: loteId,
        crismando_id: id,
        nome_destinatario: nome,
        telefone: tel,
        tipo: "aviso_falta",
        tipo_envio: "aviso_falta",
        mensagem: msgTexto,
        dados_template: {
          template: "resumo_faltas_crisma",
          params: [nome, String(totalF)]
        },
        status: "pendente",
        prioridade: 2,
        tentativas: 0,
        criado_por: usuarioAtual
      };
    });

    const { error } = await supabase.from("fila_mensagens_whatsapp").insert(registros);
    if (error) throw error;

    fecharModalPanoramaFaltosos();

    alert(
      `✅ ${registros.length} resumo(s) de falta agendado(s) com sucesso na fila do servidor!\n\n` +
      `🛡️ O servidor enviará gradualmente em segundo plano via Meta Cloud API Oficial (teto seguro de 250/dia).\n` +
      `💻 Você pode acompanhar o progresso em tempo real na aba '⚙️ Servidor WhatsApp' filtrando por 'Faltas'.`
    );

    if (typeof carregarMetricasFila === "function") carregarMetricasFila();
    if (typeof carregarTabelaMensagensFila === "function") carregarTabelaMensagensFila();

  } catch (err) {
    console.error("Erro ao enfileirar resumo de faltas:", err);
    alert(`❌ Erro ao adicionar resumo de faltas na fila: ${err.message || err}`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = `🚀 Enviar Resumo de Faltas dos Selecionados (${selecionados.length})`;
    }
  }
}
