// app.js - VERSÃO COM AUTENTICAÇÃO
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Iniciando sistema...');

  if (!auth.checkSession()) {
    console.log('❌ Usuário não autenticado - redirecionando para login');
    auth.showLoginPage();
    return;
  }

  console.log('✅ Usuário autenticado:', auth.currentUser.nome);

  try {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (typeof ENV === 'undefined') {
      throw new Error('Variáveis de ambiente não carregadas. Recarregue a página.');
    }

    const supabaseInstance = initializeSupabase();
    if (!supabaseInstance) {
      throw new Error('Falha na inicialização do Supabase - verifique as credenciais');
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    const conexaoOk = await testarConexao();
    if (conexaoOk) {
      await carregarDados();
      // ✅ carregarCodigosAutenticacao() removida — já está dentro de carregarDados()
      atualizarEstatisticas();
      atualizarTabela();
      atualizarSelectCrismandos();
      inicializarAutocompleteCrismando(); // ✅ autocomplete do campo de pagamento
       popularSelectRelatorio();
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

  window.onclick = function(event) {
    const modal = document.getElementById('modalComprovante');
    if (event.target == modal) {
      modal.style.display = 'none';
    }
  };
});

function adicionarBotaoLogout() {
  const logoutContainer = document.createElement('div');
  logoutContainer.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 1000;
    display: flex; gap: 10px; align-items: center;
  `;

  const userInfo = document.createElement('span');
  userInfo.textContent = `👤 ${auth.currentUser.nome}`;
  userInfo.style.cssText = `
    background: #2c3e50; color: white;
    padding: 8px 12px; border-radius: 5px; font-size: 14px;
  `;

  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = 'Sair';
  logoutBtn.style.cssText = `
    background: #e74c3c; color: white; border: none;
    padding: 8px 15px; border-radius: 5px; cursor: pointer;
    font-size: 14px; transition: background 0.3s;
  `;
  logoutBtn.onmouseover = () => logoutBtn.style.background = '#c0392b';
  logoutBtn.onmouseout  = () => logoutBtn.style.background = '#e74c3c';
  logoutBtn.onclick = () => {
    if (confirm('🚪 Deseja realmente sair do sistema?')) {
      auth.logout();
    }
  };

  logoutContainer.appendChild(userInfo);
  logoutContainer.appendChild(logoutBtn);
  document.body.appendChild(logoutContainer);
}

function adicionarInfoUsuario() {
  const mainContent = document.querySelector('.container') || document.body;
  const userBanner = document.createElement('div');
  userBanner.style.cssText = `
    background: linear-gradient(135deg, #2c3e50, #34495e);
    color: white; padding: 15px; border-radius: 10px;
    margin-bottom: 20px; text-align: center;
  `;
  userBanner.innerHTML = `
    <strong>Sistema de Gestão de Pagamentos da Crisma - Santuário Mãe Rainha</strong><br>
    <small>Último acesso: ${new Date().toLocaleString('pt-BR')}</small>
  `;
  mainContent.insertBefore(userBanner, mainContent.firstChild);
}
