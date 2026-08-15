// js/data.js - Manipulação de Estado, Crismandos, Pagamentos Multi-Mês e Ciclo Catequético

let crismandos = [];
let pagamentos = [];
let logoBase64 = "";
let codigosAutenticacao = [];
let recibosPendentesEncontro = [];

// Configuração padrão do Ciclo Catequético e Mensalidade
window.configuracoesSistema = {
  mes_inicio_ciclo: 9, // 9 = Setembro (padrão: Set/2026 a Ago/2027)
  ano_inicio_ciclo: 2026,
  valor_mensal_padrao: 10.00,
  nome_turma: "Crisma de Adultos 2026/2027"
};

const versiculos = [
  "A fé é o fundamento da esperança, é uma certeza a respeito do que não se vê. - Hebreus 11:1",
  "Tudo é possível àquele que crê. - Marcos 9:23",
  "Porque pela graça sois salvos, por meio da fé. - Efésios 2:8",
  "Sem fé é impossível agradar a Deus. - Hebreus 11:6",
  "A fé vem pelo ouvir, e o ouvir pela palavra de Deus. - Romanos 10:17",
  "Bem-aventurados os que não viram e creram. - João 20:29",
  "Se tiverdes fé como um grão de mostarda... - Mateus 17:20",
  "O justo viverá pela fé. - Romanos 1:17",
];

// Carrega configurações do sistema do Supabase ou localStorage
async function carregarConfiguracoesSistema() {
  try {
    const supabaseClient = getSupabaseClient() || window.supabaseClient;
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("configuracoes_sistema")
        .select("*")
        .eq("chave", "config_turma_ciclo")
        .maybeSingle();
      if (!error && data && data.valor) {
        window.configuracoesSistema = Object.assign({}, window.configuracoesSistema, data.valor);
      }
    }
  } catch (e) {
    console.warn("⚠️ Usando configurações armazenadas localmente para a turma.");
  }

  const localSalvo = localStorage.getItem("crisma_config_turma_ciclo");
  if (localSalvo) {
    try {
      window.configuracoesSistema = Object.assign({}, window.configuracoesSistema, JSON.parse(localSalvo));
    } catch (e) {}
  }

  // Preencher campos do painel de configurações se existirem na tela
  preencherPainelConfiguracoes();
}

async function salvarConfiguracoesSistema(novosDados) {
  window.configuracoesSistema = Object.assign({}, window.configuracoesSistema, novosDados);
  localStorage.setItem("crisma_config_turma_ciclo", JSON.stringify(window.configuracoesSistema));

  try {
    const supabase = getSupabaseClient() || window.supabase;
    if (supabase) {
      await supabase.from("configuracoes_sistema").upsert({
        chave: "config_turma_ciclo",
        valor: window.configuracoesSistema,
        updated_at: new Date().toISOString()
      });
    }
  } catch (e) {
    console.warn("⚠️ Configurações salvas localmente:", e);
  }

  alert("✅ Configurações da Turma e do Ciclo Catequético salvas com sucesso!");
  atualizarGradeMeses();
  atualizarEstatisticas();
}

function salvarConfiguracoesFormulario() {
  const mesInicio = parseInt(document.getElementById("cfgMesInicioCiclo")?.value || 9);
  const anoInicio = parseInt(document.getElementById("cfgAnoInicioCiclo")?.value || 2026);
  const valPadrao = parseFloat(document.getElementById("cfgValorMensalPadrao")?.value || 10.00) || 10.00;
  const nomeTurma = document.getElementById("cfgNomeTurma")?.value.trim() || "Crisma de Adultos";

  salvarConfiguracoesSistema({
    mes_inicio_ciclo: mesInicio,
    ano_inicio_ciclo: anoInicio,
    valor_mensal_padrao: valPadrao,
    nome_turma: nomeTurma
  });
}

