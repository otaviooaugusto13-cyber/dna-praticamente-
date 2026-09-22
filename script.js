/* ======================================================
   CONFIGURAÇÃO & VARIÁVEIS
   ====================================================== */
const LINK_WHATSAPP = "https://whatsapp.com/channel/0029VbBTt6PDJ6GuZdRkO33D";
const LINK_PDF = "";
let userName = "LÍDER";
let userEmail = "";
let userPhone = "";
let userContexto = "geral";

// EmailJS — credenciais
const EMAILJS_SERVICE_ID  = "service_yjnmgzq";
const EMAILJS_TEMPLATE_ID = "template_qr6xyru";
const EMAILJS_PUBLIC_KEY  = "UFhvGVkmgV0VpWyKALl7S";

// Estado salvo no sessionStorage para recuperar se fechar
let resultadoSalvo = null;

/* ======================================================
   ALERTA DE SAÍDA
   ====================================================== */
window.addEventListener('beforeunload', function(e) {
    const quizAtivo = !document.getElementById('screen-quiz').classList.contains('hidden') ||
                      !document.getElementById('screen-loading').classList.contains('hidden');
    if (quizAtivo) {
        e.preventDefault();
        e.returnValue = 'Você perderá seu progresso no teste. Deseja sair mesmo assim?';
        return e.returnValue;
    }
});

/* ======================================================
   RECUPERAR RESULTADO SALVO
   ====================================================== */
function verificarResultadoSalvo() {
    try {
        const salvo = sessionStorage.getItem('pm_resultado');
        if (salvo) {
            resultadoSalvo = JSON.parse(salvo);
            const banner = document.getElementById('banner-recuperar');
            if (banner) banner.classList.remove('hidden');
        }
    } catch(e) {}
}

function recuperarResultado() {
    if (!resultadoSalvo) return;
    userName      = resultadoSalvo.nome;
    userEmail     = resultadoSalvo.email;
    userPhone     = resultadoSalvo.phone;
    userContexto  = resultadoSalvo.contexto;
    pontuacaoTipos   = resultadoSalvo.pontuacaoTipos;
    pontuacaoInstinto = resultadoSalvo.pontuacaoInstinto;

    document.getElementById('screen-intro').classList.add('hidden');
    const banner = document.getElementById('banner-recuperar');
    if (banner) banner.classList.add('hidden');

    const nomesInstinto = { "SP": "AUTOPRESERVAÇÃO", "SX": "SEXUAL", "SO": "SOCIAL" };
    document.getElementById('screen-loading').classList.remove('hidden');
    const protocolo = "#PM-" + Math.floor(1000 + Math.random() * 9000);
    updateElement('protocol-code', protocolo);
    setTimeout(() => { exibirResultados(resultadoSalvo.tipo, resultadoSalvo.asa, nomesInstinto[resultadoSalvo.instinto]); }, 2000);
}

function reiniciarTeste() {
    try { sessionStorage.removeItem('pm_resultado'); } catch(e) {}
    location.reload();
}

/* ======================================================
   EFEITOS VISUAIS
   ====================================================== */
const canvas = document.getElementById('neural-bg');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
let particlesArray;
class Particle {
    constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.directionX = (Math.random() * 0.4) - 0.2; this.directionY = (Math.random() * 0.4) - 0.2; this.size = Math.random() * 2; }
    update() { if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX; if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY; this.x += this.directionX; this.y += this.directionY; }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = 'rgba(212, 175, 55, 0.5)'; ctx.fill(); }
}
function initParticles() { particlesArray = []; let numberOfParticles = (canvas.width * canvas.height) / 15000; for (let i = 0; i < numberOfParticles; i++) { particlesArray.push(new Particle()); } }
function animateParticles() { requestAnimationFrame(animateParticles); ctx.clearRect(0, 0, canvas.width, canvas.height); for (let i = 0; i < particlesArray.length; i++) { particlesArray[i].update(); particlesArray[i].draw(); for (let j = i; j < particlesArray.length; j++) { const dx = particlesArray[i].x - particlesArray[j].x; const dy = particlesArray[i].y - particlesArray[j].y; const distance = Math.sqrt(dx*dx + dy*dy); if (distance < 100) { ctx.beginPath(); ctx.strokeStyle = `rgba(212, 175, 55, ${1 - distance/100})`; ctx.lineWidth = 0.5; ctx.moveTo(particlesArray[i].x, particlesArray[i].y); ctx.lineTo(particlesArray[j].x, particlesArray[j].y); ctx.stroke(); } } } }
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; initParticles(); });
initParticles(); animateParticles();

/* ======================================================
   FORMULÁRIO (AJAX)
   ====================================================== */
document.addEventListener("DOMContentLoaded", function() {
    try { perguntasTipoEmbaralhadas = [...bancoPerguntas].sort(() => Math.random() - 0.5); } catch(e) { perguntasTipoEmbaralhadas = bancoPerguntas; }

    const form = document.getElementById("capture-form");
    if (form) {
        form.addEventListener("submit", function(ev) {
            ev.preventDefault();

            const nameInput = document.getElementById("input-name");
            if (nameInput && nameInput.value.trim() !== "") {
                userName = nameInput.value.trim().toUpperCase();
            }
            userEmail = document.getElementById("input-email") ? document.getElementById("input-email").value.trim() : "";
            userPhone = document.getElementById("input-phone") ? document.getElementById("input-phone").value.trim() : "";

            const btn = form.querySelector("button");
            btn.innerHTML = '<i class="ph-spinner-gap ph-spin"></i> ACESSANDO...';
            btn.disabled = true;

            const data = new FormData(form);

            fetch(form.action, {
                method: form.method,
                body: data,
                headers: { 'Accept': 'application/json' }
            })
            .then(() => { mostrarTelaContexto(); })
            .catch(() => { mostrarTelaContexto(); });
        });
    }

    // Configuração do Feedback (Estrelas)
    const stars = document.querySelectorAll('.star-rating i');
    let selectedRating = 0;

    stars.forEach(star => {
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(rating);
        });

        star.addEventListener('mouseout', function() {
            highlightStars(selectedRating);
        });

        star.addEventListener('click', function() {
            selectedRating = parseInt(this.getAttribute('data-rating'));
            highlightStars(selectedRating);
            enviarNotaFormspree(selectedRating);
        });
    });

    function highlightStars(rating) {
        stars.forEach(s => {
            if (parseInt(s.getAttribute('data-rating')) <= rating) {
                s.classList.remove('ph-star');
                s.classList.add('ph-star-fill');
                s.style.color = 'var(--gold)';
            } else {
                s.classList.remove('ph-star-fill');
                s.classList.add('ph-star');
                s.style.color = '#444';
            }
        });
    }
});

