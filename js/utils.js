// Atualizar tabela
function atualizarTabela() {
    const tbody = document.getElementById('corpoTabela');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    crismandos.forEach(crismando => {
        const pagamentosCrismando = pagamentos.filter(p => p.crismando_id == crismando.id);
        const ultimoPagamento = pagamentosCrismando.length > 0 ? 
            pagamentosCrismando[pagamentosCrismando.length - 1] : null;
        const totalPago = pagamentosCrismando.reduce((total, p) => total + parseFloat(p.valor), 0);

        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${crismando.nome}</td>
            <td>${crismando.telefone || 'Não informado'}</td>
            <td>R$ ${parseFloat(crismando.valor_mensal || 0).toFixed(2).replace('.', ',')}</td>
            <td>${ultimoPagamento ? ultimoPagamento.mes + '/2025' : 'Nenhum'}</td>
            <td>R$ ${totalPago.toFixed(2).replace('.', ',')}</td>
            <td>
                <button class="btn btn-warning" onclick="editarCrismando(${crismando.id})">Editar</button>
                <button class="btn btn-danger" onclick="removerCrismando(${crismando.id})">Remover</button>
            </td>
        `;
    });
}

// Atualizar select de crismandos
function atualizarSelectCrismandos() {
    const select = document.getElementById('selectCrismando');
    if (!select) return;

    // Limpar opções existentes
    select.innerHTML = '<option value="">Selecione um crismando</option>';

    // Verificar se há crismandos carregados
    if (!crismandos || crismandos.length === 0) {
        console.warn('Nenhum crismando encontrado para popular o select');
        return;
    }

    // Adicionar crismandos válidos
    crismandos.forEach(crismando => {
        if (crismando && crismando.id && crismando.nome) {
            const option = document.createElement('option');
            option.value = crismando.id;
            option.textContent = `${crismando.nome} - R$ ${(crismando.valor_mensal || 0).toFixed(2).replace('.', ',')}`;
            select.appendChild(option);
        }
    });

    console.log(`Select atualizado com ${crismandos.length} crismandos`);
}

// Atualizar estatísticas
function atualizarEstatisticas() {
    const totalCrismandos = crismandos.length;
    const hoje = new Date().toISOString().split('T')[0];
    const pagamentosHoje = pagamentos.filter(p => p.data_pagamento === hoje);
    const totalHoje = pagamentosHoje.reduce((total, p) => total + parseFloat(p.valor), 0);
    const totalArrecadado = pagamentos.reduce((total, p) => total + parseFloat(p.valor), 0);

    document.getElementById('totalCrismandos').textContent = totalCrismandos;
    document.getElementById('pagamentosHoje').textContent = pagamentosHoje.length;
    document.getElementById('totalArrecadado').textContent = `R$ ${totalArrecadado.toFixed(2).replace('.', ',')}`;
}

// Gerar relatório mensal
function gerarRelatorio() {
    try {
        console.log('📊 Gerando relatório...');
        
        // Verificar se o elemento existe
        let elementoRelatorio = document.getElementById('relatorioGerado');
        
        // Se não existir, tentar outros IDs possíveis
        if (!elementoRelatorio) {
            elementoRelatorio = document.getElementById('relatorioResultado');
        }
        
        if (!elementoRelatorio) {
            elementoRelatorio = document.getElementById('resultadoRelatorio');
        }
        
        // Se ainda não encontrou, criar dinamicamente
        if (!elementoRelatorio) {
            console.warn('⚠️ Elemento de relatório não encontrado. Criando dinamicamente...');
            
            // Encontrar um container adequado
            const container = document.querySelector('.section') || document.body;
            
            // Criar o elemento
            const novoElemento = document.createElement('div');
            novoElemento.id = 'relatorioGerado';
            novoElemento.style.cssText = 'margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;';
            
            // Adicionar título
            const titulo = document.createElement('h3');
            titulo.textContent = '📊 Relatório por Mês';
            titulo.style.cssText = 'color: #2c3e50; margin-bottom: 15px;';
            
            container.appendChild(titulo);
            container.appendChild(novoElemento);
            elementoRelatorio = novoElemento;
        }
        
        // Criar interface de seleção de mês
        const htmlSelecaoMes = `
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
                <h4 style="color: #e74c3c; margin-bottom: 20px; text-align: center;">📅 Selecionar Mês para Relatório</h4>
                
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; flex-wrap: wrap;">
                    <label for="mesRelatorioSelect" style="font-weight: bold; color: #2c3e50;">Escolha o mês:</label>
                    <select id="mesRelatorioSelect" style="padding: 10px; border: 2px solid #e74c3c; border-radius: 5px; font-size: 16px; min-width: 150px;">
                        <option value="">-- Selecione o mês --</option>
                        <option value="Janeiro">Janeiro/2025</option>
                        <option value="Fevereiro">Fevereiro/2025</option>
                        <option value="Março">Março/2025</option>
                        <option value="Abril">Abril/2025</option>
                        <option value="Maio">Maio/2025</option>
                        <option value="Junho">Junho/2025</option>
                        <option value="Julho">Julho/2025</option>
                        <option value="Agosto">Agosto/2025</option>
                        <option value="Setembro">Setembro/2025</option>
                        <option value="Outubro">Outubro/2025</option>
                        <option value="Novembro">Novembro/2025</option>
                        <option value="Dezembro">Dezembro/2025</option>
                    </select>
                    <button onclick="gerarRelatorioMesEspecifico()" style="background: #27ae60; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        📊 Gerar Relatório
                    </button>
                </div>
                
                <div style="margin-top: 15px; text-align: center;">
                    <button onclick="gerarRelatorioGeral()" style="background: #3498db; color: white; padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer;">
                        📈 Ver Relatório Geral (Todos os Meses)
                    </button>
                </div>
            </div>
            
            <div id="conteudoRelatorioMes" style="display: none;">
                <!-- O conteúdo do relatório será inserido aqui -->
            </div>
        `;
        
        // Inserir o HTML no elemento
        elementoRelatorio.innerHTML = htmlSelecaoMes;
        elementoRelatorio.style.display = 'block';
        
        console.log('✅ Interface de seleção de mês criada!');
        
    } catch (error) {
        console.error('❌ Erro ao criar interface de relatório:', error);
        alert(`❌ Erro ao gerar interface de relatório: ${error.message}`);
    }
}

// Função para gerar relatório de mês específico
function gerarRelatorioMesEspecifico() {
    try {
        const mesEscolhido = document.getElementById('mesRelatorioSelect').value;
        
        if (!mesEscolhido) {
            alert('⚠️ Por favor, selecione um mês para gerar o relatório.');
            return;
        }
        
        console.log(`📊 Gerando relatório para ${mesEscolhido}...`);
        
        // Verificar se temos dados
        if (!crismandos || crismandos.length === 0) {
            document.getElementById('conteudoRelatorioMes').innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666; background: white; border-radius: 8px;">
                    <p>📋 Nenhum crismando cadastrado ainda.</p>
                    <p>Adicione crismandos primeiro para gerar relatórios.</p>
                </div>
            `;
            document.getElementById('conteudoRelatorioMes').style.display = 'block';
            return;
        }
        
        // Filtrar pagamentos do mês escolhido
        const pagamentosMes = pagamentos.filter(p => p.mes === mesEscolhido);
        const valorTotalMes = pagamentosMes.reduce((total, p) => total + parseFloat(p.valor || 0), 0);
        const crismandosComPagamentoMes = [...new Set(pagamentosMes.map(p => p.crismando_id))].length;
        const crismandosSemPagamentoMes = crismandos.length - crismandosComPagamentoMes;
        
        // Criar HTML do relatório específico do mês
        let htmlRelatorio = `
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h4 style="color: #e74c3c; margin-bottom: 20px; text-align: center;">📊 Relatório de ${mesEscolhido}/2025</h4>
                
                <!-- Estatísticas do Mês -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px;">
                    <div style="background: #3498db; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <h5 style="margin: 0; font-size: 24px;">${crismandos.length}</h5>
                        <p style="margin: 5px 0 0 0;">Total de Crismandos</p>
                    </div>
                    <div style="background: #27ae60; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <h5 style="margin: 0; font-size: 24px;">${pagamentosMes.length}</h5>
                        <p style="margin: 5px 0 0 0;">Pagamentos em ${mesEscolhido}</p>
                    </div>
                    <div style="background: #e74c3c; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <h5 style="margin: 0; font-size: 16px;">R$ ${valorTotalMes.toFixed(2).replace('.', ',')}</h5>
                        <p style="margin: 5px 0 0 0;">Arrecadado em ${mesEscolhido}</p>
                    </div>
                    <div style="background: #f39c12; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <h5 style="margin: 0; font-size: 24px;">${crismandosSemPagamentoMes}</h5>
                        <p style="margin: 5px 0 0 0;">Pendentes em ${mesEscolhido}</p>
                    </div>
                </div>
                
                <!-- Tabela Detalhada do Mês -->
                <h5 style="color: #2c3e50; margin-bottom: 15px;">📋 Detalhamento de ${mesEscolhido}/2025</h5>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: white;">
                        <thead>
                            <tr style="background: #34495e; color: white;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Nome</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Telefone</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Valor Mensal</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Status ${mesEscolhido}</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Valor Pago</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Data Pagamento</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // Adicionar dados de cada crismando para o mês específico
        crismandos.forEach((crismando, index) => {
            const pagamentoMes = pagamentos.find(p => p.crismando_id == crismando.id && p.mes === mesEscolhido);
            const valorPago = pagamentoMes ? parseFloat(pagamentoMes.valor || 0) : 0;
            const dataPagamento = pagamentoMes ? 
                (pagamentoMes.created_at ? new Date(pagamentoMes.created_at).toLocaleDateString('pt-BR') : 'Data não disponível') : 
                '-';
            const status = pagamentoMes ? 'PAGO' : 'PENDENTE';
            const corStatus = pagamentoMes ? '#27ae60' : '#e74c3c';
            const corLinha = index % 2 === 0 ? '#f8f9fa' : 'white';
            
            htmlRelatorio += `
                <tr style="background: ${corLinha};">
                    <td style="padding: 10px; border: 1px solid #ddd;">${crismando.nome}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${crismando.telefone || '-'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">R$ ${(crismando.valor_mensal || 0).toFixed(2).replace('.', ',')}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                        <span style="background: ${corStatus}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${status}</span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">R$ ${valorPago.toFixed(2).replace('.', ',')}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${dataPagamento}</td>
                </tr>
            `;
        });
        
        htmlRelatorio += `
                        </tbody>
                    </table>
                </div>
                
                <!-- Resumo Final -->
                <div style="margin-top: 20px; padding: 15px; background: #ecf0f1; border-radius: 8px;">
                    <h5 style="color: #2c3e50; margin-bottom: 10px;">📈 Resumo de ${mesEscolhido}/2025</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                        <p style="margin: 5px 0;"><strong>✅ Pagaram:</strong> ${crismandosComPagamentoMes} crismandos</p>
                        <p style="margin: 5px 0;"><strong>⏳ Pendentes:</strong> ${crismandosSemPagamentoMes} crismandos</p>
                        <p style="margin: 5px 0;"><strong>💰 Total arrecadado:</strong> R$ ${valorTotalMes.toFixed(2).replace('.', ',')}</p>
                        <p style="margin: 5px 0;"><strong>📊 Taxa de pagamento:</strong> ${((crismandosComPagamentoMes / crismandos.length) * 100).toFixed(1)}%</p>
                    </div>
                </div>
                
                <!-- Botões de Ação -->
                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="baixarRelatorioMesExcel('${mesEscolhido}')" style="background: #27ae60; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 0 5px; cursor: pointer;">
                        📥 Baixar Excel - ${mesEscolhido}
                    </button>
                    <button onclick="imprimirRelatorioMes()" style="background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 0 5px; cursor: pointer;">
                        🖨️ Imprimir Relatório
                    </button>
                    <button onclick="gerarRelatorio()" style="background: #95a5a6; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 0 5px; cursor: pointer;">
                        🔄 Escolher Outro Mês
                    </button>
                </div>
                
                <div style="margin-top: 15px; padding: 10px; background: #e8f5e8; border-left: 4px solid #27ae60; border-radius: 4px;">
                    <p style="margin: 0; color: #2d5a2d; font-size: 14px;">
                        <strong>📅 Relatório de ${mesEscolhido}/2025 gerado em:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
                    </p>
                </div>
            </div>
        `;
        
        // Exibir o relatório
        document.getElementById('conteudoRelatorioMes').innerHTML = htmlRelatorio;
        document.getElementById('conteudoRelatorioMes').style.display = 'block';
        
        // Rolar até o relatório
        document.getElementById('conteudoRelatorioMes').scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        console.log(`✅ Relatório de ${mesEscolhido} gerado com sucesso!`);
        
    } catch (error) {
        console.error('❌ Erro ao gerar relatório do mês:', error);
        alert(`❌ Erro ao gerar relatório: ${error.message}`);
    }
}

// Função para gerar relatório geral (todos os meses)
function gerarRelatorioGeral() {
    try {
        console.log('📊 Gerando relatório geral...');
        
        // Verificar se temos dados
        if (!crismandos || crismandos.length === 0) {
            document.getElementById('conteudoRelatorioMes').innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666; background: white; border-radius: 8px;">
                    <p>📋 Nenhum crismando cadastrado ainda.</p>
                    <p>Adicione crismandos primeiro para gerar relatórios.</p>
                </div>
            `;
            document.getElementById('conteudoRelatorioMes').style.display = 'block';
            return;
        }
        
        // Estatísticas gerais
        const totalCrismandos = crismandos.length;
        const totalPagamentos = pagamentos.length;
        const valorTotalArrecadado = pagamentos.reduce((total, p) => total + parseFloat(p.valor || 0), 0);
        const crismandosComPagamento = [...new Set(pagamentos.map(p => p.crismando_id))].length;
        const crismandosSemPagamento = totalCrismandos - crismandosComPagamento;
        
        // Estatísticas por mês
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        let estatisticasPorMes = '';
        meses.forEach(mes => {
            const pagamentosMes = pagamentos.filter(p => p.mes === mes);
            const valorMes = pagamentosMes.reduce((total, p) => total + parseFloat(p.valor || 0), 0);
            const qtdPagamentosMes = pagamentosMes.length;
            
            if (qtdPagamentosMes > 0) {
                estatisticasPorMes += `
                    <div style="background: #3498db; color: white; padding: 10px; border-radius: 5px; text-align: center; margin: 5px;">
                        <strong>${mes}</strong><br>
                        ${qtdPagamentosMes} pagamentos<br>
                        R$ ${valorMes.toFixed(2).replace('.', ',')}
                    </div>
                `;
            }
        });
        
        const htmlRelatorioGeral = `
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h4 style="color: #e74c3c; margin-bottom: 20px; text-align: center;">📊 Relatório Geral - Crisma 2025</h4>
                
                <!-- Estatísticas Gerais -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                    <div style="background: #3498db; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <h5 style="margin: 0; font-size: 24px;">${totalCrismandos}</h5>
                        <p style="margin: 5px 0 0 0;">Total de Crismandos</p>
                    </div>
                    <div style="background: #27ae60; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <h5 style="margin: 0; font-size: 24px;">${totalPagamentos}</h5>
                        <p style="margin: 5px 0 0 0;">Total de Pagamentos</p>
                    </div>
                    <div style="background: #e74c3c; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <h5 style="margin: 0; font-size: 18px;">R$ ${valorTotalArrecadado.toFixed(2).replace('.', ',')}</h5>
                        <p style="margin: 5px 0 0 0;">Total Arrecadado</p>
                    </div>
                    <div style="background: #f39c12; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <h5 style="margin: 0; font-size: 24px;">${crismandosSemPagamento}</h5>
                        <p style="margin: 5px 0 0 0;">Sem Pagamentos</p>
                    </div>
                </div>
                
                <!-- Estatísticas por Mês -->
                <h5 style="color: #2c3e50; margin-bottom: 15px;">📅 Arrecadação por Mês</h5>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 25px;">
                    ${estatisticasPorMes || '<p style="color: #666; font-style: italic;">Nenhum pagamento registrado ainda.</p>'}
                </div>
                
                <!-- Botões de Ação -->
                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="baixarRelatorioCompleto()" style="background: #27ae60; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 0 5px; cursor: pointer;">
                        📥 Baixar Excel Completo
                    </button>
                    <button onclick="gerarRelatorio()" style="background: #95a5a6; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 0 5px; cursor: pointer;">
                        🔄 Voltar à Seleção
                    </button>
                </div>
                
                <div style="margin-top: 15px; padding: 10px; background: #e8f5e8; border-left: 4px solid #27ae60; border-radius: 4px;">
                    <p style="margin: 0; color: #2d5a2d; font-size: 14px;">
                        <strong>📅 Relatório geral gerado em:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
                    </p>
                </div>
            </div>
        `;
        
        // Exibir o relatório
        document.getElementById('conteudoRelatorioMes').innerHTML = htmlRelatorioGeral;
        document.getElementById('conteudoRelatorioMes').style.display = 'block';
        
        // Rolar até o relatório
        document.getElementById('conteudoRelatorioMes').scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        console.log('✅ Relatório geral gerado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao gerar relatório geral:', error);
        alert(`❌ Erro ao gerar relatório geral: ${error.message}`);
    }
}

