/* ===========================
   JS - CONFIGURAÇÕES
   =========================== */

console.log('[CONFIGURAÇÕES] Script carregado');

// ============ ELEMENTOS DOM ============
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// ABA 1: EMPRESA
const formEmpresa = document.getElementById('formEmpresa');
const nomeEmpresa = document.getElementById('nomeEmpresa');
const cnpj = document.getElementById('cnpj');
const nomeFantasia = document.getElementById('nomeFantasia');
const inscEstadual = document.getElementById('inscEstadual');
const endereco = document.getElementById('endereco');
const numero = document.getElementById('numero');
const cidade = document.getElementById('cidade');
const estado = document.getElementById('estado');
const cep = document.getElementById('cep');
const telefone = document.getElementById('telefone');
const whatsapp = document.getElementById('whatsapp');
const email = document.getElementById('email');
const descricao = document.getElementById('descricao');

// ABA 2: LOGOMARCA
const formLogomarca = document.getElementById('formLogomarca');
const logoFile = document.getElementById('logoFile');
const logoPreview = document.getElementById('logoPreview');
const logoInfo = document.getElementById('logoInfo');
const logoFileName = document.getElementById('logoFileName');
const logoFileSize = document.getElementById('logoFileSize');
const logoFileType = document.getElementById('logoFileType');
const btnRemoverLogo = document.getElementById('btnRemoverLogo');

// ABA 3: CONTAS
const formNovaConta = document.getElementById('formNovaConta');
const nomeBanco = document.getElementById('nomeBanco');
const agencia = document.getElementById('agencia');
const conta = document.getElementById('conta');
const tipoConta = document.getElementById('tipoConta');
const titularConta = document.getElementById('titularConta');
const observacoes = document.getElementById('observacoes');
const listaContas = document.getElementById('listaContas');

// ============ INICIALIZAÇÃO ============
document.addEventListener('DOMContentLoaded', () => {
    console.log('[CONFIGURAÇÕES] DOMContentLoaded disparado');
    
    // Inicializar Sistema de Abas
    inicializarAbas();
    
    // Carregar dados salvos
    carregarConfiguracoes();
    
    // Configurar Eventos
    configurarEventos();
});

// ============ SISTEMA DE ABAS ============
function inicializarAbas() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            mudarAba(tabName);
        });
    });
}

function mudarAba(tabName) {
    // Remover classe is-active de todos os botões e conteúdos
    tabButtons.forEach(btn => btn.classList.remove('is-active'));
    tabContents.forEach(content => content.classList.remove('is-active'));

    // Adicionar classe is-active ao botão e conteúdo selecionado
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('is-active');
    document.getElementById(`tab-${tabName}`).classList.add('is-active');

    console.log(`[CONFIGURAÇÕES] Aba alterada para: ${tabName}`);
}

// ============ CONFIGURAÇÃO DE EVENTOS ============
function configurarEventos() {
    // ABA 1: EMPRESA
    formEmpresa.addEventListener('submit', salvarDadosEmpresa);

    // ABA 2: LOGOMARCA
    logoFile.addEventListener('change', handleLogoChange);
    btnRemoverLogo.addEventListener('click', removerLogo);
    formLogomarca.addEventListener('submit', (e) => {
        e.preventDefault();
        salvarLogomarca();
    });

    // ABA 3: CONTAS
    formNovaConta.addEventListener('submit', adicionarConta);

    // Drag and Drop para Logo
    const uploadLabel = document.querySelector('.upload-label');
    uploadLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadLabel.style.background = '#E3F2FD';
    });
    uploadLabel.addEventListener('dragleave', () => {
        uploadLabel.style.background = '#ffffff';
    });
    uploadLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadLabel.style.background = '#ffffff';
        if (e.dataTransfer.files.length > 0) {
            logoFile.files = e.dataTransfer.files;
            handleLogoChange();
        }
    });
}

