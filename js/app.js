// app.js - VERSÃO COM AUTENTICAÇÃO
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando sistema...');
    
    // Verificar se usuário está autenticado
    if (!auth.checkSession()) {
        console.log('❌ Usuário não autenticado - redirecionando para login');
        auth.showLoginPage();
        return;
    }
    
    console.log('✅ Usuário autenticado:', auth.currentUser.nome);
    
    try {
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar se ENV está disponível
        if (typeof ENV === 'undefined') {
            throw new Error('Variáveis de ambiente não carregadas. Recarregue a página.');
        }
        
        // Inicializar Supabase
        const supabaseInstance = initializeSupabase();
        
        if (!supabaseInstance) {
            throw new Error('Falha na inicialização do Supabase - verifique as credenciais');
        }
        
        // Aguardar um pouco para garantir inicialização
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Testar conexão
        const conexaoOk = await testarConexao();
        
        if (conexaoOk) {
            // Carregar dados apenas se autenticado e conectado
            await carregarDados();
            carregarCodigosAutenticacao();
            atualizarEstatisticas();
            atualizarTabela();
            atualizarSelectCrismandos();
            
            // Adicionar elementos de interface
            adicionarBotaoLogout();
            adicionarInfoUsuario();
            
            console.log('✅ Sistema inicializado com sucesso!');
        } else {
            throw new Error('Falha na conexão com o banco de dados');
        }
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        alert(`❌ Erro ao inicializar sistema: ${error.message}\n\nTente recarregar a página.`);
    }
    
        
    // Configurar fechamento do modal
    window.onclick = function(event) {
        const modal = document.getElementById('modalComprovante');
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
});

// Adicionar botão de logout
function adicionarBotaoLogout() {
    const header = document.querySelector('.header') || document.querySelector('h1') || document.body;
    
    const logoutContainer = document.createElement('div');
    logoutContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        gap: 10px;
        align-items: center;
    `;
    
    const userInfo = document.createElement('span');
    userInfo.textContent = `👤 ${auth.currentUser.nome}`;
    userInfo.style.cssText = `
        background: #2c3e50;
        color: white;
        padding: 8px 12px;
        border-radius: 5px;
        font-size: 14px;
    `;
    
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Sair';
    logoutBtn.style.cssText = `
        background: #e74c3c;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.3s;
    `;
    
    logoutBtn.onmouseover = () => logoutBtn.style.background = '#c0392b';
    logoutBtn.onmouseout = () => logoutBtn.style.background = '#e74c3c';
    
    logoutBtn.onclick = () => {
        if (confirm('🚪 Deseja realmente sair do sistema?')) {
            auth.logout();
        }
    };
    
    logoutContainer.appendChild(userInfo);
    logoutContainer.appendChild(logoutBtn);
    document.body.appendChild(logoutContainer);
}

// Adicionar informações do usuário
function adicionarInfoUsuario() {
    const mainContent = document.querySelector('.container') || document.body;
    
    const userBanner = document.createElement('div');
    userBanner.style.cssText = `
        background: linear-gradient(135deg, #2c3e50, #34495e);
        color: white;
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
        text-align: center;
    `;
    
    userBanner.innerHTML = `
        <h3>🎉 Bem-vindo(a), ${auth.currentUser.nome}!</h3>
        <p>Sistema de Gestão de Pagamentos da Crisma - Santuário Mãe Rainha</p>
        <small>Último acesso: ${new Date().toLocaleString('pt-BR')}</small>
    `;
    
    mainContent.insertBefore(userBanner, mainContent.firstChild);
}
