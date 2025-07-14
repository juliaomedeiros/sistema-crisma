// Gerar comprovante automaticamente ao registrar pagamento
function gerarComprovanteAutomatico(crismandoId, mes, valor) {
    const crismando = crismandos.find(c => c.id == crismandoId);
    const versiculo = versiculos[Math.floor(Math.random() * versiculos.length)];
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    
    const codigoAutenticacao = gerarCodigoUnico();
    
    const dadosComprovante = {
        crismando,
        mes,
        valor,
        dataAtual,
        versiculo,
        codigoAutenticacao
    };
    
    registrarCodigoAutenticacao(dadosComprovante, codigoAutenticacao);
    
    return dadosComprovante;
}

// Criar template do comprovante como PNG
function criarTemplateComprovante(dadosComprovante) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 400;
        canvas.height = 650;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        
        function desenharTextoCentralizado(texto, x, y, tamanho, cor = '#000000', negrito = false) {
            ctx.fillStyle = cor;
            ctx.font = `${negrito ? 'bold ' : ''}${tamanho}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(texto, x, y);
        }
        
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
        
        // Código de verificação
        y += 20;
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(30, y - 25, canvas.width - 60, 35);
        desenharTextoCentralizado('CÓDIGO DE VERIFICAÇÃO', canvas.width/2, y - 5, 14, '#ffffff', true);
        y += 30;
        
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(30, y - 20, canvas.width - 60, 30);
        desenharTextoCentralizado(dadosComprovante.codigoAutenticacao, canvas.width/2, y, 18, '#e74c3c', true);
        y += 40;
        
        // Versículo
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
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        resolve(imgData);
    });
}

// NOVA FUNÇÃO: Detecção aprimorada de dispositivos
function detectarDispositivo() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    // Detectar iPad (incluindo iPadOS 13+ que se identifica como Mac)
    const isIpad = /ipad/.test(userAgent) || 
                   (platform === 'macintel' && navigator.maxTouchPoints > 1);
    
    // Detectar iPhone
    const isIphone = /iphone/.test(userAgent);
    
    // Detectar Android
    const isAndroid = /android/.test(userAgent);
    
    // Detectar se é mobile em geral
    const isMobile = isIpad || isIphone || isAndroid || 
                     /webos|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // Detectar navegador
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    const isChrome = /chrome/.test(userAgent);
    const isFirefox = /firefox/.test(userAgent);
    
    return {
        isIpad,
        isIphone,
        isAndroid,
        isMobile,
        isDesktop: !isMobile,
        isSafari,
        isChrome,
        isFirefox,
        userAgent
    };
}

// NOVA FUNÇÃO: Baixar comprovante otimizado para mobile
function baixarComprovanteMobile(dadosComprovante) {
    return new Promise((resolve, reject) => {
        criarTemplateComprovante(dadosComprovante).then(imgData => {
            const dispositivo = detectarDispositivo();
            
            if (dispositivo.isIpad || dispositivo.isIphone) {
                // Para iOS: usar método específico
                baixarComprovanteIOS(imgData, dadosComprovante, resolve);
            } else if (dispositivo.isAndroid) {
                // Para Android: usar método específico
                baixarComprovanteAndroid(imgData, dadosComprovante, resolve);
            } else {
                // Desktop: método tradicional
                baixarComprovanteDesktop(imgData, dadosComprovante, resolve);
            }
        }).catch(reject);
    });
}

// NOVA FUNÇÃO: Download para iOS (iPad/iPhone)
function baixarComprovanteIOS(imgData, dadosComprovante, callback) {
    // Método 1: Tentar salvar na galeria (se suportado)
    if (navigator.share) {
        fetch(imgData)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `Comprovante_${dadosComprovante.crismando.nome}_${dadosComprovante.mes}.png`, { 
                    type: 'image/png' 
                });
                
                navigator.share({
                    title: 'Comprovante de Pagamento - Crisma',
                    files: [file]
                }).then(() => {
                    console.log('Compartilhado com sucesso!');
                    callback(true);
                }).catch(err => {
                    console.log('Erro no compartilhamento, usando fallback:', err);
                    baixarComprovanteIOSFallback(imgData, dadosComprovante, callback);
                });
            })
            .catch(err => {
                console.log('Erro ao criar arquivo, usando fallback:', err);
                baixarComprovanteIOSFallback(imgData, dadosComprovante, callback);
            });
    } else {
        baixarComprovanteIOSFallback(imgData, dadosComprovante, callback);
    }
}

// NOVA FUNÇÃO: Fallback para iOS
function baixarComprovanteIOSFallback(imgData, dadosComprovante, callback) {
    // Abrir imagem em nova aba para salvar manualmente
    const novaJanela = window.open();
    novaJanela.document.write(`
        <html>
            <head>
                <title>Comprovante - ${dadosComprovante.crismando.nome}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { 
                        margin: 0; 
                        padding: 20px; 
                        text-align: center; 
                        font-family: Arial, sans-serif;
                        background: #f5f5f5;
                    }
                    img { 
                        max-width: 100%; 
                        height: auto; 
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        background: white;
                        padding: 10px;
                    }
                    .instrucoes {
                        background: #e3f2fd;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid #2196f3;
                    }
                    .botao {
                        background: #25d366;
                        color: white;
                        padding: 12px 24px;
                        border: none;
                        border-radius: 25px;
                        font-size: 16px;
                        cursor: pointer;
                        margin: 10px;
                        text-decoration: none;
                        display: inline-block;
                    }
                </style>
            </head>
            <body>
                <h2>📄 Comprovante de Pagamento</h2>
                <img src="${imgData}" alt="Comprovante">
                <div class="instrucoes">
                    <h3>📱 Como salvar no iPad/iPhone:</h3>
                    <p><strong>1.</strong> Toque e segure na imagem acima</p>
                    <p><strong>2.</strong> Selecione "Salvar na Galeria de Fotos"</p>
                    <p><strong>3.</strong> Depois use o botão abaixo para abrir o WhatsApp</p>
                </div>
                <a href="#" class="botao" onclick="abrirWhatsApp()">
                    📱 Abrir WhatsApp
                </a>
                <script>
                    function abrirWhatsApp() {
                        const telefone = '${dadosComprovante.crismando.telefone.replace(/\D/g, '')}';
                        const telefoneFormatado = telefone.startsWith('55') ? telefone : '55' + telefone;
                        const mensagem = encodeURIComponent('🙏 Comprovante de pagamento da Crisma 2025 - ${dadosComprovante.crismando.nome}');
                        
                        // Tentar abrir app do WhatsApp primeiro
                        const urlApp = 'whatsapp://send?phone=' + telefoneFormatado + '&text=' + mensagem;
                        const urlWeb = 'https://wa.me/' + telefoneFormatado + '?text=' + mensagem;
                        
                        // Tentar app primeiro, depois web
                        window.location.href = urlApp;
                        
                        setTimeout(() => {
                            window.open(urlWeb, '_blank');
                        }, 1000);
                    }
                </script>
            </body>
        </html>
    `);
    
    callback(true);
}

// NOVA FUNÇÃO: Download para Android
function baixarComprovanteAndroid(imgData, dadosComprovante, callback) {
    // Android: tentar download direto primeiro
    try {
        const link = document.createElement('a');
        link.download = `Comprovante_${dadosComprovante.crismando.nome}_${dadosComprovante.mes}.png`;
        link.href = imgData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Aguardar um pouco e abrir WhatsApp
        setTimeout(() => {
            abrirWhatsAppAndroid(dadosComprovante);
        }, 1000);
        
        callback(true);
    } catch (error) {
        console.log('Erro no download Android, usando fallback:', error);
        baixarComprovanteAndroidFallback(imgData, dadosComprovante, callback);
    }
}

// NOVA FUNÇÃO: Fallback para Android
function baixarComprovanteAndroidFallback(imgData, dadosComprovante, callback) {
    // Mesmo método do iOS mas otimizado para Android
    const novaJanela = window.open();
    novaJanela.document.write(`
        <html>
            <head>
                <title>Comprovante - ${dadosComprovante.crismando.nome}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { 
                        margin: 0; 
                        padding: 20px; 
                        text-align: center; 
                        font-family: Arial, sans-serif;
                        background: #f5f5f5;
                    }
                    img { 
                        max-width: 100%; 
                        height: auto; 
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        background: white;
                        padding: 10px;
                    }
                    .instrucoes {
                        background: #e8f5e8;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid #4caf50;
                    }
                    .botao {
                        background: #25d366;
                        color: white;
                        padding: 12px 24px;
                        border: none;
                        border-radius: 25px;
                        font-size: 16px;
                        cursor: pointer;
                        margin: 10px;
                        text-decoration: none;
                        display: inline-block;
                    }
                    .botao-download {
                        background: #2196f3;
                    }
                </style>
            </head>
            <body>
                <h2>📄 Comprovante de Pagamento</h2>
                <img src="${imgData}" alt="Comprovante" id="comprovante">
                <div class="instrucoes">
                    <h3>📱 Como usar no Android:</h3>
                    <p><strong>1.</strong> Toque no botão "Baixar" abaixo</p>
                    <p><strong>2.</strong> Depois toque em "Abrir WhatsApp"</p>
                    <p><strong>3.</strong> Anexe a imagem baixada na conversa</p>
                </div>
                <a href="${imgData}" download="Comprovante_${dadosComprovante.crismando.nome}_${dadosComprovante.mes}.png" class="botao botao-download">
                    📥 Baixar Comprovante
                </a>
                <a href="#" class="botao" onclick="abrirWhatsApp()">
                    📱 Abrir WhatsApp
                </a>
                <script>
                    function abrirWhatsApp() {
                        const telefone = '${dadosComprovante.crismando.telefone.replace(/\D/g, '')}';
                        const telefoneFormatado = telefone.startsWith('55') ? telefone : '55' + telefone;
                        const mensagem = encodeURIComponent('🙏 Comprovante de pagamento da Crisma 2025 - ${dadosComprovante.crismando.nome}');
                        
                        // Tentar abrir app do WhatsApp primeiro
                        const urlApp = 'whatsapp://send?phone=' + telefoneFormatado + '&text=' + mensagem;
                        window.location.href = urlApp;
                        
                        // Fallback para WhatsApp Web
                        setTimeout(() => {
                            const urlWeb = 'https://wa.me/' + telefoneFormatado + '?text=' + mensagem;
                            window.open(urlWeb, '_blank');
                        }, 2000);
                    }
                </script>
            </body>
        </html>
    `);
    
    callback(true);
}

// NOVA FUNÇÃO: Abrir WhatsApp no Android
function abrirWhatsAppAndroid(dadosComprovante) {
    const telefone = dadosComprovante.crismando.telefone.replace(/\D/g, '');
    const telefoneFormatado = telefone.startsWith('55') ? telefone : '55' + telefone;
    const mensagem = encodeURIComponent(`🙏 Comprovante de pagamento da Crisma 2025 - ${dadosComprovante.crismando.nome}`);
    
    // Tentar app nativo primeiro
    const urlApp = `whatsapp://send?phone=${telefoneFormatado}&text=${mensagem}`;
    window.location.href = urlApp;
    
    // Fallback para web após 2 segundos
    setTimeout(() => {
        const urlWeb = `https://wa.me/${telefoneFormatado}?text=${mensagem}`;
        window.open(urlWeb, '_blank');
    }, 2000);
}

