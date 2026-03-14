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

// ✅ ALTERAÇÃO 3: Registrar pagamento agora usa campo hidden crismandoIdSelecionado
async function registrarPagamento() {
  const crismandoId = parseInt(
    document.getElementById("crismandoIdSelecionado")?.value
  );
  const mesNumero = document.getElementById("mesPagamento").value;
  const ano = document.getElementById("anoPagamento").value;
  const valor = parseFloat(document.getElementById("valorPago").value) || 0;

  if (!crismandoId || !mesNumero || !ano || valor <= 0) {
    alert("Por favor, preencha todos os campos corretamente.");
    return;
  }

  const nomeMes = nomeMesPorNumero(mesNumero);

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

    const { data: pagamentoExistente, error: errorPagamento } = await supabase
      .from("pagamentos")
      .select("id")
      .eq("crismando_id", crismandoId)
      .eq("mes", nomeMes)
      .eq("ano", parseInt(ano));

    if (errorPagamento && errorPagamento.code !== "PGRST116") throw errorPagamento;

    if (pagamentoExistente && pagamentoExistente.length > 0) {
      alert(`❌ Já existe um pagamento registrado para ${crismandoExiste.nome} no mês ${nomeMes} de ${ano}.`);
      return;
    }

    const dadosPagamento = {
      crismando_id: crismandoId,
      mes: nomeMes,
      ano: parseInt(ano),
      valor: valor,
      data_pagamento: new Date().toISOString().split("T")[0],
    };

    const { data, error } = await supabase
      .from("pagamentos")
      .insert([dadosPagamento])
      .select();
    if (error) throw error;

    // ✅ Recarrega todos os pagamentos sem limite
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

    const dadosComprovante = gerarComprovanteAutomatico(crismandoId, nomeMes, valor, parseInt(ano));
    criarTemplateComprovante(dadosComprovante).then((imgData) => {
      window.dadosComprovanteAtual = dadosComprovante;
      window.imagemComprovanteAtual = imgData;
      const enviarAgora = confirm(
        `✅ Pagamento registrado com sucesso!\n🧾 Comprovante gerado!\n\n📱 Deseja enviar automaticamente para:\n${crismandoExiste.nome} - ${crismandoExiste.telefone}?`
      );
      if (enviarAgora) {
        enviarComprovanteAutomatico();
      } else {
        alert('✅ Pagamento salvo!\n\n👉 Use o botão "Enviar WhatsApp" quando quiser enviar o comprovante.');
      }
    });

    // Limpar campos
    document.getElementById("campoBuscaCrismando").value = "";
    document.getElementById("crismandoIdSelecionado").value = "";
    document.getElementById("mesPagamento").value = "";
    document.getElementById("anoPagamento").value = "";
    document.getElementById("valorPago").value = "";
    document.getElementById("listaAutocompleteCrismando").innerHTML = "";
    document.getElementById("listaAutocompleteCrismando").style.display = "none";

  } catch (error) {
    console.error("Erro ao registrar pagamento:", error);
    alert(`❌ Erro ao registrar pagamento: ${error.message || error}`);
  }
}

// ✅ ALTERAÇÃO 3: Nova função de autocomplete para buscar crismando
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
      return;
    }

    const filtrados = crismandos.filter((c) =>
      c.nome.toLowerCase().includes(termo)
    );

    if (filtrados.length === 0) {
      lista.style.display = "none";
      return;
    }

    filtrados.forEach((c) => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.textContent = c.nome;
      item.style.cssText =
        "padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;";
      item.addEventListener("mouseenter", () => (item.style.background = "#f0f0f0"));
      item.addEventListener("mouseleave", () => (item.style.background = "white"));
      item.addEventListener("click", () => {
        campoBusca.value = c.nome;
        campoId.value = c.id;
        lista.innerHTML = "";
        lista.style.display = "none";
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
