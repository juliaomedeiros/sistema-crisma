// Gerar comprovante automaticamente ao registrar pagamento
function gerarComprovanteAutomatico(crismandoId, mes, valor) {
    const crismando = crismandos.find(c => c.id == crismandoId);
    const versiculo = versiculos[Math.floor(Math.random() * versiculos.length)];
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    
    // Gerar código único de autenticação
    const codigoAutenticacao = gerarCodigoUnico();
    
    const dadosComprovante = {
        crismando,
        mes,
        valor,
        dataAtual,
        versiculo,
        codigoAutenticacao
    };
    
    // Registrar código no sistema
    registrarCodigoAutenticacao(dadosComprovante, codigoAutenticacao);
    
    return dadosComprovante;
}

// Criar template do comprovante como PNG
function criarTemplateComprovante(dadosComprovante) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Configurações do canvas (otimizado para WhatsApp)
        canvas.width = 400;
        canvas.height = 650;
        
        // Fundo branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Borda
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        
        // Função para desenhar texto centralizado
        function desenharTextoCentralizado(texto, x, y, tamanho, cor = '#000000', negrito = false) {
            ctx.fillStyle = cor;
            ctx.font = `${negrito ? 'bold ' : ''}${tamanho}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(texto, x, y);
        }
        
        // Função para desenhar texto alinhado à esquerda
        function desenharTextoEsquerda(texto, x, y, tamanho, cor = '#000000', negrito = false) {
            ctx.fillStyle = cor;
            ctx.font = `${negrito ? 'bold ' : ''}${tamanho}px Arial`;
            ctx.textAlign = 'left';
            ctx.fillText(texto, x, y);
        }
        
        let y = 60;
        
        // Cabeçalho
        desenharTextoCentralizado('SANTUÁRIO MÃE RAINHA', canvas.width/2, y, 20, '#2c3e50', true);
        y += 35;
        desenharTextoCentralizado('Crisma de Adultos 2025', canvas.width/2, y, 16, '#e74c3c', true);
        y += 50;
        
        // Linha separadora
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(canvas.width - 30, y);
        ctx.stroke();
        y += 40;
        
        // Título do comprovante
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(30, y - 25, canvas.width - 60, 35);
        desenharTextoCentralizado('COMPROVANTE DE PAGAMENTO', canvas.width/2, y - 5, 16, '#ffffff', true);
        y += 50;
        
        // Dados do comprovante
        const dados = [
            `Nome: ${dadosComprovante.crismando.nome}`,
            `Mês: ${dadosComprovante.mes}/2025`,
            `Valor: R$ ${dadosComprovante.valor.toFixed(2).replace('.', ',')}`,
            `Data: ${dadosComprovante.dataAtual}`,
            `Código: ${dadosComprovante.codigoAutenticacao}`
        ];
        
        dados.forEach((dado, index) => {
            // Fundo alternado
            if (index % 2 === 0) {
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(30, y - 20, canvas.width - 60, 25);
            }
            
            desenharTextoEsquerda(dado, 40, y, 14, '#2c3e50', true);
            y += 35;
        });
        
        y += 20;
        
        // Linha separadora
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(canvas.width - 30, y);
        ctx.stroke();
        y += 40;


        // Adicionar seção de verificação antes do versículo
        y += 20;
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(30, y - 25, canvas.width - 60, 35);
        desenharTextoCentralizado('CÓDIGO DE VERIFICAÇÃO', canvas.width/2, y - 5, 14, '#ffffff', true);
        y += 30;
        
        // Código em destaque
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(30, y - 20, canvas.width - 60, 30);
        desenharTextoCentralizado(dadosComprovante.codigoAutenticacao, canvas.width/2, y, 18, '#e74c3c', true);
        y += 40;
        
               
        // Versículo (quebrar em linhas se necessário)
        const versiculoTexto = `"${dadosComprovante.versiculo}"`;
        const palavras = versiculoTexto.split(' ');
        let linha = '';
        const maxLargura = canvas.width - 80;
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#7f8c8d';
        ctx.textAlign = 'center';
        
        for (let i = 0; i < palavras.length; i++) {
            const testeLinha = linha + palavras[i] + ' ';
            const metricas = ctx.measureText(testeLinha);
            
            if (metricas.width > maxLargura && i > 0) {
                ctx.fillText(linha, canvas.width/2, y);
                linha = palavras[i] + ' ';
                y += 20;
            } else {
                linha = testeLinha;
            }
        }
        ctx.fillText(linha, canvas.width/2, y);
        y += 40;
        
        // Mensagem final
        desenharTextoCentralizado('Que Deus abençoe sua caminhada de fé! 🙏', canvas.width/2, y, 14, '#2c3e50', true);
        y += 30;
        
        // Rodapé
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(canvas.width - 30, y);
        ctx.stroke();
        y += 25;
        
        desenharTextoCentralizado('Santuário Mãe Rainha - Crisma 2025', canvas.width/2, y, 12, '#7f8c8d');
        
        // Converter para base64
        const imgData = canvas.toDataURL('image/png', 1.0);
        resolve(imgData);
    });
}

// Baixar comprovante PNG
function baixarComprovantePNG(dadosComprovante) {
    criarTemplateComprovante(dadosComprovante).then(imgData => {
        const link = document.createElement('a');
        link.download = `Comprovante_${dadosComprovante.crismando.nome}_${dadosComprovante.mes}.png`;
        link.href = imgData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// Gerar comprovante visual no modal
function gerarComprovante() {
    const crismandoId = document.getElementById('selectCrismando').value;
    const mes = document.getElementById('mesPagamento').value;
    const valor = parseFloat(document.getElementById('valorPago').value) || 0;
    
    if (!crismandoId || !mes || valor <= 0) {
        alert('Por favor, preencha todos os campos antes de gerar o comprovante.');
        return;
    }
    
    const dadosComprovante = gerarComprovanteAutomatico(crismandoId, mes, valor);
    
    // Criar preview visual
    criarTemplateComprovante(dadosComprovante).then(imgData => {
        const comprovanteHTML = `
            <div style="text-align: center;">
                <img src="${imgData}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px;">
            </div>
        `;
        
        const comprovanteContent = document.getElementById('comprovanteContent');
        const modal = document.getElementById('modalComprovante');
        
        if (comprovanteContent && modal) {
            comprovanteContent.innerHTML = comprovanteHTML;
            modal.style.display = 'block';
            
            // Armazenar dados para uso posterior
            window.dadosComprovanteAtual = dadosComprovante;
            window.imagemComprovanteAtual = imgData;
        }
    });
}

// Função principal para enviar comprovante automaticamente
function enviarComprovanteAutomatico() {
    if (!window.dadosComprovanteAtual) {
        alert('Erro: Dados do comprovante não encontrados!');
        return;
    }
    
    const crismando = window.dadosComprovanteAtual.crismando;
    const telefone = crismando.telefone.replace(/\D/g, ''); // Remove tudo que não é número
    
    if (!telefone || telefone.length < 10) {
        alert(`❌ Telefone inválido para ${crismando.nome}!\n\nTelefone cadastrado: ${crismando.telefone}\n\nPor favor, verifique o número na tabela.`);
        return;
    }
    
    // Formatar telefone para WhatsApp (adicionar 55 se não tiver)
    let telefoneFormatado = telefone;
    if (!telefone.startsWith('55')) {
        telefoneFormatado = '55' + telefone;
    }
    
    console.log(`Enviando para: ${crismando.nome} - ${telefoneFormatado}`);
    
    // Detectar tipo de dispositivo e escolher melhor método
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        enviarViaMobile(telefoneFormatado, crismando);
    } else {
        enviarViaDesktop(telefoneFormatado, crismando);
    }
}

// Envio para dispositivos móveis (iPad, iPhone, Android)
function enviarViaMobile(telefone, crismando) {
    if (navigator.share && window.imagemComprovanteAtual) {
        // Método 1: Compartilhamento nativo com imagem
        fetch(window.imagemComprovanteAtual)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `Comprovante_${crismando.nome}.png`, { type: 'image/png' });
                
                return navigator.share({
                    title: 'Comprovante de Pagamento - Crisma',
                    text: `🙏 Comprovante de pagamento da Crisma de Adultos 2025\n\n👤 ${crismando.nome}`,
                    files: [file]
                });
            })
            .then(() => {
                console.log('Compartilhado com sucesso via API nativa!');
                mostrarSucesso(crismando.nome, telefone);
            })
            .catch(err => {
                console.log('Erro no compartilhamento nativo, usando fallback:', err);
                enviarViaWhatsAppDireto(telefone, crismando);
            });
    } else {
        // Fallback: WhatsApp direto
        enviarViaWhatsAppDireto(telefone, crismando);
    }
}

// Envio para desktop
function enviarViaDesktop(telefone, crismando) {
    if (navigator.clipboard && navigator.clipboard.write && window.imagemComprovanteAtual) {
        // Método 1: Copiar imagem para clipboard
        fetch(window.imagemComprovanteAtual)
            .then(res => res.blob())
            .then(blob => {
                const item = new ClipboardItem({ 'image/png': blob });
                return navigator.clipboard.write([item]);
            })
            .then(() => {
                // Abrir WhatsApp após copiar
                const url = `https://wa.me/${telefone}`;
                window.open(url, '_blank');
                
                alert(`✅ Sucesso!\n\n📋 Imagem copiada para área de transferência\n📱 WhatsApp aberto para ${crismando.nome}\n\n👉 Cole a imagem na conversa (Ctrl+V)`);
            })
            .catch(err => {
                console.log('Erro ao copiar, usando download:', err);
                enviarComDownloadAutomatico(telefone, crismando);
            });
    } else {
        // Fallback: Download automático
        enviarComDownloadAutomatico(telefone, crismando);
    }
}