function preencherPainelConfiguracoes() {
  const cfg = window.configuracoesSistema;
  const selMes = document.getElementById("cfgMesInicioCiclo");
  const selAno = document.getElementById("cfgAnoInicioCiclo");
  const inpVal = document.getElementById("cfgValorMensalPadrao");
  const inpNom = document.getElementById("cfgNomeTurma");

  if (selMes) selMes.value = cfg.mes_inicio_ciclo;
  if (selAno) selAno.value = cfg.ano_inicio_ciclo;
  if (inpVal) inpVal.value = (cfg.valor_mensal_padrao || 10.00).toFixed(2);
  if (inpNom) inpNom.value = cfg.nome_turma || "Crisma de Adultos";

  const valForm = document.getElementById("valorUnitario");
  if (valForm && (!valForm.value || valForm.value === "10.00")) {
    valForm.value = (cfg.valor_mensal_padrao || 10.00).toFixed(2);
  }
}

// Gera a sequência dos 12 meses na ordem cronológica exata do ciclo catequético ativo
function gerarMesesCicloAtivo() {
  const mesInicio = parseInt(window.configuracoesSistema.mes_inicio_ciclo || 9);
  const anoInicio = parseInt(window.configuracoesSistema.ano_inicio_ciclo || 2026);

  const meses = [];
  let m = mesInicio - 1; // 0-indexed
  let a = anoInicio;

  for (let i = 0; i < 12; i++) {
    const nomeMes = ORDEM_MESES[m];
    const mesNumStr = String(m + 1).padStart(2, "0");
    meses.push({
      indiceMes: m,
      mesNome: nomeMes,
      mesNum: mesNumStr,
      ano: a,
      rotuloCurto: `${nomeMes.substring(0, 3)}/${String(a).substring(2)}`
    });

    m++;
    if (m > 11) {
      m = 0;
      a++;
    }
  }

  return meses;
}

async function carregarDados() {
  try {
    console.log("🔄 Carregando dados do Supabase...");
    await carregarConfiguracoesSistema();

    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const { data: crismandosData, error: crismandosError } = await supabase
      .from("crismandos")
      .select("*")
      .order("nome");
    if (crismandosError) throw crismandosError;
    crismandos = crismandosData || [];

    let pagamentosData = [];
    let pagamentosError = null;
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data: batch, error: batchError } = await supabase
        .from("pagamentos")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (batchError) { pagamentosError = batchError; break; }
      if (!batch || batch.length === 0) break;

      pagamentosData = pagamentosData.concat(batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    if (pagamentosError) throw pagamentosError;
    pagamentos = pagamentosData;

    const { data: codigosData, error: codigosError } = await supabase
      .from("codigos_autenticacao")
      .select("*")
      .order("data_geracao", { ascending: false });
    if (!codigosError) codigosAutenticacao = codigosData || [];

    const logoSalvo = localStorage.getItem("logoBase64");
    if (logoSalvo) {
      logoBase64 = logoSalvo;
      const preview = document.getElementById("logoPreview");
      if (preview) {
        preview.src = logoBase64;
        preview.style.display = "block";
        const logoText = document.getElementById("logoText");
        if (logoText) logoText.style.display = "none";
      }
    }

    carregarRecibosPendentesLocal();
    console.log("✅ Todos os dados carregados com sucesso!");
  } catch (error) {
    console.error("❌ Erro crítico ao carregar dados:", error);
    alert(`❌ Erro ao carregar dados do servidor: ${error.message}\n\nVerifique sua conexão e recarregue a página.`);
    crismandos = crismandos || [];
    pagamentos = pagamentos || [];
    codigosAutenticacao = codigosAutenticacao || [];
    carregarRecibosPendentesLocal();
  }
}

