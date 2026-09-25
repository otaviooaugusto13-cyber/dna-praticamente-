
/* ============================================================
   DNA DO LÍDER — script.js
   Observação importante sobre segurança:
   Este é um app 100% front-end. Não existe servidor, login real
   nem validação server-side aqui — os dados do participante ficam
   salvos apenas no localStorage do navegador dele (não são
   enviados a nenhuma nuvem). Isso é adequado para um protótipo,
   mas para uso corporativo real (dados de contato, respostas
   sensíveis) o recomendado é ligar isto a um backend com
   autenticação e armazenamento próprios.
   ============================================================ */

// Substitua pelos IDs reais dos vídeos do YouTube de cada semana.
// Semanas sem vídeo cadastrado liberam o formulário automaticamente.
const courseData = {
    1: { title: "Semana 1: Identidade do Líder", videoId: null, questions: [ { id: "s1_q1", label: "Estilo de liderança atual:" }, { id: "s1_q2", label: "Plano de Ação (Pontos Fortes):" } ] },
    2: { title: "Semana 2: Meu Perfil", videoId: null, questions: [ { id: "s2_q1", label: "Mapeamento (Características predominantes):" } ] },
    12: { title: "Semana 12: Consolidação", videoId: null, questions: [ { id: "s12_q1", label: "Comportamento estratégico transformado:" } ] }
};

const WATCH_THRESHOLD = 0.9; // 90% do vídeo assistido libera o plano de ação

let autoSaveTimer;
let radarChartInstance = null;
let ytPlayer = null;
let ytProgressInterval = null;
let currentWeek = 1;

/* --- ARMAZENAMENTO SEGURO (com fallback para modo privado / storage bloqueado) --- */
function safeGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (err) {
        console.warn('Não foi possível ler o armazenamento local:', err);
        return null;
    }
}

function safeSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (err) {
        console.warn('Não foi possível salvar no armazenamento local:', err);
        showToast('Não foi possível salvar. Verifique se o modo privado/anônimo está desativado.', true);
        return false;
    }
}

function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (err) { console.warn(err); }
}

function safeJSON(key, fallback) {
    const raw = safeGet(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (err) { return fallback; }
}

/* --- NOTIFICAÇÃO DE NOVO CADASTRO (Formspree) ---
   Site 100% estático (HTML/CSS/JS puro, sem bundler), então usamos o
   padrão "Vanilla JS (Ajax)" do Formspree: um fetch() direto para o
   endpoint, em segundo plano. Isso NÃO substitui o salvamento local —
   é só um aviso por e-mail para você toda vez que alguém se cadastra.
   Se o Formspree falhar (sem internet, bloqueio, etc.), a jornada do
   participante continua normalmente; só registramos um aviso no console. */
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xzezadaz';

function notifyNewRegistration(userData) {
    fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
            _subject: `Novo cadastro no DNA do Líder: ${userData.nome}`,
            nome: userData.nome,
            email: userData.email,
            telefone: userData.telefone,
            origem: userData.origem || 'Não informado',
            _replyto: userData.email
        })
    })
    .then(res => {
        if (!res.ok) console.warn('Formspree: notificação não confirmada (status ' + res.status + ').');
    })
    .catch(err => {
        // Falha silenciosa por design: um problema de rede aqui não pode travar o cadastro do usuário.
        console.warn('Formspree: não foi possível enviar a notificação de cadastro.', err);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    verificarCadastro();

    document.getElementById('btn-next-register').addEventListener('click', () => {
        document.getElementById('welcome-screen').classList.remove('active');
        document.getElementById('register-screen').classList.add('active');
    });

    document.getElementById('registration-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validateRegistrationForm()) return;

        const userData = {
            nome: document.getElementById('user-name').value.trim(),
            telefone: document.getElementById('user-phone').value.trim(),
            email: document.getElementById('user-email').value.trim(),
            origem: document.getElementById('user-referral').value.trim()
        };
        if (!safeSet('dna_user_data', JSON.stringify(userData))) return;
        notifyNewRegistration(userData);
        transicaoLoading(userData.nome);
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        if (!confirm('Sair vai manter suas respostas salvas neste navegador. Deseja continuar?')) return;
        safeRemove('dna_user_data');
        stopYouTubeTracking();
        location.reload();
    });

    // MODO FOCO
    document.getElementById('btn-focus').addEventListener('click', () => {
        document.body.classList.toggle('focus-mode');
        const btnFoco = document.getElementById('btn-focus');
        const active = document.body.classList.contains('focus-mode');
        btnFoco.setAttribute('aria-pressed', String(active));
        if (active) {
            btnFoco.innerText = 'Sair do Foco';
            btnFoco.style.background = 'rgba(248, 181, 0, 0.2)';
            showToast('Modo Foco ativado. Elimine distrações.');
        } else {
            btnFoco.innerText = 'Modo Foco';
            btnFoco.style.background = 'transparent';
        }
    });

    document.getElementById('btnSave').addEventListener('click', () => saveData(false));

    // Validação ao vivo dos campos de cadastro
    ['user-name', 'user-phone', 'user-email'].forEach(id => {
        document.getElementById(id).addEventListener('blur', () => validateField(id));
    });
});