// NOVA FUNÇÃO: Download para Desktop (método original melhorado)
function baixarComprovanteDesktop(imgData, dadosComprovante, callback) {
    const link = document.createElement('a');
    link.download = `Comprovante_${dadosComprovante.crismando.nome}_${dadosComprovante.mes}.png`;
    link.href = imgData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    callback(true);
}

// FUNÇÃO PRINCIPAL ATUALIZADA: Enviar comprovante automaticamente
function enviarComprovanteAutomatico() {
    if (!window.dadosComprovanteAtual) {
        alert('Erro: Dados do comprovante não encontrados!');
        return;
    }
    
    const crismando = window.dadosComprovanteAtual.crismando;
    const telefone = crismando.telefone.replace(/\D/g, '');
    
    if (!telefone || telefone.length < 10) {
        alert(`❌ Telefone inválido para ${crismando.nome}!\n\nTelefone cadastrado: ${crismando.telefone}\n\nPor favor, verifique o número na tabela.`);
        return;
    }
    
    const dispositivo = detectarDispositivo();
    
    console.log('Dispositivo detectado:', dispositivo);
    console.log(`Enviando para: ${crismando.nome} - ${telefone}`);
    
    // Mostrar loading
    const loadingMsg = mostrarLoading('Preparando comprovante...');
    
    // Baixar/preparar comprovante baseado no dispositivo
    baixarComprovanteMobile(window.dadosComprovanteAtual)
        .then((sucesso) => {
            esconderLoading(loadingMsg);
            
            if (sucesso) {
                if (dispositivo.isMobile) {
                    // Para mobile: mostrar instruções específicas
                    mostrarInstrucoesMobile(crismando, dispositivo);
                } else {
                    // Para desktop: abrir WhatsApp Web
                    abrirWhatsAppWeb(telefone, crismando);
                }
            }
        })
        .catch((error) => {
            esconderLoading(loadingMsg);
            console.error('Erro ao preparar comprovante:', error);
            alert(`❌ Erro ao preparar comprovante: ${error.message}`);
        });
}