async function adicionarCrismando() {
  const nome = document.getElementById("novoNome").value.trim();
  const telefone = document.getElementById("novoTelefone").value.trim();
  const valor = parseFloat(document.getElementById("novoValor").value) || window.configuracoesSistema.valor_mensal_padrao || 10.00;

  if (!nome) { alert("Por favor, informe o nome do crismando."); return; }

  try {
    const supabase = getSupabaseClient() || window.supabase; 
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const { data, error } = await supabase
      .from("crismandos")
      .insert([{ nome, telefone, valor_mensal: valor }])
      .select();
    if (error) throw error;

    crismandos.push(data[0]);
    atualizarTabela();
    atualizarSelectCrismandos();
    atualizarEstatisticas();

    document.getElementById("novoNome").value = "";
    document.getElementById("novoTelefone").value = "";
    document.getElementById("novoValor").value = "";
    alert("Crismando adicionado com sucesso!");
  } catch (error) {
    console.error("Erro ao adicionar crismando:", error);
    alert("Erro ao adicionar crismando. Tente novamente.");
  }
}

// ─────────────────────────────────────────────────────────────
// GRADE TOUCH-FRIENDLY DE MESES DO CICLO CATEQUÉTICO
// ─────────────────────────────────────────────────────────────

function atualizarGradeMeses() {
  const container = document.getElementById("containerGradeMeses");
  if (!container) return;

  const crismandoId = parseInt(document.getElementById("crismandoIdSelecionado")?.value || 0);
  const listaMesesCiclo = gerarMesesCicloAtivo();

  const mesInicio = window.configuracoesSistema.mes_inicio_ciclo;
  const anoInicio = window.configuracoesSistema.ano_inicio_ciclo;
  const anoFim = listaMesesCiclo[11].ano;
  const nomeTurma = window.configuracoesSistema.nome_turma || "Crisma de Adultos";

  let html = `
    <div style="margin-bottom: 12px; font-weight: bold; color: #2c3e50; font-size: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <span>📅 Ciclo Catequético: ${ORDEM_MESES[mesInicio - 1]}/${anoInicio} a ${ORDEM_MESES[listaMesesCiclo[11].indiceMes]}/${anoFim} (${nomeTurma})</span>
      <small style="color: #666; font-weight: normal;">Toque nos meses para selecionar</small>
    </div>
    <div class="month-tile-grid">
  `;

  listaMesesCiclo.forEach((item) => {
    const idChk = `chk_tile_${item.ano}_${item.mesNum}`;
    
    let jaPago = false;
    if (crismandoId && pagamentos && pagamentos.length > 0) {
      jaPago = pagamentos.some((p) => {
        if (p.crismando_id !== crismandoId) return false;
        const { mes, ano: a } = extrairMesAno(p);
        return mes === item.mesNome && parseInt(a) === item.ano;
      });
    }

    if (jaPago) {
      html += `
        <div class="month-tile paid" title="Mês já quitado anteriormente">
          <input type="checkbox" id="${idChk}" data-mes="${item.mesNome}" data-ano="${item.ano}" disabled checked style="display: none;">
          <span class="month-tile-name">${item.mesNome}</span>
          <span class="month-tile-year">${item.ano}</span>
          <span class="month-tile-status badge-pago">✅ PAGO</span>
        </div>
      `;
    } else {
      html += `
        <div class="month-tile" id="tile_${idChk}" onclick="toggleTileMes('${idChk}')">
          <input type="checkbox" id="${idChk}" data-mes="${item.mesNome}" data-ano="${item.ano}" style="display: none;" onchange="recalcularValorTotal()">
          <span class="month-tile-name">${item.mesNome}</span>
          <span class="month-tile-year">${item.ano}</span>
          <span class="month-tile-status badge-aberto">☐ Aberto</span>
        </div>
      `;
    }
  });

  html += `</div>`;
  container.innerHTML = html;
  recalcularValorTotal();
}

function toggleTileMes(idCheckbox) {
  const chk = document.getElementById(idCheckbox);
  const tile = document.getElementById(`tile_${idCheckbox}`);
  if (!chk || chk.disabled || !tile) return;

  chk.checked = !chk.checked;
  const statusSpan = tile.querySelector(".month-tile-status");

  if (chk.checked) {
    tile.classList.add("selected");
    if (statusSpan) statusSpan.textContent = "☑️ SELECIONADO";
  } else {
    tile.classList.remove("selected");
    if (statusSpan) statusSpan.textContent = "☐ Aberto";
  }

  recalcularValorTotal();
}

