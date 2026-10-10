const BROKER_WS_URL = 'ws://192.168.9.130:9001/mqtt';
const TOPICO_INSCRICAO = 'phrsystem/teste/iot/dados';
const TOPICO_PUBLICACAO = 'phrsystem/teste/iot/comando';
const registrosPorPagina = 10;
let paginaAtual = 1;
let registrosAtuais = [];
let clienteMqtt;
let alarmeAtivo = false;
let deslizadorEmUso;
let tipoEntradaDeslizador;
let desativacaoEmCurso = false;
let aguardandoConfirmacaoDesativacao = false;

function atualizarBotaoAlarme(ativo) {
    alarmeAtivo = ativo;
    if (!ativo) {
        aguardandoConfirmacaoDesativacao = false;
    }
    const botao = document.getElementById('botao-ativar');
    const deslizadorPrincipal = document.getElementById('deslizador-alarme');
    botao.hidden = ativo;
    deslizadorPrincipal.hidden = !ativo;
    botao.textContent = 'Ativar Alarme';
    botao.classList.toggle('is-active', ativo);
    botao.setAttribute('aria-pressed', String(ativo));
    atualizarEstadoEsperaDesativacao(aguardandoConfirmacaoDesativacao);
}

function atualizarEstadoEsperaDesativacao(aguardando) {
    document.querySelectorAll('.desativacao-slider').forEach(deslizador => {
        const alca = deslizador.querySelector('.desativacao-slider-alca');
        const texto = deslizador.querySelector('.desativacao-slider-texto');
        deslizador.classList.toggle('is-desativando', aguardando);
        deslizador.setAttribute('aria-disabled', String(aguardando));
        texto.textContent = aguardando ? 'Aguardando...' : 'Deslize para desativar';
        alca.textContent = aguardando ? '' : '›';
        if (aguardando) {
            texto.style.opacity = '1';
        } else {
            atualizarDeslizador(deslizador, 0);
        }
    });
}

function atualizarDeslizador(deslizador, progresso) {
    const valor = Math.max(0, Math.min(100, progresso));
    const alca = deslizador.querySelector('.desativacao-slider-alca');
    const distanciaMaxima = Math.max(0, deslizador.clientWidth - alca.offsetWidth - 8);
    const texto = deslizador.querySelector('.desativacao-slider-texto');
    deslizador.style.setProperty('--progresso', `${valor}%`);
    alca.style.left = `${4 + distanciaMaxima * valor / 100}px`;
    alca.textContent = '›';
    texto.style.opacity = String(Math.max(0, 1 - valor / 85));
    deslizador.setAttribute('aria-valuenow', String(Math.round(valor)));
    deslizador.setAttribute(
        'aria-valuetext',
        valor >= 85 ? 'Solte para desativar' : 'Pronto para deslizar'
    );
}

function iniciarDeslizamento(evento) {
    const alca = evento.target.closest('.desativacao-slider-alca');
    const deslizador = alca && alca.closest('.desativacao-slider');
    if (
        !deslizador ||
        (deslizador.id === 'deslizador-alarme' && !alarmeAtivo) ||
        desativacaoEmCurso ||
        aguardandoConfirmacaoDesativacao ||
        deslizadorEmUso ||
        (evento.type === 'mousedown' && evento.button !== 0)
    ) {
        return;
    }

    evento.preventDefault();
    deslizadorEmUso = deslizador;
    tipoEntradaDeslizador = evento.type === 'touchstart' ? 'touch' : 'mouse';
    deslizador.classList.add('is-arrastando');
}

function obterCoordenadaX(evento) {
    if (evento.type.startsWith('touch')) {
        const toque = evento.changedTouches[0] || evento.touches[0];
        return toque ? toque.clientX : undefined;
    }
    return evento.clientX;
}

