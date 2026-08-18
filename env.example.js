const ENV = {
        SUPABASE_URL: 'SUA_URL_SUPABASE',
        SUPABASE_ANON_KEY: 'SUA_CHAVE_ANON',
        EVOLUTION_GO_URL: 'http://SEU_IP:8080/',
        EVOLUTION_GO_API_KEY: 'SUA_API_KEY',
        EVOLUTION_GO_INSTANCE: 'SEU_NOME_INSTANCIA'
    };
    if (typeof window !== 'undefined') window.ENV = ENV;