function enviarNotaFormspree(nota) {
    const formData = new FormData();
    formData.append("nome", userName);
    formData.append("email", userEmail);
    formData.append("nota_diagnostico", `${nota} Estrelas`);
    formData.append("_subject", `[Feedback] ${userName} avaliou o diagnóstico com ${nota} estrelas!`);

    fetch("https://formspree.io/f/xwvoklpq", {
        method: "POST",
        body: formData,
        headers: { "Accept": "application/json" }
    }).then(() => {
        const msg = document.getElementById('feedback-msg');
        if(msg) msg.classList.remove('hidden');
        document.getElementById('star-rating').style.pointerEvents = 'none'; // Desabilita novos cliques
    }).catch(err => console.log("Erro no feedback:", err));
}

/* ======================================================
   TELA DE CONTEXTO
   ====================================================== */
function mostrarTelaContexto() {
    const intro = document.getElementById('screen-intro');
    intro.style.opacity = '0';
    intro.style.transform = 'scale(0.95)';
    intro.style.transition = 'all 0.5s ease';
    setTimeout(() => {
        intro.classList.add('hidden');
        document.getElementById('screen-contexto').classList.remove('hidden');
    }, 500);
}

function selecionarContexto(contexto) {
    userContexto = contexto;
    const tela = document.getElementById('screen-contexto');
    tela.style.opacity = '0';
    tela.style.transform = 'scale(0.95)';
    tela.style.transition = 'all 0.5s ease';
    setTimeout(() => {
        tela.classList.add('hidden');
        document.getElementById('screen-quiz').classList.remove('hidden');
        mostrarPergunta();
    }, 500);
}

/* ======================================================
   BANCO DE PERGUNTAS
   ====================================================== */
const bancoPerguntas = [
    { tipo: 1, txt: "Sinto uma pressão interna constante para corrigir erros e colocar ordem." },
    { tipo: 1, txt: "Tenho um 'crítico interno' severo que me julga por qualquer falha." },
    { tipo: 1, txt: "Fico frustrado quando vejo pessoas sendo irresponsáveis." },
    { tipo: 2, txt: "Priorizo as necessidades dos outros e ignoro as minhas." },
    { tipo: 2, txt: "Sinto que preciso ser útil para ter valor na vida das pessoas." },
    { tipo: 2, txt: "Tenho dificuldade em dizer 'não' e me sobrecarrego." },
    { tipo: 3, txt: "Sinto que meu valor depende das minhas conquistas e resultados." },
    { tipo: 3, txt: "Adapto minha imagem para causar a melhor impressão possível." },
    { tipo: 3, txt: "Tenho pavor de fracassar ou parecer incompetente." },
    { tipo: 4, txt: "Sinto que falta algo em mim que os outros têm." },
    { tipo: 4, txt: "Busco profundidade e detesto a superficialidade." },
    { tipo: 4, txt: "Passo muito tempo imaginando cenários ideais ou nostálgicos." },
    { tipo: 5, txt: "Preciso de muito tempo sozinho para recarregar minhas energias." },
    { tipo: 5, txt: "Prefiro observar e entender antes de participar." },
    { tipo: 5, txt: "Protejo minha privacidade e evito demandas emocionais." },
    { tipo: 6, txt: "Minha mente está sempre escaneando perigos e riscos." },
    { tipo: 6, txt: "A lealdade é vital, mas demoro a confiar nas pessoas." },
    { tipo: 6, txt: "A dúvida e a ansiedade muitas vezes me paralisam." },
    { tipo: 7, txt: "Tenho muitas ideias, mas dificuldade em terminar o que começo." },
    { tipo: 7, txt: "Evito o tédio e a dor mantendo-me ocupado e otimista." },
    { tipo: 7, txt: "Sinto que preciso experimentar tudo para não perder nada." },
    { tipo: 8, txt: "Gosto de estar no controle para garantir que não serei controlado." },
    { tipo: 8, txt: "Protejo os 'meus' com ferocidade, mas não tolero traição." },
    { tipo: 8, txt: "Tenho dificuldade em mostrar vulnerabilidade." },
    { tipo: 9, txt: "Evito conflitos a todo custo para manter a paz." },
    { tipo: 9, txt: "Tenho tendência a procrastinar para não me estressar." },
    { tipo: 9, txt: "Muitas vezes concordo com os outros só para não criar atrito." }
];

const perguntasInstinto = [
    { txt: "Quando entro num ambiente novo, minha atenção vai para:", opcoes: [ { txt: "Conforto físico, temperatura e segurança.", tag: "SP" }, { txt: "Quem são as pessoas atraentes ou interessantes.", tag: "SX" }, { txt: "Quem tem poder e onde eu me encaixo no grupo.", tag: "SO" } ] },
    { txt: "O que mais me gera ansiedade hoje?", opcoes: [ { txt: "Instabilidade financeira ou problemas de saúde.", tag: "SP" }, { txt: "Falta de conexão profunda ou rejeição pessoal.", tag: "SX" }, { txt: "Ser excluído do grupo ou perder minha reputação.", tag: "SO" } ] },
    { txt: "Como prefiro recarregar as energias?", opcoes: [ { txt: "No meu canto, cuidando das minhas coisas.", tag: "SP" }, { txt: "Em conversas intensas 'olho no olho'.", tag: "SX" }, { txt: "Em eventos sociais, reuniões ou com a galera.", tag: "SO" } ] }
];

/* ======================================================
   DADOS BASE DOS 9 TIPOS (fixos para todos os contextos)
   ====================================================== */
