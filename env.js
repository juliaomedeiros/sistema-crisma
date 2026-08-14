// env.js - Configurações de Ambiente (Supabase e Evolution Go)

const ENV = {
    SUPABASE_URL: 'https://yqqpugheqqknpbetysme.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxcXB1Z2hlcXFrbnBiZXR5c21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTkwNTUsImV4cCI6MjA2NTc3NTA1NX0.Q89vTdLgodaIsuLiIB6JijJPuzyrcRNPoTwUJ_gUQV4',
    
    // Configurações do Evolution Go (evolution-foundation/evolution-go)
    EVOLUTION_GO_URL: 'https://evolution-go-0-7-2-4.onrender.com/',
    EVOLUTION_GO_API_KEY: 'e79d536b-7a44-4312-9781-ec14b161d8a6',
    EVOLUTION_GO_INSTANCE: 'crisma-mae-rainha'
};

if (typeof window !== 'undefined') {
    window.ENV = ENV;
}

console.log('✅ Configurações do ambiente ENV (Supabase + Evolution Go) carregadas');
