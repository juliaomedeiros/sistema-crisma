// Inicialização do sistema
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando sistema...');

        
    // Testar conexão 
    const conexaoOk = await testarConexao();
    
    if (conexaoOk) {
        // Só carregar dados se a conexão estiver OK
        await carregarDados();
        carregarCodigosAutenticacao();
        atualizarEstatisticas();
        atualizarTabela();
        atualizarSelectCrismandos();
        console.log('✅ Sistema inicializado com sucesso!');
    } else {
        console.warn('⚠️ Sistema iniciado com problemas de conexão');
        alert('⚠️ Problema na conexão com o banco de dados. Verifique suas configurações.');
    }
    carregarDados();
    carregarCodigosAutenticacao();
    atualizarEstatisticas();
    atualizarTabela();
    atualizarSelectCrismandos();
    
    // Configurar upload de logo
    const logoInput = document.getElementById('logoInput');
    if (logoInput) {
        logoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    logoBase64 = e.target.result;
                    const preview = document.getElementById('logoPreview');
                    const logoText = document.getElementById('logoText');
                    
                    if (preview) {
                        preview.src = logoBase64;
                        preview.style.display = 'block';
                    }
                    
                    if (logoText) {
                        logoText.style.display = 'none';
                    }
                    
                    localStorage.setItem('logoBase64', logoBase64);
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Configurar fechamento do modal ao clicar fora
    window.onclick = function(event) {
        const modal = document.getElementById('modalComprovante');
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
});

// Função para debug - pode ser removida em produção
function debugInfo() {
    console.log('Crismandos: Carregador com sucesso', /*crismandos*/);
    console.log('Pagamentos: Carregados com sucesso', /*pagamentos*/);
    console.log('Logo carregada:', logoBase64 ? 'Sim' : 'Não');
}