const perfisData = {
    1: { nome: "O PERFECCIONISTA", essencia: ["Busca integridade e melhoria contínua.", "Guiado por um senso interno de certo e errado.", "Deseja fazer o bem e ser ético em tudo."], forcas: ["Organizado, confiável e criterioso.", "Alto padrão de qualidade.", "Honesto e comprometido com a verdade."], desequilibrio: ["Torna-se rígido, crítico e inflexível.", "Reprime a raiva até explodir.", "Julga a si mesmo e aos outros sem parar."], desafios: ["O crítico interno nunca descansa.", "Dificuldade em relaxar e 'deixar ir'.", "Medo paralisante de cometer erros."], padraoFrase: "Se eu for perfeito, estarei seguro.", padraoPreco: ["Ansiedade crônica.", "Rigidez que afasta pessoas.", "Exaustão mental e física."] },
    2: { nome: "O AJUDADOR", essencia: ["Busca conexão genuína e amor verdadeiro.", "Sente prazer real em cuidar e servir.", "Intuitivo com as necessidades alheias."], forcas: ["Empático, carinhoso e generoso.", "Cria vínculos profundos com facilidade.", "Sabe apoiar e encorajar os outros."], desequilibrio: ["Torna-se invasivo e sufocante.", "Cobra reconhecimento de forma velada.", "Esquece de si mesmo completamente."], desafios: ["Diz sim quando quer dizer não.", "Orgulho oculto: acha que os outros precisam dele.", "Carência afetiva que nunca se preenche."], padraoFrase: "Se eu ajudar a todos, serei amado.", padraoPreco: ["Exaustão emocional profunda.", "Ressentimento acumulado.", "Perda da própria identidade."] },
    3: { nome: "O REALIZADOR", essencia: ["Busca valor e admiração genuína.", "Orientado a metas, eficiente e prático.", "Adapta-se com facilidade a qualquer ambiente."], forcas: ["Motivador nato e extremamente competente.", "Executa com rapidez e precisão.", "Inspira pelo exemplo e pelos resultados."], desequilibrio: ["Vicia-se no trabalho e na produção.", "Torna-se competitivo e calculista.", "Perde a autenticidade virando personagem."], desafios: ["Confunde quem é com o que conquista.", "Pavor do fracasso e da mediocridade.", "Desconexão total dos próprios sentimentos."], padraoFrase: "Sou o que eu realizo.", padraoPreco: ["Vazio interior apesar do sucesso.", "Estresse crônico e burnout.", "Relações superficiais e solitárias."] },
    4: { nome: "O INDIVIDUALISTA", essencia: ["Busca identidade única e significado profundo.", "Sensível, criativo e introspectivo.", "Sente as emoções com intensidade rara."], forcas: ["Criatividade e originalidade únicas.", "Compaixão profunda com quem sofre.", "Honestidade emocional corajosa."], desequilibrio: ["Mergulha na melancolia e no drama.", "Inveja quem parece 'completo'.", "Se isola e fica preso no mundo interno."], desafios: ["Vício no sofrimento como forma de identidade.", "Sensação constante de que falta algo.", "Instabilidade emocional que afasta."], padraoFrase: "Ninguém me entende de verdade.", padraoPreco: ["Isolamento voluntário.", "Paralisia criativa.", "Depressão e retraimento."] },
    5: { nome: "O OBSERVADOR", essencia: ["Busca conhecimento, compreensão e competência.", "Cerebral, analítico e independente.", "Precisa entender antes de se comprometer."], forcas: ["Visão objetiva e imparcial.", "Curiosidade intelectual inesgotável.", "Calma e clareza em momentos de crise."], desequilibrio: ["Isola-se e torna-se cínico.", "Guarda energia e conhecimento para si.", "Desconecta-se do corpo e das emoções."], desafios: ["Medo de ser invadido ou sobrecarregado.", "Paralisia por análise infinita.", "Frieza que afasta quem ama."], padraoFrase: "Preciso entender tudo antes de agir.", padraoPreco: ["Solidão profunda e silenciosa.", "Ansiedade mental incessante.", "Niilismo e sensação de inutilidade."] },
    6: { nome: "O LEALISTA", essencia: ["Busca segurança, apoio e certeza.", "Alerta, responsável e comprometido.", "Leal como ninguém — mas demora a confiar."], forcas: ["Lealdade e coragem em momentos difíceis.", "Antecipa problemas antes que aconteçam.", "Trabalha bem em equipe e é confiável."], desequilibrio: ["Torna-se ansioso, desconfiado e reativo.", "Cria cenários negativos na cabeça.", "Depende de autoridade ou rebela-se contra ela."], desafios: ["A dúvida é sua companheira constante.", "Mente cria catástrofes que nunca acontecem.", "Indecisão que paralisa e cria arrependimentos."], padraoFrase: "E se tudo der errado?", padraoPreco: ["Estresse alto e contínuo.", "Perda de grandes oportunidades.", "Dependência emocional que sufoca."] },
    7: { nome: "O ENTUSIASTA", essencia: ["Busca felicidade, liberdade e novas experiências.", "Espontâneo, versátil e otimista.", "Transforma qualquer ambiente com energia."], forcas: ["Alegria e entusiasmo contagiantes.", "Criatividade rápida e conexões inesperadas.", "Resiliência — se levanta rápido da dor."], desequilibrio: ["Impulsivo, disperso e inconstante.", "Foge da dor e do comprometimento.", "Começa mil coisas, termina poucas."], desafios: ["Medo do tédio, da dor e do vazio.", "Gula por experiências que nunca satisfaz.", "Falta de acabativa que sabota o potencial."], padraoFrase: "Eu quero tudo e agora.", padraoPreco: ["Superficialidade em tudo.", "Ansiedade quando forçado a parar.", "Fuga da realidade quando dói."] },
    8: { nome: "O DESAFIADOR", essencia: ["Busca controle, autonomia e justiça.", "Forte, assertivo e protetor por natureza.", "Não suporta fraqueza — em si nem nos outros."], forcas: ["Liderança natural e presença magnética.", "Energia realizadora imbatível.", "Defende os mais fracos com coragem."], desequilibrio: ["Torna-se dominador, impulsivo e intimidador.", "Insensível ao impacto que causa.", "Parte para o confronto antes de pensar."], desafios: ["Mostrar vulnerabilidade é quase impossível.", "Intensidade que atropela quem está por perto.", "Nega fraqueza até o limite do colapso."], padraoFrase: "Eu sou forte, ninguém manda em mim.", padraoPreco: ["Desgaste profundo nos relacionamentos.", "Solidão no topo — ninguém chega perto.", "Endurecimento que mata a sensibilidade."] },
    9: { nome: "O PACIFICADOR", essencia: ["Busca paz, harmonia e estabilidade genuína.", "Tem facilidade em acolher e adaptar-se.", "Seu maior medo é perder a conexão com as pessoas."], forcas: ["Descomplicado, empático e agregador.", "Constante, leal e de fácil convivência.", "Grande capacidade de escuta e mediação."], desequilibrio: ["Foge de decisões e conversas difíceis.", "Se anestesia com rotina e distrações.", "Some de si mesmo para agradar ao redor."], desafios: ["Passividade que parece paz mas é fuga.", "Esquece o que quer para não gerar conflito.", "Cede demais — e ressente por dentro."], padraoFrase: "Se eu não me posicionar, tudo fica bem.", padraoPreco: ["Perda da própria identidade.", "Procrastinação que paralisa a vida.", "Vive a vida dos outros, não a sua."] }
};

/* ======================================================
   CONTEÚDO CONTEXTUALIZADO (por contexto × tipo)
   ====================================================== */
