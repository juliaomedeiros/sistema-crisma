// supabase/functions/processar-fila-whatsapp/index.ts
// Worker autônomo acionado pelo pg_cron a cada 2 minutos
// Exclusivo Meta Cloud API Oficial (Limite de 250 msgs/dia, sem Evolution Go)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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

function getAgoraBrasilia(): { dataHoje: string; hora: number; minuto: number; agoraISO: string } {
  const agora = new Date();
  const utc = agora.getTime() + agora.getTimezoneOffset() * 60000;
  const brasiliaTime = new Date(utc - 3 * 3600000);

  const ano = brasiliaTime.getFullYear();
  const mes = String(brasiliaTime.getMonth() + 1).padStart(2, "0");
  const dia = String(brasiliaTime.getDate()).padStart(2, "0");
  const dataHoje = `${ano}-${mes}-${dia}`;
  const hora = brasiliaTime.getHours();
  const minuto = brasiliaTime.getMinutes();

  return { dataHoje, hora, minuto, agoraISO: agora.toISOString() };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const { dataHoje, hora, agoraISO } = getAgoraBrasilia();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY") ||
      "";

    // Meta API Secrets Obrigatórios
    const META_PHONE_ID = Deno.env.get("META_PHONE_ID");
    const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Configurações do Supabase ausentes", { requestId });
      return new Response(JSON.stringify({ error: "Configurações incompletas no servidor." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!META_PHONE_ID || !META_ACCESS_TOKEN) {
      console.error("Credenciais da Meta API ausentes", { requestId });
      return new Response(JSON.stringify({ error: "Credenciais da Meta API ausentes no Supabase." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. REGRA: HORÁRIO COMERCIAL (08:00 às 20:00 - Horário de Brasília)
    if (hora < 8 || hora >= 20) {
      console.log(`🌙 [Worker Fila - Meta] Fora do horário comercial (${hora}h Brasília). Pausando até as 08:00.`);
      return new Response(
        JSON.stringify({
          ok: true,
          pausado: true,
          motivo: `Fora do horário comercial (atualmente ${hora}h). Envio permitido entre 08h e 20h.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. RECUPERAR MENSAGENS PRESAS EM 'processando' HÁ MAIS DE 10 MINUTOS
    const dezMinutosAtras = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await supabase
      .from("fila_mensagens_whatsapp")
      .update({ status: "pendente", updated_at: agoraISO })
      .eq("status", "processando")
      .lte("updated_at", dezMinutosAtras);

    // 2.1 EXPURGO AUTOMÁTICO DE MENSAGENS DO CHAT COM MAIS DE 45 DIAS
    try {
      const limite45Dias = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("mensagens_chat_whatsapp")
        .delete()
        .lt("created_at", limite45Dias);
    } catch (_) {
      // Ignora silenciosamente caso a tabela ainda não tenha sido criada
    }

    // 3. CONTROLE DE VOLUME DIÁRIO (Teto de 250 msgs/dia na Meta)
    const LIMITE_PADRAO = 250;

    let { data: controle } = await supabase
      .from("controle_envios_diarios")
      .select("*")
      .eq("data", dataHoje)
      .maybeSingle();

    if (!controle) {
      const { data: novoControle } = await supabase
        .from("controle_envios_diarios")
        .insert({ data: dataHoje, total_enviados: 0, limite_diario: LIMITE_PADRAO })
        .select("*")
        .single();
      controle = novoControle || { total_enviados: 0, limite_diario: LIMITE_PADRAO };
    }

    const limiteDiario = controle.limite_diario || LIMITE_PADRAO;
    const totalHoje = controle.total_enviados || 0;

    if (totalHoje >= limiteDiario) {
      console.log(`🛑 [Worker Fila - Meta] Limite diário de ${limiteDiario} envios atingido para hoje (${dataHoje}).`);
      return new Response(
        JSON.stringify({
          ok: true,
          pausado: true,
          motivo: `Limite diário atingido (${totalHoje}/${limiteDiario}).`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const quotaRestante = limiteDiario - totalHoje;
    // Processa em lote de até 5 mensagens por ciclo de 2 min
    const batchSize = Math.min(quotaRestante, 5);

    // 4. SELEÇÃO DE MENSAGENS ALVO (Reagendadas prioritárias + Pendentes)
    const alvos: any[] = [];

    // Prioridade 1: Reagendadas cujo agendado_para já chegou
    const { data: reagendadas } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("*")
      .in("status", ["reagendado_463", "reagendado_500"])
      .lte("agendado_para", agoraISO)
      .order("agendado_para", { ascending: true })
      .limit(batchSize);

    if (reagendadas && reagendadas.length > 0) {
      alvos.push(...reagendadas);
    }

    // Prioridade 2: Pendentes normais até completar o lote
    const vagas = batchSize - alvos.length;
    if (vagas > 0) {
      const { data: pendentes } = await supabase
        .from("fila_mensagens_whatsapp")
        .select("*")
        .eq("status", "pendente")
        .order("prioridade", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(vagas);

      if (pendentes && pendentes.length > 0) {
        alvos.push(...pendentes);
      }
    }

    if (alvos.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processados: 0, message: "Fila limpa. Nenhuma mensagem pendente no momento." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🚀 [Worker Fila - Meta] Iniciando envio de lote com ${alvos.length} mensagem(ns)...`);

    let enviadosNestaRodada = 0;
    let falhasNestaRodada = 0;
    let novoTotalDiario = totalHoje;

    for (const mensagemAlvo of alvos) {
      // Marcar como processando
      await supabase
        .from("fila_mensagens_whatsapp")
        .update({ status: "processando", updated_at: agoraISO })
        .eq("id", mensagemAlvo.id);

      const telefoneNorm = normalizarTelefone(mensagemAlvo.telefone);
      const textoMsg = mensagemAlvo.mensagem_texto || mensagemAlvo.mensagem || "";
      const nomeDest = mensagemAlvo.nome_destinatario || extrairNome(textoMsg) || "Crismando";

      if (!telefoneNorm || telefoneNorm.length < 12) {
        await supabase
          .from("fila_mensagens_whatsapp")
          .update({
            status: "falha_definitiva",
            erro_log: "Telefone inválido ou não cadastrado.",
            updated_at: agoraISO,
          })
          .eq("id", mensagemAlvo.id);
        falhasNestaRodada++;
        continue;
      }

      // Determinar Template e Parâmetros
      let templateName = "";
      let templateParams: string[] = [];

      if (mensagemAlvo.dados_template?.template) {
        templateName = mensagemAlvo.dados_template.template;
        templateParams = mensagemAlvo.dados_template.params || [];
      } else {
        const tipo = mensagemAlvo.tipo || mensagemAlvo.tipo_envio || "aviso_lote";

        if (tipo === "cobranca") {
          templateName = "lembrete_mensalidade_crisma";
          templateParams = [
            nomeDest,
            extrairMesAno(textoMsg) || "Mês Corrente",
            extrairValor(textoMsg) || "10,00",
          ];
        } else if (tipo === "recibo") {
          templateName = "comprovante_pagamento_crisma";
          templateParams = [
            nomeDest,
            extrairMesAno(textoMsg) || "Mensalidade",
            extrairValor(textoMsg) || "10,00",
          ];
        } else if (tipo === "aviso_falta") {
          if (textoMsg.includes("total de faltas") || textoMsg.includes("resumo") || textoMsg.includes("acumulada(s)")) {
            templateName = "resumo_faltas_crisma";
            templateParams = [
              nomeDest,
              extrairFaltas(textoMsg) || "1",
            ];
          } else {
            templateName = "aviso_ausencia_crisma";
            templateParams = [
              nomeDest,
              extrairData(textoMsg) || dataHoje,
              extrairFaltas(textoMsg) || "1",
            ];
          }
        } else {
          templateName = "comunicado_geral_crisma";
          templateParams = [nomeDest, limparTextoAviso(textoMsg)];
        }
      }

      const metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: telefoneNorm,
        type: "template",
        template: {
          name: templateName,
          language: { code: "pt_BR" },
          components: [
            {
              type: "body",
              parameters: templateParams.map((p) => ({ type: "text", text: String(p || "") })),
            },
          ],
        },
      };

      try {
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
          // Sucesso via Meta Cloud API!
          await supabase
            .from("fila_mensagens_whatsapp")
            .update({
              status: "enviado",
              enviado_em: agoraISO,
              erro_log: null,
              codigo_erro: 200,
              updated_at: agoraISO,
            })
            .eq("id", mensagemAlvo.id);

          novoTotalDiario++;
          enviadosNestaRodada++;

          await supabase
            .from("controle_envios_diarios")
            .update({ total_enviados: novoTotalDiario, updated_at: agoraISO })
            .eq("data", dataHoje);

          console.log(`✅ [Worker Fila - Meta] Mensagem ${mensagemAlvo.id} enviada para ${telefoneNorm}! (${novoTotalDiario}/${limiteDiario})`);

          if (mensagemAlvo.lote_id) {
            await checarENotificarConclusaoLote(supabase, mensagemAlvo.lote_id, META_PHONE_ID, META_ACCESS_TOKEN);
          }
        } else {
          // Meta Recusou
          console.warn(`⚠️ [Worker Fila - Meta] Recusa da Meta para ${telefoneNorm}:`, metaText);
          const erroMeta = metaJson?.error?.message || metaText;
          const codigoMeta = metaJson?.error?.code || metaRes.status;

          // Se for erro de template em análise (code 132000, 132001 ou mensagem de template), reagenda para 15 minutos sem falhar
          const isTemplatePending = codigoMeta === 132000 || codigoMeta === 132001 || erroMeta.toLowerCase().includes("template");

          if (isTemplatePending) {
            const reagendarPara = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            await supabase
              .from("fila_mensagens_whatsapp")
              .update({
                status: "reagendado_500",
                agendado_para: reagendarPara,
                codigo_erro: codigoMeta,
                erro_log: `Template (${templateName}) aguardando aprovação na Meta. Reagendado para 15 min.`,
                updated_at: agoraISO,
              })
              .eq("id", mensagemAlvo.id);
          } else {
            // Outros erros
            const tentativas = (mensagemAlvo.tentativas || 0) + 1;
            if (tentativas >= 3) {
              await supabase
                .from("fila_mensagens_whatsapp")
                .update({
                  status: "falha_definitiva",
                  tentativas,
                  codigo_erro: codigoMeta,
                  erro_log: `Meta API: ${erroMeta.slice(0, 200)}`,
                  updated_at: agoraISO,
                })
                .eq("id", mensagemAlvo.id);
            } else {
              const dataReag = new Date(Date.now() + 10 * 60 * 1000).toISOString();
              await supabase
                .from("fila_mensagens_whatsapp")
                .update({
                  status: "reagendado_500",
                  agendado_para: dataReag,
                  tentativas,
                  codigo_erro: codigoMeta,
                  erro_log: `Meta API: ${erroMeta.slice(0, 150)}`,
                  updated_at: agoraISO,
                })
                .eq("id", mensagemAlvo.id);
            }
          }
          falhasNestaRodada++;
        }
      } catch (metaErr: any) {
        console.error("❌ [Worker Fila - Meta] Exceção de rede na Meta:", metaErr);
        falhasNestaRodada++;
      }

      // Pequena pausa entre envios do lote (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processados: alvos.length,
        enviados: enviadosNestaRodada,
        falhas: falhasNestaRodada,
        totalHoje: novoTotalDiario,
        limiteDiario,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("❌ [Worker Fila] Erro geral:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Funções utilitárias de extração de parâmetros
function extrairNome(txt: string): string {
  const m = txt.match(/Olá,\s*([^.]+)\./i);
  return m ? m[1].trim() : "Crismando";
}

function extrairMesAno(txt: string): string {
  const m = txt.match(/mês\(es\):\s*\*([^*]+)\*/i) ||
            txt.match(/mês de:\s*\*([^*]+)\*/i) ||
            txt.match(/mês de\s*\*([^*]+)\*/i) ||
            txt.match(/\*([A-Za-zçãõ\s,0-9\/]+)\*/i);
  return m ? m[1].trim() : "Mês Corrente";
}

function extrairValor(txt: string): string {
  const m = txt.match(/Valor(?:\s*Total)?:\s*R\$\s*([\d,.]+)/i) ||
            txt.match(/R\$\s*([\d,.]+)/i);
  return m ? m[1].trim() : "10,00";
}

function extrairData(txt: string): string {
  const m = txt.match(/(\d{2}\/\d{2}\/\d{4})/);
  return m ? m[1] : "";
}

function extrairFaltas(txt: string): string {
  const m = txt.match(/\*(\d+)\s*falta/i) || txt.match(/(\d+)\s*falta/i);
  return m ? m[1] : "1";
}

function limparTextoAviso(txt: string): string {
  return txt
    .replace(/^Paz e bem,?\s*[^!.]+!/i, "")
    .replace(/Pastoral da Crisma.*$/is, "")
    .trim();
}

async function checarENotificarConclusaoLote(
  supabase: any,
  loteId: string,
  metaPhoneId: string,
  metaToken: string
) {
  try {
    const { count: pendentesCount } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("*", { count: "exact", head: true })
      .eq("lote_id", loteId)
      .in("status", ["pendente", "processando", "reagendado_463", "reagendado_500"]);

    if (pendentesCount !== 0) return;

    const { data: todos } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("*")
      .eq("lote_id", loteId);

    if (!todos || todos.length === 0) return;

    const total = todos.length;
    const sucessos = todos.filter((m: any) => m.status === "enviado").length;
    const falhas = todos.filter((m: any) => m.status === "falha_definitiva").length;

    console.log(`🎉 [Lote Concluído] Lote ${loteId}: ${sucessos}/${total} entregues, ${falhas} falhas.`);
  } catch (e) {
    console.warn("⚠️ Falha ao verificar lote:", e);
  }
}
