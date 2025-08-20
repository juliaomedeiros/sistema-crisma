// Dados globais
let crismandos = [];
let pagamentos = [];
let logoBase64 = "";
let codigosAutenticacao = [];

// Versículos bíblicos sobre fé
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
// Carregar dados do Supabase
async function carregarDados() {
  try {
    console.log("🔄 Carregando dados do Supabase...");

    // Carregar crismandos
    const { data: crismandosData, error: crismandosError } = await supabase
      .from("crismandos")
      .select("*")
      .order("nome");

    if (crismandosError) {
      console.error("Erro ao carregar crismandos:", crismandosError);
      throw crismandosError;
    }

    crismandos = crismandosData || [];
    console.log(`✅ ${crismandos.length} crismandos carregados`);

    // Carregar pagamentos
    const { data: pagamentosData, error: pagamentosError } = await supabase
      .from("pagamentos")
      .select("*")
      .order("created_at", { ascending: false });

    if (pagamentosError) {
      console.error("Erro ao carregar pagamentos:", pagamentosError);
      throw pagamentosError;
    }

    pagamentos = pagamentosData || [];
    console.log(`✅ ${pagamentos.length} pagamentos carregados`);

    // Carregar códigos de autenticação
    const { data: codigosData, error: codigosError } = await supabase
      .from("codigos_autenticacao")
      .select("*")
      .order("data_geracao", { ascending: false });

    if (codigosError) {
      console.warn("Aviso ao carregar códigos:", codigosError);
    } else {
      codigosAutenticacao = codigosData || [];
      console.log(`✅ ${codigosAutenticacao.length} códigos carregados`);
    }

    // Carregar logo do localStorage
    const logoSalvo = localStorage.getItem("logoBase64");
    if (logoSalvo) {
      logoBase64 = logoSalvo;
      const preview = document.getElementById("logoPreview");
      if (preview) {
        preview.src = logoBase64;
        preview.style.display = "block";
        const logoText = document.getElementById("logoText");
        if (logoText) {
          logoText.style.display = "none";
        }
      }
    }

    console.log("✅ Todos os dados carregados com sucesso!");
  } catch (error) {
    console.error("❌ Erro crítico ao carregar dados:", error);
    alert(
      `❌ Erro ao carregar dados do servidor: ${error.message}\n\nVerifique sua conexão e recarregue a página.`
    );

    // Inicializar arrays vazios para evitar erros
    crismandos = crismandos || [];
    pagamentos = pagamentos || [];
    codigosAutenticacao = codigosAutenticacao || [];
  }
}

// Adicionar novo crismando
async function adicionarCrismando() {
  const nome = document.getElementById("novoNome").value.trim();
  const telefone = document.getElementById("novoTelefone").value.trim();
  const valor = parseFloat(document.getElementById("novoValor").value) || 0;

  if (!nome) {
    alert("Por favor, informe o nome do crismando.");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("crismandos")
      .insert([
        {
          nome: nome,
          telefone: telefone,
          valor_mensal: valor,
        },
      ])
      .select();

    if (error) throw error;

    // Atualizar array local
    crismandos.push(data[0]);

    atualizarTabela();
    atualizarSelectCrismandos();
    atualizarEstatisticas();

    // Limpar formulário
    document.getElementById("novoNome").value = "";
    document.getElementById("novoTelefone").value = "";
    document.getElementById("novoValor").value = "";

    alert("Crismando adicionado com sucesso!");
  } catch (error) {
    console.error("Erro ao adicionar crismando:", error);
    alert("Erro ao adicionar crismando. Tente novamente.");
  }
}

