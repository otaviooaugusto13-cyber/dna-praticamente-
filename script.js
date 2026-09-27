// Importações Oficiais do Firebase v10
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Suas credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBCbGHH0xDs7mXDBANzCjZeMOXISiTeXyk",
  authDomain: "dna-do-lider.firebaseapp.com",
  projectId: "dna-do-lider",
  storageBucket: "dna-do-lider.firebasestorage.app",
  messagingSenderId: "142543072482",
  appId: "1:142543072482:web:d1fbf79400d102a7d302bb"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const courseData = {
    1: { title: "Semana 1: Identidade do Líder", videoId: null, questions: [ { id: "s1_q1", label: "Estilo de liderança atual:" }, { id: "s1_q2", label: "Plano de Ação (Pontos Fortes):" } ] },
    2: { title: "Semana 2: Meu Perfil", videoId: null, questions: [ { id: "s2_q1", label: "Mapeamento (Características predominantes):" } ] },
    12: { title: "Semana 12: Consolidação", videoId: null, questions: [ { id: "s12_q1", label: "Comportamento estratégico transformado:" } ] }
};

const WATCH_THRESHOLD = 0.9;
let autoSaveTimer;
let radarChartInstance = null;
let ytPlayer = null;
let ytProgressInterval = null;
let currentWeek = 1;

/* --- SISTEMA DE LOGIN GOOGLE E BANCO DE DADOS --- */
document.addEventListener("DOMContentLoaded", () => {
    
    // Botão de Login do Google
    const btnLogin = document.getElementById('btn-google-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            btnLogin.innerHTML = "Carregando...";
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("Erro no login:", error);
                btnLogin.innerHTML = "Entrar com o Google";
                showToast("Erro ao fazer login. Tente novamente.", true);
            }
        });
    }

    // Botões de Sair
    const handleLogout = async () => {
        if (!confirm('Sair encerrará sua sessão. Deseja continuar?')) return;
        await signOut(auth);
        location.reload();
    };
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    document.getElementById('btn-logout-payment').addEventListener('click', handleLogout);

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
});