function moverDeslizamento(evento) {
    if (!deslizadorEmUso) {
        return;
    }

    const coordenadaX = obterCoordenadaX(evento);
    if (coordenadaX === undefined) {
        return;
    }

    evento.preventDefault();
    const deslizador = deslizadorEmUso;
    const alca = deslizador.querySelector('.desativacao-slider-alca');
    const retangulo = deslizador.getBoundingClientRect();
    const distanciaMaxima = Math.max(0, deslizador.clientWidth - alca.offsetWidth - 8);
    const posicao = Math.max(
        0,
        Math.min(distanciaMaxima, coordenadaX - retangulo.left - alca.offsetWidth / 2 - 4)
    );
    atualizarDeslizador(deslizador, distanciaMaxima > 0 ? posicao / distanciaMaxima * 100 : 0);
}

async function finalizarDeslizamento(evento) {
    if (!deslizadorEmUso || (evento.type.startsWith('touch') ? tipoEntradaDeslizador !== 'touch' : tipoEntradaDeslizador !== 'mouse')) {
        return;
    }

    moverDeslizamento(evento);
    const deslizador = deslizadorEmUso;
    const progresso = Number(deslizador.style.getPropertyValue('--progresso').replace('%', ''));
    const confirmado = progresso >= 85;
    deslizadorEmUso = undefined;
    tipoEntradaDeslizador = undefined;
    deslizador.classList.remove('is-arrastando');

    if (confirmado) {
        deslizador.querySelector('.desativacao-slider-alca').textContent = '✔';
        deslizador.querySelector('.desativacao-slider-texto').style.opacity = '0';
        await desativarAlarme();
    } else {
        atualizarDeslizador(deslizador, 0);
    }
}

function cancelarDeslizamento(evento) {
    if (
        !deslizadorEmUso ||
        (evento.type.startsWith('touch') ? tipoEntradaDeslizador !== 'touch' : tipoEntradaDeslizador !== 'mouse')
    ) {
        return;
    }

    const deslizador = deslizadorEmUso;
    deslizadorEmUso = undefined;
    tipoEntradaDeslizador = undefined;
    deslizador.classList.remove('is-arrastando');
    atualizarDeslizador(deslizador, 0);
}

function configurarBotoesAlarme() {
    const botaoPrincipal = document.getElementById('botao-ativar');
    botaoPrincipal.addEventListener('click', () => {
        if (!alarmeAtivo && !desativacaoEmCurso) {
            void ativarAlarme();
        }
    });

    const deslizadores = [
        document.getElementById('deslizador-alarme'),
        document.getElementById('deslizador-modal')
    ];
    deslizadores.forEach(deslizador => {
        deslizador.querySelector('.desativacao-slider-alca').addEventListener('mousedown', iniciarDeslizamento);
        deslizador.querySelector('.desativacao-slider-alca').addEventListener('touchstart', iniciarDeslizamento, { passive: false });
        deslizador.addEventListener('keydown', evento => {
            if (!alarmeAtivo || desativacaoEmCurso || aguardandoConfirmacaoDesativacao || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(evento.key)) {
                return;
            }

            evento.preventDefault();
            const valorAtual = Number(deslizador.getAttribute('aria-valuenow'));
            const proximoValor = evento.key === 'End' ? 100 :
                evento.key === 'Home' ? 0 :
                Math.max(0, Math.min(100, valorAtual + (evento.key === 'ArrowRight' ? 15 : -15)));
            atualizarDeslizador(deslizador, proximoValor);
            if (proximoValor >= 85) {
                deslizador.querySelector('.desativacao-slider-alca').textContent = '✔';
                void desativarAlarme();
            }
        });
    });
    document.addEventListener('mousemove', moverDeslizamento);
    document.addEventListener('mouseup', finalizarDeslizamento);
    document.addEventListener('touchmove', moverDeslizamento, { passive: false });
    document.addEventListener('touchend', finalizarDeslizamento);
    document.addEventListener('touchcancel', cancelarDeslizamento);
}

function atualizarStatusConexao(online) {
    const indicador = document.getElementById('status-conexao');
    indicador.classList.toggle('is-online', online);
    indicador.classList.toggle('is-offline', !online);
    document.getElementById('texto-conexao').textContent = online ? 'MQTT online' : 'MQTT offline';
}