async function registrarPagamento() {
  const crismandoId = parseInt(
    document.getElementById("selectCrismando").value
  );
  const mesNumero = document.getElementById("mesPagamento").value; // '01' a '12'
  const ano = document.getElementById("anoPagamento").value; // '2025', etc
  const valor = parseFloat(document.getElementById("valorPago").value) || 0;

  if (!crismandoId || !mesNumero || !ano || valor <= 0) {
    alert("Por favor, preencha todos os campos corretamente.");
    return;
  }

  // Converter número do mês para nome do mês (ex: '01' -> 'Janeiro')
  const nomeMes = nomeMesPorNumero(mesNumero);

  try {
    // Verificar se crismando existe
    const { data: crismandoExiste, error: errorVerificacao } = await supabase
      .from("crismandos")
      .select("id, nome, telefone")
      .eq("id", crismandoId)
      .single();

    if (errorVerificacao || !crismandoExiste) {
      alert("❌ Erro: Crismando não encontrado no banco de dados.");
      await carregarDados();
      atualizarSelectCrismandos();
      return;
    }

    // Verificar se pagamento para o nome do mês e para o crismando já existe
    const { data: pagamentoExistente, error: errorPagamento } = await supabase
      .from("pagamentos")
      .select("id")
      .eq("crismando_id", crismandoId)
      .eq("mes", nomeMes)
      .eq("ano", parseInt(ano))

    if (errorPagamento && errorPagamento.code !== "PGRST116") {
      throw errorPagamento;
    }

    if (pagamentoExistente && pagamentoExistente.length > 0) {
      alert(
        `❌ Já existe um pagamento registrado para ${crismandoExiste.nome} no mês ${nomeMes} de ${ano}.`
      );
      return;
    }

    // Criar objeto de pagamento usando nome do mês para o campo 'mes' e data atual para 'data_pagamento'
    const dadosPagamento = {
      crismando_id: crismandoId,
      mes: nomeMes,
      ano: parseInt(ano),     // ex: 2025
      valor: valor,
      data_pagamento: new Date().toISOString().split("T")[0],
    };

    const { data, error } = await supabase
      .from("pagamentos")
      .insert([dadosPagamento])
      .select();

    if (error) throw error;

    pagamentos.push(data);
    atualizarTabela();
    atualizarEstatisticas();

    // Gerar comprovante
    const dadosComprovante = gerarComprovanteAutomatico(
      crismandoId,
      nomeMes,
      valor
    );
    criarTemplateComprovante(dadosComprovante).then((imgData) => {
      window.dadosComprovanteAtual = dadosComprovante;
      window.imagemComprovanteAtual = imgData;
      const enviarAgora = confirm(
        `✅ Pagamento registrado com sucesso!\n🧾 Comprovante gerado!\n\n📱 Deseja enviar automaticamente para:\n${crismandoExiste.nome} - ${crismandoExiste.telefone}?`
      );
      if (enviarAgora) {
        enviarComprovanteAutomatico();
      } else {
        alert(
          '✅ Pagamento salvo!\n\n👉 Use o botão "Enviar WhatsApp" quando quiser enviar o comprovante.'
        );
      }
    });

    // Limpar campos
    document.getElementById("selectCrismando").value = "";
    document.getElementById("mesPagamento").value = "";
    document.getElementById("anoPagamento").value = "";
    document.getElementById("valorPago").value = "";
  } catch (error) {
    console.error("Erro ao registrar pagamento:", error);
    alert(`❌ Erro ao registrar pagamento: ${error.message || error}`);
  }
}

