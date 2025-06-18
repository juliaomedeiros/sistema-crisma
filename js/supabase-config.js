// Configuração do Supabase
const SUPABASE_URL = 'https://yqqpugheqqknpbetysme.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxcXB1Z2hlcXFrbnBiZXR5c21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTkwNTUsImV4cCI6MjA2NTc3NTA1NX0.Q89vTdLgodaIsuLiIB6JijJPuzyrcRNPoTwUJ_gUQV4';

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
