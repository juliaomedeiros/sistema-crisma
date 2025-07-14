// auth.js - VERSÃO CORRIGIDA
class AuthSystem {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutos
        this.sessionTimer = null;
        this.maxTentativas = 3;
    }
    
    // Função para hash de senha (SHA-256)
    async hashSenha(senha) {
        const senhaLimpa = senha.trim();
        const encoder = new TextEncoder();
        const data = encoder.encode(senhaLimpa);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // CORREÇÃO: Inicializar Supabase antes do login
    async initializeSupabaseForAuth() {
        try {
            // Verificar se ENV está disponível
            if (typeof ENV === 'undefined') {
                throw new Error('Variáveis de ambiente não carregadas');
            }
            
            // Verificar se biblioteca Supabase está carregada
            if (typeof window.supabase === 'undefined') {
                throw new Error('Biblioteca Supabase não carregada');
            }
            
            // Criar cliente se não existir
            if (!window.supabase_client) {
                window.supabase_client = window.supabase.createClient(
                    ENV.SUPABASE_URL, 
                    ENV.SUPABASE_ANON_KEY
                );
            }
            
            return window.supabase_client;
        } catch (error) {
            console.error('Erro ao inicializar Supabase para auth:', error);
            throw error;
        }
    }
    
    // Função de login corrigida
    async login(usuario, senha) {
        try {
            console.log('🔄 Iniciando processo de login...');
            
            // CORREÇÃO: Inicializar Supabase primeiro
            const supabaseClient = await this.initializeSupabaseForAuth();
            
            if (!supabaseClient) {
                throw new Error('Falha na inicialização do banco de dados');
            }
            
            console.log('✅ Cliente Supabase inicializado para login');
            
            // Hash da senha
            const senhaHash = await this.hashSenha(senha);
            console.log('🔐 Senha processada');
            
            // Verificar credenciais no banco
            const { data, error } = await supabaseClient
                .from('usuarios_autenticados')
                .select('*')
                .eq('usuario', usuario)
                .eq('ativo', true)
                .single();
            
            if (error || !data) {
                console.error('Erro na consulta:', error);
                throw new Error('Usuário não encontrado ou inativo');
            }
            
            console.log('✅ Usuário encontrado no banco');
            
            // Verificar se está bloqueado
            if (data.bloqueado_ate && new Date(data.bloqueado_ate) > new Date()) {
                const tempoRestante = Math.ceil((new Date(data.bloqueado_ate) - new Date()) / 60000);
                throw new Error(`Usuário bloqueado. Tente novamente em ${tempoRestante} minutos.`);
            }
            
            // Verificar senha
            if (data.senha !== senhaHash) {
                // Incrementar tentativas
                const novasTentativas = (data.tentativas_login || 0) + 1;
                const updateData = { tentativas_login: novasTentativas };
                
                // Bloquear após 3 tentativas
                if (novasTentativas >= this.maxTentativas) {
                    updateData.bloqueado_ate = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                }
                
                await supabaseClient
                    .from('usuarios_autenticados')
                    .update(updateData)
                    .eq('id', data.id);
                
                throw new Error(`Senha incorreta. Tentativas restantes: ${this.maxTentativas - novasTentativas}`);
            }
            
            // Login bem-sucedido - resetar tentativas e atualizar último login
            await supabaseClient
                .from('usuarios_autenticados')
                .update({
                    tentativas_login: 0,
                    bloqueado_ate: null,
                    last_login: new Date().toISOString()
                })
                .eq('id', data.id);
            
            // Configurar sessão
            this.isAuthenticated = true;
            this.currentUser = {
                id: data.id,
                usuario: data.usuario,
                nome: data.nome,
                email: data.email
            };
            
            // Salvar sessão no localStorage
            const sessionData = {
                user: this.currentUser,
                loginTime: Date.now(),
                expiresAt: Date.now() + this.sessionTimeout
            };
            
            localStorage.setItem('crisma_session', JSON.stringify(sessionData));
            this.startSessionTimer();
            
            console.log('✅ Login realizado com sucesso');
            return { success: true, user: this.currentUser };
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Verificar sessão existente
    checkSession() {
        const sessionData = localStorage.getItem('crisma_session');
        if (!sessionData) return false;
        
        try {
            const session = JSON.parse(sessionData);
            
            // Verificar se não expirou
            if (Date.now() > session.expiresAt) {
                this.logout();
                return false;
            }
            
            // Restaurar sessão
            this.isAuthenticated = true;
            this.currentUser = session.user;
            this.startSessionTimer();
            
            return true;
            
        } catch (error) {
            this.logout();
            return false;
        }
    }
    
    // Logout
    logout() {
        this.isAuthenticated = false;
        this.currentUser = null;
        localStorage.removeItem('crisma_session');
        this.clearSessionTimer();
        
        // Redirecionar para login
        this.showLoginPage();
    }
    
    // Gerenciar timer de sessão
    startSessionTimer() {
        this.clearSessionTimer();
        this.sessionTimer = setTimeout(() => {
            alert('⏰ Sessão expirada. Você será redirecionado para o login.');
            this.logout();
        }, this.sessionTimeout);
    }
    
    clearSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }
    
    // Verificar se usuário está autenticado
    requireAuth() {
        if (!this.isAuthenticated) {
            alert('🔒 Acesso negado. Faça login primeiro.');
            this.showLoginPage();
            return false;
        }
        return true;
    }
    
    // Mostrar página de login
    showLoginPage() {
        document.body.innerHTML = this.getLoginHTML();
        this.setupLoginEvents();
    }
    
    // HTML da página de login (mantém o mesmo do arquivo original)
    getLoginHTML() {
        return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login - Sistema Crisma</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                
                .login-container {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    overflow: hidden;
                    width: 100%;
                    max-width: 400px;
                    animation: slideUp 0.5s ease-out;
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .login-header {
                    background: linear-gradient(135deg, #e74c3c, #c0392b);
                    color: white;
                    padding: 40px 30px;
                    text-align: center;
                }
                
                .login-header h1 {
                    font-size: 28px;
                    margin-bottom: 10px;
                    font-weight: 300;
                }
                
                .login-header p {
                    opacity: 0.9;
                    font-size: 16px;
                }
                
                .login-form {
                    padding: 40px 30px;
                }
                
                .form-group {
                    margin-bottom: 25px;
                    position: relative;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    color: #333;
                    font-weight: 500;
                    font-size: 14px;
                }
                
                .form-group input {
                    width: 100%;
                    padding: 15px;
                    border: 2px solid #e1e8ed;
                    border-radius: 10px;
                    font-size: 16px;
                    transition: all 0.3s ease;
                    background: #f8f9fa;
                }
                
                .form-group input:focus {
                    outline: none;
                    border-color: #e74c3c;
                    background: white;
                    box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
                }
                
                .login-btn {
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #e74c3c, #c0392b);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-top: 10px;
                }
                
                .login-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(231, 76, 60, 0.3);
                }
                
                .login-btn:active {
                    transform: translateY(0);
                }
                
                .login-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .error-message {
                    background: #fee;
                    color: #c0392b;
                    padding: 15px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    border-left: 4px solid #e74c3c;
                    font-size: 14px;
                    display: none;
                }
                
                .loading {
                    display: none;
                    text-align: center;
                    margin-top: 20px;
                }
                
                .loading::after {
                    content: '';
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 2px solid #e74c3c;
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .login-footer {
                    background: #f8f9fa;
                    padding: 20px 30px;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                }
                
                .credentials-info {
                    background: #e8f5e8;
                    border: 1px solid #c3e6c3;
                    border-radius: 10px;
                    padding: 15px;
                    margin-bottom: 20px;
                    font-size: 14px;
                    color: #2d5a2d;
                }
                
                .credentials-info h4 {
                    margin-bottom: 10px;
                    color: #1e4d1e;
                }
                
                .credentials-info p {
                    margin: 5px 0;
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <div class="login-header">
                    <h1>🔐 Sistema de Gestão de Pagamentos da Crisma</h1>
                    <p>Santuário Mãe Rainha</p>
                </div>
                
                <div class="login-form">
                    <div class="credentials-info">
                        <h4>👤 Credenciais de Acesso:</h4>
                        <p>Entre com seu usuário e senha</p>
                    </div>
                    
                    <div id="errorMessage" class="error-message"></div>
                    
                    <form id="loginForm">
                        <div class="form-group">
                            <label for="usuario">👤 Usuário</label>
                            <input type="text" id="usuario" name="usuario" required autocomplete="username">
                        </div>
                        
                        <div class="form-group">
                            <label for="senha">🔒 Senha</label>
                            <input type="password" id="senha" name="senha" required autocomplete="current-password">
                        </div>
                        
                        <button type="submit" class="login-btn" id="loginBtn">
                            Entrar no Sistema
                        </button>
                        
                        <div class="loading" id="loading">
                            Verificando credenciais...
                        </div>
                    </form>
                </div>
                
                <div class="login-footer">
                    <p>🛡️ Sistema protegido por autenticação</p>
                    <p>© 2025 Santuário Mãe Rainha - Crisma de Adultos</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }
    
    // Configurar eventos do login
    setupLoginEvents() {
        const loginForm = document.getElementById('loginForm');
        const errorMessage = document.getElementById('errorMessage');
        const loginBtn = document.getElementById('loginBtn');
        const loading = document.getElementById('loading');
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const usuario = document.getElementById('usuario').value.trim();
            const senha = document.getElementById('senha').value;
            
            if (!usuario || !senha) {
                this.showError('Por favor, preencha todos os campos.');
                return;
            }
            
            // Mostrar loading
            loginBtn.disabled = true;
            loginBtn.textContent = 'Verificando...';
            loading.style.display = 'block';
            errorMessage.style.display = 'none';
            
            try {
                const result = await this.login(usuario, senha);
                
                if (result.success) {
                    loginBtn.textContent = '✅ Sucesso! Redirecionando...';
                    setTimeout(() => {
                        location.reload(); // Recarregar página principal
                    }, 1000);
                } else {
                    this.showError(result.error);
                }
            } catch (error) {
                this.showError('Erro interno. Tente novamente.');
                console.error('Erro no login:', error);
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Entrar no Sistema';
                loading.style.display = 'none';
            }
        });
        
        // Focar no campo usuário
        document.getElementById('usuario').focus();
    }
    
    // Mostrar erro
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Animar erro
        errorMessage.style.animation = 'none';
        setTimeout(() => {
            errorMessage.style.animation = 'slideUp 0.3s ease-out';
        }, 10);
    }
}

// Instância global
window.auth = new AuthSystem();