// Carregar Excel - VERSÃO CORRIGIDA FINAL
function loadExcel() {
  const fileInput = document.getElementById("excelFile");
  const file = fileInput.files[0];

  if (!file) {
    alert("Por favor, selecione um arquivo Excel.");
    return;
  }

  // Verificar extensão do arquivo
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
    alert(
      "Formato de arquivo inválido. Por favor, selecione um arquivo .xlsx ou .xls"
    );
    return;
  }

  // Verificar se XLSX está carregado
  if (typeof XLSX === "undefined") {
    alert(
      "Erro: Biblioteca XLSX não carregada. Recarregue a página e tente novamente."
    );
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      console.log("Iniciando leitura do arquivo...");

      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {
        type: "array",
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      console.log(
        "Arquivo lido com sucesso. Planilhas encontradas:",
        workbook.SheetNames
      );

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
        raw: false,
        defval: "",
      });

      console.log("Dados do Excel:", jsonData);

      if (jsonData.length === 0) {
        alert("O arquivo Excel está vazio ou não contém dados válidos.");
        return;
      }

      let crismandosAdicionados = 0;
      let pagamentosAdicionados = 0;

      // Processar cada linha do Excel
      jsonData.forEach((row, index) => {
        // Tentar diferentes variações de nomes de colunas
        const nome =
          row.Nome ||
          row.nome ||
          row.NOME ||
          row["Nome Completo"] ||
          row["nome completo"] ||
          "";

        const telefone =
          row.Telefone ||
          row.telefone ||
          row.TELEFONE ||
          row.Celular ||
          row.celular ||
          row.CELULAR ||
          row.Fone ||
          row.fone ||
          row.FONE ||
          "";

        const valor = parseFloat(
          row.Valor ||
            row.valor ||
            row.VALOR ||
            row["Valor Mensal"] ||
            row["valor mensal"] ||
            row.Mensalidade ||
            row.mensalidade ||
            0
        );

        const mes =
          row.Mes || row.mes || row.MES || row.Mês || row.mês || row.MÊS || "";

        console.log(`Linha ${index + 1}:`, { nome, telefone, valor, mes });

        if (nome && nome.trim()) {
          // Verificar se já existe
          const existe = crismandos.find(
            (c) => c.nome.toLowerCase().trim() === nome.toLowerCase().trim()
          );

          if (!existe) {
            const crismando = {
              id: Date.now() + Math.random() + index,
              nome: nome.trim(),
              telefone: telefone ? telefone.toString().trim() : "",
              valor_mensal: valor || 0,
            };

            crismandos.push(crismando);
            crismandosAdicionados++;
            console.log("Crismando adicionado:", crismando);

            // Adicionar pagamento se existir mês e valor
            if (mes && mes.trim() && valor > 0) {
              const pagamento = {
                id: Date.now() + Math.random() + index + 1000,
                crismandoId: crismando.id,
                mes: mes.trim(),
                valor: valor,
                data: new Date().toISOString().split("T")[0],
              };

              pagamentos.push(pagamento);
              pagamentosAdicionados++;
              console.log("Pagamento adicionado:", pagamento);
            }
          }
        }
      });

      // CORREÇÃO: Chamar salvarDados() diretamente (função já existe)
      //salvarDados();
      atualizarTabela();
      atualizarSelectCrismandos();
      atualizarEstatisticas();

      alert(
        `✅ Dados carregados com sucesso!\n📊 Crismandos adicionados: ${crismandosAdicionados}\n💰 Pagamentos adicionados: ${pagamentosAdicionados}`
      );

      // Limpar input
      document.getElementById("excelFile").value = "";
    } catch (error) {
      console.error("Erro detalhado:", error);

      if (error.message.includes("XLSX")) {
        alert(
          "Erro: Biblioteca XLSX não foi carregada corretamente. Recarregue a página e tente novamente."
        );
      } else if (error.message.includes("Unsupported file")) {
        alert(
          "Erro: Arquivo não suportado. Certifique-se de que é um arquivo Excel válido (.xlsx ou .xls)."
        );
      } else {
        alert(
          `Erro ao processar arquivo: ${error.message}\n\nVerifique se o arquivo não está corrompido e tente novamente.`
        );
      }
    }
  };

  reader.onerror = function (error) {
    console.error("Erro na leitura do arquivo:", error);
    alert("Erro ao ler o arquivo. Verifique se o arquivo não está corrompido.");
  };

  reader.readAsArrayBuffer(file);
}

// Função para processar os dados do Excel
function processarDadosExcel(jsonData) {
  console.log("Processando dados do Excel...");

  // Assumir que a primeira linha contém os cabeçalhos
  const headers = jsonData[0];
  const rows = jsonData.slice(1);

  console.log("Cabeçalhos encontrados:", headers);

  let crismandosAdicionados = 0;
  let pagamentosAdicionados = 0;

  rows.forEach((row, index) => {
    if (!row || row.length === 0) return; // Pular linhas vazias

    // Mapear colunas (ajuste conforme sua planilha)
    const nome = extrairValor(row, headers, [
      "nome",
      "Nome",
      "NOME",
      "Nome Completo",
    ]);
    const telefone = extrairValor(row, headers, [
      "telefone",
      "Telefone",
      "TELEFONE",
      "celular",
      "Celular",
    ]);
    const valor = extrairValorNumerico(row, headers, [
      "valor",
      "Valor",
      "VALOR",
      "Valor Mensal",
      "mensalidade",
    ]);
    const mes = extrairValor(row, headers, ["mes", "Mes", "MES", "Mês", "mês"]);

    console.log(`Linha ${index + 2}:`, { nome, telefone, valor, mes });

    if (nome && nome.trim()) {
      // Verificar se já existe
      const existe = crismandos.find(
        (c) => c.nome.toLowerCase().trim() === nome.toLowerCase().trim()
      );

      if (!existe) {
        const crismando = {
          id: Date.now() + Math.random() + index,
          nome: nome.trim(),
          telefone: telefone ? telefone.toString().trim() : "",
          valor_mensal: valor || 0,
        };

        crismandos.push(crismando);
        crismandosAdicionados++;

        // Adicionar pagamento se existir mês e valor
        if (mes && mes.trim() && valor > 0) {
          const pagamento = {
            id: Date.now() + Math.random() + index + 1000,
            crismandoId: crismando.id,
            mes: mes.trim(),
            valor: valor,
            data: new Date().toISOString().split("T")[0],
          };

          pagamentos.push(pagamento);
          pagamentosAdicionados++;
        }
      }
    }
  });

  // Salvar e atualizar interface
  salvarDados();
  atualizarTabela();
  atualizarSelectCrismandos();
  atualizarEstatisticas();

  alert(
    `✅ Dados importados com sucesso!\n\n📊 Crismandos adicionados: ${crismandosAdicionados}\n💰 Pagamentos adicionados: ${pagamentosAdicionados}`
  );

  // Limpar input
  document.getElementById("excelFile").value = "";
}

