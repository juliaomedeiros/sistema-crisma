// supabase/functions/processar-fila-reagendada/index.ts
// Edge Function de background acionada por cron / pg_cron no Supabase para reprocessar mensagens reagendadas em 2h

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    const EVOLUTION_URL = Deno.env.get("EVOLUTION_GO_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY");
    const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_GO_INSTANCE") || "crisma-mae-rainha";

    if (!supabaseUrl || !supabaseServiceKey || !EVOLUTION_URL || !EVOLUTION_API_KEY) {
      console.error("Configurações ausentes para processar fila", { requestId });
      return new Response(JSON.stringify({ error: "Configurações incompletas no servidor." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const agora = new Date().toISOString();

    // 1. Buscar mensagens reagendadas com agendado_para <= agora
    const { data: mensagens, error: fetchError } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("*")
      .eq("status", "reagendado_463")
      .lte("agendado_para", agora)
      .limit(20);

    if (fetchError) {
      console.error("Erro ao buscar mensagens reagendadas", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!mensagens || mensagens.length === 0) {
      return new Response(JSON.stringify({ ok: true, processados: 0, message: "Nenhuma mensagem reagendada pendente." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`⏳ [Cron Edge] Iniciando reenvio de ${mensagens.length} mensagens reagendadas...`, { requestId });

    const cleanBaseUrl = EVOLUTION_URL.replace(/\/+$/, "");
    const targetUrl = `${cleanBaseUrl}/send/text`;
    let sucessos = 0;
    let falhas = 0;

    for (const item of mensagens) {
      if (!item.telefone || !item.mensagem_texto) continue;

      const numLimpo = item.telefone.replace(/\D/g, "");
      const numFormatado = numLimpo.startsWith("55") ? numLimpo : `55${numLimpo}`;

      await supabase.from("fila_mensagens_whatsapp").update({ status: "processando" }).eq("id", item.id);

      const payload = {
        instance: EVOLUTION_INSTANCE,
        number: numFormatado,
        text: item.mensagem_texto,
        options: { delay: 1200, presence: "composing", linkPreview: false },
        textMessage: { text: item.mensagem_texto },
      };

      try {
        const evoRes = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": EVOLUTION_API_KEY,
          },
          body: JSON.stringify(payload),
        });

        const evoText = await evoRes.text();
        const isOk = evoRes.ok && !evoText.includes("463");

        if (isOk) {
          sucessos++;
          await supabase.from("fila_mensagens_whatsapp").update({
            status: "enviado",
            enviado_em: new Date().toISOString(),
            erro_log: null,
          }).eq("id", item.id);
        } else {
          falhas++;
          const tentativas = (item.tentativas || 1) + 1;
          if (tentativas >= 2) {
            await supabase.from("fila_mensagens_whatsapp").update({
              status: "falha_definitiva",
              tentativas,
              erro_log: "Não foi possível entregar após reenvio automático. Verifique o número no WhatsApp.",
            }).eq("id", item.id);
          } else {
            const proximaData = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
            await supabase.from("fila_mensagens_whatsapp").update({
              status: "reagendado_463",
              agendado_para: proximaData,
              tentativas,
              erro_log: "WhatsApp recusou envio no reenvio. Reagendado para mais 2h.",
            }).eq("id", item.id);
          }
        }
      } catch (err: any) {
        falhas++;
        console.error(`Erro ao enviar para ${item.telefone}:`, err);
      }
    }

    return new Response(JSON.stringify({ ok: true, processados: mensagens.length, sucessos, falhas }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Erro interno ao processar fila" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
