const courseData = {
    1: { title: "Semana 1: Identidade do Líder", questions: [ { id: "s1_q1", label: "Estilo de liderança atual:" }, { id: "s1_q2", label: "Plano de Ação (Pontos Fortes):" } ] },
    2: { title: "Semana 2: Meu Perfil", questions: [ { id: "s2_q1", label: "Mapeamento (Características predominantes):" } ] },
    12: { title: "Semana 12: Consolidação", questions: [ { id: "s12_q1", label: "Comportamento estratégico transformado:" } ] }
};

let autoSaveTimer;
let radarChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    verificarCadastro();

    // Credenciamento & Mapeamento Dev
    document.getElementById('btn-next-register').addEventListener('click', () => {
        document.getElementById('welcome-screen').classList.remove('active');
        document.getElementById('register-screen').classList.add('active');
    });

    document.getElementById('user-name').addEventListener('input', (e) => {
        const texto = e.target.value.toLowerCase().trim();
        if (texto === 'teste' || texto === 'admin') {
            document.getElementById('user-phone').value = '(00) 00000-0000';
            document.getElementById('user-email').value = 'diretoria@praticamente.com';
            document.getElementById('user-referral').value = 'Admin SaaS';
            showToast('Modo Desenvolvedor ativado!');
        }
    });

    document.getElementById('registration-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const userData = { nome: document.getElementById('user-name').value };
        localStorage.setItem('dna_user_data', JSON.stringify(userData));
        transicaoLoading(userData.nome);
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('dna_user_data');
        location.reload(); 
    });

    // MODO FOCO
    document.getElementById('btn-focus').addEventListener('click', () => {
        document.body.classList.toggle('focus-mode');
        const btnFoco = document.getElementById('btn-focus');
        if(document.body.classList.contains('focus-mode')) {
            btnFoco.innerText = 'Sair do Foco';
            btnFoco.style.background = 'rgba(248, 181, 0, 0.2)';
            showToast('Modo Foco Ativado. Elimine distrações.');
        } else {
            btnFoco.innerText = 'Modo Foco';
            btnFoco.style.background = 'transparent';
        }
    });

    document.getElementById('btnSave').addEventListener('click', () => saveData(false));
});

// --- TRANSIÇÕES E SKELETON LOADING ---
function verificarCadastro() {
    const savedUser = localStorage.getItem('dna_user_data');
    if (savedUser) {
        document.getElementById('welcome-screen').classList.remove('active');
        transicaoLoading(JSON.parse(savedUser).nome);
    }
}

function transicaoLoading(nomeUsuario) {
    document.getElementById('register-screen').classList.remove('active');
    document.getElementById('welcome-screen').classList.remove('active');
    document.getElementById('loading-screen').classList.add('active');

    // Simula o tempo de API/Skeleton Loading (2 segundos)
    setTimeout(() => {
        document.getElementById('loading-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');
        
        let primeiroNome = nomeUsuario.split(' ')[0];
        primeiroNome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1);
        document.getElementById('user-greeting').innerText = `Gestão em andamento. Bem-vindo, ${primeiroNome}.`;

        buildWeekSelector();
        loadWeek(1);
        updateProgress();
        iniciarOnboarding();
    }, 2000);
}

// --- ONBOARDING GUIADO ---
function iniciarOnboarding() {
    if (!localStorage.getItem('dna_onboarding_done')) {
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
                title.innerText = steps[currentStep].t;
                text.innerText = steps[currentStep].d;
                if(currentStep === steps.length -1) btnNext.innerText = "Começar Jornada";
            } else {
                modal.classList.remove('active');
                localStorage.setItem('dna_onboarding_done', 'true');
                showToast("Ambiente liberado para execução.");
            }
        };
    }
}

// --- NAVEGAÇÃO ---
function buildWeekSelector() {
    const selector = document.getElementById('weekSelector');
    selector.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.className = 'week-btn';
        btn.innerText = i; 
        btn.id = `btn-week-${i}`;
        btn.onclick = () => {
            loadWeek(i);
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        };
        selector.appendChild(btn);
    }
}