// Função auxiliar para extrair valores das colunas
function extrairValor(row, headers, possiveisNomes) {
  for (const nome of possiveisNomes) {
    const index = headers.findIndex(
      (h) => h && h.toString().toLowerCase().trim() === nome.toLowerCase()
    );
    if (index !== -1 && row[index] !== undefined && row[index] !== null) {
      return row[index].toString().trim();
    }
  }
  return "";
}

// Função auxiliar para extrair valores numéricos
function extrairValorNumerico(row, headers, possiveisNomes) {
  const valor = extrairValor(row, headers, possiveisNomes);
  if (!valor) return 0;

  // Remover caracteres não numéricos exceto vírgula e ponto
  const numeroLimpo = valor.replace(/[^\d,.-]/g, "").replace(",", ".");
  const numero = parseFloat(numeroLimpo);

  return isNaN(numero) ? 0 : numero;
}

// Remover crismando
async function removerCrismando(id) {
  if (!confirm("Tem certeza que deseja remover este crismando?")) {
    return;
  }

  try {
    const { error } = await supabase.from("crismandos").delete().eq("id", id);

    if (error) throw error;

    // Atualizar arrays locais
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

// Função para gerar código único
function gerarCodigoUnico() {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "";
  do {
    codigo = "";
    for (let i = 0; i < 8; i++) {
      codigo += caracteres.charAt(
        Math.floor(Math.random() * caracteres.length)
      );
    }
  } while (codigosAutenticacao.some((c) => c.codigo === codigo));
  return codigo;
}

// Registrar código de autenticação
async function registrarCodigoAutenticacao(dadosComprovante, codigo) {
  try {
    const registro = {
      codigo: codigo,
      crismando_id: dadosComprovante.crismando.id,
      nome_crismando: dadosComprovante.crismando.nome,
      mes: dadosComprovante.mes,
      valor: dadosComprovante.valor,
      data_vencimento: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
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

// Carregar códigos salvos
function carregarCodigosAutenticacao() {
  const codigosSalvos = localStorage.getItem("codigosAutenticacao");
  if (codigosSalvos) {
    codigosAutenticacao = JSON.parse(codigosSalvos);
  }
}

// Função para testar se XLSX está carregado
function testarBibliotecaXLSX() {
  if (typeof XLSX !== "undefined") {
    console.log("✅ Biblioteca XLSX carregada com sucesso!");
    alert("✅ Biblioteca XLSX está funcionando corretamente!");
    return true;
  } else {
    console.error("❌ Biblioteca XLSX não encontrada!");
    alert("❌ Erro: Biblioteca XLSX não foi carregada. Recarregue a página.");
    return false;
  }
}

// Melhorar a associação de pagamentos
pagamentosParaSalvar.forEach((item) => {
  const crismandoEncontrado = crismandosSalvos.find(
    (c) =>
      c.nome.toLowerCase().trim() === item.nomeCrismando.toLowerCase().trim()
  );
  if (crismandoEncontrado) {
    pagamentosComId.push({
      crismando_id: crismandoEncontrado.id,
      mes: item.pagamento.mes,
      valor: item.pagamento.valor,
    });
  }
});

// Função para sincronizar dados
async function sincronizarDados() {
  console.log("🔄 Sincronizando dados...");

  try {
    await carregarDados();
    atualizarTabela();
    atualizarSelectCrismandos();
    atualizarEstatisticas();

    console.log("✅ Dados sincronizados com sucesso!");
    return true;
  } catch (error) {
    console.error("❌ Erro na sincronização:", error);
    return false;
  }
}
