// js/financeiro.js - Módulo de Gestão Financeira (Despesas e Entradas Extras)

let despesas = [];
let entradasExtras = [];

async function carregarDadosFinanceiros() {
  try {
    console.log("🔄 Carregando dados financeiros...");
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) return;

    // Carregar despesas
    const { data: dataDespesas, error: errDespesas } = await supabase
      .from("despesas")
      .select("*")
      .order("data_despesa", { ascending: false });

    if (!errDespesas) {
      despesas = dataDespesas || [];
    } else {
      console.warn("Tabela despesas ainda não criada ou vazia no Supabase:", errDespesas);
      despesas = despesas || [];
    }

    // Carregar entradas extras
    const { data: dataEntradas, error: errEntradas } = await supabase
      .from("entradas_extras")
      .select("*")
      .order("data_entrada", { ascending: false });

    if (!errEntradas) {
      entradasExtras = dataEntradas || [];
    } else {
      console.warn("Tabela entradas_extras ainda não criada ou vazia no Supabase:", errEntradas);
      entradasExtras = entradasExtras || [];
    }

    atualizarTabelasFinanceiras();
    atualizarEstatisticasFinanceiras();

  } catch (error) {
    console.error("Erro ao carregar dados financeiros:", error);
  }
}

async function adicionarDespesa() {
  const descricao = document.getElementById("novaDespesaDescricao")?.value?.trim();
  const categoria = document.getElementById("novaDespesaCategoria")?.value;
  const valor = parseFloat(document.getElementById("novaDespesaValor")?.value) || 0;
  const dataDespesa = document.getElementById("novaDespesaData")?.value || new Date().toISOString().split("T")[0];

  if (!descricao || !categoria || valor <= 0) {
    alert("Por favor, preencha a descrição, categoria e um valor válido para a despesa.");
    return;
  }

  try {
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const novaDespesaObj = {
      descricao,
      categoria,
      valor,
      data_despesa: dataDespesa
    };

    const { data, error } = await supabase
      .from("despesas")
      .insert([novaDespesaObj])
      .select();

    if (error) throw error;

    if (data && data.length > 0) {
      despesas.unshift(data[0]);
    } else {
      despesas.unshift(novaDespesaObj);
    }

    atualizarTabelasFinanceiras();
    atualizarEstatisticasFinanceiras();

    // Limpar campos
    document.getElementById("novaDespesaDescricao").value = "";
    document.getElementById("novaDespesaValor").value = "";
    alert("✅ Despesa registrada com sucesso!");

  } catch (error) {
    console.error("Erro ao adicionar despesa:", error);
    alert(`❌ Erro ao adicionar despesa: ${error.message || error}`);
  }
}

async function removerDespesa(id) {
  if (!confirm("Deseja realmente remover esta despesa?")) return;

  try {
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const { error } = await supabase.from("despesas").delete().eq("id", id);
    if (error) throw error;

    despesas = despesas.filter(d => d.id != id);
    atualizarTabelasFinanceiras();
    atualizarEstatisticasFinanceiras();
    alert("✅ Despesa removida com sucesso!");

  } catch (error) {
    console.error("Erro ao remover despesa:", error);
    alert(`❌ Erro ao remover despesa: ${error.message || error}`);
  }
}

async function adicionarEntradaExtra() {
  const descricao = document.getElementById("novaEntradaDescricao")?.value?.trim();
  const origem = document.getElementById("novaEntradaOrigem")?.value;
  const valor = parseFloat(document.getElementById("novaEntradaValor")?.value) || 0;
  const dataEntrada = document.getElementById("novaEntradaData")?.value || new Date().toISOString().split("T")[0];

  if (!descricao || !origem || valor <= 0) {
    alert("Por favor, preencha a descrição, origem/tipo e um valor válido.");
    return;
  }

  try {
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const novaEntradaObj = {
      descricao,
      origem,
      valor,
      data_entrada: dataEntrada
    };

    const { data, error } = await supabase
      .from("entradas_extras")
      .insert([novaEntradaObj])
      .select();

    if (error) throw error;

    if (data && data.length > 0) {
      entradasExtras.unshift(data[0]);
    } else {
      entradasExtras.unshift(novaEntradaObj);
    }

    atualizarTabelasFinanceiras();
    atualizarEstatisticasFinanceiras();

    // Limpar campos
    document.getElementById("novaEntradaDescricao").value = "";
    document.getElementById("novaEntradaValor").value = "";
    alert("✅ Entrada extra/taxa registrada com sucesso!");

  } catch (error) {
    console.error("Erro ao adicionar entrada extra:", error);
    alert(`❌ Erro ao adicionar entrada extra: ${error.message || error}`);
  }
}