// Observador de Estado: Deteta automaticamente se o utilizador está logado
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Usuário fez login. Mostrar tela de loading enquanto verifica pagamento no banco
        ocultarTodasTelas();
        document.getElementById('loading-screen').classList.add('active');

        const emailFormatado = user.email.toLowerCase();
        
        try {
            // Verifica no banco de dados na coleção "pagantes" se existe um documento com o email dele
            const docRef = doc(db, "pagantes", emailFormatado);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // E-mail ENCONTRADO na lista VIP! Acesso liberado.
                iniciarSessaoAprovada(user.displayName);
            } else {
                // E-mail NÃO ENCONTRADO. Mostrar botão de compra.
                ocultarTodasTelas();
                document.getElementById('payment-screen').classList.add('active');
                document.getElementById('user-email-display').innerText = emailFormatado;
            }
        } catch (erro) {
            console.error("Erro ao verificar banco de dados:", erro);
            showToast("Erro ao comunicar com o servidor de licenças.", true);
        }

    } else {
        // Usuário não está logado. Mostrar tela inicial de login.
        ocultarTodasTelas();
        document.getElementById('welcome-screen').classList.add('active');
        const btnLogin = document.getElementById('btn-google-login');
        if(btnLogin) btnLogin.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Entrar com o Google`;
    }
});

function ocultarTodasTelas() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
}

function iniciarSessaoAprovada(nomeUsuario) {
    ocultarTodasTelas();
    document.getElementById('loading-screen').classList.add('active');

    setTimeout(() => {
        document.getElementById('loading-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');

        let primeiroNome = (nomeUsuario || 'Líder').split(' ')[0];
        primeiroNome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1);
        document.getElementById('user-greeting').innerText = `Acesso Liberado. Bem-vindo, ${primeiroNome}.`;

        buildWeekSelector();
        loadWeek(1);
        updateProgress();
        iniciarOnboarding();
        loadYouTubeAPI();
    }, 800);
}

/* --- ARMAZENAMENTO SEGURO (MANTIDO LOCAL PARA AS RESPOSTAS) --- */
function safeGet(key) { try { return localStorage.getItem(key); } catch (err) { return null; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (err) { return false; } }
function safeJSON(key, fallback) { const raw = safeGet(key); if (!raw) return fallback; try { return JSON.parse(raw); } catch (err) { return fallback; } }

/* --- ONBOARDING GUIADO --- */
function iniciarOnboarding() {
    if (!safeGet('dna_onboarding_done')) {
        const modal = document.getElementById('onboarding-modal');
        const title = document.getElementById('onboarding-title');
        const text = document.getElementById('onboarding-text');
        const btnNext = document.getElementById('btn-onboarding-next');

        modal.classList.add('active');
        const steps = [
            { t: "Bem-vindo ao Praticamente", d: "Sua plataforma corporativa de mentoria executiva. Vamos fazer um tour rápido." },
            { t: "1. Briefing Semanal", d: "Assista ao vídeo no topo do painel para alinhar a estratégia da semana." },
            { t: "2. Auto-Save Inteligente", d: "Preencha seu plano de ação com tranquilidade. O sistema salva tudo automaticamente." },
            { t: "3. Mapa Estratégico", d: "Na Semana 12, nossa IA analisará seu vocabulário e gerará seu gráfico comportamental." }
        ];

        let currentStep = 0;
        btnNext.onclick = () => {
            currentStep++;
            if (currentStep < steps.length) {
                title.innerText = steps[currentStep].t; text.innerText = steps[currentStep].d;
                if (currentStep === steps.length - 1) btnNext.innerText = "Começar Jornada";
            } else {
                modal.classList.remove('active');
                safeSet('dna_onboarding_done', 'true');
                showToast("Ambiente liberado para execução.");
            }
        };
    }
}

/* --- NAVEGAÇÃO E PROGRESSO --- */
function buildWeekSelector() {
    const selector = document.getElementById('weekSelector');
    selector.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'week-btn'; btn.innerText = i; btn.id = `btn-week-${i}`;
        btn.onclick = () => { loadWeek(i); btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); };
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
    const formContainer = document.getElementById('formContainer'); formContainer.innerHTML = '';
    document.getElementById('resultsContainer').style.display = (weekNumber === 12) ? 'block' : 'none';

    if (weekNumber === 12) gerarDiagnosticoInteligente();
    const savedData = safeJSON('dna_respostas', {});

    weekInfo.questions.forEach(q => {
        const div = document.createElement('div'); div.className = 'input-group';
        const label = document.createElement('label'); label.innerText = q.label; label.setAttribute('for', q.id);
        const textarea = document.createElement('textarea');
        textarea.id = q.id; textarea.value = savedData[q.id] || ''; textarea.placeholder = "Descreva sua aplicação prática...";
        textarea.addEventListener('input', () => {
            document.getElementById('save-status').innerText = 'Digitando…';
            document.getElementById('save-status').style.color = 'var(--gold-main)';
            clearTimeout(autoSaveTimer); autoSaveTimer = setTimeout(() => { saveData(true); }, 1500);
        });
        div.appendChild(label); div.appendChild(textarea); formContainer.appendChild(div);
    });
    setupVideoForWeek(weekInfo);
}

function saveData(silent = false) {
    const statusText = document.getElementById('save-status');
    statusText.innerText = 'Salvando…';
    let savedData = safeJSON('dna_respostas', {});
    document.querySelectorAll('#formContainer textarea').forEach(input => { savedData[input.id] = input.value; });
    const ok = safeSet('dna_respostas', JSON.stringify(savedData));
    updateProgress();
    setTimeout(() => {
        if (ok) {
            statusText.innerText = 'Salvo neste dispositivo.'; statusText.style.color = 'var(--silver-dark)';
            if (!silent) showToast('Rota estratégica salva neste dispositivo.');
        } else {
            statusText.innerText = 'Falha ao salvar.'; statusText.style.color = 'var(--error-color)';
        }
    }, 400);
}

function updateProgress() {
    const savedData = safeJSON('dna_respostas', {});
    let completedWeeks = 0;
    for (let i = 1; i <= 12; i++) {
        const hasData = Object.keys(savedData).some(key => key.startsWith(`s${i}_`) && savedData[key].trim() !== "");
        const btn = document.getElementById(`btn-week-${i}`);
        if (btn) { if (hasData) { completedWeeks++; btn.classList.add('completed'); } else { btn.classList.remove('completed'); } }
    }
    document.getElementById('progress-fill').style.width = ((completedWeeks / 12) * 100) + '%';
}

function showToast(message, isError = false) {
    let toast = document.getElementById('custom-toast');
    if (!toast) {
        toast = document.createElement('div'); toast.id = 'custom-toast'; toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    toast.classList.toggle('toast-error', isError);
    toast.innerHTML = `<strong style="color: ${isError ? 'var(--error-color)' : 'var(--gold-main)'}">${isError ? '⚠' : '✓'}</strong> ${message}`;
    toast.classList.add('show');
    clearTimeout(toast._hideTimer); toast._hideTimer = setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

/* --- VÍDEO (YouTube) --- */
let ytApiReady = false;
function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) { ytApiReady = true; return; }
    window.onYouTubeIframeAPIReady = () => { ytApiReady = true; setupVideoForWeek(courseData[currentWeek]); };
}

function setupVideoForWeek(weekInfo) {
    const overlay = document.getElementById('video-overlay');
    const lockMsg = document.getElementById('video-lock-msg');
    const fill = document.getElementById('video-progress-fill');
    stopYouTubeTracking(); fill.style.width = '0%';

    if (!weekInfo || !weekInfo.videoId) {
        overlay.classList.add('hidden'); lockMsg.style.display = 'none'; setFormLocked(false); return;
    }
    overlay.classList.remove('hidden'); overlay.querySelector('.video-label').innerText = 'Carregando briefing...'; lockMsg.style.display = 'block';

    const alreadyWatched = safeGet(`dna_video_watched_s${currentWeek}`) === 'true';
    setFormLocked(!alreadyWatched);
    if (alreadyWatched) { fill.style.width = '100%'; lockMsg.style.display = 'none'; }
    if (!ytApiReady || !window.YT) return;

    const container = document.getElementById('youtube-player'); container.innerHTML = '';
    const playerDiv = document.createElement('div'); container.appendChild(playerDiv);

    ytPlayer = new YT.Player(playerDiv, {
        videoId: weekInfo.videoId, playerVars: { rel: 0, modestbranding: 1 },
        events: { onReady: () => { overlay.classList.add('hidden'); }, onStateChange: onYouTubeStateChange }
    });
}
function onYouTubeStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) { clearInterval(ytProgressInterval); ytProgressInterval = setInterval(trackYouTubeProgress, 1000); } 
    else { clearInterval(ytProgressInterval); }
}
function trackYouTubeProgress() {
    if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
    const ratio = Math.min(ytPlayer.getCurrentTime() / ytPlayer.getDuration(), 1);
    document.getElementById('video-progress-fill').style.width = (ratio * 100) + '%';
    if (ratio >= WATCH_THRESHOLD) {
        safeSet(`dna_video_watched_s${currentWeek}`, 'true'); document.getElementById('video-lock-msg').style.display = 'none';
        setFormLocked(false); clearInterval(ytProgressInterval);
    }
}
function stopYouTubeTracking() { clearInterval(ytProgressInterval); ytProgressInterval = null; }
function setFormLocked(locked) { document.querySelectorAll('#formContainer textarea').forEach(t => { t.disabled = locked; }); }

/* --- ANÁLISE LEXICAL --- */
function gerarDiagnosticoInteligente() {
    const textoCompleto = Object.values(safeJSON('dna_respostas', {})).join(" ").toLowerCase();
    const perfis = {
        "Executor": { desc: "Focado em metas e agilidade.", palavras: ["meta", "resultado", "foco", "rápido", "agilidade", "prática", "ação", "equipe", "vencer", "prazo"], pontos: 0 },
        "Analítico": { desc: "Focado em processos e estrutura.", palavras: ["processo", "análise", "detalhe", "estrutura", "regra", "organização", "entender", "lógica", "método"], pontos: 0 },
        "Relacional": { desc: "Focado em pessoas e harmonia.", palavras: ["pessoas", "ajudar", "empatia", "ouvir", "juntos", "harmonia", "comunicação", "sentimento", "apoio"], pontos: 0 }
    };

    let totalEncontradas = 0;
    for (const d of Object.values(perfis)) { d.palavras.forEach(p => { const matches = textoCompleto.match(new RegExp("\\b" + p + "\\b", "g")); if (matches) { d.pontos += matches.length; totalEncontradas += matches.length; } }); }

    let pDom = "Híbrido (Em Análise)", dDom = "Escreva seus planos de ação para a IA processar.", mPts = 0;
    if (totalEncontradas > 2) { for (const [p, d] of Object.entries(perfis)) { if (d.pontos > mPts) { mPts = d.pontos; pDom = p; dDom = d.desc; } } }
    
    document.getElementById('diagnostico-titulo').innerText = `Traço Dominante: ${pDom}`;
    document.getElementById('diagnostico-desc').innerText = dDom;
    renderRadarChart(perfis["Executor"].pontos, perfis["Analítico"].pontos, perfis["Relacional"].pontos);
}

function renderRadarChart(pExe, pAna, pRel) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    if (radarChartInstance) radarChartInstance.destroy();
    if (pExe === 0 && pAna === 0 && pRel === 0) { pExe = 1; pAna = 1; pRel = 1; }
    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: { labels: ['Executor', 'Analítico', 'Relacional'], datasets: [{ data: [pExe, pAna, pRel], backgroundColor: 'rgba(248, 181, 0, 0.2)', borderColor: '#f8b500', borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { pointLabels: { color: '#e0e0e0' }, ticks: { display: false } } }, plugins: { legend: { display: false } } }
    });
}

/* --- EXPORTAÇÃO PDF --- */
const exportBtn = document.getElementById('btn-export-pdf');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        if (typeof html2pdf === 'undefined') return showToast('PDF indisponível.', true);
        html2pdf().from(document.getElementById('resultsContainer')).set({ margin: 10, filename: 'DNA-do-Lider-Relatorio.pdf', html2canvas: { scale: 2, backgroundColor: '#0a0a0c' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).save();
    });
}

/* --- PARTÍCULAS DE FUNDO --- */
const canvas = document.getElementById('particles-bg');
const ctx = canvas.getContext('2d');
let particlesArray = [];
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; initParticles(); });

class Particle {
    constructor(x, y, dx, dy, size, color) { this.x = x; this.y = y; this.dx = dx; this.dy = dy; this.size = size; this.color = color; }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); }
    update() { if (this.x > canvas.width || this.x < 0) this.dx = -this.dx; if (this.y > canvas.height || this.y < 0) this.dy = -this.dy; this.x += this.dx; this.y += this.dy; this.draw(); }
}
function initParticles() {
    particlesArray = []; let num = Math.min((canvas.height * canvas.width) / 15000, 60);
    for (let i = 0; i < num; i++) {
        let size = Math.random() * 2 + 1;
        particlesArray.push(new Particle(Math.random() * (canvas.width - size*2) + size*2, Math.random() * (canvas.height - size*2) + size*2, (Math.random() * 0.4) - 0.2, (Math.random() * 0.4) - 0.2, size, Math.random() > 0.7 ? '#f8b500' : '#555555'));
    }
}
function animateParticles() {
    requestAnimationFrame(animateParticles); ctx.clearRect(0, 0, canvas.width, canvas.height); particlesArray.forEach(p => p.update());
    for (let a = 0; a < particlesArray.length; a++) { for (let b = a; b < particlesArray.length; b++) { let dist = ((particlesArray[a].x - particlesArray[b].x) ** 2) + ((particlesArray[a].y - particlesArray[b].y) ** 2); if (dist < (canvas.width / 7) * (canvas.height / 7)) { ctx.strokeStyle = `rgba(248, 181, 0, ${0.4 - (dist / 25000)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(particlesArray[a].x, particlesArray[a].y); ctx.lineTo(particlesArray[b].x, particlesArray[b].y); ctx.stroke(); } } }
}
initParticles(); animateParticles();