const contextoData = {
    lider: {
        label: "Líder / Empresário",
        1: { potencial: ["Constrói sistemas de excelência sem perfeccionismo tóxico.", "Delega com confiança e liderança serena.", "Transforma padrões em cultura organizacional sólida."], padraoAcao: "Seu negócio não precisa de perfeição — precisa de velocidade.", praticas: ["Lançar algo antes de estar 100% pronto.", "Delegar sem corrigir depois.", "Perguntar à equipe: 'O que está bom o suficiente?'"] },
        2: { potencial: ["Cria times coesos e leal pelo cuidado genuíno.", "Inspira pelo exemplo de doação equilibrada.", "Constrói cultura de apoio sem dependência."], padraoAcao: "Um líder que se esgota não tem mais nada para dar.", praticas: ["Marcar tempo para si mesmo na agenda.", "Delegar cuidados — não centralizar tudo.", "Perguntar: 'O que EU preciso para liderar bem hoje?'"] },
        3: { potencial: ["Inspira pelo ser, não só pelo fazer.", "Constrói legado com autenticidade e propósito.", "Time que segue o líder — não só os resultados."], padraoAcao: "O melhor resultado do seu negócio começa com um líder real.", praticas: ["Compartilhar uma dificuldade real com a equipe.", "Criar metas de processo, não só de resultado.", "Desligar o celular por 2h e não trabalhar."] },
        4: { potencial: ["Cria cultura e identidade de marca únicas e poderosas.", "Inspira times com visão criativa incomum.", "Transforma dificuldades em diferenciais competitivos."], padraoAcao: "Sua visão única é seu maior ativo — execute-a com disciplina.", praticas: ["Criar um ritual diário de execução (não só inspiração).", "Documentar processos para não depender do humor.", "Buscar um mentor para ancorar na realidade."] },
        5: { potencial: ["Estrategista profundo que enxerga onde outros não veem.", "Constrói sistemas inteligentes e escaláveis.", "Mentor de conhecimento que eleva a equipe inteira."], padraoAcao: "Sua análise só vale quando vira ação — compartilhe e decida.", praticas: ["Apresentar ideias antes de estarem 'perfeitas'.", "Pedir feedback da equipe nas decisões.", "Fazer uma reunião de alinhamento por semana."] },
        6: { potencial: ["Previne crises antes que aconteçam — é ouro para o negócio.", "Constrói sistemas de controle e segurança.", "Inspira confiança pela consistência e lealdade."], padraoAcao: "Prepare o pior cenário — depois execute como se fosse ganhar.", praticas: ["Tomar uma decisão de risco calculado por semana.", "Montar um 'plano B' real e arquivá-lo — depois agir.", "Listar 3 evidências de que o negócio está bem."] },
        7: { potencial: ["Inspira e motiva times com visão e energia únicos.", "Conecta pontos que ninguém mais enxerga.", "Transforma problemas em oportunidades com criatividade."], padraoAcao: "A maior ideia do mundo vale zero sem execução consistente.", praticas: ["Escolher 1 projeto por vez e terminar antes do próximo.", "Criar rituais semanais de revisão de metas.", "Ter alguém que cobra as entregas de você."] },
        8: { potencial: ["Lidera com visão, coragem e proteção genuína do time.", "Executa com uma força que outros admiram.", "Constrói cultura de respeito — não de medo."], padraoAcao: "O líder mais forte é o que consegue ser vulnerável na hora certa.", praticas: ["Perguntar à equipe: 'Como posso te ajudar melhor?'", "Ouvir uma reunião inteira sem interromper.", "Admitir um erro em público para o time."] },
        9: { potencial: ["Une pessoas e culturas em torno de um objetivo.", "Lidera pela presença serena e pela consistência.", "Cria ambientes de alto desempenho sem tensão tóxica."], padraoAcao: "Liderança é posicionamento — a paz vem depois da decisão.", praticas: ["Definir a prioridade do negócio para a semana.", "Expressar discordância numa reunião.", "Dizer não para um projeto que não é estratégico."] }
    },
    familia: {
        label: "Família / Filhos",
        1: { potencial: ["Cria um lar com estrutura, valores e segurança.", "Ensina os filhos pelo exemplo de integridade.", "Torna-se referência de caráter para a família."], padraoAcao: "Seus filhos precisam do seu amor — não da sua perfeição.", praticas: ["Brincar com os filhos sem objetivo ou resultado.", "Pedir desculpas a um filho quando errar.", "Criar um momento de 'zona livre de regras' em casa."] },
        2: { potencial: ["Cria vínculos familiares profundos e seguros.", "Filhos que se sentem amados e acolhidos.", "Transforma o lar num porto seguro de verdade."], padraoAcao: "Cuide de você para poder cuidar de quem ama.", praticas: ["Reservar 30 minutos por dia só para si.", "Expressar suas necessidades para a família.", "Deixar os filhos resolverem um problema sozinhos."] },
        3: { potencial: ["Inspira filhos a acreditar em si mesmos.", "Cria ambiente familiar de crescimento saudável.", "Demonstra que esforço e autenticidade andam juntos."], padraoAcao: "Seus filhos precisam do seu tempo — não das suas conquistas.", praticas: ["Estar presente sem celular em 1 refeição por dia.", "Perguntar ao filho: 'Como você está por dentro?'", "Compartilhar uma história de quando você falhou."] },
        4: { potencial: ["Cria lar rico em emoção, criatividade e significado.", "Filhos que aprendem a sentir e expressar com profundidade.", "Conecta a família em torno de valores e memórias únicas."], padraoAcao: "Sua intensidade é um presente — quando bem dirigida.", praticas: ["Criar rituais familiares simples e constantes.", "Não dramatizar conflitos menores com os filhos.", "Praticar gratidão diária com a família."] },
        5: { potencial: ["Ensina os filhos a pensar com profundidade e curiosidade.", "Cria ambiente familiar de aprendizado e descoberta.", "Filhos que desenvolvem autonomia e raciocínio."], padraoAcao: "Sua família precisa da sua presença — não só do seu conhecimento.", praticas: ["Fazer 15 minutos de contato físico (abraço, brincadeira) todo dia.", "Perguntar ao filho sobre sentimentos — não só sobre fatos.", "Participar de uma atividade familiar sem o celular."] },
        6: { potencial: ["Cria lar seguro, estruturado e confiável.", "Filhos que crescem com senso de proteção e lealdade.", "Parceiro/a que sabe que pode contar com você sempre."], padraoAcao: "Sua família precisa da sua fé — não dos seus medos.", praticas: ["Substituir uma preocupação por uma ação protetora real.", "Dizer a um filho: 'Confio em você para resolver isso.'", "Criar uma tradição familiar positiva e repetir toda semana."] },
        7: { potencial: ["Cria família cheia de alegria, aventura e memórias vivas.", "Filhos que crescem com leveza e amor pela vida.", "Lar onde há espaço para sonho e para o presente."], padraoAcao: "Estar presente é o maior presente que você pode dar.", praticas: ["Ficar em casa sem programação extra pelo menos 1 noite.", "Ouvir o filho até o fim sem dar solução imediata.", "Criar uma rotina simples e manter por 21 dias."] },
        8: { potencial: ["Família que se sente protegida e amada com força.", "Filhos que aprendem coragem e justiça.", "Lar onde há segurança real e amor intenso."], padraoAcao: "Sua força protege — mas sua ternura transforma.", praticas: ["Fazer um gesto de carinho sem motivo especial.", "Ouvir o filho reclamar sem resolver na força.", "Pedir desculpas quando a intensidade foi longe demais."] },
        9: { potencial: ["Cria lar harmonioso, acolhedor e estável.", "Filhos que aprendem a lidar com diferenças.", "Família unida pela presença serena do 9 saudável."], padraoAcao: "Se posicionar em casa é um ato de amor — não de conflito.", praticas: ["Expressar o que quer para o jantar (começo pequeno).", "Resolver uma pendência familiar que vem adiando.", "Dizer a um filho o que você pensa — com calma."] }
    },
    relacionamento: {
        label: "Relacionamento / Casal",
        1: { potencial: ["Cria relacionamento sólido baseado em valores e respeito.", "Parceiro confiável, comprometido e honesto.", "Transforma o casal em equipe de crescimento mútuo."], padraoAcao: "Seu parceiro precisa de aceitação — não de correção.", praticas: ["Deixar um comportamento do parceiro passar sem comentar.", "Expressar afeto sem condição ou crítica embutida.", "Perguntar: 'O que você precisa de mim hoje?'"] },
        2: { potencial: ["Cria vínculo profundo de amor e cuidado genuíno.", "Parceiro que faz o outro se sentir especial.", "Relacionamento de apoio mútuo real."], padraoAcao: "Amor que exige reconhecimento não é amor — é contrato.", praticas: ["Expressar uma necessidade sem esperar o parceiro adivinhar.", "Fazer algo só para você — sem envolver o casal.", "Dizer não para o parceiro quando precisar."] },
        3: { potencial: ["Inspira o parceiro a crescer e sonhar junto.", "Relacionamento com metas, conquistas e evolução.", "Casal que se admira e se motiva."], padraoAcao: "Seu parceiro quer você — não sua versão de palco.", praticas: ["Ter uma conversa sem falar de trabalho ou conquistas.", "Perguntar: 'Como você está se sentindo comigo?'", "Fazer um programa simples sem tentar impressionar."] },
        4: { potencial: ["Cria relacionamento intenso, profundo e significativo.", "Parceiro que faz o outro se sentir realmente visto.", "Conexão emocional que poucos casais têm."], padraoAcao: "Intensidade é lindo — mas constância é o que sustenta.", praticas: ["Aceitar um dia 'comum' com o parceiro sem drama.", "Expressar gratidão pelo que tem — não pelo ideal.", "Quando triste, contar ao parceiro em vez de se isolar."] },
        5: { potencial: ["Parceiro reflexivo que ouve com profundidade.", "Relacionamento baseado em respeito e inteligência.", "Amor que cresce com tempo e confiança."], padraoAcao: "Seu parceiro precisa de presença — não só de sua mente.", praticas: ["Iniciar contato físico sem esperar o parceiro.", "Falar sobre sentimentos 1 vez ao dia.", "Desligar o celular/livro e estar 100% presente por 30 min."] },
        6: { potencial: ["Cria relacionamento seguro, leal e duradouro.", "Parceiro que o outro sabe que nunca vai abandonar.", "Casal que enfrenta crises com coragem e lealdade."], padraoAcao: "Confiar no parceiro é um ato de coragem — não de ingenuidade.", praticas: ["Substituir uma suspeita por uma pergunta direta.", "Dizer ao parceiro o que você aprecia nele hoje.", "Tomar uma decisão do casal sem pedir validação externa."] },
        7: { potencial: ["Cria relacionamento cheio de alegria, aventura e cumplicidade.", "Parceiro que transforma o cotidiano em algo especial.", "Casal que cresce junto com leveza e entusiasmo."], padraoAcao: "O amor real também vive nos dias parados — não só nos voos.", praticas: ["Ficar em casa com o parceiro sem planejar programa.", "Ouvir o parceiro até o fim sem sugerir solução.", "Honrar um compromisso do casal que vinha evitando."] },
        8: { potencial: ["Amor intenso, protetor e absolutamente leal.", "Parceiro que o outro sabe que está ao lado em qualquer batalha.", "Relacionamento de confiança profunda e respeito mútuo."], padraoAcao: "Vulnerabilidade com quem ama não é fraqueza — é intimidade.", praticas: ["Contar ao parceiro algo que te machuca de verdade.", "Ouvir uma crítica do parceiro sem rebater.", "Pedir algo ao parceiro — sem exigir."] },
        9: { potencial: ["Cria ambiente de amor seguro, calmo e acolhedor.", "Parceiro com quem o outro descansa e se recarrega.", "Relacionamento de confiança construída pela constância."], padraoAcao: "Dizer o que sente fortalece o casal — não ameaça a paz.", praticas: ["Expressar uma opinião diferente do parceiro hoje.", "Resolver uma conversa difícil que vem adiando.", "Escolher o programa do final de semana sem delegar ao parceiro."] }
    },
    pessoal: {
        label: "Desenvolvimento Pessoal",
        1: { potencial: ["Alcança excelência com serenidade e sabedoria.", "Transforma autocrítica em autodisciplina saudável.", "Vive com integridade sem rigidez."], padraoAcao: "Feito é melhor que perfeito. Sempre.", praticas: ["Quebrar uma regra pequena de propósito.", "Praticar o não-julgamento por 24h.", "Escrever 3 coisas que estão boas o suficiente hoje."] },
        2: { potencial: ["Cuida de si com a mesma intensidade que cuida dos outros.", "Descobre o que realmente quer e vai buscar.", "Amor-próprio que transborda para os outros."], padraoAcao: "Primeiro a máscara de oxigênio em você.", praticas: ["Fazer algo só para si mesmo essa semana.", "Pedir ajuda para alguém — sem justificar.", "Listar 5 necessidades suas e atender 1 hoje."] },
        3: { potencial: ["Sucesso com alma e autenticidade.", "Realiza e sente — não só executa.", "Valoriza o ser tanto quanto o ter e o fazer."], padraoAcao: "O sucesso sem alma é o maior fracasso.", praticas: ["Desacelerar propositalmente 1 vez ao dia.", "Fazer um hobbie sem meta ou resultado.", "Escrever: quem eu sou quando ninguém está olhando?"] },
        4: { potencial: ["Transforma dor em criação e crescimento.", "Vive com profundidade sem se afogar.", "Equilíbrio emocional que liberta para criar."], padraoAcao: "A disciplina traz a liberdade que você tanto busca.", praticas: ["Criar uma rotina de 3 hábitos e manter por 21 dias.", "Focar no que tem, não no que falta — escrever 1 gratidão diária.", "Agir mesmo sem estar no 'humor certo'."] },
        5: { potencial: ["Transforma conhecimento em sabedoria prática.", "Conecta-se ao mundo sem perder sua profundidade.", "Generoso com o que sabe — e isso o transforma."], padraoAcao: "O conhecimento só vale quando compartilhado.", praticas: ["Compartilhar uma ideia antes de estar 'pronta'.", "Praticar atividade física intensa 3x por semana.", "Participar de um grupo e comprometer-se por 30 dias."] },
        6: { potencial: ["Confia em si mesmo com a mesma força que confia nos outros.", "Age com coragem mesmo com medo.", "Cria sua própria segurança interna."], padraoAcao: "A coragem não é ausência de medo — é agir com ele.", praticas: ["Tomar uma decisão rápida sem consultar ninguém.", "Listar 3 evidências de que você é capaz.", "Praticar meditação para silenciar a mente catastrófica."] },
        7: { potencial: ["Alegria profunda que não depende de estímulo externo.", "Termina o que começa — e isso muda tudo.", "Gratidão pelo presente que é suficiente."], padraoAcao: "A liberdade real requer compromisso.", praticas: ["Terminar um projeto que está parado há mais de 1 mês.", "Praticar silêncio por 20 minutos ao dia.", "Aceitar e ficar com uma emoção difícil por 5 minutos."] },
        8: { potencial: ["Força que constrói — não que destrói.", "Vulnerabilidade como ato de coragem consciente.", "Impacto positivo que dura além do poder."], padraoAcao: "A verdadeira força é gentil — e isso exige mais coragem.", praticas: ["Escrever sobre algo que te machuca de verdade.", "Pedir ajuda a alguém de confiança.", "Cuidar de algo frágil (planta, animal, criança)."] },
        9: { potencial: ["Paz interior que não depende da paz ao redor.", "Age a partir de seus próprios desejos com confiança.", "Presença que une — sem se perder."], padraoAcao: "Pequenas ações diárias quebram a inércia.", praticas: ["Definir 1 prioridade pessoal e agir nela hoje.", "Verbalizar uma opinião simples: 'Eu prefiro...'", "Usar a pergunta-chave todo dia: O que EU quero?"] }
    },
    carreira: {
        label: "Carreira / Propósito",
        1: { potencial: ["Constrói carreira sólida baseada em competência real.", "Referência de qualidade no que faz.", "Transforma padrão alto em diferencial competitivo."], padraoAcao: "Mostre o trabalho antes de estar perfeito — o mercado precisa disso.", praticas: ["Entregar um projeto antes de 'terminar de ajustar'.", "Pedir feedback externo sobre seu trabalho.", "Mapear o que é excelente versus o que é ansiedade."] },
        2: { potencial: ["Constrói redes poderosas pelo cuidado genuíno.", "Carreira de impacto real nas pessoas.", "Referência de apoio e colaboração no mercado."], padraoAcao: "Sua carreira mais poderosa nasce quando você para de precisar de aprovação.", praticas: ["Buscar uma oportunidade para si — não para agradar alguém.", "Dizer não para uma demanda que não é sua prioridade.", "Identificar o que você quer profissionalmente — sem filtro."] },
        3: { potencial: ["Carreira de alto impacto com propósito real.", "Sucesso que inspira e que é sustentável.", "Referência de excelência com autenticidade."], padraoAcao: "A melhor versão profissional sua é a versão real sua.", praticas: ["Definir sua missão profissional além dos resultados.", "Dizer não para uma oportunidade que não tem sentido.", "Conversar sobre fracasso com alguém que admira."] },
        4: { potencial: ["Carreira única que só você poderia ter.", "Cria produtos, serviços ou arte com impacto emocional.", "Diferencial de mercado que vem da sua profundidade."], padraoAcao: "Sua singularidade é seu maior diferencial — mas exige execução.", praticas: ["Criar um projeto criativo pessoal e trabalhar nele 30 min/dia.", "Buscar um mentor que equilibre visão com prática.", "Comprometer-se com um caminho por 6 meses sem mudar."] },
        5: { potencial: ["Especialista reconhecido que transforma conhecimento em valor.", "Carreira construída sobre profundidade e competência real.", "Referência intelectual que inspira e lidera pelo saber."], padraoAcao: "O especialista que ninguém conhece não gera impacto.", praticas: ["Criar conteúdo ou falar em público sobre o que domina.", "Buscar um projeto colaborativo fora da zona de conforto.", "Aceitar uma oportunidade antes de 'se sentir pronto'."] },
        6: { potencial: ["Carreira sólida construída sobre consistência e confiança.", "Profissional que as empresas sabem que podem contar.", "Cresce com segurança porque planeja e executa."], padraoAcao: "A carreira que você quer está do outro lado do risco calculado.", praticas: ["Candidatar-se a uma oportunidade que parece grande demais.", "Buscar um mentor para tomar decisões de carreira.", "Listar seus diferenciais reais — sem minimizar."] },
        7: { potencial: ["Carreira multidisciplinar de alto impacto e criatividade.", "Conecta mundos diferentes e cria soluções inéditas.", "Profissional que enxerga o futuro antes dos outros."], padraoAcao: "Especialização profunda abre mais portas do que diversificação rasa.", praticas: ["Escolher uma área e se aprofundar por 6 meses.", "Terminar um curso ou projeto que começou e parou.", "Criar um plano de carreira de 2 anos e revisitar mensalmente."] },
        8: { potencial: ["Carreira de liderança e impacto transformador.", "Cria negócios, times e resultados que outros acham impossível.", "Referência de força, execução e visão no mercado."], padraoAcao: "Seu impacto profissional cresce quando você leva pessoas junto — não na frente.", praticas: ["Escolher um profissional para desenvolver ativamente.", "Pedir feedback honesto de alguém da equipe.", "Criar espaço para que outros liderem um projeto."] },
        9: { potencial: ["Carreira construída com consistência e propósito real.", "Mediador e construtor de pontes no mercado.", "Referência de equilíbrio e presença no trabalho."], padraoAcao: "Sua carreira começa quando você decide o que quer — não o que aceitam.", praticas: ["Definir sua meta profissional para os próximos 12 meses.", "Buscar uma promoção ou oportunidade sem esperar ser chamado.", "Expressar sua opinião profissional numa reunião hoje."] }
    }
};