// ============ ABA 1: EMPRESA ============
function salvarDadosEmpresa(e) {
    e.preventDefault();

    const dadosEmpresa = {
        nomeEmpresa: nomeEmpresa.value.trim(),
        cnpj: cnpj.value.trim(),
        nomeFantasia: nomeFantasia.value.trim(),
        inscEstadual: inscEstadual.value.trim(),
        endereco: endereco.value.trim(),
        numero: numero.value.trim(),
        cidade: cidade.value.trim(),
        estado: estado.value.trim().toUpperCase(),
        cep: cep.value.trim(),
        telefone: telefone.value.trim(),
        whatsapp: whatsapp.value.trim(),
        email: email.value.trim(),
        descricao: descricao.value.trim()
    };

    // Validar campos obrigatórios
    if (!dadosEmpresa.nomeEmpresa || !dadosEmpresa.cnpj || !dadosEmpresa.endereco || 
        !dadosEmpresa.cidade || !dadosEmpresa.estado || !dadosEmpresa.telefone || !dadosEmpresa.email) {
        mostrarMensagem('Por favor, preencha todos os campos obrigatórios!', 'error');
        return;
    }

    // Salvar no localStorage
    localStorage.setItem('configEmpresa', JSON.stringify(dadosEmpresa));
    
    // Atualizar nome da empresa no header
    atualizarNomeEmpresaHeader(dadosEmpresa.nomeEmpresa);

    mostrarMensagem('✓ Dados da empresa salvos com sucesso!', 'success');
    console.log('[CONFIGURAÇÕES] Dados da empresa salvos:', dadosEmpresa);
}

function carregarDadosEmpresa() {
    const dadosSalvos = localStorage.getItem('configEmpresa');
    
    if (dadosSalvos) {
        const dados = JSON.parse(dadosSalvos);
        
        nomeEmpresa.value = dados.nomeEmpresa || '';
        cnpj.value = dados.cnpj || '';
        nomeFantasia.value = dados.nomeFantasia || '';
        inscEstadual.value = dados.inscEstadual || '';
        endereco.value = dados.endereco || '';
        numero.value = dados.numero || '';
        cidade.value = dados.cidade || '';
        estado.value = dados.estado || '';
        cep.value = dados.cep || '';
        telefone.value = dados.telefone || '';
        whatsapp.value = dados.whatsapp || '';
        email.value = dados.email || '';
        descricao.value = dados.descricao || '';

        console.log('[CONFIGURAÇÕES] Dados da empresa carregados:', dados);
    }
}

function atualizarNomeEmpresaHeader(nome) {
    const companyNameElements = document.querySelectorAll('.company-name');
    companyNameElements.forEach(el => {
        el.textContent = nome;
    });
}

// ============ ABA 2: LOGOMARCA ============
function handleLogoChange() {
    const file = logoFile.files[0];

    if (!file) {
        logoInfo.style.display = 'none';
        return;
    }

    // Validar tipo de arquivo
    const tiposValidos = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!tiposValidos.includes(file.type)) {
        mostrarMensagem('Por favor, selecione uma imagem válida (PNG, JPG ou SVG)', 'error');
        logoFile.value = '';
        return;
    }

    // Validar tamanho (máx 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
        mostrarMensagem('O arquivo é muito grande. Máximo permitido: 2MB', 'error');
        logoFile.value = '';
        return;
    }

    // Ler arquivo
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;

        // Mostrar preview
        logoPreview.innerHTML = `<img src="${base64}" alt="Preview da Logo">`;

        // Mostrar informações
        logoFileName.textContent = file.name;
        logoFileSize.textContent = (file.size / 1024).toFixed(2) + ' KB';
        logoFileType.textContent = file.type;
        logoInfo.style.display = 'block';

        // Armazenar em sessionStorage para uso na função salvarLogomarca
        sessionStorage.setItem('logoBase64', base64);
    };
    reader.readAsDataURL(file);
}

