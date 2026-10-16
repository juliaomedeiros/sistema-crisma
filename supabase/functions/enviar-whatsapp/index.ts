// supabase/functions/enviar-whatsapp/index.ts
// Proxy de envio de WhatsApp: Exclusivo Meta Cloud API Oficial (Sem Evolution Go)

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

function normalizarTelefone(telefone: string): string {
  let numLimpo = String(telefone || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!numLimpo) return "";
  if (numLimpo.startsWith("55") && (numLimpo.length === 12 || numLimpo.length === 13)) {
    return numLimpo;
  } else if (numLimpo.length === 10 || numLimpo.length === 11) {
    return `55${numLimpo}`;
  } else if (numLimpo.length === 8 || numLimpo.length === 9) {
    return `5583${numLimpo}`;
  }
  return numLimpo.startsWith("55") ? numLimpo : `55${numLimpo}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    if (req.method !== "POST") {
      return jsonResponse({ ok: false, requestId, error: "Método não permitido" }, 405);
    }

    const body = await req.json();
    const { telefone, mensagem, templateName, templateParams, dados_template, modoTextoLivre } = body ?? {};

    if (!telefone) {
      return jsonResponse({ ok: false, requestId, error: "Telefone é obrigatório." }, 400);
    }

    const numFormatado = normalizarTelefone(telefone);
    if (!numFormatado || numFormatado.length < 12) {
      return jsonResponse({ ok: false, requestId, error: `Telefone inválido: ${telefone}` }, 400);
    }

    // Credenciais Meta Cloud API Oficial
    const META_PHONE_ID = Deno.env.get("META_PHONE_ID");
    const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");

    if (!META_PHONE_ID || !META_ACCESS_TOKEN) {
      console.error("Credenciais da Meta API ausentes nos secrets", { requestId });
      return jsonResponse(
        {
          ok: false,
          requestId,
          error: "Credenciais da Meta Cloud API (META_PHONE_ID / META_ACCESS_TOKEN) não configuradas no servidor.",
        },
        500
      );
    }

    let metaPayload: any = null;
    let finalTplName = modoTextoLivre ? null : (templateName || dados_template?.template);
    let finalTplParams = templateParams || dados_template?.params || [];

    // Auto-detecção de template oficial se apenas mensagem for fornecida (exceto quando modoTextoLivre = true no Chat 24h)
    if (!modoTextoLivre && !finalTplName && mensagem) {
      const nomeDest = (mensagem.match(/Olá,\s*([^.]+)\./i)?.[1] || "Crismando").trim();
      if (mensagem.includes("Confirmamos o recebimento da sua")) {
        finalTplName = "comprovante_pagamento_crisma";
        const mes = (mensagem.match(/mês\(es\):\s*\*([^*]+)\*/i)?.[1] || "Mensalidade").trim();
        const valor = (mensagem.match(/Valor(?:\s*Total)?:\s*R\$\s*([\d,.]+)/i)?.[1] || "10,00").trim();
        finalTplParams = [nomeDest, mes, valor];
      } else if (mensagem.includes("Passando para lembrar sobre a contribuição")) {
        finalTplName = "lembrete_mensalidade_crisma";
        const mes = (mensagem.match(/mês de:\s*\*([^*]+)\*/i)?.[1] || mensagem.match(/mês de\s*\*([^*]+)\*/i)?.[1] || "Mês Corrente").trim();
        const valor = (mensagem.match(/Valor:\s*R\$\s*([\d,.]+)/i)?.[1] || "10,00").trim();
        finalTplParams = [nomeDest, mes, valor];
      } else if (mensagem.includes("total de faltas") || mensagem.includes("resumo de frequência") || mensagem.includes("acumulada(s)")) {
        finalTplName = "resumo_faltas_crisma";
        const faltas = (mensagem.match(/(\d+)\s*falta/i)?.[1] || "1").trim();
        finalTplParams = [nomeDest, faltas];
      } else if (mensagem.includes("Registramos a sua ausência")) {
        finalTplName = "aviso_ausencia_crisma";
        const dataEnc = (mensagem.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || "").trim();
        const faltas = (mensagem.match(/\*(\d+)\s*falta/i)?.[1] || "1").trim();
        finalTplParams = [nomeDest, dataEnc, faltas];
      } else {
        finalTplName = "comunicado_geral_crisma";
        const textoLimpo = mensagem.replace(/^Paz e bem,?\s*[^!.]+!/i, "").replace(/Pastoral da Crisma.*$/is, "").trim();
        finalTplParams = [nomeDest, textoLimpo];
      }
    }

    if (finalTplName) {
      // Disparo via Template Oficial Meta
      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: numFormatado,
        type: "template",
        template: {
          name: finalTplName,
          language: { code: "pt_BR" },
          components: finalTplParams.length > 0 ? [
            {
              type: "body",
              parameters: finalTplParams.map((p: any) => ({
                type: "text",
                text: String(p ?? ""),
              })),
            },
          ] : [],
        },
      };
    } else if (mensagem) {
      // Envio como texto livre (janela de atendimento)
      metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: numFormatado,
        type: "text",
        text: { preview_url: false, body: mensagem },
      };
    } else {
      return jsonResponse({ ok: false, requestId, error: "Mensagem ou template obrigatório para envio." }, 400);
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${META_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${META_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      }
    );

    const metaText = await metaRes.text();
    let metaJson: any = {};
    try { metaJson = JSON.parse(metaText); } catch {}

    if (metaRes.ok && metaJson?.messages?.length > 0) {
      console.log(`✅ [Meta API] Mensagem entregue via Meta! MessageID: ${metaJson.messages[0].id}`);
      return jsonResponse({
        ok: true,
        canal: "meta_cloud_api",
        messageId: metaJson.messages[0].id,
        requestId,
        data: metaJson,
      });
    } else {
      console.warn(`⚠️ [Meta API] Recusa da Meta:`, metaText);
      return jsonResponse({
        ok: false,
        canal: "meta_cloud_api",
        requestId,
        error: metaJson?.error?.message || "Falha no envio via Meta API Oficial.",
        details: metaJson,
      }, 200);
    }

  } catch (err: any) {
    return jsonResponse({
      ok: false,
      requestId,
      error: err?.message || "Erro interno ao processar envio.",
    }, 500);
  }
});
