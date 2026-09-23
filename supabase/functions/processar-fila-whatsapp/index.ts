// supabase/functions/processar-fila-whatsapp/index.ts
// Worker autônomo acionado pelo pg_cron a cada 2 minutos
// Gerencia limites diários (60/dia), horário comercial, anti-ban inteligente e alerta ao coordenador

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

// Retorna data e hora atual no fuso horário de Brasília (UTC-3)
function getAgoraBrasilia(): { dataHoje: string; hora: number; minuto: number; agoraISO: string } {
  const agora = new Date();
  // Brasília é UTC-3
  const utc = agora.getTime() + agora.getTimezoneOffset() * 60000;
  const brasiliaTime = new Date(utc - 3 * 3600000);

  const ano = brasiliaTime.getFullYear();
  const mes = String(brasiliaTime.getMonth() + 1).padStart(2, "0");
  const dia = String(brasiliaTime.getDate()).padStart(2, "0");
  const dataHoje = `${ano}-${mes}-${dia}`;
  const hora = brasiliaTime.getHours();
  const minuto = brasiliaTime.getMinutes();

  return {
    dataHoje,
    hora,
    minuto,
    agoraISO: agora.toISOString(),
  };
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
    const EVOLUTION_URL = Deno.env.get("EVOLUTION_GO_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY");
    const EVOLUTION_INSTANCE = Deno.env.get("EVOLUTION_GO_INSTANCE") || "crisma-mae-rainha";

    if (!supabaseUrl || !supabaseServiceKey || !EVOLUTION_URL || !EVOLUTION_API_KEY) {
      console.error("Configurações ausentes para o worker", { requestId });
      return new Response(JSON.stringify({ error: "Configurações incompletas no servidor." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. REGRA ANTI-BAN: HORÁRIO COMERCIAL (08:00 às 20:00 - Brasília)
    if (hora < 8 || hora >= 20) {
      console.log(`🌙 [Worker Fila] Fora do horário comercial (${hora}h Brasília). Pausando até as 08:00.`);
      return new Response(
        JSON.stringify({
          ok: true,
          pausado: true,
          motivo: `Fora do horário comercial (atualmente ${hora}h). Envio permitido entre 08h e 20h.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. REGRA ANTI-BAN: JITTER ALEATÓRIO (Gaps naturais de pausa entre 2 e 4 min)
    // 20% das chamadas do cron são puladas para criar intervalos humanos irregulares
    if (Math.random() < 0.20) {
      console.log(`🎲 [Worker Fila] Jitter natural ativado. Pulando execução para variar intervalo de envio.`);
      return new Response(
        JSON.stringify({ ok: true, pausado: true, motivo: "Jitter aleatório anti-padrão executado." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. REGRA ANTI-BAN: VERIFICAR CONTROLE DIÁRIO (Teto de 60/dia e Timelock)
    let { data: controle, error: errControle } = await supabase
      .from("controle_envios_diarios")
      .select("*")
      .eq("data", dataHoje)
      .maybeSingle();

    if (!controle) {
      const { data: novoControle } = await supabase
        .from("controle_envios_diarios")
        .insert({ data: dataHoje, total_enviados: 0, limite_diario: 60 })
        .select("*")
        .single();
      controle = novoControle || { total_enviados: 0, limite_diario: 60, timelock_ativo: false };
    }

    // Verificar se timelock está ativo
    if (controle.timelock_ativo) {
      if (controle.timelock_expira && new Date(controle.timelock_expira) <= new Date()) {
        // Expirou! Desbloquear
        await supabase
          .from("controle_envios_diarios")
          .update({ timelock_ativo: false, timelock_expira: null })
          .eq("data", dataHoje);
        console.log(`🔓 [Worker Fila] Restrição Timelock expirou! Retomando envios normais.`);
      } else {
        console.warn(`⏳ [Worker Fila] Timelock ativo até ${controle.timelock_expira}. Fila congelada.`);
        return new Response(
          JSON.stringify({
            ok: true,
            pausado: true,
            motivo: `Timelock ativo até ${controle.timelock_expira}. Fila congelada para proteção do número.`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Verificar teto diário de 60
    const limiteDiario = controle.limite_diario || 60;
    if (controle.total_enviados >= limiteDiario) {
      console.log(`🛑 [Worker Fila] Limite diário de ${limiteDiario} envios atingido para hoje (${dataHoje}).`);
      return new Response(
        JSON.stringify({
          ok: true,
          pausado: true,
          motivo: `Limite diário atingido (${controle.total_enviados}/${limiteDiario}). O worker retomará amanhã às 08:00.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. VERIFICAR SE HÁ MENSAGEM REAGENDADA PRONTA (Prioridade 1)
    let mensagemAlvo: any = null;
    const { data: reagendadas } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("*")
      .in("status", ["reagendado_463", "reagendado_500"])
      .lte("agendado_para", agoraISO)
      .order("agendado_para", { ascending: true })
      .limit(1);

    if (reagendadas && reagendadas.length > 0) {
      mensagemAlvo = reagendadas[0];
    } else {
      // 5. SE NÃO HOUVER REAGENDADA, PEGAR A PRÓXIMA PENDENTE DA FILA (Prioridade 2)
      const { data: pendentes } = await supabase
        .from("fila_mensagens_whatsapp")
        .select("*")
        .eq("status", "pendente")
        .order("prioridade", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1);

      if (pendentes && pendentes.length > 0) {
        mensagemAlvo = pendentes[0];
      }
    }

    if (!mensagemAlvo) {
      return new Response(
        JSON.stringify({ ok: true, processados: 0, message: "Fila limpa. Nenhuma mensagem pendente." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Marcar como processando
    await supabase
      .from("fila_mensagens_whatsapp")
      .update({ status: "processando", updated_at: agoraISO })
      .eq("id", mensagemAlvo.id);

    const textoFinal = mensagemAlvo.mensagem_texto || mensagemAlvo.mensagem || "";
    const telefoneNorm = normalizarTelefone(mensagemAlvo.telefone);

    if (!telefoneNorm || telefoneNorm.length < 12) {
      await supabase
        .from("fila_mensagens_whatsapp")
        .update({
          status: "falha_definitiva",
          erro_log: "Telefone inválido ou não cadastrado.",
          updated_at: agoraISO,
        })
        .eq("id", mensagemAlvo.id);

      return new Response(
        JSON.stringify({ ok: false, message: `Telefone inválido: ${mensagemAlvo.telefone}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. CALCULAR TEMPO DE COMPOSING HUMANO (35ms por caractere, min 3.5s, max 9.5s)
    const composingMs = Math.min(9500, Math.max(3500, textoFinal.length * 35));

    const cleanBaseUrl = EVOLUTION_URL.replace(/\/+$/, "");
    const targetUrl = `${cleanBaseUrl}/send/text`;

    const payload = {
      instance: EVOLUTION_INSTANCE,
      number: telefoneNorm,
      text: textoFinal,
      options: {
        delay: composingMs,
        presence: "composing",
        linkPreview: false,
      },
      textMessage: {
        text: textoFinal,
      },
    };

    console.log(`📱 [Worker Fila] Enviando mensagem ID ${mensagemAlvo.id} para ${telefoneNorm}...`);

    let evoResponse: Response;
    let evoText = "";
    try {
      evoResponse = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify(payload),
      });
      evoText = await evoResponse.text();
    } catch (fetchErr: any) {
      console.error(`❌ [Worker Fila] Erro na requisição HTTP para Evolution:`, fetchErr);
      evoResponse = new Response("timeout", { status: 504 });
      evoText = String(fetchErr?.message || "Timeout na conexão com Evolution Go");
    }

    let evoBody: any = {};
    try {
      evoBody = JSON.parse(evoText);
    } catch {}

    const isError463 =
      evoText.includes("463") ||
      (typeof evoBody === "object" && evoBody?.error?.includes("463")) ||
      evoText.includes("ReachoutTimelock");

    // 7. TRATAMENTO DO RESULTADO DO DISPARO
    if (evoResponse.ok && !isError463) {
      // SUCESSO!
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

      // Incrementar contador diário
      const novoTotal = (controle.total_enviados || 0) + 1;
      await supabase
        .from("controle_envios_diarios")
        .update({ total_enviados: novoTotal, updated_at: agoraISO })
        .eq("data", dataHoje);

      console.log(`✅ [Worker Fila] Mensagem ${mensagemAlvo.id} enviada com sucesso! (${novoTotal}/${limiteDiario} hoje)`);

      // 8. VERIFICAR SE O LOTE FOI 100% CONCLUÍDO (Para notificar Coordenador)
      if (mensagemAlvo.lote_id) {
        await checarENotificarConclusaoLote(supabase, mensagemAlvo.lote_id, EVOLUTION_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE);
      }

      return new Response(
        JSON.stringify({ ok: true, enviadoId: mensagemAlvo.id, totalHoje: novoTotal }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (isError463) {
      // ERRO 463 / TIMELOCK DETECTADO
      console.warn(`🚨 [Worker Fila] Erro 463 (Reachout Timelock) detectado ao enviar para ${telefoneNorm}!`);

      // Congelar fila por 24 horas no controle_envios_diarios
      const dataExpira = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("controle_envios_diarios")
        .update({ timelock_ativo: true, timelock_expira: dataExpira, updated_at: agoraISO })
        .eq("data", dataHoje);

      // Reagendar a mensagem para após o desbloqueio
      await supabase
        .from("fila_mensagens_whatsapp")
        .update({
          status: "reagendado_463",
          agendado_para: dataExpira,
          codigo_erro: 463,
          erro_log: "WhatsApp recusou envio imediato (Reachout Timelock). Reagendado para 24h.",
          updated_at: agoraISO,
        })
        .eq("id", mensagemAlvo.id);

      // Notificar coordenador do bloqueio temporário
      await notificarCoordenadorAlerta(
        supabase,
        "🚨 *ALERTA SISTEMA CRISMA:* O WhatsApp aplicou uma restrição temporária (Reachout Timelock). A fila de envios foi congelada automaticamente por 24 horas para proteger o número contra banimento permanente.",
        EVOLUTION_URL,
        EVOLUTION_API_KEY,
        EVOLUTION_INSTANCE
      );

      return new Response(
        JSON.stringify({ ok: false, error: "Reachout Timelock detectado. Fila congelada por 24h." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // OUTROS ERROS (500, Falha de rede, etc.)
      const statusHttp = evoResponse.status || 500;
      const tentativas = (mensagemAlvo.tentativas || 0) + 1;

      if (tentativas >= 3) {
        // Falha definitiva após 3 tentativas
        await supabase
          .from("fila_mensagens_whatsapp")
          .update({
            status: "falha_definitiva",
            tentativas,
            codigo_erro: statusHttp,
            erro_log: `Falha após 3 tentativas. Erro: ${evoText.slice(0, 150)}`,
            updated_at: agoraISO,
          })
          .eq("id", mensagemAlvo.id);

        console.warn(`❌ [Worker Fila] Mensagem ${mensagemAlvo.id} marcada como falha definitiva.`);
      } else {
        // Reagendar para 35 minutos
        const dataReagendada = new Date(Date.now() + 35 * 60 * 1000).toISOString();
        await supabase
          .from("fila_mensagens_whatsapp")
          .update({
            status: "reagendado_500",
            agendado_para: dataReagendada,
            tentativas,
            codigo_erro: statusHttp,
            erro_log: `Instabilidade (${statusHttp}). Reagendado para 35min. Detalhes: ${evoText.slice(0, 100)}`,
            updated_at: agoraISO,
          })
          .eq("id", mensagemAlvo.id);

        console.log(`⏳ [Worker Fila] Mensagem ${mensagemAlvo.id} reagendada para 35min (Tentativa ${tentativas}/3).`);
      }

      return new Response(
        JSON.stringify({ ok: false, status: statusHttp, error: evoText.slice(0, 200) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error("❌ [Worker Fila] Erro não tratado:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Checa se o lote_id foi concluído e, se sim, envia o relatório ao coordenador
async function checarENotificarConclusaoLote(
  supabase: any,
  loteId: string,
  evoUrl: string,
  evoApiKey: string,
  evoInstance: string
) {
  try {
    // Verificar se ainda há itens pendentes ou em processamento neste lote
    const { count: pendentesCount } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("*", { count: "exact", head: true })
      .eq("lote_id", loteId)
      .in("status", ["pendente", "processando", "reagendado_463", "reagendado_500"]);

    if (pendentesCount !== 0) {
      // Ainda há mensagens a enviar neste lote
      return;
    }

    // Lote finalizado! Coletar estatísticas
    const { data: todosDoLote } = await supabase
      .from("fila_mensagens_whatsapp")
      .select("*")
      .eq("lote_id", loteId);

    if (!todosDoLote || todosDoLote.length === 0) return;

    const total = todosDoLote.length;
    const sucessos = todosDoLote.filter((m: any) => m.status === "enviado").length;
    const falhas = todosDoLote.filter((m: any) => m.status === "falha_definitiva");
    const tipo = todosDoLote[0]?.tipo || todosDoLote[0]?.tipo_envio || "Aviso em Lote";

    let textoRelatorio = `📋 *Relatório do Sistema Crisma*\n_Santuário Mãe Rainha_\n\n`;
    textoRelatorio += `✅ *Lote de mensagens concluído!*\n`;
    textoRelatorio += `📌 *Tipo:* ${tipo === "cobranca" ? "Cobrança de Mensalidade" : tipo === "recibo" ? "Recibos de Pagamento" : "Avisos em Lote"}\n\n`;
    textoRelatorio += `📊 *Resumo Geral:*\n`;
    textoRelatorio += `• Total Processado: ${total}\n`;
    textoRelatorio += `• ✅ Entregues: ${sucessos}\n`;
    textoRelatorio += `• ❌ Falhas Definitivas: ${falhas.length}\n`;

    if (falhas.length > 0) {
      textoRelatorio += `\n*Crismandos não contatados:*\n`;
      falhas.slice(0, 10).forEach((f: any, idx: number) => {
        textoRelatorio += `${idx + 1}. ${f.nome_destinatario || "Sem nome"} (${f.telefone}): ${f.erro_log || "Falha de entrega"}\n`;
      });
      if (falhas.length > 10) {
        textoRelatorio += `_... e mais ${falhas.length - 10} contato(s). Veja o painel para detalhes._\n`;
      }
    }

    textoRelatorio += `\n💡 _Você pode reenviar as mensagens que falharam diretamente no Dashboard da aba Servidor WhatsApp._`;

    await notificarCoordenadorAlerta(supabase, textoRelatorio, evoUrl, evoApiKey, evoInstance);
  } catch (e) {
    console.warn("⚠️ Falha ao verificar conclusão do lote:", e);
  }
}

// Envia mensagem direta ao WhatsApp do coordenador cadastrado
async function notificarCoordenadorAlerta(
  supabase: any,
  mensagem: string,
  evoUrl: string,
  evoApiKey: string,
  evoInstance: string
) {
  try {
    const { data: cfg } = await supabase
      .from("configuracoes_sistema")
      .select("valor")
      .eq("chave", "config_turma_ciclo")
      .maybeSingle();

    const telCoordenador = cfg?.valor?.telefone_coordenador;
    if (!telCoordenador) {
      console.log("ℹ️ Nenhum telefone de coordenador configurado para notificações.");
      return;
    }

    const telNorm = normalizarTelefone(telCoordenador);
    if (!telNorm || telNorm.length < 12) return;

    const cleanBaseUrl = evoUrl.replace(/\/+$/, "");
    const targetUrl = `${cleanBaseUrl}/send/text`;

    await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evoApiKey,
      },
      body: JSON.stringify({
        instance: evoInstance,
        number: telNorm,
        text: mensagem,
        options: { delay: 1000, presence: "composing", linkPreview: false },
        textMessage: { text: mensagem },
      }),
    });

    console.log(`📱 [Worker Fila] Notificação enviada ao coordenador (${telNorm}) com sucesso!`);
  } catch (err) {
    console.warn("⚠️ Não foi possível notificar o coordenador:", err);
  }
}