// WhatsApp direto (sem imagem)
function enviarViaWhatsAppDireto(telefone, crismando) {
    const dados = window.dadosComprovanteAtual;
    
    const mensagem = `🙏 *Santuário Mãe Rainha - Crisma 2025*

✅ *COMPROVANTE DE PAGAMENTO*

👤 *Nome:* ${crismando.nome}
📅 *Mês:* ${dados.mes}/2025
💰 *Valor:* R$ ${dados.valor.toFixed(2).replace('.', ',')}
📆 *Data:* ${dados.dataAtual}

📖 _"${dados.versiculo}"_

🙏 Que Deus abençoe sua caminhada de fé!

---
*Santuário Mãe Rainha - Crisma 2025*`;
    
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    // Também baixar a imagem
    if (window.imagemComprovanteAtual) {
        baixarComprovantePNG(window.dadosComprovanteAtual);
        alert(`✅ WhatsApp aberto para ${crismando.nome}!\n📥 Comprovante baixado!\n\n👉 Anexe o arquivo baixado na conversa.`);
    } else {
        alert(`✅ WhatsApp aberto para ${crismando.nome}!`);
    }
}

// Download automático + WhatsApp
function enviarComDownloadAutomatico(telefone, crismando) {
    // Baixar imagem automaticamente
    baixarComprovantePNG(window.dadosComprovanteAtual);
    
    // Abrir WhatsApp
    const mensagem = `🙏 *Santuário Mãe Rainha - Crisma 2025*\n\n✅ Comprovante de pagamento anexo!\n\n👤 ${crismando.nome}\n\nQue Deus abençoe sua caminhada de fé! 🙏`;
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    alert(`✅ Sucesso!\n\n📥 Comprovante baixado\n📱 WhatsApp aberto para ${crismando.nome}\n\n👉 Anexe o arquivo na conversa`);
}