// Função para baixar Excel do mês específico
function baixarRelatorioMesExcel(mes) {
    try {
        console.log(`Gerando Excel para ${mes}...`);
        
        // Preparar dados para Excel
        const dadosExcel = [];
        
        // Cabeçalho
        dadosExcel.push(['Nome', 'Telefone', 'Valor Mensal', 'Status', 'Valor Pago', 'Data Pagamento']);
        
        // Dados dos crismandos para o mês específico
        crismandos.forEach(crismando => {
            const pagamentoMes = pagamentos.find(p => 
                p.crismando_id == crismando.id && p.mes === mes
            );
            const status = pagamentoMes ? 'PAGO' : 'PENDENTE';
            const valorPago = pagamentoMes ? parseFloat(pagamentoMes.valor) : 0;
            const dataPagamento = pagamentoMes ? 
                (pagamentoMes.created_at ? new Date(pagamentoMes.created_at).toLocaleDateString('pt-BR') : '') : 
                '';
            
            dadosExcel.push([
                crismando.nome,
                crismando.telefone || '',
                parseFloat(crismando.valor_mensal || 0),
                status,
                valorPago,
                dataPagamento
            ]);
        });

        // Criar e baixar Excel
        const ws = XLSX.utils.aoa_to_sheet(dadosExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${mes} 2025`);
        XLSX.writeFile(wb, `relatorio_${mes}_2025.xlsx`);
        
        console.log(`Excel de ${mes} gerado com sucesso!`);
        
    } catch (error) {
        console.error('Erro ao gerar Excel:', error);
        alert(`Erro ao gerar Excel: ${error.message}`);
    }
}

// Função para imprimir relatório do mês
function imprimirRelatorioMes() {
    const conteudoRelatorio = document.getElementById('conteudoRelatorioMes');
    if (!conteudoRelatorio || conteudoRelatorio.style.display === 'none') {
        alert('❌ Nenhum relatório foi gerado ainda.');
        return;
    }
    
    const janelaImpressao = window.open('', '_blank');
    janelaImpressao.document.write(`
        <html>
            <head>
                <title>Relatório Crisma 2025</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                ${conteudoRelatorio.innerHTML}
            </body>
        </html>
    `);
    janelaImpressao.document.close();
    janelaImpressao.print();
}



// Função placeholder para editar crismando
function editarCrismando(id) {
    alert('Funcionalidade de edição será implementada em breve!');
}

// Fechar modal
function fecharModal() {
    const modal = document.getElementById('modalComprovante');
    if (modal) {
        modal.style.display = 'none';
    }
}
// Gerar relatório mensal detalhado
function gerarRelatorioDetalhado() {
    const mes = document.getElementById('mesRelatorio').value;
    const pagamentosMes = pagamentos.filter(p => p.mes === mes);
    const totalMes = pagamentosMes.reduce((total, p) => total + p.valor, 0);
    
    // Dados para a planilha
    const dadosRelatorio = [];
    
    // Cabeçalho
    dadosRelatorio.push([
        'Nome',
        'Telefone', 
        'Valor Pago',
        'Data do Pagamento',
        'Mês',
        'Status'
    ]);
    
    // Dados dos pagamentos
    pagamentosMes.forEach(pagamento => {
        const crismando = crismandos.find(c => c.id == pagamento.crismandoId);
        if (crismando) {
            dadosRelatorio.push([
                crismando.nome,
                crismando.telefone,
                `R$ ${pagamento.valor.toFixed(2).replace('.', ',')}`,
                new Date(pagamento.data).toLocaleDateString('pt-BR'),
                pagamento.mes,
                'Pago'
            ]);
        }
    });
    
    // Adicionar crismandos que não pagaram no mês
    crismandos.forEach(crismando => {
        const pagouNoMes = pagamentosMes.find(p => p.crismandoId == crismando.id);
        if (!pagouNoMes) {
            dadosRelatorio.push([
                crismando.nome,
                crismando.telefone,
                'R$ 0,00',
                '-',
                mes,
                'Pendente'
            ]);
        }
    });
    
    // Linha de totais
    dadosRelatorio.push([]);
    dadosRelatorio.push([
        'TOTAIS:',
        '',
        `R$ ${totalMes.toFixed(2).replace('.', ',')}`,
        '',
        `${pagamentosMes.length} pagamentos`,
        `${crismandos.length - pagamentosMes.length} pendentes`
    ]);
    
    return dadosRelatorio;
}

function calcularStatusPagamento(crismandoId, mes) {
    // Buscar pagamentos do crismando para o mês específico
    const pagamentoEncontrado = pagamentos.find(p => 
        p.crismando_id == crismandoId && p.mes === mes
    );
    
    if (pagamentoEncontrado) {
        return 'PAGO';
    }
    
    // Verificar se o mês já passou (considerar mês atual como referência)
    const mesAtual = new Date().getMonth() + 1; // Janeiro = 1
    const mesNumerico = parseInt(mes);
    
    if (mesNumerico < mesAtual) {
        return 'ATRASADO';
    } else {
        return 'PENDENTE';
    }
}

// Baixar relatório como Excel
function baixarRelatorioExcel() {
    const mes = document.getElementById('mesRelatorio').value;
    if (!mes) {
        alert('Por favor, selecione um mês');
        return;
    }

    // Preparar dados para Excel
    const dadosExcel = [];
    
    // Cabeçalho
    dadosExcel.push(['Nome', 'Telefone', 'Valor Mensal', 'Status', 'Valor Pago']);
    
    // Dados dos crismandos
    crismandos.forEach(crismando => {
        const status = calcularStatusPagamento(crismando.id, mes);
        const pagamento = pagamentos.find(p => 
            p.crismando_id == crismando.id && p.mes === mes
        );
        const valorPago = pagamento ? parseFloat(pagamento.valor) : 0;
        
        dadosExcel.push([
            crismando.nome,
            crismando.telefone || '',
            parseFloat(crismando.valor_mensal || 0),
            status,
            valorPago
        ]);
    });

    // Criar e baixar Excel
    const ws = XLSX.utils.aoa_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Relatório ${mes}-2025`);
    XLSX.writeFile(wb, `relatorio_${mes}_2025.xlsx`);
}


// Gerar relatório completo (todos os meses)
function baixarRelatorioCompleto() {
    try {
        console.log('Gerando relatório completo...');
        
        // Preparar dados para Excel
        const dadosExcel = [];
        
        // Cabeçalho
        dadosExcel.push([
            'Nome', 
            'Telefone', 
            'Valor Mensal', 
            'Total Pago', 
            'Último Pagamento',
            'Status Geral'
        ]);
        
        // Processar cada crismando
        crismandos.forEach(crismando => {
            // CORREÇÃO: Verificar se os valores existem antes de usar toFixed()
            const valorMensal = crismando.valor_mensal ? parseFloat(crismando.valor_mensal) : 0;
            
            // Calcular total pago
            const pagamentosCrismando = pagamentos.filter(p => p.crismando_id == crismando.id);
            const totalPago = pagamentosCrismando.reduce((total, p) => {
                const valor = p.valor ? parseFloat(p.valor) : 0;
                return total + valor;
            }, 0);
            
            // Encontrar último pagamento
            const ultimoPagamento = pagamentosCrismando.length > 0 ? 
                pagamentosCrismando[pagamentosCrismando.length - 1] : null;
            
            const dataUltimoPagamento = ultimoPagamento ? 
                (ultimoPagamento.created_at ? 
                    new Date(ultimoPagamento.created_at).toLocaleDateString('pt-BR') : 
                    'Data não disponível') : 
                'Nenhum pagamento';
            
            // Determinar status geral
            const statusGeral = pagamentosCrismando.length > 0 ? 'COM PAGAMENTOS' : 'SEM PAGAMENTOS';
            
            dadosExcel.push([
                crismando.nome || 'Nome não informado',
                crismando.telefone || '',
                valorMensal.toFixed(2),
                totalPago.toFixed(2),
                dataUltimoPagamento,
                statusGeral
            ]);
        });

        // Criar e baixar Excel
        const ws = XLSX.utils.aoa_to_sheet(dadosExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Relatório Completo');
        XLSX.writeFile(wb, `relatorio_completo_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        console.log('Relatório completo gerado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao gerar relatório completo:', error);
        alert(`Erro ao gerar relatório: ${error.message}`);
    }
}

// Função para validar comprovante
function validarComprovante() {
    const codigo = document.getElementById('codigoValidacao').value.trim().toUpperCase();
    const resultado = document.getElementById('resultadoValidacao');
    
    if (!codigo || codigo.length !== 8) {
        resultado.innerHTML = `
            <div class="status-erro">
                ❌ <strong>Código Inválido</strong><br>
                O código deve ter exatamente 8 caracteres.
            </div>
        `;
        return;
    }
    
    const registro = codigosAutenticacao.find(c => c.codigo === codigo && c.ativo);
    
    if (!registro) {
        resultado.innerHTML = `
            <div class="status-erro">
                ❌ <strong>Comprovante Não Encontrado</strong><br>
                Código: <strong>${codigo}</strong><br>
                Este código não existe ou foi desativado.
            </div>
        `;
        return;
    }
    
    // Verificar se não expirou
    const agora = new Date();
    const vencimento = new Date(registro.data_vencimento);
    
    if (agora > vencimento) {
        resultado.innerHTML = `
            <div class="status-erro">
                ❌ <strong>Comprovante Expirado</strong><br>
                Código: <strong>${codigo}</strong><br>
                Vencido em: ${new Date(registro.data_vencimento).toLocaleDateString('pt-BR')}
            </div>
        `;
        return;
    }
    
    // Comprovante válido
    resultado.innerHTML = `
        <div class="status-sucesso">
            ✅ <strong>Comprovante Válido</strong><br>
            <strong>Código:</strong> ${registro.codigo}<br>
            <strong>Crismando:</strong> ${registro.nome_crismando}<br>
            <strong>Mês:</strong> ${registro.mes}/2025<br>
            <strong>Valor:</strong> R$ ${registro.valor.toFixed(2).replace('.', ',')}<br>
            <strong>Data de Emissão:</strong> ${new Date(registro.data_geracao).toLocaleDateString('pt-BR')}<br>
            <strong>Válido até:</strong> ${new Date(registro.data_vencimento).toLocaleDateString('pt-BR')}
        </div>
    `;
}

// Função para listar comprovantes válidos
async function listarComprovantesValidos() {
    try {
        console.log('🔍 Buscando comprovantes válidos...');
        
        // Verificar se o elemento existe antes de tentar usá-lo
        const elementoResultado = document.getElementById('resultadoComprovantes');
        if (!elementoResultado) {
            console.error('Elemento resultadoComprovantes não encontrado');
            alert('❌ Erro: Elemento de exibição não encontrado na página. Verifique se o HTML está correto.');
            return;
        }
        
        // Buscar códigos ativos do Supabase
        const { data: codigosValidos, error } = await supabase
            .from('codigos_autenticacao')
            .select('*')
            .eq('ativo', true)
            .order('data_geracao', { ascending: false });

        if (error) {
            console.error('Erro ao buscar códigos:', error);
            alert('❌ Erro ao carregar comprovantes válidos do banco de dados');
            return;
        }

        // Atualizar array local
        codigosAutenticacao = codigosValidos || [];
        
        // Exibir resultados
        if (codigosAutenticacao.length === 0) {
            elementoResultado.innerHTML = '<p style="color: #666; font-style: italic;">Nenhum comprovante válido encontrado.</p>';
            return;
        }

        // Criar tabela com os comprovantes
        let html = `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <h4 style="color: #2c3e50; margin-bottom: 15px;">📋 Comprovantes Válidos Encontrados</h4>
                <p style="color: #666; margin-bottom: 15px;">Total: <strong>${codigosAutenticacao.length}</strong> comprovante(s)</p>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                        <thead>
                            <tr style="background: #e74c3c; color: white;">
                                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Código</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Nome</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Mês</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Valor</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Data</th>
                                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        codigosAutenticacao.forEach((codigo, index) => {
            const valorFormatado = codigo.valor ? parseFloat(codigo.valor).toFixed(2).replace('.', ',') : '0,00';
            const dataFormatada = codigo.data_geracao ? 
                new Date(codigo.data_geracao).toLocaleDateString('pt-BR') : 
                'Data não disponível';
            
            const corLinha = index % 2 === 0 ? '#f8f9fa' : 'white';
            
            html += `
                <tr style="background: ${corLinha};">
                    <td style="padding: 10px; border: 1px solid #ddd; font-family: monospace; font-weight: bold;">${codigo.codigo}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${codigo.nome_crismando || 'Nome não informado'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${codigo.mes}/2025</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">R$ ${valorFormatado}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${dataFormatada}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                        <span style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">VÁLIDO</span>
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 15px; padding: 10px; background: #e8f5e8; border-left: 4px solid #27ae60; border-radius: 4px;">
                    <p style="margin: 0; color: #2d5a2d; font-size: 14px;">
                        <strong>💡 Dica:</strong> Estes códigos podem ser usados para validar comprovantes de pagamento.
                    </p>
                </div>
            </div>
        `;
        
        // Definir o conteúdo HTML
        elementoResultado.innerHTML = html;
        
        console.log(`✅ ${codigosAutenticacao.length} comprovantes válidos exibidos`);
        
    } catch (error) {
        console.error('Erro crítico:', error);
        
        // Tentar encontrar o elemento novamente
        const elementoResultado = document.getElementById('resultadoComprovantes');
        if (elementoResultado) {
            elementoResultado.innerHTML = `
                <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin-top: 15px;">
                    <h4>❌ Erro ao Carregar Comprovantes</h4>
                    <p>Ocorreu um erro ao buscar os comprovantes válidos:</p>
                    <p><strong>${error.message}</strong></p>
                    <p>Tente recarregar a página ou entre em contato com o suporte.</p>
                </div>
            `;
        } else {
            alert(`❌ Erro crítico ao processar comprovantes válidos: ${error.message}`);
        }
    }
}
// Função para desativar código
function desativarCodigo(codigo) {
    if (confirm(`Tem certeza que deseja desativar o código ${codigo}?`)) {
        const registro = codigosAutenticacao.find(c => c.codigo === codigo);
        if (registro) {
            registro.ativo = false;
            localStorage.setItem('codigosAutenticacao', JSON.stringify(codigosAutenticacao));
            alert('Código desativado com sucesso!');
            listarComprovantesValidos(); // Atualizar lista
        }
    }
}