// NOVA FUNÇÃO: Mostrar loading
function mostrarLoading(mensagem) {
    const loading = document.createElement('div');
    loading.id = 'loading-comprovante';
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-family: Arial, sans-serif;
    `;
    
    loading.innerHTML = `
        <div style="text-align: center;">
            <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
            <p style="font-size: 18px; margin: 0;">${mensagem}</p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(loading);
    return loading;
}

// NOVA FUNÇÃO: Esconder loading
function esconderLoading(loadingElement) {
    if (loadingElement && loadingElement.parentNode) {
        loadingElement.parentNode.removeChild(loadingElement);
    }
}

// NOVA FUNÇÃO: Mostrar instruções para mobile
function mostrarInstrucoesMobile(crismando, dispositivo) {
    let instrucoes = '';
    
    if (dispositivo.isIpad) {
        instrucoes = `
            ✅ <strong>Comprovante preparado para iPad!</strong><br><br>
            📱 <strong>Próximos passos:</strong><br>
            1. Uma nova aba foi aberta com o comprovante<br>
            2. Toque e segure na imagem para salvar<br>
            3. Use o botão "Abrir WhatsApp" na página<br>
            4. Anexe a imagem salva na conversa<br><br>
            💡 <strong>Dica:</strong> Se o WhatsApp Web não abrir, use o app do WhatsApp
        `;
    } else if (dispositivo.isIphone) {
        instrucoes = `
            ✅ <strong>Comprovante preparado para iPhone!</strong><br><br>
            📱 <strong>Próximos passos:</strong><br>
            1. Uma nova aba foi aberta com o comprovante<br>
            2. Toque e segure na imagem para salvar<br>
            3. Use o botão "Abrir WhatsApp" na página<br>
            4. O app do WhatsApp será aberto automaticamente<br><br>
            💡 <strong>Dica:</strong> A imagem ficará salva na galeria de fotos
        `;
    } else if (dispositivo.isAndroid) {
        instrucoes = `
            ✅ <strong>Comprovante baixado para Android!</strong><br><br>
            📱 <strong>Próximos passos:</strong><br>
            1. O arquivo foi baixado automaticamente<br>
            2. O WhatsApp será aberto em alguns segundos<br>
            3. Anexe o arquivo baixado na conversa<br><br>
            💡 <strong>Dica:</strong> Verifique a pasta Downloads se necessário
        `;
    }
    
    const modal = criarModalInstrucoes(crismando.nome, instrucoes);
    document.body.appendChild(modal);
}