function salvarLogomarca() {
    const logoBase64 = sessionStorage.getItem('logoBase64');

    if (!logoBase64) {
        mostrarMensagem('Por favor, selecione uma imagem primeiro!', 'error');
        return;
    }

    // Salvar no localStorage
    localStorage.setItem('configLogomarca', logoBase64);

    mostrarMensagem('✓ Logomarca salva com sucesso!', 'success');
    console.log('[CONFIGURAÇÕES] Logomarca salva');
}

function carregarLogomarca() {
    const logoBase64 = localStorage.getItem('configLogomarca');

    if (logoBase64) {
        logoPreview.innerHTML = `<img src="${logoBase64}" alt="Logo da Empresa">`;
        logoInfo.style.display = 'block';
        logoFileName.textContent = 'Logo salva';
        console.log('[CONFIGURAÇÕES] Logomarca carregada');
    }
}

function removerLogo() {
    if (confirm('Tem certeza que deseja remover a logomarca?')) {
        localStorage.removeItem('configLogomarca');
        sessionStorage.removeItem('logoBase64');
        logoFile.value = '';
        logoPreview.innerHTML = '<span class="logo-placeholder">🖼️</span><p>Nenhuma logo carregada</p>';
        logoInfo.style.display = 'none';
        mostrarMensagem('✓ Logomarca removida com sucesso!', 'success');
        console.log('[CONFIGURAÇÕES] Logomarca removida');
    }
}

// ============ ABA 3: CONTAS BANCÁRIAS ============
function adicionarConta(e) {
    e.preventDefault();

    const novaConta = {
        id: Date.now(),
        nomeBanco: nomeBanco.value.trim(),
        agencia: agencia.value.trim(),
        conta: conta.value.trim(),
        tipoConta: tipoConta.value,
        titularConta: titularConta.value.trim(),
        observacoes: observacoes.value.trim()
    };

    // Validar campos obrigatórios
    if (!novaConta.nomeBanco || !novaConta.agencia || !novaConta.conta || 
        !novaConta.tipoConta || !novaConta.titularConta) {
        mostrarMensagem('Por favor, preencha todos os campos obrigatórios!', 'error');
        return;
    }

    // Carregar contas existentes
    let contas = JSON.parse(localStorage.getItem('configContas') || '[]');

    // Adicionar nova conta
    contas.push(novaConta);

    // Salvar no localStorage
    localStorage.setItem('configContas', JSON.stringify(contas));

    mostrarMensagem('✓ Conta bancária adicionada com sucesso!', 'success');
    console.log('[CONFIGURAÇÕES] Nova conta adicionada:', novaConta);

    // Resetar formulário
    formNovaConta.reset();

    // Atualizar lista
    carregarContas();
}

function carregarContas() {
    const contas = JSON.parse(localStorage.getItem('configContas') || '[]');

    listaContas.innerHTML = '';

    if (contas.length === 0) {
        listaContas.innerHTML = '<p class="empty-message">Nenhuma conta cadastrada</p>';
        return;
    }

    contas.forEach(conta => {
        const cartaoHTML = `
            <div class="conta-card">
                <div class="conta-header">
                    <div class="conta-banco">${conta.nomeBanco}</div>
                    <div class="conta-tipo">${obterLabelTipoConta(conta.tipoConta)}</div>
                </div>
                <div class="conta-info">
                    <strong>Agência:</strong> ${conta.agencia}<br>
                    <strong>Conta:</strong> ${conta.conta}<br>
                    <strong>Titular:</strong> ${conta.titularConta}
                </div>
                ${conta.observacoes ? `
                    <div class="conta-info">
                        <strong>Observações:</strong> ${conta.observacoes}
                    </div>
                ` : ''}
                <div class="conta-actions">
                    <button class="conta-btn conta-btn-edit" onclick="editarConta(${conta.id})">✏️ Editar</button>
                    <button class="conta-btn conta-btn-delete" onclick="deletarConta(${conta.id})">🗑️ Deletar</button>
                </div>
            </div>
        `;
        listaContas.innerHTML += cartaoHTML;
    });
}