/* ======================================================
   LABELS DOS CONTEXTOS
   ====================================================== */
const nomeContexto = { lider: "Liderança & Negócios", familia: "Família & Filhos", relacionamento: "Relacionamento & Casal", pessoal: "Desenvolvimento Pessoal", carreira: "Carreira & Propósito" };

/* ======================================================
   LÓGICA DO QUIZ
   ====================================================== */
let pontuacaoTipos = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
let pontuacaoInstinto = { "SP": 0, "SX": 0, "SO": 0 };
let indiceTipo = 0;
let indiceInstinto = 0;
let faseAtual = "TIPO";
let perguntasTipoEmbaralhadas = [];

function mostrarPergunta() {
    if (faseAtual === "TIPO") {
        if (indiceTipo >= perguntasTipoEmbaralhadas.length) { faseAtual = "INSTINTO"; mostrarPergunta(); return; }
        const q = perguntasTipoEmbaralhadas[indiceTipo];
        renderizarQuestao(q.txt, `${indiceTipo + 1} / 27`, ["Discordo Totalmente", "Discordo", "Neutro", "Concordo", "Concordo Totalmente"], [0, 1, 2, 3, 5], (val) => { pontuacaoTipos[q.tipo] += val; indiceTipo++; mostrarPergunta(); });
    } else if (faseAtual === "INSTINTO") {
        if (indiceInstinto >= perguntasInstinto.length) { processarFinalizacao(); return; }
        const q = perguntasInstinto[indiceInstinto];
        renderizarQuestao(q.txt, "FASE FINAL", [q.opcoes[0].txt, q.opcoes[1].txt, q.opcoes[2].txt], [q.opcoes[0].tag, q.opcoes[1].tag, q.opcoes[2].tag], (tag) => { pontuacaoInstinto[tag] += 1; indiceInstinto++; mostrarPergunta(); });
    }
}