function recalcularValorTotal() {
  const checkboxes = document.querySelectorAll('#containerGradeMeses input[type="checkbox"]:checked:not(:disabled)');
  const qtd = checkboxes.length;

  const valPadrao = window.configuracoesSistema.valor_mensal_padrao || 10.00;
  const valorUnitarioInput = parseFloat(document.getElementById("valorUnitario")?.value || valPadrao) || 0;
  const valorTotal = qtd * valorUnitarioInput;

  const lblQtd = document.getElementById("lblQtdMesesSelecionados");
  const lblValor = document.getElementById("lblValorTotalCalculado");
  const inputValorHidden = document.getElementById("valorPagoTotalCalculado");

  if (lblQtd) lblQtd.textContent = qtd;
  if (lblValor) lblValor.textContent = valorTotal.toFixed(2).replace(".", ",");
  if (inputValorHidden) inputValorHidden.value = valorTotal;
}

// ─────────────────────────────────────────────────────────────
// REGISTRO DE PAGAMENTO FLASH (SUPABASE + RECIBO PENDENTE OU IMEDIATO)
// ─────────────────────────────────────────────────────────────

async function registrarPagamento() {
  let crismandoId = parseInt(document.getElementById("crismandoIdSelecionado")?.value || 0);
  const campoBuscaVal = document.getElementById("campoBuscaCrismando")?.value.trim();

  // Resolver automaticamente o crismando pelo nome digitado se o ID não foi preenchido via clique
  if (!crismandoId && campoBuscaVal) {
    const achadoExato = crismandos.find(c => c.nome.toLowerCase() === campoBuscaVal.toLowerCase());
    if (achadoExato) {
      crismandoId = achadoExato.id;
      document.getElementById("crismandoIdSelecionado").value = achadoExato.id;
    } else {
      const achadosParciais = crismandos.filter(c => c.nome.toLowerCase().includes(campoBuscaVal.toLowerCase()));
      if (achadosParciais.length === 1) {
        crismandoId = achadosParciais[0].id;
        document.getElementById("crismandoIdSelecionado").value = achadosParciais[0].id;
        document.getElementById("campoBuscaCrismando").value = achadosParciais[0].nome;
      }
    }
  }

  const checkboxesMarcados = Array.from(
    document.querySelectorAll('#containerGradeMeses input[type="checkbox"]:checked:not(:disabled)')
  );
  const valorUnitario = parseFloat(document.getElementById("valorUnitario")?.value) || window.configuracoesSistema.valor_mensal_padrao || 10.00;
  const enviarAgora = document.getElementById("chkEnviarReciboImediato")?.checked || false;

  if (!crismandoId) {
    alert("Por favor, digite e selecione um crismando no campo de busca.");
    return;
  }

  if (checkboxesMarcados.length === 0) {
    alert("Por favor, selecione pelo menos um mês a ser pago na grade.");
    return;
  }

  if (valorUnitario <= 0) {
    alert("Por favor, informe um valor mensal válido.");
    return;
  }

  // Validação antierro de data/cronologia do ciclo
  const mesInicio = parseInt(window.configuracoesSistema.mes_inicio_ciclo || 9);
  const anoInicio = parseInt(window.configuracoesSistema.ano_inicio_ciclo || 2026);

  for (let chk of checkboxesMarcados) {
    const mesNome = chk.getAttribute("data-mes");
    const anoNum = parseInt(chk.getAttribute("data-ano"));
    const mesNum = ORDEM_MESES.indexOf(mesNome) + 1;

    // Se o ano for menor que o ano de início OU se for no mesmo ano mas antes do mês de início
    if (anoNum < anoInicio || (anoNum === anoInicio && mesNum < mesInicio)) {
      const confirma = confirm(`⚠️ ALERTA DE DATA:\n\nO mês de ${mesNome}/${anoNum} é ANTERIOR ao início da turma ativa (${ORDEM_MESES[mesInicio - 1]}/${anoInicio}).\n\nDeseja realmente registrar este mês antigo?`);
      if (!confirma) return;
    }
  }

  try {
    const supabase = getSupabaseClient() || window.supabase; 
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const { data: crismandoExiste, error: errorVerificacao } = await supabase
      .from("crismandos")
      .select("id, nome, telefone")
      .eq("id", crismandoId)
      .single();

    if (errorVerificacao || !crismandoExiste) {
      alert("❌ Erro: Crismando não encontrado no banco de dados.");
      await carregarDados();
      return;
    }

    const dataHoje = new Date().toISOString().split("T")[0];
    const listaMesesAnos = [];
    const dadosPagamentosParaInserir = [];

    checkboxesMarcados.forEach((chk) => {
      const mesNome = chk.getAttribute("data-mes");
      const anoNum = parseInt(chk.getAttribute("data-ano"));

      listaMesesAnos.push({ mes: mesNome, ano: anoNum });
      dadosPagamentosParaInserir.push({
        crismando_id: crismandoId,
        mes: mesNome,
        ano: anoNum,
        valor: valorUnitario,
        data_pagamento: dataHoje,
      });
    });

    const { data, error } = await supabase
      .from("pagamentos")
      .insert(dadosPagamentosParaInserir)
      .select();

    if (error) throw error;

    // Recarregar pagamentos no estado local
    let todosPagamentos = [];
    let fromReg = 0;
    while (true) {
      const { data: batch, error: bErr } = await supabase
        .from("pagamentos")
        .select("*")
        .order("created_at", { ascending: false })
        .range(fromReg, fromReg + 999);

      if (bErr || !batch || batch.length === 0) break;
      todosPagamentos = todosPagamentos.concat(batch);
      if (batch.length < 1000) break;
      fromReg += 1000;
    }
    pagamentos = todosPagamentos;

    atualizarTabela();
    atualizarEstatisticas();

    const valorTotalGeral = valorUnitario * checkboxesMarcados.length;
    const resultadoComprovante = gerarTextoComprovanteConsolidado(
      crismandoExiste,
      listaMesesAnos,
      valorTotalGeral
    );

    window.dadosComprovanteAtual = resultadoComprovante.dadosComprovante;
    window.textoComprovanteAtual = resultadoComprovante.mensagemTexto;

    // LÓGICA DE DISPARO: IMEDIATO OU ACUMULADO EM LOTE POSTERIOR
    if (enviarAgora) {
      if (crismandoExiste.telefone) {
        const enviadoOk = await enviarTextoEvolutionGo(
          crismandoExiste.telefone,
          resultadoComprovante.mensagemTexto
        );

        if (enviadoOk) {
          alert(
            `✅ PAGAMENTO E RECIBO REGISTRADOS COM SUCESSO!\n\n` +
            `👤 Crismando: ${crismandoExiste.nome}\n` +
            `💰 Total Quitado: R$ ${valorTotalGeral.toFixed(2).replace(".", ",")}\n` +
            `📱 Recibo enviado com sucesso no WhatsApp de ${crismandoExiste.nome}!`
          );
        } else {
          alert(
            `✅ Pagamento de ${crismandoExiste.nome} (R$ ${valorTotalGeral.toFixed(2).replace(".", ",")}) registrado com sucesso no banco!\n\n` +
            `⚠️ Contudo, a mensagem no WhatsApp não pôde ser entregue no momento. Verifique a conexão com o Evolution Go.`
          );
        }
      } else {
        alert(
          `✅ Pagamento de ${crismandoExiste.nome} (R$ ${valorTotalGeral.toFixed(2).replace(".", ",")}) registrado com sucesso!\n\n` +
          `⚠️ Crismando não possui número de telefone cadastrado para o envio do recibo.`
        );
      }
    } else {
      recibosPendentesEncontro.push({
        crismando: crismandoExiste,
        mesesAnos: listaMesesAnos,
        valorTotal: valorTotalGeral,
        mensagemTexto: resultadoComprovante.mensagemTexto,
        dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });

      salvarRecibosPendentesLocal();

      alert(
        `✅ PAGAMENTO REGISTRADO COM SUCESSO!\n\n` +
        `👤 Crismando: ${crismandoExiste.nome}\n` +
        `💰 Total Quitado: R$ ${valorTotalGeral.toFixed(2).replace(".", ",")}\n` +
        `🧾 O recibo foi adicionado à fila do encontro e SERÁ ENVIADO EM LOTE POSTERIORMENTE (no final do dia via Evolution Go).`
      );
    }

    // Limpar formulário para próximo atendimento
    document.getElementById("campoBuscaCrismando").value = "";
    document.getElementById("crismandoIdSelecionado").value = "";
    document.getElementById("listaAutocompleteCrismando").innerHTML = "";
    document.getElementById("listaAutocompleteCrismando").style.display = "none";
    atualizarGradeMeses();

  } catch (error) {
    console.error("Erro ao registrar pagamento:", error);
    alert(`❌ Erro ao registrar pagamento: ${error.message || error}`);
  }
}

