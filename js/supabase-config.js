// Configuração do Supabase
const SUPABASE_URL = ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY;

// Verificar se as variáveis foram carregadas
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Erro: Variáveis de ambiente não configuradas');
    throw new Error('Configuração de banco de dados inválida');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Verificar conexão
async function testarConexao() {
    try {
        const { data, error } = await supabase.from('crismandos').select('count');
        if (error) throw error;
        console.log('Conexão com Supabase estabelecida com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro na conexão com Supabase:', error);
        return false;
    }
}