// NOVA FUNÇÃO: Criar modal de instruções
function criarModalInstrucoes(nomeCrismando, instrucoes) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        padding: 20px;
        box-sizing: border-box;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            font-family: Arial, sans-serif;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        ">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">
                📄 Comprovante para ${nomeCrismando}
            </h2>
            <div style="
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                text-align: left;
                line-height: 1.6;
                border-left: 4px solid #25d366;
            ">
                ${instrucoes}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: #25d366;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 25px;
                font-size: 16px;
                cursor: pointer;
                margin-top: 10px;
            ">
                ✅ Entendi!
            </button>
        </div>
    `;
    
    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
}

// NOVA FUNÇÃO: Abrir WhatsApp Web (para desktop)
function abrirWhatsAppWeb(telefone, crismando) {
    const telefoneFormatado = telefone.startsWith('55') ? telefone : '55' + telefone;
    const mensagem = encodeURIComponent(`🙏 Comprovante de pagamento da Crisma 2025 - ${crismando.nome}`);
    const url = `https://wa.me/${telefoneFormatado}?text=${mensagem}`;
    
    window.open(url, '_blank');
    
    alert(`✅ Comprovante baixado!\n📱 WhatsApp Web aberto para ${crismando.nome}\n\n👉 Anexe o arquivo baixado na conversa`);
}

// Manter funções originais para compatibilidade
function baixarComprovantePNG(dadosComprovante) {
    baixarComprovanteMobile(dadosComprovante);
}

function gerarComprovante() {
    const crismandoId = document.getElementById('selectCrismando').value;
    const mes = document.getElementById('mesPagamento').value;
    const valor = parseFloat(document.getElementById('valorPago').value) || 0;
    
    if (!crismandoId || !mes || valor <= 0) {
        alert('Por favor, preencha todos os campos antes de gerar o comprovante.');
        return;
    }
    
    const dadosComprovante = gerarComprovanteAutomatico(crismandoId, mes, valor);
    
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
            
            window.dadosComprovanteAtual = dadosComprovante;
            window.imagemComprovanteAtual = imgData;
        }
    });
}

// Função principal para envio (mantida para compatibilidade)
function enviarWhatsApp() {
    enviarComprovanteAutomatico();
}