function salvarRecibosPendentesLocal() {
  localStorage.setItem("crisma_recibos_pendentes", JSON.stringify(recibosPendentesEncontro));
  atualizarContadorRecibosPendentes();
}

function carregarRecibosPendentesLocal() {
  const dados = localStorage.getItem("crisma_recibos_pendentes");
  if (dados) {
    try {
      recibosPendentesEncontro = JSON.parse(dados) || [];
    } catch (e) {
      recibosPendentesEncontro = [];
    }
  }
  atualizarContadorRecibosPendentes();
}

function atualizarContadorRecibosPendentes() {
  const lblCount = document.getElementById("lblQtdRecibosPendentes");
  const btnDisparar = document.getElementById("btnDispararRecibosPendentes");
  if (lblCount) lblCount.textContent = recibosPendentesEncontro.length;
  if (btnDisparar) {
    btnDisparar.style.display = recibosPendentesEncontro.length > 0 ? "inline-flex" : "none";
  }
}

function inicializarAutocompleteCrismando() {
  const campoBusca = document.getElementById("campoBuscaCrismando");
  const lista = document.getElementById("listaAutocompleteCrismando");
  const campoId = document.getElementById("crismandoIdSelecionado");

  if (!campoBusca || !lista || !campoId) return;

  campoBusca.addEventListener("input", () => {
    const termo = campoBusca.value.trim().toLowerCase();
    lista.innerHTML = "";
    campoId.value = "";

    if (termo.length < 2) {
      lista.style.display = "none";
      atualizarGradeMeses();
      return;
    }

    const filtrados = crismandos.filter((c) =>
      c.nome.toLowerCase().includes(termo)
    );

    if (filtrados.length === 0) {
      lista.style.display = "none";
      atualizarGradeMeses();
      return;
    }

    // Auto-atribuir ID se houver correspondência exata de nome
    const exato = crismandos.find(c => c.nome.toLowerCase() === termo);
    if (exato) {
      campoId.value = exato.id;
      const valInput = document.getElementById("valorUnitario");
      const valPadrao = window.configuracoesSistema.valor_mensal_padrao || 10.00;
      if (valInput) valInput.value = (exato.valor_mensal || valPadrao).toFixed(2);
      atualizarGradeMeses();
    } else if (filtrados.length === 1) {
      campoId.value = filtrados[0].id;
      const valInput = document.getElementById("valorUnitario");
      const valPadrao = window.configuracoesSistema.valor_mensal_padrao || 10.00;
      if (valInput) valInput.value = (filtrados[0].valor_mensal || valPadrao).toFixed(2);
      atualizarGradeMeses();
    }

    filtrados.forEach((c) => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      const valPadrao = window.configuracoesSistema.valor_mensal_padrao || 10.00;
      item.textContent = `${c.nome} (R$ ${(c.valor_mensal || valPadrao).toFixed(2).replace(".", ",")})`;
      item.style.cssText =
        "padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #eee;";
      item.addEventListener("mouseenter", () => (item.style.background = "#f0f0f0"));
      item.addEventListener("mouseleave", () => (item.style.background = "white"));
      item.addEventListener("click", () => {
        campoBusca.value = c.nome;
        campoId.value = c.id;
        const valInput = document.getElementById("valorUnitario");
        if (valInput) valInput.value = (c.valor_mensal || valPadrao).toFixed(2);
        lista.innerHTML = "";
        lista.style.display = "none";
        atualizarGradeMeses();
      });
      lista.appendChild(item);
    });

    lista.style.cssText =
      "display: block; position: absolute; background: white; border: 1px solid #ccc; border-radius: 4px; z-index: 1000; width: 100%; max-height: 200px; overflow-y: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.15);";
  });

  document.addEventListener("click", (e) => {
    if (!campoBusca.contains(e.target) && !lista.contains(e.target)) {
      lista.style.display = "none";
    }
  });

  atualizarGradeMeses();
}

