// ─────────────────────────────────────────────
// CONSTANTE DE ORDEM DOS MESES
// ─────────────────────────────────────────────
const ORDEM_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// ✅ Extrai mes e ano corretos a partir de data_pagamento
// Se data_pagamento existir, usa ela. Senão, usa mes/ano do registro.
function extrairMesAno(p) {
  if (p.data_pagamento) {
    const d = new Date(p.data_pagamento + "T12:00:00"); // evita fuso horário
    const mesNome = ORDEM_MESES[d.getMonth()];
    const ano = d.getFullYear();
    return { mes: mesNome, ano };
  }
  // fallback: usa os campos mes/ano do banco normalizando capitalização
  const mes = p.mes
    ? p.mes.charAt(0).toUpperCase() + p.mes.slice(1).toLowerCase()
    : null;
  return { mes, ano: parseInt(p.ano) };
}


function nomeMesPorNumero(mes) {
  const indice = parseInt(mes, 10) - 1;
  return ORDEM_MESES[indice] || mes;
}

// ─────────────────────────────────────────────
// TABELA PRINCIPAL
// ─────────────────────────────────────────────
function atualizarTabela() {
  const tbody = document.getElementById("corpoTabela");
  if (!tbody) return;
  tbody.innerHTML = "";

  const mesEscolhido = document.getElementById("mesPagamento")?.value || null;
  const anoEscolhido = document.getElementById("anoPagamento")?.value || null;

  let crismandosComPagamentoMes = 0;
  let crismandosSemPagamentoMes = 0;
  let valorTotalMes = 0;

  crismandos.forEach((crismando) => {
    const pagamentosCrismando = pagamentos.filter(
      (p) => p.crismando_id === crismando.id
    );

    const ultimoPagamento =
      pagamentosCrismando.length > 0
        ? pagamentosCrismando[pagamentosCrismando.length - 1]
        : null;

    const totalPago = pagamentosCrismando.reduce(
      (total, p) => total + parseFloat(p.valor || 0), 0
    );

    let status = "❌ Não Pagou";
    let valorPago = 0;
    let mesAnoTexto = "-";

    if (ultimoPagamento) {
      status = "✅ Pagou";
      valorPago = parseFloat(ultimoPagamento.valor);
      mesAnoTexto = ultimoPagamento.mes
        ? `${ultimoPagamento.mes}/${ultimoPagamento.ano || ""}`
        : "-";
    }

    let pagamentoNoMes = false;
    if (mesEscolhido && anoEscolhido) {
      const nomeMesFiltro = nomeMesPorNumero(mesEscolhido);
      const anoFiltro = parseInt(anoEscolhido);

      pagamentoNoMes = pagamentosCrismando.some(
        (p) => p.mes === nomeMesFiltro && parseInt(p.ano) === anoFiltro
      );

      if (pagamentoNoMes) {
        crismandosComPagamentoMes++;
        const pg = pagamentosCrismando.find(
          (p) => p.mes === nomeMesFiltro && parseInt(p.ano) === anoFiltro
        );
        valorTotalMes += parseFloat(pg.valor || 0);
        status = "✅ Pagou";
        valorPago = parseFloat(pg.valor);
        mesAnoTexto = `${pg.mes}/${pg.ano}`;
      } else {
        crismandosSemPagamentoMes++;
        status = "❌ Não Pagou";
        valorPago = 0;
      }
    }

    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${crismando.nome}</td>
      <td>${crismando.telefone || "-"}</td>
      <td>R$ ${(crismando.valor_mensal || 0).toFixed(2).replace(".", ",")}</td>
      <td>${status}</td>
      <td>R$ ${valorPago.toFixed(2).replace(".", ",")}</td>
      <td>${mesAnoTexto}</td>
      <td>R$ ${totalPago.toFixed(2).replace(".", ",")}</td>
    `;
  });

  const elPagaram = document.getElementById("crismandosComPagamento");
  if (elPagaram) elPagaram.textContent = crismandosComPagamentoMes;

  const elPendentes = document.getElementById("crismandosSemPagamento");
  if (elPendentes) elPendentes.textContent = crismandosSemPagamentoMes;

  const elValorMes = document.getElementById("valorTotalMes");
  if (elValorMes)
    elValorMes.textContent = `R$ ${valorTotalMes.toFixed(2).replace(".", ",")}`;
}

// ─────────────────────────────────────────────
// ESTATÍSTICAS
// ─────────────────────────────────────────────
function atualizarEstatisticas() {
  const elTotal = document.getElementById("totalCrismandos");
  if (elTotal) elTotal.textContent = crismandos.length;

  const totalArrecadado = pagamentos.reduce((acc, p) => {
    const val = parseFloat(p.valor);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const elArrecadado = document.getElementById("totalArrecadado");
  if (elArrecadado)
    elArrecadado.textContent = `R$ ${totalArrecadado.toFixed(2).replace(".", ",")}`;
}

// ─────────────────────────────────────────────
// SELECT DE CRISMANDOS (mantido para compatibilidade)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// ✅ RELATÓRIO — POPULAR SELECT DINAMICAMENTE
// ─────────────────────────────────────────────
function popularSelectRelatorio() {
  const select = document.getElementById("selectMesRelatorio");
  if (!select) return;

  const valorAtual = select.value;

  const combinacoes = new Map();
  pagamentos.forEach((p) => {
    const { mes: mesNormalizado, ano: anoNorm } = extrairMesAno(p);
    if (!mesNormalizado || !anoNorm) return;
    const numMes = String(ORDEM_MESES.indexOf(mesNormalizado) + 1).padStart(2, "0");
    const chave = `${anoNorm}-${numMes}`;
    if (!combinacoes.has(chave)) {
      combinacoes.set(chave, { mes: mesNormalizado, ano: anoNorm, chave });
    }
  });

  const opcoes = Array.from(combinacoes.values()).sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano;
    return ORDEM_MESES.indexOf(a.mes) - ORDEM_MESES.indexOf(b.mes);
  });

  select.innerHTML = '<option value="">-- Selecione o mês --</option>';
  opcoes.forEach(({ mes, ano, chave }) => {
    const option = document.createElement("option");
    option.value = chave;
    option.textContent = `${mes}/${ano}`;
    if (option.value === valorAtual) option.selected = true;
    select.appendChild(option);
  });
}

// ─────────────────────────────────────────────
// ✅ RELATÓRIO — VER RELATÓRIO MENSAL
// ─────────────────────────────────────────────
function gerarRelatorio() {
  const select = document.getElementById("selectMesRelatorio");
  const elementoRelatorio = document.getElementById("relatorioGerado");
  if (!elementoRelatorio) return;

  if (!select || !select.value) {
    elementoRelatorio.innerHTML = "<p>⚠️ Selecione um mês para gerar o relatório.</p>";
    return;
  }

  const [anoStr, mesNumStr] = select.value.split("-");
  const anoFiltro = parseInt(anoStr);
  const nomeMesFiltro = ORDEM_MESES[parseInt(mesNumStr) - 1];

  if (!crismandos || crismandos.length === 0) {
    elementoRelatorio.innerHTML = "<p>📋 Nenhum crismando cadastrado ainda.</p>";
    return;
  }

  let crismandosComPagamento = 0;
  let crismandosSemPagamento = 0;
  let valorTotalMes = 0;
  let linhasTabela = "";

  crismandos.forEach((crismando) => {
    const pg = pagamentos.find((p) => {
      if (p.crismando_id !== crismando.id) return false;
      const { mes, ano } = extrairMesAno(p);
      return mes === nomeMesFiltro && ano === anoFiltro;
    });

    let status, valorPago, dataPagamento;
    if (pg) {
      status = "✅ Pagou";
      valorPago = parseFloat(pg.valor || 0);
      dataPagamento = pg.data_pagamento || "-";
      crismandosComPagamento++;
      valorTotalMes += valorPago;
    } else {
      status = "❌ Não Pagou";
      valorPago = 0;
      dataPagamento = "-";
      crismandosSemPagamento++;
    }

    linhasTabela += `
      <tr style="${pg ? "background:#eaffea;" : ""}">
        <td>${crismando.nome}</td>
        <td>${crismando.telefone || "-"}</td>
        <td>R$ ${(crismando.valor_mensal || 0).toFixed(2).replace(".", ",")}</td>
        <td>${status}</td>
        <td>R$ ${valorPago.toFixed(2).replace(".", ",")}</td>
        <td>${dataPagamento}</td>
      </tr>`;
  });

  const taxaPagamento = crismandos.length > 0
    ? ((crismandosComPagamento / crismandos.length) * 100).toFixed(1)
    : "0.0";

  elementoRelatorio.innerHTML = `
    <div style="display:flex;gap:15px;flex-wrap:wrap;margin-bottom:15px;">
      <div class="stat-box">👥 Total: <strong>${crismandos.length}</strong></div>
      <div class="stat-box">✅ Pagaram: <strong>${crismandosComPagamento}</strong></div>
      <div class="stat-box">⏳ Pendentes: <strong>${crismandosSemPagamento}</strong></div>
      <div class="stat-box">💰 Arrecadado: <strong>R$ ${valorTotalMes.toFixed(2).replace(".", ",")}</strong></div>
      <div class="stat-box">📊 Taxa: <strong>${taxaPagamento}%</strong></div>
    </div>
    <table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead style="background:#2c3e50;color:white;">
        <tr>
          <th>Nome</th><th>Telefone</th><th>Valor Mensal</th>
          <th>Status ${nomeMesFiltro}/${anoFiltro}</th>
          <th>Valor Pago</th><th>Data Pagamento</th>
        </tr>
      </thead>
      <tbody>${linhasTabela}</tbody>
    </table>
    <p style="margin-top:10px;font-size:12px;color:#666;">
      📅 Relatório de ${nomeMesFiltro}/${anoFiltro} gerado em:
      ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}
    </p>`;
}

// ─────────────────────────────────────────────
// ✅ RELATÓRIO COMPLETO — CARDS POR ANO/MÊS
// ─────────────────────────────────────────────
function verRelatorioCompleto() {
  const elementoRelatorio = document.getElementById("relatorioGerado");
  if (!elementoRelatorio) return;

  if (!pagamentos || pagamentos.length === 0) {
    elementoRelatorio.innerHTML = "<p>Nenhum pagamento registrado ainda.</p>";
    return;
  }

  // Agrupa por ANO + MÊS
  const grupos = {};
  pagamentos.forEach((p) => {
    const { mes: mesNormalizado, ano: anoNorm } = extrairMesAno(p);
    if (!mesNormalizado || !anoNorm) return;
    const chave = `${anoNorm}-${mesNormalizado}`;
    if (!grupos[chave]) {
      grupos[chave] = { mes: mesNormalizado, ano: anoNorm, total: 0, qtd: 0 };
    }
    grupos[chave].total += parseFloat(p.valor || 0);
    grupos[chave].qtd++;
  });

  const ordenados = Object.values(grupos).sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano;
    return ORDEM_MESES.indexOf(a.mes) - ORDEM_MESES.indexOf(b.mes);
  });

  const porAno = {};
  ordenados.forEach((item) => {
    if (!porAno[item.ano]) porAno[item.ano] = [];
    porAno[item.ano].push(item);
  });

  let html = "";
  Object.keys(porAno).sort().forEach((ano) => {
    html += `<h3 style="margin:20px 0 10px;color:#2c3e50;">📅 ${ano}</h3>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;">`;
    porAno[ano].forEach(({ mes, total, qtd }) => {
      const numMes = String(ORDEM_MESES.indexOf(mes) + 1).padStart(2, "0");
      html += `
        <div onclick="selecionarMesRelatorio('${mes}', ${ano})"
             style="background:#3498db;color:white;border-radius:8px;
                    padding:12px 16px;text-align:center;min-width:130px;
                    cursor:pointer;transition:opacity 0.2s;"
             onmouseover="this.style.opacity='0.85'"
             onmouseout="this.style.opacity='1'">
          <strong>${mes}</strong><br>
          <small>${qtd} pagamentos</small><br>
          <small>R$ ${total.toFixed(2).replace(".", ",")}</small>
        </div>`;
    });
    html += `</div>`;
  });

  html += `
    <div style="margin-top:15px;">
      <button onclick="baixarExcelCompleto()" style="background:#27ae60;color:white;
              border:none;padding:10px 20px;border-radius:6px;cursor:pointer;margin-right:10px;">
        📥 Baixar Excel Completo
      </button>
      <button onclick="popularSelectRelatorio(); document.getElementById('relatorioGerado').innerHTML='';"
              style="background:#7f8c8d;color:white;border:none;
                     padding:10px 20px;border-radius:6px;cursor:pointer;">
        🔙 Voltar à Seleção
      </button>
    </div>
    <p style="margin-top:10px;font-size:12px;color:#666;">
      📅 Relatório geral gerado em:
      ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}
    </p>`;

  elementoRelatorio.innerHTML = html;
}