/* --- VALIDAÇÃO DE FORMULÁRIO --- */
function setFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const group = input.closest('.input-group');
    let errorEl = group.querySelector('.field-error');
    if (!errorEl) {
        errorEl = document.createElement('span');
        errorEl.className = 'field-error';
        errorEl.setAttribute('role', 'alert');
        group.appendChild(errorEl);
    }
    if (message) {
        group.classList.add('has-error');
        errorEl.innerText = message;
    } else {
        group.classList.remove('has-error');
        errorEl.innerText = '';
    }
}

function validateField(id) {
    const value = document.getElementById(id).value.trim();
    if (id === 'user-name') {
        if (value.length < 2) { setFieldError(id, 'Informe seu nome completo.'); return false; }
        setFieldError(id, '');
        return true;
    }
    if (id === 'user-phone') {
        const digits = value.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 11) { setFieldError(id, 'Informe um WhatsApp válido com DDD.'); return false; }
        setFieldError(id, '');
        return true;
    }
    if (id === 'user-email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) { setFieldError(id, 'Informe um e-mail válido.'); return false; }
        setFieldError(id, '');
        return true;
    }
    return true;
}

function validateRegistrationForm() {
    const nameOk = validateField('user-name');
    const phoneOk = validateField('user-phone');
    const emailOk = validateField('user-email');
    if (!nameOk || !phoneOk || !emailOk) {
        showToast('Revise os campos destacados antes de continuar.', true);
        return false;
    }
    return true;
}

/* --- TRANSIÇÕES E SKELETON LOADING --- */
function verificarCadastro() {
    const savedUser = safeJSON('dna_user_data', null);
    if (savedUser && savedUser.nome) {
        document.getElementById('welcome-screen').classList.remove('active');
        transicaoLoading(savedUser.nome);
    }
}

function transicaoLoading(nomeUsuario) {
    document.getElementById('register-screen').classList.remove('active');
    document.getElementById('welcome-screen').classList.remove('active');
    document.getElementById('loading-screen').classList.add('active');

    setTimeout(() => {
        document.getElementById('loading-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');

        let primeiroNome = (nomeUsuario || 'Participante').split(' ')[0];
        primeiroNome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1);
        document.getElementById('user-greeting').innerText = `Gestão em andamento. Bem-vindo, ${primeiroNome}.`;

        buildWeekSelector();
        loadWeek(1);
        updateProgress();
        iniciarOnboarding();
        loadYouTubeAPI();
    }, 1200);
}

/* --- ONBOARDING GUIADO --- */
function iniciarOnboarding() {
    if (!safeGet('dna_onboarding_done')) {
        const modal = document.getElementById('onboarding-modal');
        const title = document.getElementById('onboarding-title');
        const text = document.getElementById('onboarding-text');
        const btnNext = document.getElementById('btn-onboarding-next');

        modal.classList.add('active');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');

        const steps = [
            { t: "Bem-vindo ao Praticamente", d: "Sua plataforma corporativa de mentoria executiva. Vamos fazer um tour rápido." },
            { t: "1. Briefing Semanal", d: "Assista ao vídeo no topo do painel para alinhar a estratégia da semana." },
            { t: "2. Auto-Save Inteligente", d: "Preencha seu plano de ação com tranquilidade. O sistema salva tudo automaticamente neste dispositivo." },
            { t: "3. Mapa Estratégico", d: "Na Semana 12, nossa IA analisará seu vocabulário e gerará seu gráfico comportamental." }
        ];

        let currentStep = 0;

        btnNext.onclick = () => {
            currentStep++;
            if (currentStep < steps.length) {
                title.innerText = steps[currentStep].t;
                text.innerText = steps[currentStep].d;
                if (currentStep === steps.length - 1) btnNext.innerText = "Começar Jornada";
            } else {
                modal.classList.remove('active');
                safeSet('dna_onboarding_done', 'true');
                showToast("Ambiente liberado para execução.");
            }
        };
    }
}