function obterLabelTipoConta(tipo) {
    const tipos = {
        corrente: 'Corrente',
        poupanca: 'Poupança',
        investimento: 'Investimento'
    };
    return tipos[tipo] || tipo;
}

function editarConta(id) {
    const contas = JSON.parse(localStorage.getItem('configContas') || '[]');
    const conta = contas.find(c => c.id === id);

    if (conta) {
        nomeBanco.value = conta.nomeBanco;
        agencia.value = conta.agencia;
        conta.value = conta.conta;
        tipoConta.value = conta.tipoConta;
        titularConta.value = conta.titularConta;
        observacoes.value = conta.observacoes;

        // Armazenar ID para atualização
        formNovaConta.dataset.editId = id;

        // Mudar texto do botão
        const submitBtn = formNovaConta.querySelector('button[type="submit"]');
        submitBtn.textContent = '✏️ Atualizar Conta';

        // Rolar para o formulário
        formNovaConta.scrollIntoView({ behavior: 'smooth' });
    }
}

function deletarConta(id) {
    if (confirm('Tem certeza que deseja deletar esta conta bancária?')) {
        let contas = JSON.parse(localStorage.getItem('configContas') || '[]');
        contas = contas.filter(c => c.id !== id);
        localStorage.setItem('configContas', JSON.stringify(contas));

        mostrarMensagem('✓ Conta deletada com sucesso!', 'success');
        console.log('[CONFIGURAÇÕES] Conta deletada:', id);

        carregarContas();
    }
}

// ============ CARREGAMENTO GERAL ============
function carregarConfiguracoes() {
    console.log('[CONFIGURAÇÕES] Carregando todas as configurações');
    carregarDadosEmpresa();
    carregarLogomarca();
    carregarContas();
}

// ============ UTILITÁRIOS ============
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function formatarData(data) {
    const d = new Date(data);
    return new Intl.DateTimeFormat('pt-BR').format(d);
}

function mostrarMensagem(mensagem, tipo = 'success') {
    const classe = tipo === 'success' ? 'success-message' : 'error-message';
    const mensagemEl = document.createElement('div');
    mensagemEl.className = classe;
    mensagemEl.textContent = mensagem;

    // Insira a mensagem no topo do conteúdo ativo
    const tabAtiva = document.querySelector('.tab-content.is-active');
    tabAtiva.insertBefore(mensagemEl, tabAtiva.firstChild);

    // Remover mensagem após 4 segundos
    setTimeout(() => {
        mensagemEl.remove();
    }, 4000);

    console.log(`[CONFIGURAÇÕES] ${tipo.toUpperCase()}: ${mensagem}`);
}

// ============ EXPORTAR CONFIGURAÇÕES ============
function exportarConfiguracoes() {
    const config = {
        empresa: JSON.parse(localStorage.getItem('configEmpresa') || '{}'),
        logo: localStorage.getItem('configLogomarca') ? 'salva' : 'não salva',
        contas: JSON.parse(localStorage.getItem('configContas') || '[]'),
        dataExportacao: new Date().toLocaleString('pt-BR')
    };

    console.log('[CONFIGURAÇÕES] Configurações atuais:', config);
    return config;
}

// ============ IMPORTAR CONFIGURAÇÕES ============
function importarConfiguracoes(arquivo) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const config = JSON.parse(e.target.result);
            
            if (config.empresa) {
                localStorage.setItem('configEmpresa', JSON.stringify(config.empresa));
            }
            if (config.contas) {
                localStorage.setItem('configContas', JSON.stringify(config.contas));
            }

            mostrarMensagem('✓ Configurações importadas com sucesso!', 'success');
            carregarConfiguracoes();
        } catch (erro) {
            mostrarMensagem('Erro ao importar configurações. Arquivo inválido.', 'error');
            console.error('[CONFIGURAÇÕES] Erro ao importar:', erro);
        }
    };
    reader.readAsText(arquivo);
}
