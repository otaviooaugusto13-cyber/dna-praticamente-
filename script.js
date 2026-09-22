<script>
    // Variável para guardar o resultado do mapeamento
    let resultadoCalculadoFinal = ""; 

    // 1. Inicia o Mapeamento (Esconde Abertura, Mostra Quiz)
    function iniciarMapeamento() {
        document.getElementById('telaAbertura').classList.add('hidden');
        document.getElementById('painelQuiz').classList.remove('hidden');
    }

    // 2. Finaliza as Perguntas (Esconde Quiz, Mostra Teaser da Neurociência)
    function finalizarTeste() {
        // Seu código de somar as respostas entra aqui.
        // Simulando um resultado:
        resultadoCalculadoFinal = "Perfil Estrategista / Analítico"; 
        
        // Insere o nome na tela de teaser
        document.getElementById('resultadoSuperficial').innerText = resultadoCalculadoFinal;

        // Executa a troca de painéis
        document.getElementById('painelQuiz').classList.add('hidden');
        document.getElementById('painelTeaser').classList.remove('hidden');
        
        // Joga a tela pro topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 3. Intercepta o envio do Formulário 12 Semanas (AJAX)
    document.getElementById('formDozeSemanas').addEventListener('submit', function(event) {
        event.preventDefault(); // Impede o redirecionamento (a tela branca)

        const btn = document.querySelector('#formDozeSemanas .btn-cta');
        const textoOriginal = btn.innerHTML;
        
        // Feedback visual para o usuário
        btn.innerHTML = "Decodificando Córtex Pré-Frontal...";
        btn.disabled = true;

        const formData = new FormData(this);

        // Envia os dados por baixo dos panos para o FormSubmit
        fetch(this.action, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        })
        .then(response => {
            if (response.ok) {
                // Insere o resultado final no laudo
                document.getElementById('resultadoProfundoNome').innerText = resultadoCalculadoFinal;
                
                // Esconde o Teaser e revela o Laudo Completo
                document.getElementById('painelTeaser').classList.add('hidden');
                document.getElementById('telaResultadoFinal').classList.remove('hidden');
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                alert("Erro ao validar. Verifique o link do seu formulário.");
                btn.innerHTML = textoOriginal;
                btn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Erro de requisição:', error);
            alert("Verifique sua conexão com a internet.");
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        });
    });
</script>
