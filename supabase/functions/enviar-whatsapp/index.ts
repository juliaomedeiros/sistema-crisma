// supabase/functions/enviar-whatsapp/index.ts
// Proxy seguro para Evolution Go (Oracle Cloud) com tratamento estruturado de erros

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        {
          ok: false,
          requestId,
          error: "Método não permitido",
        },
        405
      );
    }

    const body = await req.json();
    const { telefone, mensagem } = body ?? {};

    if (!telefone || !mensagem) {
      return jsonResponse(
        {
          ok: false,
          requestId,
          error: "Telefone e mensagem são obrigatórios.",
        },
        400
      );
    }

    const EVOLUTION_URL = Deno.env.get("EVOLUTION_GO_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY");
    const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_GO_INSTANCE") || "crisma-mae-rainha";

    if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
      console.error("Secrets da Evolution não configurados", {
        requestId,
        hasUrl: Boolean(EVOLUTION_URL),
        hasApiKey: Boolean(EVOLUTION_API_KEY),
      });

      return jsonResponse(
        {
          ok: false,
          requestId,
          error: "Configurações da Evolution API não encontradas no servidor.",
        },
        500
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
        linkPreview: false,
      },
      textMessage: {
        text: mensagem,
      },
    };

    const cleanBaseUrl = EVOLUTION_URL.replace(/\/+$/, "");
    let targetUrl = `${cleanBaseUrl}/send/text`;

    console.log("Enviando para Evolution Go", {
      requestId,
      targetUrl,
      instance: EVOLUTION_INSTANCE,
      number: numFormatado,
      messageLength: mensagem.length,
    });

    const startedAt = Date.now();

    // Controller para timeout de 15 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let evoResponse: Response;
    try {
      evoResponse = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": EVOLUTION_API_KEY,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const evoText = await evoResponse.text();
    const durationMs = Date.now() - startedAt;

    console.log("Resposta da Evolution Go", {
      requestId,
      status: evoResponse.status,
      durationMs,
      response: evoText.slice(0, 1000),
    });

    let evoBody: any = evoText;
    try {
      evoBody = JSON.parse(evoText);
    } catch {
      // Mantém string se não for JSON
    }

    // Verificar erro 463 ou recusas do WhatsApp
    const isError463 =
      evoText.includes("463") ||
      (typeof evoBody === "object" && evoBody?.error?.includes("463"));

    if (!evoResponse.ok || isError463) {
      console.warn("⚠️ Recusa/Erro no envio via Evolution Go", {
        requestId,
        status: evoResponse.status,
        isError463,
        details: evoBody,
      });

      return jsonResponse({
        ok: false,
        requestId,
        evolutionStatus: evoResponse.status,
        isError463,
        errorCode: isError463 ? 463 : evoResponse.status,
        error: isError463
          ? "O WhatsApp recusou o envio imediato para este número."
          : "Falha ao enviar mensagem via Evolution Go.",
        details: evoBody,
      }, 200); // Retorna HTTP 200 para a aplicação client-side poder tratar o reagendamento graciosamente
    }

    return jsonResponse({
      ok: true,
      requestId,
      evolutionStatus: evoResponse.status,
      data: evoBody,
    }, 200);

  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    console.error("Erro não tratado na Edge Function", {
      requestId,
      isTimeout: isAbort,
      error: err?.message || String(err),
    });

    return jsonResponse(
      {
        ok: false,
        requestId,
        isTimeout: isAbort,
        error: isAbort
          ? "Tempo limite de resposta com o servidor WhatsApp excedido."
          : (err?.message || "Erro interno ao enviar mensagem."),
      },
      200
    );
  }
});