/* --- NAVEGAÇÃO --- */
function buildWeekSelector() {
    const selector = document.getElementById('weekSelector');
    selector.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'week-btn';
        btn.innerText = i;
        btn.id = `btn-week-${i}`;
        btn.setAttribute('aria-label', `Semana ${i}`);
        btn.onclick = () => {
            loadWeek(i);
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        };
        selector.appendChild(btn);
    }
}

function loadWeek(weekNumber) {
    currentWeek = weekNumber;
    document.querySelectorAll('.week-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-week-${weekNumber}`);
    if (activeBtn) activeBtn.classList.add('active');

    const weekInfo = courseData[weekNumber] || { title: `Semana ${weekNumber}: Em Breve`, videoId: null, questions: [{ id: `s${weekNumber}_q1`, label: "Rota de Execução (Anotações):" }] };
    document.getElementById('weekTitle').innerText = weekInfo.title;

    const formContainer = document.getElementById('formContainer');
    formContainer.innerHTML = '';

    document.getElementById('resultsContainer').style.display = (weekNumber === 12) ? 'block' : 'none';

    if (weekNumber === 12) {
        gerarDiagnosticoInteligente();
    }

    const savedData = safeJSON('dna_respostas', {});

    weekInfo.questions.forEach(q => {
        const div = document.createElement('div');
        div.className = 'input-group';
        const label = document.createElement('label');
        label.innerText = q.label;
        label.setAttribute('for', q.id);
        const textarea = document.createElement('textarea');
        textarea.id = q.id;
        textarea.setAttribute('maxlength', '4000');
        textarea.value = savedData[q.id] || '';
        textarea.placeholder = "Descreva sua aplicação prática...";

        textarea.addEventListener('input', () => {
            const status = document.getElementById('save-status');
            status.innerText = 'Digitando…';
            status.style.color = 'var(--gold-main)';

            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                saveData(true);
            }, 1500);
        });

        div.appendChild(label);
        div.appendChild(textarea);
        formContainer.appendChild(div);
    });

    setupVideoForWeek(weekInfo);
}

function showToast(message, isError = false) {
    let toast = document.getElementById('custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'custom-toast';
        toast.className = 'toast-notification';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    toast.classList.toggle('toast-error', isError);
    const icon = isError ? '⚠' : '✓';
    toast.innerHTML = `<strong style="color: ${isError ? 'var(--error-color)' : 'var(--gold-main)'}">${icon}</strong> `;
    toast.appendChild(document.createTextNode(message));
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

/* --- SALVAR E PROGRESSO --- */
function saveData(silent = false) {
    const statusText = document.getElementById('save-status');
    statusText.innerText = 'Salvando…';

    let savedData = safeJSON('dna_respostas', {});
    document.querySelectorAll('#formContainer textarea').forEach(input => {
        savedData[input.id] = input.value;
    });

    const ok = safeSet('dna_respostas', JSON.stringify(savedData));
    updateProgress();

    setTimeout(() => {
        if (ok) {
            statusText.innerText = 'Salvo neste dispositivo.';
            statusText.style.color = 'var(--silver-dark)';
            if (!silent) showToast('Rota estratégica salva neste dispositivo.');
        } else {
            statusText.innerText = 'Falha ao salvar.';
            statusText.style.color = 'var(--error-color)';
        }
    }, 400);
}

function updateProgress() {
    const savedData = safeJSON('dna_respostas', {});
    let completedWeeks = 0;

    for (let i = 1; i <= 12; i++) {
        const hasData = Object.keys(savedData).some(key => key.startsWith(`s${i}_`) && savedData[key].trim() !== "");
        const btn = document.getElementById(`btn-week-${i}`);
        if (btn) {
            if (hasData) { completedWeeks++; btn.classList.add('completed'); }
            else { btn.classList.remove('completed'); }
        }
    }

    const percentage = (completedWeeks / 12) * 100;
    document.getElementById('progress-fill').style.width = percentage + '%';
}

/* --- VÍDEO (YouTube IFrame API) ---
   O HTML já reserva os elementos de player, barra de progresso e o aviso
   de bloqueio; antes esses elementos nunca eram usados pelo JS e o vídeo
   ficava eternamente em "Carregando Briefing...". Agora o player é
   inicializado de verdade e o plano de ação da semana só é liberado
   depois que o participante assiste a 90% do vídeo. */
let ytApiReady = false;
function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) { ytApiReady = true; return; }
    window.onYouTubeIframeAPIReady = () => { ytApiReady = true; setupVideoForWeek(courseData[currentWeek]); };
}

