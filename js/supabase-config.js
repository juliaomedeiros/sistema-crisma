// supabase-config.js - VERSÃO CORRIGIDA COMPLETA
let supabase = null;

function initializeSupabase() {
    try {
        console.log('🔄 Tentando inicializar Supabase...');
        
        // Verificar se ENV está disponível
        if (typeof ENV === 'undefined') {
            console.error('❌ ENV não definido - arquivo env.js não foi carregado');
            return null;
        }
        
        console.log('✅ ENV encontrado:', {
            hasUrl: !!ENV.SUPABASE_URL,
            hasKey: !!ENV.SUPABASE_ANON_KEY,
            urlLength: ENV.SUPABASE_URL ? ENV.SUPABASE_URL.length : 0,
            keyLength: ENV.SUPABASE_ANON_KEY ? ENV.SUPABASE_ANON_KEY.length : 0
        });

        // Configuração do Supabase
        const SUPABASE_URL = ENV.SUPABASE_URL;
        const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY;

        // Verificar se as variáveis foram carregadas
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error('❌ Erro: Variáveis de ambiente não configuradas');
            console.log('URL:', SUPABASE_URL);
            console.log('KEY:', SUPABASE_ANON_KEY ? 'Presente' : 'Ausente');
            return null;
        }

        // Verificar se a biblioteca Supabase está carregada
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Biblioteca Supabase não carregada');
            return null;
        }

        // Criar cliente Supabase
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        if (!supabase) {
            console.error('❌ Falha ao criar cliente Supabase');
            return null;
        }
        
        console.log('✅ Supabase inicializado com sucesso');
        return supabase;
        
    } catch (error) {
        console.error('❌ Erro ao inicializar Supabase:', error);
        return null;
    }
}

// Verificar conexão
async function testarConexao() {
    try {
        if (!supabase) {
            console.error('❌ Supabase não foi inicializado');
            return false;
        }
        
        console.log('🔄 Testando conexão com banco...');
        
        const { data, error } = await supabase.from('crismandos').select('count');
        if (error) {
            console.error('❌ Erro na consulta:', error);
            throw error;
        }
        
        console.log('✅ Conexão com Supabase estabelecida com sucesso!');
        return true;
    } catch (error) {
        console.error('❌ Erro na conexão com Supabase:', error);
        return false;
    }
}

// Função para obter cliente Supabase
function getSupabaseClient() {
    return supabase;
}