// Mostrar mensagem de sucesso
function mostrarSucesso(nome, telefone) {
    alert(`✅ Comprovante enviado com sucesso!\n\n👤 Para: ${nome}\n📱 Número: ${telefone}\n\n🙏 Que Deus abençoe!`);
}

// Atualizar função principal de envio
function enviarWhatsApp() {
    enviarComprovanteAutomatico();
}

// Função para testar número de telefone
function testarTelefone(telefone) {
    const numeroLimpo = telefone.replace(/\D/g, '');
    
    if (numeroLimpo.length < 10) {
        return { valido: false, erro: 'Número muito curto' };
    }
    
    if (numeroLimpo.length > 15) {
        return { valido: false, erro: 'Número muito longo' };
    }
    
    // Formatar para WhatsApp
    let numeroFormatado = numeroLimpo;
    if (!numeroLimpo.startsWith('55')) {
        numeroFormatado = '55' + numeroLimpo;
    }
    
    return { valido: true, numero: numeroFormatado };
}

// Função para validar todos os telefones da tabela
function validarTelefonesCadastrados() {
    const problemasEncontrados = [];
    
    crismandos.forEach(crismando => {
        const teste = testarTelefone(crismando.telefone);
        if (!teste.valido) {
            problemasEncontrados.push({
                nome: crismando.nome,
                telefone: crismando.telefone,
                erro: teste.erro
            });
        }
    });
    
    if (problemasEncontrados.length > 0) {
        let mensagem = '⚠️ Telefones com problemas encontrados:\n\n';
        problemasEncontrados.forEach(problema => {
            mensagem += `• ${problema.nome}: ${problema.telefone} (${problema.erro})\n`;
        });
        mensagem += '\n👉 Corrija estes números na planilha ou tabela.';
        alert(mensagem);
    } else {
        alert('✅ Todos os telefones estão válidos!');
    }
    
    return problemasEncontrados;
}
