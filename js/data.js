// Dados globais
let crismandos = [];
let pagamentos = [];
let logoBase64 = "";
let codigosAutenticacao = [];

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

async function carregarDados() {
  try {
    console.log("🔄 Carregando dados do Supabase...");
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const { data: crismandosData, error: crismandosError } = await supabase
      .from("crismandos")
      .select("*")
      .order("nome");
    if (crismandosError) throw crismandosError;
    crismandos = crismandosData || [];

    // ✅ .range() garante busca de todos os registros sem limite do Supabase (padrão 1000)
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
      if (batch.length < pageSize) break; // última página
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

    console.log("✅ Todos os dados carregados com sucesso!");
  } catch (error) {
    console.error("❌ Erro crítico ao carregar dados:", error);
    alert(`❌ Erro ao carregar dados do servidor: ${error.message}\n\nVerifique sua conexão e recarregue a página.`);
    crismandos = crismandos || [];
    pagamentos = pagamentos || [];
    codigosAutenticacao = codigosAutenticacao || [];
  }
}

async function adicionarCrismando() {
  const nome = document.getElementById("novoNome").value.trim();
  const telefone = document.getElementById("novoTelefone").value.trim();
  const valor = parseFloat(document.getElementById("novoValor").value) || 0;

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

// ─────────────────────────────────────────────
// GRADE DE MESES E REGISTRO MULTI-MÊS / MULTI-ANO
// ─────────────────────────────────────────────

function atualizarGradeMeses() {
  const container = document.getElementById("containerGradeMeses");
  if (!container) return;

  const anoPrincipal = parseInt(document.getElementById("anoPagamento")?.value || 2026);
  const incluirAnoSeguinte = document.getElementById("chkIncluirAnoSeguinte")?.checked || false;
  const crismandoId = parseInt(document.getElementById("crismandoIdSelecionado")?.value || 0);

  const anosParaExibir = [anoPrincipal];
  if (incluirAnoSeguinte) {
    anosParaExibir.push(anoPrincipal + 1);
  }

  let html = "";
  anosParaExibir.forEach((ano) => {
    html += `<div style="margin-bottom: 15px;">`;
    html += `<div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50;">📆 Ano ${ano}</div>`;
    html += `<div class="meses-grid">`;

    ORDEM_MESES.forEach((mesNome, index) => {
      const mesNum = String(index + 1).padStart(2, "0");
      const idCheckbox = `chk_mes_${ano}_${mesNum}`;
      
      let jaPago = false;
      if (crismandoId && pagamentos && pagamentos.length > 0) {
        jaPago = pagamentos.some((p) => {
          if (p.crismando_id !== crismandoId) return false;
          const { mes, ano: a } = extrairMesAno(p);
          return mes === mesNome && parseInt(a) === ano;
        });
      }

      if (jaPago) {
        html += `
          <label class="mes-checkbox-label pago" title="Mês já quitado anteriormente">
            <input type="checkbox" id="${idCheckbox}" data-mes="${mesNome}" data-ano="${ano}" disabled checked>
            <span>${mesNome}</span>
            <span class="badge-pago">Pago</span>
          </label>
        `;
      } else {
        html += `
          <label class="mes-checkbox-label" id="label_${idCheckbox}">
            <input type="checkbox" id="${idCheckbox}" data-mes="${mesNome}" data-ano="${ano}" onchange="toggleLabelStyle(this); recalcularValorTotal();">
            <span>${mesNome}</span>
          </label>
        `;
      }
    });

    html += `</div></div>`;
  });

  container.innerHTML = html;
  recalcularValorTotal();
}

function toggleLabelStyle(checkbox) {
  const label = document.getElementById(`label_${checkbox.id}`);
  if (label) {
    if (checkbox.checked) {
      label.classList.add("checked");
    } else {
      label.classList.remove("checked");
    }
  }
}

function recalcularValorTotal() {
  const checkboxes = document.querySelectorAll('#containerGradeMeses input[type="checkbox"]:checked:not(:disabled)');
  const qtd = checkboxes.length;

  const valorUnitarioInput = parseFloat(document.getElementById("valorUnitario")?.value || 10.00) || 0;
  const valorTotal = qtd * valorUnitarioInput;

  const lblQtd = document.getElementById("lblQtdMesesSelecionados");
  const lblValor = document.getElementById("lblValorTotalCalculado");
  const inputValorHidden = document.getElementById("valorPagoTotalCalculado");

  if (lblQtd) lblQtd.textContent = qtd;
  if (lblValor) lblValor.textContent = valorTotal.toFixed(2).replace(".", ",");
  if (inputValorHidden) inputValorHidden.value = valorTotal;
}

// ✅ Registrar Pagamento em Lote (Multi-Mês / Multi-Ano)
async function registrarPagamento() {
  const crismandoId = parseInt(
    document.getElementById("crismandoIdSelecionado")?.value
  );
  
  const checkboxesMarcados = Array.from(
    document.querySelectorAll('#containerGradeMeses input[type="checkbox"]:checked:not(:disabled)')
  );

  const valorUnitario = parseFloat(document.getElementById("valorUnitario")?.value) || 0;

  if (!crismandoId) {
    alert("Por favor, selecione um crismando no campo de busca.");
    return;
  }

  if (checkboxesMarcados.length === 0) {
    alert("Por favor, marque pelo menos um mês a ser pago.");
    return;
  }

  if (valorUnitario <= 0) {
    alert("Por favor, informe um valor mensal válido.");
    return;
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

    // Recarregar lista paginada do Supabase
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

    alert(
      `✅ ${checkboxesMarcados.length} pagamento(s) registrado(s) com sucesso!\n💰 Total: R$ ${valorTotalGeral.toFixed(2).replace(".", ",")}`
    );

    exibirModalComprovanteTexto(resultadoComprovante.mensagemTexto, crismandoExiste);

    // Limpar seleções
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

    filtrados.forEach((c) => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.textContent = `${c.nome} (R$ ${(c.valor_mensal || 10).toFixed(2).replace(".", ",")})`;
      item.style.cssText =
        "padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #eee;";
      item.addEventListener("mouseenter", () => (item.style.background = "#f0f0f0"));
      item.addEventListener("mouseleave", () => (item.style.background = "white"));
      item.addEventListener("click", () => {
        campoBusca.value = c.nome;
        campoId.value = c.id;
        const valInput = document.getElementById("valorUnitario");
        if (valInput) valInput.value = (c.valor_mensal || 10.00).toFixed(2);
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

// Manter atualizarSelectCrismandos para não quebrar outras dependências
function atualizarSelectCrismandos() {
  const select = document.getElementById("selectCrismando");
  if (!select) return;
  select.innerHTML = "";
  if (!crismandos || crismandos.length === 0) return;
  crismandos.forEach((crismando) => {
    if (crismando && crismando.id && crismando.nome) {
      const option = document.createElement("option");
      option.value = crismando.id;
      option.textContent = `${crismando.nome} - R$ ${(crismando.valor_mensal || 0).toFixed(2).replace(".", ",")}`;
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
    const registro = {
      codigo,
      crismando_id: dadosComprovante.crismando.id,
      nome_crismando: dadosComprovante.crismando.nome,
      mes: dadosComprovante.mes,
      ano: dadosComprovante.ano,
      valor: dadosComprovante.valor,
      data_vencimento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      ativo: true,
    };
    const { data, error } = await supabase
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
