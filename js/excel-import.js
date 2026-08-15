// js/excel-import.js - Módulo de Importação de Planilha Excel (.xlsx)

let listaNovosCrismandosParaImportar = [];

function inicializarMóduloExcel() {
  const inputFile = document.getElementById("arquivoExcelCrismandos");
  if (inputFile) {
    inputFile.addEventListener("change", processarArquivoExcel);
  }
}

async function processarArquivoExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log(`📁 Processando arquivo Excel: ${file.name}`);

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });

    // Pegar primeira planilha do arquivo
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Converter para JSON de linhas
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!rows || rows.length < 2) {
      alert("⚠️ A planilha parece estar vazia ou sem cabeçalho na primeira linha.");
      return;
    }

    // Mapear cabeçalho (primeira linha)
    const header = rows[0].map(cell => String(cell || "").trim().toLowerCase());
    
    let idxNome = header.findIndex(h => h.includes("nome") || h.includes("crismando") || h.includes("aluno"));
    let idxTelefone = header.findIndex(h => h.includes("telef") || h.includes("celular") || h.includes("whats") || h.includes("contato"));
    let idxValor = header.findIndex(h => h.includes("valor") || h.includes("mensal") || h.includes("taxa"));

    if (idxNome === -1) {
      alert("❌ Não foi possível encontrar a coluna de 'Nome' na planilha.\n\nCertifique-se de que a primeira linha contém o título 'Nome'.");
      return;
    }

    const novosCandidatos = [];
    const nomesExistentes = new Set(crismandos.map(c => c.nome.trim().toLowerCase()));
    const telsExistentes = new Set(crismandos.map(c => c.telefone ? c.telefone.replace(/\D/g, "") : ""));

    let ignoradosPorDuplicidade = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const nomeRaw = row[idxNome] ? String(row[idxNome]).trim() : "";
      if (!nomeRaw) continue;

      const telRaw = idxTelefone !== -1 && row[idxTelefone] ? String(row[idxTelefone]).trim() : "";
      const valorRaw = idxValor !== -1 && row[idxValor] ? parseFloat(String(row[idxValor]).replace(",", ".")) : 10.00;
      const valorFinal = !isNaN(valorRaw) && valorRaw > 0 ? valorRaw : 10.00;

      const nomeNorm = nomeRaw.toLowerCase();
      const telNumOnly = telRaw.replace(/\D/g, "");

      // Checar duplicidade local
      if (nomesExistentes.has(nomeNorm) || (telNumOnly && telsExistentes.has(telNumOnly))) {
        ignoradosPorDuplicidade++;
        continue;
      }

      novosCandidatos.push({
        nome: nomeRaw,
        telefone: telRaw,
        valor_mensal: valorFinal
      });
    }

    if (novosCandidatos.length === 0) {
      alert(`⚠️ Nenhum novo crismando para importar.\n\n${ignoradosPorDuplicidade} crismando(s) já estavam previamente cadastrados.`);
      return;
    }

    listaNovosCrismandosParaImportar = novosCandidatos;
    exibirModalPreviaImportacao(novosCandidatos, ignoradosPorDuplicidade);

  } catch (error) {
    console.error("Erro ao ler arquivo Excel:", error);
    alert(`❌ Erro ao ler planilha Excel: ${error.message || error}`);
  } finally {
    // Resetar input
    event.target.value = "";
  }
}

function exibirModalPreviaImportacao(novos, duplicadosCount) {
  let htmlLinhas = "";
  novos.forEach((c, idx) => {
    htmlLinhas += `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${c.nome}</strong></td>
        <td>${c.telefone || '<span style="color:#888;">(Sem fone)</span>'}</td>
        <td style="color:#27ae60; font-weight:bold;">R$ ${c.valor_mensal.toFixed(2).replace('.', ',')}</td>
      </tr>
    `;
  });

  const modal = document.createElement("div");
  modal.id = "modalPreviaExcel";
  modal.className = "modal";
  modal.style.display = "block";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 650px;">
      <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
      <h3 style="color: #27ae60; text-align: center; margin-bottom: 10px;">📊 Prévia da Importação Excel</h3>
      <p style="font-size: 13px; color: #555; text-align: center; margin-bottom: 15px;">
        Encontrados <strong>${novos.length} novos crismandos</strong> prontos para cadastrar.
        ${duplicadosCount > 0 ? `<br><small style="color: #e67e22;">(Ignorados ${duplicadosCount} já existentes no sistema)</small>` : ""}
      </p>

      <div class="table-container" style="max-height: 250px; overflow-y: auto; margin-bottom: 20px;">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Valor Mensal</th>
            </tr>
          </thead>
          <tbody>
            ${htmlLinhas}
          </tbody>
        </table>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn btn-success" style="flex: 1;" onclick="confirmarImportacaoExcel()">✅ Confirmar Importação (${novos.length})</button>
        <button class="btn btn-secondary" style="flex: 1; background: #6c757d; color: white;" onclick="this.parentElement.parentElement.parentElement.remove()">❌ Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

async function confirmarImportacaoExcel() {
  if (!listaNovosCrismandosParaImportar || listaNovosCrismandosParaImportar.length === 0) return;

  try {
    const supabase = getSupabaseClient() || window.supabase;
    if (!supabase) throw new Error("Cliente Supabase não inicializado");

    console.log(`📥 Importando ${listaNovosCrismandosParaImportar.length} crismandos no Supabase...`);

    const { data, error } = await supabase
      .from("crismandos")
      .insert(listaNovosCrismandosParaImportar)
      .select();

    if (error) throw error;

    alert(`🎉 Sucesso! ${listaNovosCrismandosParaImportar.length} crismando(s) cadastrado(s) com sucesso!`);

    // Recarregar dados do sistema
    await carregarDados();
    atualizarTabela();
    atualizarSelectCrismandos();
    inicializarAutocompleteCrismando();

    // Fechar modal
    const modal = document.getElementById("modalPreviaExcel");
    if (modal) modal.remove();

  } catch (error) {
    console.error("Erro ao importar lote no Supabase:", error);
    alert(`❌ Erro ao salvar crismandos: ${error.message || error}`);
  }
}