let temporizadorNotificacao;
function mostrarNotificacao(mensagem, erro = false) {
    const notificacao = document.getElementById('notificacao');
    notificacao.textContent = mensagem;
    notificacao.classList.toggle('is-error', erro);
    notificacao.classList.add('is-visible');
    clearTimeout(temporizadorNotificacao);
    temporizadorNotificacao = setTimeout(() => notificacao.classList.remove('is-visible'), 3500);
}

function renderizarLogs() {
    const corpoTabela = document.getElementById('tabela-logs');
    const paginacao = document.getElementById('paginacao-registros');
    const totalPaginas = Math.ceil(registrosAtuais.length / registrosPorPagina);

    if (registrosAtuais.length === 0) {
        corpoTabela.innerHTML = '<tr><td colspan="3">Nenhum registro encontrado.</td></tr>';
        paginacao.hidden = true;
        return;
    }

    paginaAtual = Math.min(paginaAtual, totalPaginas);
    const inicio = (paginaAtual - 1) * registrosPorPagina;
    const registrosDaPagina = registrosAtuais.slice(inicio, inicio + registrosPorPagina);
    corpoTabela.innerHTML = '';

    registrosDaPagina.forEach(registro => {
        const linha = document.createElement('tr');
        const celulaDispositivo = document.createElement('td');
        const celulaStatus = document.createElement('td');
        const celulaHora = document.createElement('td');

        let statusMovimento;
        if (registro.eventoDashboard === 'alarme-desativado') {
            statusMovimento = '🔇 Alarme Desativado';
        } else if (registro.device_id === 'dashboard-web') {
            if (registro.button == 1) {
                statusMovimento = '🔴 Desativado (Web)';
            } else if (registro.button == 0) {
                statusMovimento = '🟢 Ativado (Web)';
            } else {
                statusMovimento = 'Evento Web';
            }
        } else if (registro.movement == 1) {
            statusMovimento = '<span>🚨 Movimento Detectado</span>';
        } else if (registro.movement == 0) {
            statusMovimento = '✅ Normal';
        } else {
            statusMovimento = 'Status desconhecido';
        }

        celulaDispositivo.textContent = registro.device_id || 'ESP32';
        celulaStatus.innerHTML = statusMovimento;
        celulaHora.textContent = new Date(registro.created_at).toLocaleString();
        linha.append(celulaDispositivo, celulaStatus, celulaHora);
        corpoTabela.appendChild(linha);
    });

    paginacao.hidden = totalPaginas <= 1;
    document.getElementById('informacao-paginacao').textContent =
        `Exibindo ${inicio + 1} a ${Math.min(inicio + registrosPorPagina, registrosAtuais.length)} de ${registrosAtuais.length}`;
    document.getElementById('pagina-anterior').disabled = paginaAtual === 1;
    document.getElementById('pagina-proxima').disabled = paginaAtual === totalPaginas;
}

function mudarPagina(direcao) {
    paginaAtual += direcao;
    renderizarLogs();
}

function processarMensagemMqtt(topico, payload) {
    if (topico !== TOPICO_INSCRICAO) {
        return;
    }

    let registro;
    try {
        registro = JSON.parse(payload.toString());
    } catch (erro) {
        console.error('Mensagem MQTT contém JSON inválido:', erro);
        return;
    }

    if (
        !registro ||
        typeof registro !== 'object' ||
        typeof registro.device_id !== 'string' ||
        !('movement' in registro) ||
        !('button' in registro)
    ) {
        console.error('Mensagem MQTT recebida com formato inesperado:', registro);
        return;
    }

    const confirmacaoDesativacao =
        aguardandoConfirmacaoDesativacao &&
        registro.device_id !== 'dashboard-web' &&
        registro.button == 1;
    const novoRegistro = {
        ...registro,
        ...(confirmacaoDesativacao ? { eventoDashboard: 'alarme-desativado' } : {}),
        created_at: new Date().toISOString()
    };

    registrosAtuais.unshift(novoRegistro);
    paginaAtual = 1;
    renderizarLogs();

    const modalAlarme = document.getElementById('modal-alarme');
    if (confirmacaoDesativacao) {
        atualizarBotaoAlarme(false);
        modalAlarme.style.display = 'none';
        mostrarNotificacao('O ESP32 confirmou a desativação do alarme.');
    } else if (novoRegistro.movement == 1) {
        modalAlarme.style.display = 'flex';
        atualizarDeslizador(document.getElementById('deslizador-modal'), 0);
    }
}