function renderizarQuestao(texto, num, labels, valores, callback) {
    updateElement('q-text', texto);
    updateElement('q-number', num);
    const bar = document.getElementById('progress-bar');
    if (bar) { let pct = faseAtual === "TIPO" ? (indiceTipo / 27) * 90 : 90 + ((indiceInstinto / 3) * 10); bar.style.width = `${pct}%`; }
    const container = document.getElementById('options-container');
    if (container) { container.innerHTML = ''; labels.forEach((label, idx) => { const btn = document.createElement('button'); btn.className = 'btn-option'; if (faseAtual === "INSTINTO") btn.style.borderColor = "#D4AF37"; btn.innerText = label; btn.onclick = function() { this.style.background = "#D4AF37"; this.style.color = "black"; setTimeout(() => callback(valores[idx]), 100); }; container.appendChild(btn); }); }
}

function processarFinalizacao() {
    document.getElementById('screen-quiz').classList.add('hidden');
    document.getElementById('screen-loading').classList.remove('hidden');
    let vencedor = 1; let maxPontos = -1;
    for (let i = 1; i <= 9; i++) { if (pontuacaoTipos[i] > maxPontos) { maxPontos = pontuacaoTipos[i]; vencedor = i; } }
    let vizinhoEsq = (vencedor === 1) ? 9 : vencedor - 1;
    let vizinhoDir = (vencedor === 9) ? 1 : vencedor + 1;
    let asa = (pontuacaoTipos[vizinhoEsq] > pontuacaoTipos[vizinhoDir]) ? vizinhoEsq : vizinhoDir;
    let instintoVencedor = "SP"; let maxInst = -1;
    for (let tag in pontuacaoInstinto) { if (pontuacaoInstinto[tag] > maxInst) { maxInst = pontuacaoInstinto[tag]; instintoVencedor = tag; } }
    const nomesInstinto = { "SP": "AUTOPRESERVAÇÃO", "SX": "SEXUAL", "SO": "SOCIAL" };
    const protocolo = "#PM-" + Math.floor(1000 + Math.random() * 9000);
    updateElement('protocol-code', protocolo);

    try {
        sessionStorage.setItem('pm_resultado', JSON.stringify({
            nome: userName, email: userEmail, phone: userPhone,
            contexto: userContexto, tipo: vencedor, asa: asa,
            instinto: instintoVencedor, pontuacaoTipos, pontuacaoInstinto
        }));
    } catch(e) {}

    setTimeout(() => { exibirResultados(vencedor, asa, nomesInstinto[instintoVencedor]); }, 3000);
}