function setupVideoForWeek(weekInfo) {
    const overlay = document.getElementById('video-overlay');
    const lockMsg = document.getElementById('video-lock-msg');
    const fill = document.getElementById('video-progress-fill');
    stopYouTubeTracking();
    fill.style.width = '0%';

    if (!weekInfo || !weekInfo.videoId) {
        // Sem vídeo cadastrado para esta semana: não bloqueia o formulário.
        overlay.classList.add('hidden');
        lockMsg.style.display = 'none';
        setFormLocked(false);
        return;
    }

    overlay.classList.remove('hidden');
    overlay.querySelector('.video-label').innerText = 'Carregando briefing...';
    lockMsg.style.display = 'block';

    const alreadyWatched = safeGet(`dna_video_watched_s${currentWeek}`) === 'true';
    setFormLocked(!alreadyWatched);
    if (alreadyWatched) {
        fill.style.width = '100%';
        lockMsg.style.display = 'none';
    }

    if (!ytApiReady || !window.YT) return; // API ainda carregando; tentará de novo via onYouTubeIframeAPIReady

    const container = document.getElementById('youtube-player');
    container.innerHTML = '';
    const playerDiv = document.createElement('div');
    container.appendChild(playerDiv);

    ytPlayer = new YT.Player(playerDiv, {
        videoId: weekInfo.videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
            onReady: () => { overlay.classList.add('hidden'); },
            onStateChange: onYouTubeStateChange
        }
    });
}

function onYouTubeStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        clearInterval(ytProgressInterval);
        ytProgressInterval = setInterval(trackYouTubeProgress, 1000);
    } else {
        clearInterval(ytProgressInterval);
    }
}

function trackYouTubeProgress() {
    if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
    const duration = ytPlayer.getDuration();
    const current = ytPlayer.getCurrentTime();
    if (!duration) return;

    const ratio = Math.min(current / duration, 1);
    document.getElementById('video-progress-fill').style.width = (ratio * 100) + '%';

    if (ratio >= WATCH_THRESHOLD) {
        safeSet(`dna_video_watched_s${currentWeek}`, 'true');
        document.getElementById('video-lock-msg').style.display = 'none';
        setFormLocked(false);
        clearInterval(ytProgressInterval);
    }
}

function stopYouTubeTracking() {
    clearInterval(ytProgressInterval);
    ytProgressInterval = null;
}

function setFormLocked(locked) {
    document.querySelectorAll('#formContainer textarea').forEach(t => { t.disabled = locked; });
}

/* --- MOTOR DE ANÁLISE LEXICAL (PNL/ENEAGRAMA) --- */
function gerarDiagnosticoInteligente() {
    const savedData = safeJSON('dna_respostas', {});
    let textoCompleto = Object.values(savedData).join(" ").toLowerCase();

    const perfis = {
        "Executor": {
            desc: "Focado em metas, agilidade e resultados práticos (Tipos Eneagrama 3 ou 8).",
            palavras: ["meta", "resultado", "foco", "rápido", "agilidade", "prática", "ação", "equipe", "liderar", "vencer", "prazo"],
            pontos: 0
        },
        "Analítico": {
            desc: "Focado em processos, estrutura e alta qualidade (Tipos Eneagrama 1 ou 5).",
            palavras: ["processo", "análise", "detalhe", "estrutura", "regra", "organização", "entender", "lógica", "método", "cuidado"],
            pontos: 0
        },
        "Relacional": {
            desc: "Focado em pessoas, integração e clima da equipe (Tipos Eneagrama 2 ou 9).",
            palavras: ["pessoas", "ajudar", "empatia", "ouvir", "juntos", "harmonia", "comunicação", "sentimento", "desenvolver", "apoio"],
            pontos: 0
        }
    };

    let totalPalavrasEncontradas = 0;

    for (const dados of Object.values(perfis)) {
        dados.palavras.forEach(palavra => {
            const regex = new RegExp("\\b" + palavra + "\\b", "g");
            const matches = textoCompleto.match(regex);
            if (matches) {
                dados.pontos += matches.length;
                totalPalavrasEncontradas += matches.length;
            }
        });
    }

    let perfilDominante = "Perfil Híbrido (Em Análise)";
    let descDominante = "Continue escrevendo seus planos de ação nas semanas anteriores para a IA processar seu vocabulário.";
    let maiorPontuacao = 0;

    if (totalPalavrasEncontradas > 2) {
        for (const [perfil, dados] of Object.entries(perfis)) {
            if (dados.pontos > maiorPontuacao) {
                maiorPontuacao = dados.pontos;
                perfilDominante = perfil;
                descDominante = dados.desc;
            }
        }
    }

    document.getElementById('diagnostico-titulo').innerText = `Traço Dominante: ${perfilDominante}`;
    document.getElementById('diagnostico-desc').innerText = descDominante;

    renderRadarChart(perfis["Executor"].pontos, perfis["Analítico"].pontos, perfis["Relacional"].pontos);
}

