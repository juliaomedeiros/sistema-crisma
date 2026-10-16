// supabase/functions/webhook-whatsapp/index.ts
// Webhook Oficial da Meta Cloud API para recebimento de respostas no Chat
// Regras estritas:
// 1. Armazena SOMENTE texto (nunca faz download nem armazena áudio, imagem, vídeo ou documentos).
// 2. Expurga automaticamente registros com mais de 45 dias.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

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

// Compara dois números brasileiros ignorando a presença ou ausência do 9º dígito após o DDD
function telefonesEquivalentes(telA: string, telB: string): boolean {
  const a = normalizarTelefone(telA);
  const b = normalizarTelefone(telB);
  if (!a || !b) return false;
  if (a === b) return true;
  // Comparar os últimos 8 dígitos + DDD (primeiros 4 dígitos: 55 + DDD)
  if (a.length >= 12 && b.length >= 12) {
    const prefixoA = a.substring(0, 4);
    const prefixoB = b.substring(0, 4);
    const sufixoA = a.slice(-8);
    const sufixoB = b.slice(-8);
    return prefixoA === prefixoB && sufixoA === sufixoB;
  }
  return false;
}

function traduzirTipoMidia(tipo: string): string {
  const mapa: Record<string, string> = {
    audio: "áudio",
    voice: "mensagem de voz",
    image: "imagem/foto",
    video: "vídeo",
    document: "documento/PDF",
    sticker: "figurinha",
    location: "localização",
    contacts: "contato",
  };
  return mapa[tipo] || tipo || "mídia";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // 1. VERIFICAÇÃO DO WEBHOOK PELA META (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyTokenEsperado = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "crisma_mae_rainha_webhook";

    if (mode === "subscribe" && token === verifyTokenEsperado) {
      console.log("✅ [Webhook Meta] Verificação de Webhook concluída com sucesso!");
      return new Response(challenge || "ok", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    return new Response("Token de verificação inválido", {
      status: 403,
      headers: corsHeaders,
    });
  }

  // 2. RECEBIMENTO DE EVENTOS / MENSAGENS DA META (POST)
  if (req.method === "POST") {
    try {
      const payload = await req.json();

      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey =
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
        Deno.env.get("SUPABASE_ANON_KEY") ||
        "";

      if (!supabaseUrl || !supabaseKey) {
        console.error("❌ Configurações do Supabase ausentes no Webhook.");
        return new Response(JSON.stringify({ ok: false }), { status: 200, headers: corsHeaders });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Limpeza automática de mensagens com mais de 45 dias
      const limite45Dias = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("mensagens_chat_whatsapp")
        .delete()
        .lt("created_at", limite45Dias);

      const entries = payload?.entry || [];
      let mensagensSalvas = 0;

      // Carregar lista leve de crismandos para vincular nome pelo telefone
      const { data: listaCrismandos } = await supabase
        .from("crismandos")
        .select("id, nome, telefone");

      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          const messages = value?.messages || [];
          const contacts = value?.contacts || [];

          for (const msg of messages) {
            const remetenteRaw = msg?.from || "";
            const telefoneNormalizado = normalizarTelefone(remetenteRaw);
            if (!telefoneNormalizado) continue;

            const metaMsgId = msg?.id || null;
            const tipoMsg = msg?.type || "unknown";

            // Nome do perfil no WhatsApp caso não encontre na tabela crismandos
            const contatoWhats = contacts.find((c: any) => c?.wa_id === remetenteRaw) || contacts[0];
            const nomePerfilWhats = contatoWhats?.profile?.name || "";

            // Vincular com crismando cadastrado
            let crismandoEncontrado: any = null;
            if (listaCrismandos && listaCrismandos.length > 0) {
              crismandoEncontrado = listaCrismandos.find((c: any) =>
                telefonesEquivalentes(c.telefone || "", telefoneNormalizado)
              );
            }

            const crismandoId = crismandoEncontrado ? crismandoEncontrado.id : null;
            const nomeContato = crismandoEncontrado
              ? crismandoEncontrado.nome
              : nomePerfilWhats || `+${telefoneNormalizado}`;

            // REGRA ESTRITA: Somente texto! Nunca baixar nem armazenar áudio, imagem ou vídeo
            let textoParaSalvar = "";
            if (tipoMsg === "text") {
              textoParaSalvar = String(msg?.text?.body || "").trim();
            } else if (tipoMsg === "button") {
              textoParaSalvar = String(msg?.button?.text || msg?.button?.payload || "[Botão clicado]").trim();
            } else if (tipoMsg === "interactive") {
              textoParaSalvar = String(
                msg?.interactive?.button_reply?.title ||
                msg?.interactive?.list_reply?.title ||
                "[Resposta interativa]"
              ).trim();
            } else if (tipoMsg === "reaction") {
              // Ignorar reações de emoji soltas para não poluir o banco
              continue;
            } else {
              const midiaNome = traduzirTipoMidia(tipoMsg);
              const legendaOpcional = msg?.[tipoMsg]?.caption ? ` Legenda enviada: "${msg[tipoMsg].caption}"` : "";
              textoParaSalvar = `⚠️ [O crismando enviou um(a) ${midiaNome}. Por regra do sistema, mídias (áudios, fotos e vídeos) não são armazenadas — apenas texto.${legendaOpcional}]`;
            }

            if (!textoParaSalvar) continue;

            // Timestamp original da mensagem na Meta (ou agora)
            const timestampMs = msg?.timestamp ? parseInt(String(msg.timestamp), 10) * 1000 : Date.now();
            const dataMsgIso = !isNaN(timestampMs) ? new Date(timestampMs).toISOString() : new Date().toISOString();

            // Evitar duplicação caso a Meta reenvie o mesmo evento
            if (metaMsgId) {
              const { data: jaExiste } = await supabase
                .from("mensagens_chat_whatsapp")
                .select("id")
                .eq("meta_message_id", metaMsgId)
                .maybeSingle();

              if (jaExiste) {
                continue;
              }
            }

            const { error: errInsert } = await supabase
              .from("mensagens_chat_whatsapp")
              .insert([
                {
                  crismando_id: crismandoId,
                  telefone: telefoneNormalizado,
                  nome_contato: nomeContato,
                  direcao: "recebida",
                  mensagem_texto: textoParaSalvar,
                  meta_message_id: metaMsgId,
                  lida: false,
                  created_at: dataMsgIso,
                },
              ]);

            if (!errInsert) {
              mensagensSalvas++;
              console.log(`✅ [Webhook Meta] Mensagem recebida salva de ${nomeContato} (${telefoneNormalizado})`);
            } else {
              console.error("⚠️ Erro ao salvar mensagem no chat:", errInsert.message);
            }
          }
        }
      }

      return new Response(JSON.stringify({ ok: true, mensagensSalvas }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("❌ Erro no processamento do Webhook Meta:", err);
      // Sempre retornar 200 para a Meta não desativar o webhook em caso de payload inesperado
      return new Response(JSON.stringify({ ok: true, warning: err?.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Método não suportado", { status: 405, headers: corsHeaders });
});