function atualizarSelectCrismandos() {
  const select = document.getElementById("selectCrismando");
  if (!select) return;
  select.innerHTML = "";
  if (!crismandos || crismandos.length === 0) return;
  crismandos.forEach((crismando) => {
    if (crismando && crismando.id && crismando.nome) {
      const option = document.createElement("option");
      option.value = crismando.id;
      const valPadrao = window.configuracoesSistema.valor_mensal_padrao || 10.00;
      option.textContent = `${crismando.nome} - R$ ${(crismando.valor_mensal || valPadrao).toFixed(2).replace(".", ",")}`;
      select.appendChild(option);
    }
  });
}

async function removerCrismando(id) {
  if (!confirm("Tem certeza que deseja remover este crismando?")) return;
  try {
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");
    const { error } = await supabase.from("crismandos").delete().eq("id", id);
    if (error) throw error;
    crismandos = crismandos.filter((c) => c.id != id);
    pagamentos = pagamentos.filter((p) => p.crismando_id != id);
    atualizarTabela();
    atualizarSelectCrismandos();
    atualizarEstatisticas();
    alert("Crismando removido com sucesso!");
  } catch (error) {
    console.error("Erro ao remover crismando:", error);
    alert("Erro ao remover crismando. Tente novamente.");
  }
}