/* ======================================================
   ENVIO DE EMAIL (FORMSPREE)
   ====================================================== */
function enviarResultadoFormspree(tipo, asa, subtipo) {
    const base = perfisData[tipo] || perfisData[9];
    const ctx_data = (contextoData[userContexto] || contextoData['pessoal'])[tipo] || contextoData['pessoal'][tipo];
    const formData = new FormData();
    formData.append("nome", userName);
    formData.append("whatsapp", userPhone);
    formData.append("_replyto", userEmail);
    formData.append("contexto", nomeContexto[userContexto] || userContexto);
    formData.append("resultado_tipo", `TIPO ${tipo} - ${base.nome}`);
    formData.append("resultado_asa", `ASA ${asa}`);
    formData.append("resultado_instinto", subtipo);
    formData.append("data_hora", new Date().toLocaleString("pt-BR"));
    formData.append("_subject", `[PráticaMente] ${userName} — TIPO ${tipo} | ASA ${asa} | ${nomeContexto[userContexto]}`);

    const resumoEmail =
`Olá, ${userName}!

Obrigado por fazer o Diagnóstico PráticaMente.
Aqui está o seu resultado completo 🎯

━━━━━━━━━━━━━━━━━━━━
SEU RESULTADO
━━━━━━━━━━━━━━━━━━━━
Tipo Dominante : TIPO ${tipo} — ${base.nome}
Asa (Wing)     : ASA ${asa}
Instinto       : ${subtipo}
Foco           : ${nomeContexto[userContexto]}

━━━━━━━━━━━━━━━━━━━━
ESSÊNCIA (Quem você é)
━━━━━━━━━━━━━━━━━━━━
${base.essencia.map(e => `• ${e}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━
SUAS FORÇAS
━━━━━━━━━━━━━━━━━━━━
${base.forcas.map(e => `• ${e}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━
SEUS DESAFIOS
━━━━━━━━━━━━━━━━━━━━
${base.desafios.map(e => `• ${e}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━
PADRÃO INCONSCIENTE
━━━━━━━━━━━━━━━━━━━━
"${base.padraoFrase}"
${base.padraoPreco.map(e => `• Preço: ${e}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━
FOCO: ${nomeContexto[userContexto].toUpperCase()}
━━━━━━━━━━━━━━━━━━━━
Potencial:
${ctx_data.potencial.map(e => `• ${e}`).join('\n')}

➜ ${ctx_data.padraoAcao}

━━━━━━━━━━━━━━━━━━━━
PRÁTICAS PRÁTICAMENTS
━━━━━━━━━━━━━━━━━━━━
${ctx_data.praticas.map(e => `• ${e}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━
Acesse o grupo VIP para o manual completo da sua mente:
${LINK_WHATSAPP}

Com gratidão,
Equipe PráticaMente 🧠`;

    formData.append("mensagem_resultado", resumoEmail);

    fetch("https://formspree.io/f/xwvoklpq", {
        method: "POST",
        body: formData,
        headers: { "Accept": "application/json" }
    }).catch(err => console.log("Erro ao enviar resultado:", err));
}

function enviarEmailPessoa(tipo, asa, subtipo) {
    if (!userEmail || !window.emailjs) return;

    const base = perfisData[tipo] || perfisData[9];
    const ctx_data = (contextoData[userContexto] || contextoData['pessoal'])[tipo] || contextoData['pessoal'][tipo];

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_name:    userName,
        to_email:   userEmail,
        tipo:       `TIPO ${tipo} — ${base.nome}`,
        asa:        `ASA ${asa}`,
        instinto:   subtipo,
        contexto:   nomeContexto[userContexto] || userContexto,
        essencia:   base.essencia.map(e => `• ${e}`).join('\n'),
        forcas:     base.forcas.map(e => `• ${e}`).join('\n'),
        desafios:   base.desafios.map(e => `• ${e}`).join('\n'),
        padrao:     base.padraoFrase,
        acao:       ctx_data.padraoAcao,
        praticas:   ctx_data.praticas.map(e => `• ${e}`).join('\n'),
        potencial:  ctx_data.potencial.map(e => `• ${e}`).join('\n'),
        link_grupo: LINK_WHATSAPP
    }, EMAILJS_PUBLIC_KEY)
    .catch(err => console.log("Erro EmailJS:", err));
}


function exibirResultados(tipo, asa, subtipo) {
    document.getElementById('screen-loading').classList.add('hidden');
    document.getElementById('screen-result').classList.remove('hidden');

    enviarResultadoFormspree(tipo, asa, subtipo);
    enviarEmailPessoa(tipo, asa, subtipo);

    const base = perfisData[tipo] || perfisData[9];
    const ctx_data = (contextoData[userContexto] || contextoData['pessoal'])[tipo] || contextoData['pessoal'][tipo];

    updateElement('user-name-result', userName);
    updateElement('res-archetype', base.nome);
    updateElement('res-type', `TIPO ${tipo}`);
    updateElement('res-wing-calc', `ASA ${asa}`);
    updateElement('res-subtype', subtipo);

    const badgeContexto = document.getElementById('res-contexto');
    if (badgeContexto) badgeContexto.innerText = `FOCO: ${nomeContexto[userContexto] || userContexto}`.toUpperCase();

    const createList = (items) => items.map(i => `<li>${i}</li>`).join('');

    document.getElementById('list-essencia').innerHTML     = createList(base.essencia);
    document.getElementById('list-forcas').innerHTML       = createList(base.forcas);
    document.getElementById('list-desequilibrio').innerHTML = createList(base.desequilibrio);
    document.getElementById('list-potencial').innerHTML    = createList(ctx_data.potencial);
    document.getElementById('list-desafios').innerHTML     = createList(base.desafios);

    updateElement('txt-padrao-frase', `"${base.padraoFrase}"`);
    document.getElementById('list-padrao-preco').innerHTML = createList(base.padraoPreco);
    updateElement('txt-padrao-acao', ctx_data.padraoAcao);
    document.getElementById('list-praticas').innerHTML     = createList(ctx_data.praticas);

    let infl = 70, res = 70, est = 70;
    if ([2,3,7,8].includes(tipo)) infl = 90 + Math.random() * 5;
    if ([1,8,9,5].includes(tipo)) res  = 90 + Math.random() * 5;
    if ([5,6,1,3].includes(tipo)) est  = 90 + Math.random() * 5;

    setTimeout(() => {
        document.getElementById('bar-infl').style.width  = `${infl}%`;
        document.getElementById('score-infl').innerText  = `${Math.floor(infl)}%`;
        document.getElementById('bar-res').style.width   = `${res}%`;
        document.getElementById('score-res').innerText   = `${Math.floor(res)}%`;
        document.getElementById('bar-est').style.width   = `${est}%`;
        document.getElementById('score-est').innerText   = `${Math.floor(est)}%`;
    }, 500);

    gerarGraficoRadar(pontuacaoTipos);
}

function gerarGraficoRadar(pontos) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    const dataValues = [pontos[1], pontos[2], pontos[3], pontos[4], pontos[5], pontos[6], pontos[7], pontos[8], pontos[9]];
    if (window.myRadar) window.myRadar.destroy();
    window.myRadar = new Chart(ctx, { type: 'radar', data: { labels: ['T1','T2','T3','T4','T5','T6','T7','T8','T9'], datasets: [{ label: 'Assinatura Neural', data: dataValues, backgroundColor: 'rgba(212, 175, 55, 0.2)', borderColor: '#D4AF37', borderWidth: 2, pointBackgroundColor: '#fff', pointBorderColor: '#D4AF37' }] }, options: { scales: { r: { angleLines: { color: 'rgba(255,255,255,0.1)' }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#aaa', font: { size: 10 } }, ticks: { display: false, backdropColor: 'transparent' }, suggestedMin: 0, suggestedMax: 20 } }, plugins: { legend: { display: false } }, maintainAspectRatio: false } });
}

function baixarEEntrar() {
    const btn = document.querySelector('.btn-cta');
    if (btn) { btn.innerHTML = "DIRECIONANDO..."; btn.disabled = true; }
    if (LINK_PDF && LINK_PDF.length > 5) { window.open(LINK_PDF, '_blank'); }
    setTimeout(() => { window.location.href = LINK_WHATSAPP; }, 1000);
}

function updateElement(id, text) { const el = document.getElementById(id); if (el) el.innerHTML = text; }
