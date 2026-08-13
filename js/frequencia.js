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

function atualizarTabelaChamada() {
  const tbody = document.getElementById("corpoTabelaChamada");
  if (!tbody) return;

  tbody.innerHTML = "";

  const encontroId = parseInt(document.getElementById("selectEncontroChamada")?.value || 0);

  if (!crismandos || crismandos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888;">Nenhum crismando cadastrado.</td></tr>`;
    return;
  }

  // Filtrar presenças salvas para este encontro específico
  const presencasDoEncontro = presencas.filter(p => p.encontro_id === encontroId);

  crismandos.forEach(c => {
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
        <div style="display: flex; gap: 8px;">
          <label style="cursor:pointer; display:flex; align-items:center; gap:3px;">
            <input type="radio" name="status_presenca_${c.id}" value="PRESENTE" ${statusSalvo === "PRESENTE" ? "checked" : ""}>
            <span style="color:#27ae60; font-weight:bold;">P</span>
          </label>
          <label style="cursor:pointer; display:flex; align-items:center; gap:3px;">
            <input type="radio" name="status_presenca_${c.id}" value="FALTA" ${statusSalvo === "FALTA" ? "checked" : ""}>
            <span style="color:#c0392b; font-weight:bold;">F</span>
          </label>
          <label style="cursor:pointer; display:flex; align-items:center; gap:3px;">
            <input type="radio" name="status_presenca_${c.id}" value="JUSTIFICADO" ${statusSalvo === "JUSTIFICADO" ? "checked" : ""}>
            <span style="color:#f39c12; font-weight:bold;">J</span>
          </label>
        </div>
      </td>
      <td>
        <input type="text" id="obs_presenca_${c.id}" placeholder="Obs (opcional)" value="${pSalva?.observacao || ""}" style="padding:4px 8px; font-size:12px;">
      </td>
    `;

    tbody.appendChild(tr);
  });
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

  faltosos.forEach(item => {
    const c = item.crismando;
    const totalF = item.totalFaltas;
    const msg = `Olá, ${c.nome}. Registramos a sua ausência no encontro da Crisma do dia *${dataEncontroStr}*. Lembramos que o limite tolerado pela coordenação é de 7 faltas e no momento você possui *${totalF} falta(s)* acumulada(s).\n\n"Eu sou o caminho, a verdade e a vida." - João 14:6. Contamos com sua presença no próximo encontro! 🙏`;

    let tel = c.telefone ? c.telefone.replace(/\D/g, "") : "";
    let telFormatado = tel.startsWith("55") ? tel : "55" + tel;
    let urlWa = `https://wa.me/${telFormatado}?text=${encodeURIComponent(msg)}`;

    htmlTextos += `
      <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
        <strong>👤 ${c.nome} (Total: ${totalF} faltas)</strong><br>
        <div style="background: #f8f9fa; padding: 8px; border-radius: 5px; font-size: 12px; margin: 5px 0;">${msg}</div>
        <a href="${urlWa}" target="_blank" class="btn btn-warning" style="padding: 4px 10px; font-size: 12px; text-decoration: none; display: inline-block;">
          📱 Enviar Aviso no WhatsApp
        </a>
      </div>
    `;
  });

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "block";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
      <h3 style="color: #c0392b; margin-bottom: 15px; text-align: center;">📱 Notificações de Falta (${faltosos.length})</h3>
      <p style="font-size: 13px; color: #555; margin-bottom: 15px;">Os crismandos abaixo receberam registro de ausência. Clique no botão de cada um para abrir o aviso via WhatsApp:</p>
      <div style="max-height: 350px; overflow-y: auto;">${htmlTextos}</div>
      <div style="text-align: center; margin-top: 15px;">
        <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">✅ Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