function gerarCodigoUnico() {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "";
  do {
    codigo = "";
    for (let i = 0; i < 8; i++) {
      codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
  } while (codigosAutenticacao.some((c) => c.codigo === codigo));
  return codigo;
}

async function registrarCodigoAutenticacao(dadosComprovante, codigo) {
  try {
    let mesBanco = String(dadosComprovante.mes || "");
    if (mesBanco.length > 20) {
      mesBanco = mesBanco.substring(0, 17) + "...";
    }

    const registro = {
      codigo,
      crismando_id: dadosComprovante.crismando.id,
      nome_crismando: dadosComprovante.crismando.nome,
      mes: mesBanco,
      ano: dadosComprovante.ano,
      valor: dadosComprovante.valor,
      data_vencimento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      ativo: true,
    };
    const supabaseClient = getSupabaseClient() || window.supabaseClient;
    if (!supabaseClient) throw new Error("Cliente Supabase não inicializado");

    const { data, error } = await supabaseClient
      .from("codigos_autenticacao")
      .insert([registro])
      .select();
    if (error) throw error;
    codigosAutenticacao.push(data[0]);
    return data[0];
  } catch (error) {
    console.error("Erro ao registrar código:", error);
    return null;
  }
}

async function sincronizarDados() {
  try {
    await carregarDados();
    atualizarTabela();
    atualizarSelectCrismandos();
    atualizarEstatisticas();
    inicializarAutocompleteCrismando();
    return true;
  } catch (error) {
    console.error("❌ Erro na sincronização:", error);
    return false;
  }
}