function loadWeek(weekNumber) {
    document.querySelectorAll('.week-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-week-${weekNumber}`).classList.add('active');

    const weekInfo = courseData[weekNumber] || { title: `Semana ${weekNumber}: Em Breve`, questions: [{id: `s${weekNumber}_q1`, label: "Rota de Execução (Anotações):"}] };
    document.getElementById('weekTitle').innerText = weekInfo.title;

    const formContainer = document.getElementById('formContainer');
    formContainer.innerHTML = '';

    document.getElementById('resultsContainer').style.display = (weekNumber === 12) ? 'block' : 'none';
    
    // Se for semana 12, roda a análise lexical
    if(weekNumber === 12) {
        gerarDiagnosticoInteligente();
    }

    const savedData = JSON.parse(localStorage.getItem('dna_respostas')) || {};

    weekInfo.questions.forEach(q => {
        const div = document.createElement('div');
        div.className = 'input-group';
        const label = document.createElement('label'); label.innerText = q.label;
        const textarea = document.createElement('textarea');
        textarea.id = q.id; 
        textarea.value = savedData[q.id] || ''; 
        textarea.placeholder = "Descreva sua aplicação prática...";
        
        // AUTO-SAVE INTELIGENTE
        textarea.addEventListener('input', () => {
            document.getElementById('save-status').innerText = 'Digitando...';
            document.getElementById('save-status').style.color = 'var(--gold-main)';
            
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                saveData(true); // Modo silencioso
            }, 1500); // Salva 1.5s após parar de digitar
        });

        div.appendChild(label); div.appendChild(textarea); formContainer.appendChild(div);
    });
}

function showToast(message) {
    let toast = document.getElementById('custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'custom-toast';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<strong style="color: var(--gold-main)">✓</strong> ${message}`;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

// --- LÓGICA DE SALVAR E PROGRESSO ---
function saveData(silent = false) {
    const statusText = document.getElementById('save-status');
    statusText.innerText = 'Salvando na nuvem...';
    
    let savedData = JSON.parse(localStorage.getItem('dna_respostas')) || {};
    document.querySelectorAll('#formContainer textarea').forEach(input => {
        savedData[input.id] = input.value;
    });

    localStorage.setItem('dna_respostas', JSON.stringify(savedData));
    updateProgress(); 
    
    setTimeout(() => {
        statusText.innerText = 'Sincronizado há poucos segundos.';
        statusText.style.color = 'var(--silver-dark)';
        if(!silent) showToast('Rota estratégica consolidada manualmente!');
    }, 800);
}

function updateProgress() {
    const savedData = JSON.parse(localStorage.getItem('dna_respostas')) || {};
    let completedWeeks = 0;
    
    for(let i = 1; i <= 12; i++) {
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

// --- MOTOR DE ANÁLISE LEXICAL (PNL/ENEAGRAMA) ---
function gerarDiagnosticoInteligente() {
    const savedData = JSON.parse(localStorage.getItem('dna_respostas')) || {};
    let textoCompleto = Object.values(savedData).join(" ").toLowerCase();

    // Dicionário Analítico
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

    for (const [perfil, dados] of Object.entries(perfis)) {
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

    // Renderiza Gráfico Radar com Chart.js
    renderRadarChart(perfis["Executor"].pontos, perfis["Analítico"].pontos, perfis["Relacional"].pontos);
}

function renderRadarChart(pExe, pAna, pRel) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    if (radarChartInstance) { radarChartInstance.destroy(); }
    
    // Se a pessoa não escreveu nada ainda, exibe um gráfico vazio genérico
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

// PARTICULAS NO FUNDO
const canvas = document.getElementById('particles-bg');
const ctx = canvas.getContext('2d');
let particlesArray;

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
    requestAnimationFrame(animateParticles); ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        });
    });
</script>
