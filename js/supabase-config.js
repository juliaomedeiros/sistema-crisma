
// supabase-config.js - VERSÃO CORRIGIDA

// Função para inicializar o Supabase (não declarar variável global aqui)
function initializeSupabase() {
    try {
        console.log('🔄 Tentando inicializar Supabase...');

        // Configuração do Supabase (com fallback das chaves públicas padrão)
        const SUPABASE_URL = (typeof ENV !== 'undefined' && ENV.SUPABASE_URL) ? ENV.SUPABASE_URL : 'https://yqqpugheqqknpbetysme.supabase.co';
        const SUPABASE_ANON_KEY = (typeof ENV !== 'undefined' && ENV.SUPABASE_ANON_KEY) ? ENV.SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxcXB1Z2hlcXFrbnBiZXR5c21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTkwNTUsImV4cCI6MjA2NTc3NTA1NX0.Q89vTdLgodaIsuLiIB6JijJPuzyrcRNPoTwUJ_gUQV4';

        // Verificar se a biblioteca Supabase está carregada
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Biblioteca Supabase não carregada');
            return null;
        }

        // Criar ou retornar cliente Supabase existente
        if (!window.supabaseClient) {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Novo cliente Supabase criado');
        } else {
            console.log('✅ Cliente Supabase já existente');
        }

        if (!window.supabaseClient) {
            console.error('❌ Falha ao criar cliente Supabase');
            return null;
        }

        console.log('✅ Supabase inicializado com sucesso');
        return window.supabaseClient;

    } catch (error) {
        console.error('❌ Erro ao inicializar Supabase:', error);
        return null;
    }
}

// Verificar conexão
async function testarConexao() {
    try {
        const supabase = getSupabaseClient();

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
    return window.supabaseClient || null;
}