async function removerEntradaExtra(id) {
  if (!confirm("Deseja realmente remover esta receita extra?")) return;

  try {
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    const { error } = await supabase.from("entradas_extras").delete().eq("id", id);
    if (error) throw error;

    entradasExtras = entradasExtras.filter(e => e.id != id);
    atualizarTabelasFinanceiras();
    atualizarEstatisticasFinanceiras();
    alert("✅ Entrada extra removida com sucesso!");

  } catch (error) {
    console.error("Erro ao remover entrada extra:", error);
    alert(`❌ Erro ao remover entrada extra: ${error.message || error}`);
  }
}

function atualizarTabelasFinanceiras() {
  // Tabela de Despesas
  const tbodyDespesas = document.getElementById("corpoTabelaDespesas");
  if (tbodyDespesas) {
    tbodyDespesas.innerHTML = "";
    if (despesas.length === 0) {
      tbodyDespesas.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888;">Nenhuma despesa lançada ainda.</td></tr>`;
    } else {
      despesas.forEach(d => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${d.descricao}</td>
          <td><span style="background:#e9ecef; padding:2px 8px; border-radius:4px; font-size:12px;">${d.categoria}</span></td>
          <td style="color:#c0392b; font-weight:bold;">R$ ${parseFloat(d.valor || 0).toFixed(2).replace(".", ",")}</td>
          <td>${d.data_despesa || "-"}</td>
          <td><button class="btn btn-warning" style="padding:4px 8px; font-size:12px;" onclick="removerDespesa(${d.id})">🗑️ Excluir</button></td>
        `;
        tbodyDespesas.appendChild(tr);
      });
    }
  }

  // Tabela de Entradas Extras
  const tbodyEntradas = document.getElementById("corpoTabelaEntradasExtras");
  if (tbodyEntradas) {
    tbodyEntradas.innerHTML = "";
    if (entradasExtras.length === 0) {
      tbodyEntradas.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888;">Nenhuma entrada extra/taxa lançada ainda.</td></tr>`;
    } else {
      entradasExtras.forEach(e => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${e.descricao}</td>
          <td><span style="background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:4px; font-size:12px;">${e.origem}</span></td>
          <td style="color:#27ae60; font-weight:bold;">R$ ${parseFloat(e.valor || 0).toFixed(2).replace(".", ",")}</td>
          <td>${e.data_entrada || "-"}</td>
          <td><button class="btn btn-warning" style="padding:4px 8px; font-size:12px;" onclick="removerEntradaExtra(${e.id})">🗑️ Excluir</button></td>
        `;
        tbodyEntradas.appendChild(tr);
      });
    }
  }
}

function atualizarEstatisticasFinanceiras() {
  const totalMensalidades = (pagamentos || []).reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
  const totalEntradasExtras = (entradasExtras || []).reduce((acc, e) => acc + (parseFloat(e.valor) || 0), 0);
  const totalDespesas = (despesas || []).reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);

  const saldoCaixa = (totalMensalidades + totalEntradasExtras) - totalDespesas;

  // Atualizar cards do Dashboard
  const elArrecadado = document.getElementById("totalArrecadado");
  if (elArrecadado) elArrecadado.textContent = `R$ ${totalMensalidades.toFixed(2).replace(".", ",")}`;

  const elEntradasExtras = document.getElementById("totalEntradasExtras");
  if (elEntradasExtras) elEntradasExtras.textContent = `R$ ${totalEntradasExtras.toFixed(2).replace(".", ",")}`;

  const elDespesas = document.getElementById("totalDespesasGerais");
  if (elDespesas) elDespesas.textContent = `R$ ${totalDespesas.toFixed(2).replace(".", ",")}`;

  const elSaldoCaixa = document.getElementById("saldoCaixaGeral");
  if (elSaldoCaixa) {
    elSaldoCaixa.textContent = `R$ ${saldoCaixa.toFixed(2).replace(".", ",")}`;
    if (saldoCaixa < 0) {
      elSaldoCaixa.style.color = "#ffdddd";
    } else {
      elSaldoCaixa.style.color = "#ffffff";
    }
  }
}