function conectarMqtt() {
    clienteMqtt = mqtt.connect(BROKER_WS_URL, {
        reconnectPeriod: 1000
    });

    clienteMqtt.on('connect', () => {
        atualizarStatusConexao(true);
        clienteMqtt.subscribe(TOPICO_INSCRICAO, erro => {
            if (erro) {
                console.error('Erro ao se inscrever no tópico MQTT:', erro);
                atualizarStatusConexao(false);
            }
        });
    });

    clienteMqtt.on('reconnect', () => atualizarStatusConexao(false));
    clienteMqtt.on('offline', () => atualizarStatusConexao(false));
    clienteMqtt.on('error', erro => {
        console.error('Erro na conexão MQTT:', erro);
        atualizarStatusConexao(false);
    });
    clienteMqtt.on('message', processarMensagemMqtt);
}

async function ativarAlarme() {
    const botao = document.getElementById('botao-ativar');
    if (!clienteMqtt || !clienteMqtt.connected) {
        mostrarNotificacao('Sem conexão MQTT para enviar o comando.', true);
        return;
    }

    botao.disabled = true;
    botao.textContent = 'Ativando...';
    try {
        const comando = JSON.stringify({
            device_id: 'dashboard-web',
            movement: 0,
            button: 0
        });

        await new Promise((resolve, reject) => {
            clienteMqtt.publish(TOPICO_PUBLICACAO, comando, { qos: 1 }, erro => {
                if (erro) {
                    reject(erro);
                } else {
                    resolve();
                }
            });
        });
        atualizarBotaoAlarme(true);
        mostrarNotificacao('Comando para ativar o alarme enviado.');
    } catch (erro) {
        console.error('Erro ao ativar o alarme via MQTT:', erro);
        mostrarNotificacao('Erro ao enviar comando MQTT para ativar o alarme.', true);
    } finally {
        botao.disabled = false;
        atualizarBotaoAlarme(alarmeAtivo);
    }
}

async function desativarAlarme() {
    const botaoPrincipal = document.getElementById('botao-ativar');
    if (desativacaoEmCurso || aguardandoConfirmacaoDesativacao) {
        return;
    }

    if (!clienteMqtt || !clienteMqtt.connected) {
        mostrarNotificacao('Sem conexão MQTT para enviar o comando.', true);
        atualizarBotaoAlarme(alarmeAtivo);
        return;
    }

    desativacaoEmCurso = true;
    botaoPrincipal.disabled = true;
    aguardandoConfirmacaoDesativacao = true;
    atualizarEstadoEsperaDesativacao(true);
    try {
        const comando = JSON.stringify({
            device_id: 'dashboard-web',
            movement: 0,
            button: 1
        });

        await new Promise((resolve, reject) => {
            clienteMqtt.publish(TOPICO_PUBLICACAO, comando, { qos: 1 }, erro => {
                if (erro) {
                    reject(erro);
                } else {
                    resolve();
                }
            });
        });
        mostrarNotificacao('Comando enviado. Aguardando confirmação do ESP32.');
    } catch (erro) {
        aguardandoConfirmacaoDesativacao = false;
        atualizarEstadoEsperaDesativacao(false);
        console.error('Erro ao desativar o alarme via MQTT:', erro);
        mostrarNotificacao('Erro ao enviar comando MQTT para desativar o alarme.', true);
    } finally {
        desativacaoEmCurso = false;
        botaoPrincipal.disabled = false;
        if (!aguardandoConfirmacaoDesativacao) {
            atualizarBotaoAlarme(alarmeAtivo);
        }
    }
}

configurarBotoesAlarme();
conectarMqtt();