// ✅ Ao clicar num card, seleciona o mês/ano e gera relatório detalhado
function selecionarMesRelatorio(mes, ano) {
  const numMes = String(ORDEM_MESES.indexOf(mes) + 1).padStart(2, "0");
  const select = document.getElementById("selectMesRelatorio");
  if (select) {
    select.value = `${ano}-${numMes}`;
    gerarRelatorio();
  }
}

// ─────────────────────────────────────────────
// BAIXAR EXCEL DO MÊS SELECIONADO
// ─────────────────────────────────────────────
function baixarExcel() {
  const select = document.getElementById("selectMesRelatorio");
  if (!select || !select.value) {
    alert("Selecione um mês primeiro.");
    return;
  }

  const [anoStr, mesNumStr] = select.value.split("-");
  const anoFiltro = parseInt(anoStr);
  const nomeMesFiltro = ORDEM_MESES[parseInt(mesNumStr) - 1];

  const dados = [["Nome", "Telefone", "Valor Mensal", "Status", "Valor Pago", "Data Pagamento"]];

  crismandos.forEach((crismando) => {
    const pg = pagamentos.find(
      (p) =>
        p.crismando_id === crismando.id &&
        p.mes === nomeMesFiltro &&
        parseInt(p.ano) === anoFiltro
    );
    dados.push([
      crismando.nome,
      crismando.telefone || "",
      crismando.valor_mensal || 0,
      pg ? "Pagou" : "Não Pagou",
      pg ? parseFloat(pg.valor) : 0,
      pg ? pg.data_pagamento || "" : "",
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${nomeMesFiltro}-${anoFiltro}`);
  XLSX.writeFile(wb, `relatorio_${nomeMesFiltro}_${anoFiltro}.xlsx`);
}

// ─────────────────────────────────────────────
// BAIXAR EXCEL COMPLETO (todos os anos/meses)
// ─────────────────────────────────────────────
function baixarExcelCompleto() {
  if (!pagamentos || pagamentos.length === 0) {
    alert("Nenhum pagamento registrado.");
    return;
  }

  const dados = [["Nome", "Telefone", "Mês", "Ano", "Valor Pago", "Data Pagamento"]];

  const ordenados = [...pagamentos].sort((a, b) => {
    if (parseInt(a.ano) !== parseInt(b.ano)) return parseInt(a.ano) - parseInt(b.ano);
    return ORDEM_MESES.indexOf(a.mes) - ORDEM_MESES.indexOf(b.mes);
  });

  ordenados.forEach((p) => {
    const crismando = crismandos.find((c) => c.id === p.crismando_id);
    dados.push([
      crismando ? crismando.nome : "Desconhecido",
      crismando ? crismando.telefone || "" : "",
      p.mes || "",
      p.ano || "",
      parseFloat(p.valor || 0),
      p.data_pagamento || "",
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório Completo");
  XLSX.writeFile(wb, `relatorio_completo_crisma.xlsx`);
}

// ─────────────────────────────────────────────
// PESQUISAR CRISMANDO
// ─────────────────────────────────────────────
function pesquisarCrismandoPorNome(nome) {
  const nomeLower = nome.toLowerCase().trim();
  return crismandos
    .filter((c) => c.nome.toLowerCase().includes(nomeLower))
    .map((c) => {
      const pagamentosCrismando = pagamentos.filter(
        (p) => p.crismando_id === c.id
      );
      const mesesPagos = pagamentosCrismando.map((p) => {
        const { mes, ano } = extrairMesAno(p);  // ← normaliza aqui
        return `${mes}/${ano || ""}`;
      });
      return { crismando: c, pagamentos: pagamentosCrismando, mesesPagos };
    });
}


function pesquisarCrismandoPorNome(nome) { 
  const nomeLower = nome.toLowerCase().trim(); 
  return crismandos 
    .filter((c) => c.nome.toLowerCase().includes(nomeLower)) 
    .map((c) => { 
      const pagamentosCrismando = pagamentos.filter( 
        (p) => p.crismando_id === c.id 
      ); 
      const mesesPagos = pagamentosCrismando.map((p) => { 
        const { mes, ano } = extrairMesAno(p); 
        return `${mes}/${ano || ""}`; 
      }); 
      return { crismando: c, pagamentos: pagamentosCrismando, mesesPagos }; 
    }); 
}

function exibirResultadoPesquisa() {
  const nomePesquisa = document.getElementById("nomePesquisa")?.value?.trim();
  const container = document.getElementById("resultadoPesquisa");
  if (!container) return;

  if (!nomePesquisa || nomePesquisa.length < 2) {
    container.innerHTML = "<p>Digite o nome do crismando para pesquisar.</p>";
    return;
  }

  const resultados = pesquisarCrismandoPorNome(nomePesquisa);
  if (resultados.length === 0) {
    container.innerHTML = `<p>Nenhum crismando encontrado com o nome "${nomePesquisa}".</p>`;
    return;
  }

  let html = "";
  resultados.forEach((res) => {
    const mesesPagosStr = res.mesesPagos.length > 0
      ? res.mesesPagos.join(", ")
      : "Nenhum pagamento registrado";

    let pagamentosDetalhesHTML = "";
    res.pagamentos.forEach((p) => {
      const { mes, ano } = extrairMesAno(p);
      pagamentosDetalhesHTML += `
        <tr>
          <td>${mes}/${ano}</td>
          <td>R$ ${parseFloat(p.valor || 0).toFixed(2).replace(".", ",")}</td>
          <td>${p.data_pagamento || "-"}</td>
        </tr>`;
    });

    html += ` 
      <div style="border:1px solid #ddd;padding:10px;margin:10px 0;border-radius:8px;background:#f9f9f9;">
        <h4 style="margin-top:0;color:#2c3e50;">👤 ${res.crismando.nome}</h4>
        <p><strong>📞 Telefone:</strong> ${res.crismando.telefone || "-"}</p>
        <p><strong>💰 Valor Mensal:</strong> R$ ${(res.crismando.valor_mensal || 0).toFixed(2).replace(".", ",")}</p>
        <p><strong>✅ Meses Pagos:</strong> ${mesesPagosStr}</p>
        ${res.pagamentos.length > 0 ? `
          <table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;margin-top:10px;font-size:12px;">
            <thead style="background:#34495e;color:white;">
              <tr>
                <th>Mês/Ano</th>
                <th>Valor</th>
                <th>Data Pagamento</th>
              </tr>
            </thead>
            <tbody>
              ${pagamentosDetalhesHTML}
            </tbody>
          </table>
        ` : ""}
      </div>`;
  });

  container.innerHTML = html;
}


// ─────────────────────────────────────────────
// VALIDAÇÃO DE TELEFONES
// ─────────────────────────────────────────────
function validarTelefones() {
  const container = document.getElementById("resultadoValidacao");
  if (!container) return;

  if (!crismandos || crismandos.length === 0) {
    container.innerHTML = "<p>Nenhum crismando cadastrado.</p>";
    return;
  }

  let html = `<table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead style="background:#2c3e50;color:white;">
      <tr><th>Nome</th><th>Telefone</th><th>Status</th></tr>
    </thead><tbody>`;

  crismandos.forEach((c) => {
    const tel = (c.telefone || "").replace(/\D/g, "");
    const valido = tel.length >= 10 && tel.length <= 11;
    html += `
      <tr style="${valido ? "" : "background:#fff0f0;"}">
        <td>${c.nome}</td>
        <td>${c.telefone || "-"}</td>
        <td>${valido ? "✅ OK" : "⚠️ Verificar"}</td>
      </tr>`;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

// ─────────────────────────────────────────────
// COMPROVANTES VÁLIDOS
// ─────────────────────────────────────────────
async function exibirComprovantesValidos() {
  const container = document.getElementById("listaComprovantes");
  if (!container) return;

  try {
    if (!codigosAutenticacao || codigosAutenticacao.length === 0) {
      container.innerHTML = "<p>Nenhum comprovante válido encontrado.</p>";
      return;
    }

    let html = `<p>Total: <strong>${codigosAutenticacao.length}</strong> comprovante(s)</p>`;
    html += `<table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead style="background:#2c3e50;color:white;">
        <tr><th>Código</th><th>Nome</th><th>Mês/Ano</th><th>Valor</th><th>Validade</th></tr>
      </thead><tbody>`;

    codigosAutenticacao.forEach((c) => {
      html += `
        <tr>
          <td><code>${c.codigo}</code></td>
          <td>${c.nome_crismando || "-"}</td>
          <td>${c.mes || "-"}/${c.ano || "-"}</td>
          <td>R$ ${parseFloat(c.valor || 0).toFixed(2).replace(".", ",")}</td>
          <td>${c.data_vencimento ? new Date(c.data_vencimento).toLocaleDateString("pt-BR") : "-"}</td>
        </tr>`;
    });

    html += "</tbody></table>";
    html += `<p style="margin-top:10px;font-size:12px;color:#666;">
      💡 Estes códigos podem ser usados para validar comprovantes de pagamento.</p>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p>Ocorreu um erro ao buscar os comprovantes: <strong>${error.message}</strong></p>`;
  }
}
