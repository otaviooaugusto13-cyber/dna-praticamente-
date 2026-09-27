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

// Dados das semanas
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

/* --- EVENTO PRINCIPAL QUE CARREGA O BOTÃO --- */
document.addEventListener("DOMContentLoaded", () => {
    
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

    const handleLogout = async () => {
        if (!confirm('Sair encerrará sua sessão. Deseja continuar?')) return;
        await signOut(auth);
        location.reload();
    };
    
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    document.getElementById('btn-logout-payment').addEventListener('click', handleLogout);
    document.getElementById('btnSave').addEventListener('click', () => saveData(false));
});

/* --- VERIFICAÇÃO DE USUÁRIO E BANCO DE DADOS --- */
onAuthStateChanged(auth, async (user) => {
    if (user) {
        ocultarTodasTelas();
        document.getElementById('loading-screen').classList.add('active');

        const emailFormatado = user.email.toLowerCase();
        
        try {
            const docRef = doc(db, "pagantes", emailFormatado);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                iniciarSessaoAprovada(user.displayName);
            } else {
                ocultarTodasTelas();
                document.getElementById('payment-screen').classList.add('active');
                document.getElementById('user-email-display').innerText = emailFormatado;
            }
        } catch (erro) {
            console.error("Erro ao verificar banco de dados:", erro);
            showToast("Erro ao comunicar com o servidor.", true);
        }

    } else {
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
    }, 800);
}

/* --- FUNÇÕES DO PAINEL (SALVAR, NAVEGAR) --- */
function safeGet(key) { try { return localStorage.getItem(key); } catch (err) { return null; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (err) { return false; } }
function safeJSON(key, fallback) { const raw = safeGet(key); if (!raw) return fallback; try { return JSON.parse(raw); } catch (err) { return fallback; } }

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

    const weekInfo = courseData[weekNumber] || { title: `Semana ${weekNumber}: Em Breve`, videoId: null, questions: [{ id: `s${weekNumber}_q1`, label: "Rota de Execução:" }] };
    document.getElementById('weekTitle').innerText = weekInfo.title;
    const formContainer = document.getElementById('formContainer'); formContainer.innerHTML = '';
    
    const savedData = safeJSON('dna_respostas', {});

    weekInfo.questions.forEach(q => {
        const div = document.createElement('div'); div.className = 'input-group';
        const label = document.createElement('label'); label.innerText = q.label; label.setAttribute('for', q.id);
        const textarea = document.createElement('textarea');
        textarea.id = q.id; textarea.value = savedData[q.id] || ''; 
        textarea.placeholder = "Descreva sua aplicação prática...";
        textarea.addEventListener('input', () => {
            document.getElementById('save-status').innerText = 'Digitando…';
            document.getElementById('save-status').style.color = 'var(--gold-main)';
            clearTimeout(autoSaveTimer); autoSaveTimer = setTimeout(() => { saveData(true); }, 1500);
        });
        div.appendChild(label); div.appendChild(textarea); formContainer.appendChild(div);
    });
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
            if (!silent) showToast('Estratégia salva com sucesso.');
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
}
initParticles(); animateParticles();