function renderRadarChart(pExe, pAna, pRel) {
    const canvasEl = document.getElementById('radarChart');
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');

    if (radarChartInstance) { radarChartInstance.destroy(); }

    if (pExe === 0 && pAna === 0 && pRel === 0) { pExe = 1; pAna = 1; pRel = 1; }

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Executor', 'Analítico', 'Relacional'],
            datasets: [{
                label: 'Mapeamento Lexical',
                data: [pExe, pAna, pRel],
                backgroundColor: 'rgba(248, 181, 0, 0.2)',
                borderColor: '#f8b500',
                pointBackgroundColor: '#fceabb',
                pointBorderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { color: '#e0e0e0', font: { size: 14, family: 'Segoe UI' } },
                    ticks: { display: false }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

/* --- EXPORTAÇÃO PDF --- */
const exportBtn = document.getElementById('btn-export-pdf');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        if (typeof html2pdf === 'undefined') {
            showToast('Biblioteca de PDF indisponível no momento.', true);
            return;
        }
        const resultsEl = document.getElementById('resultsContainer');
        html2pdf().from(resultsEl).set({
            margin: 10,
            filename: 'DNA-do-Lider-Relatorio.pdf',
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, backgroundColor: '#0a0a0c' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).save();
    });
}

/* --- PARTÍCULAS DE FUNDO --- */
const canvas = document.getElementById('particles-bg');
const ctx = canvas.getContext('2d');
let particlesArray = [];
let particlesReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

canvas.width = window.innerWidth; canvas.height = window.innerHeight;
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; initParticles(); });

class Particle {
    constructor(x, y, dx, dy, size, color) { this.x = x; this.y = y; this.dx = dx; this.dy = dy; this.size = size; this.color = color; }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); }
    update() {
        if (this.x > canvas.width || this.x < 0) this.dx = -this.dx;
        if (this.y > canvas.height || this.y < 0) this.dy = -this.dy;
        this.x += this.dx; this.y += this.dy; this.draw();
    }
}
function initParticles() {
    particlesArray = [];
    let num = Math.min((canvas.height * canvas.width) / 15000, 60);
    for (let i = 0; i < num; i++) {
        let size = Math.random() * 2 + 1;
        let x = Math.random() * (canvas.width - size * 2) + size * 2;
        let y = Math.random() * (canvas.height - size * 2) + size * 2;
        let color = Math.random() > 0.7 ? '#f8b500' : '#555555';
        particlesArray.push(new Particle(x, y, (Math.random() * 0.4) - 0.2, (Math.random() * 0.4) - 0.2, size, color));
    }
}
function animateParticles() {
    requestAnimationFrame(animateParticles);
    if (particlesReduced) return; // respeita preferência de menos movimento
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesArray.forEach(p => p.update());
    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            let dist = ((particlesArray[a].x - particlesArray[b].x) ** 2) + ((particlesArray[a].y - particlesArray[b].y) ** 2);
            if (dist < (canvas.width / 7) * (canvas.height / 7)) {
                ctx.strokeStyle = `rgba(248, 181, 0, ${0.4 - (dist / 25000)})`;
                ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(particlesArray[a].x, particlesArray[a].y); ctx.lineTo(particlesArray[b].x, particlesArray[b].y); ctx.stroke();
            }
        }
    }
}
initParticles(); animateParticles();
