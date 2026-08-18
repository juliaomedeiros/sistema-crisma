// supabase/functions/enviar-whatsapp/index.ts
// Proxy seguro para Evolution Go (Oracle Cloud)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { telefone, mensagem } = await req.json();

    if (!telefone || !mensagem) {
      return new Response(
        JSON.stringify({ error: "Telefone e mensagem são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const EVOLUTION_URL = Deno.env.get("EVOLUTION_GO_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY");
    const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_GO_INSTANCE") || "crisma-mae-rainha";

    if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Configurações da Evolution API não encontradas no servidor." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numLimpo = telefone.replace(/\D/g, "");
    const numFormatado = numLimpo.startsWith("55") ? numLimpo : "55" + numLimpo;

    const payload = {
      instance: EVOLUTION_INSTANCE,
      number: numFormatado,
      text: mensagem,
      options: {
        delay: 1200,
        presence: "composing",
        linkPreview: false
      },
      textMessage: {
        text: mensagem
      }
    };

    const targetUrl = `${EVOLUTION_URL.replace(/\/$/, "")}/send/text`;

    const evoResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const evoData = await evoResponse.text();

    return new Response(evoData, {
      status: evoResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno ao enviar mensagem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
