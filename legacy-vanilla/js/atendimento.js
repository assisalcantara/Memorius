// ===========================
// JS - ATENDIMENTO
// ===========================

// DOM Elements
const formAtendimento = document.getElementById('formAtendimento');
const agregadoBusca = document.getElementById('agregadoBusca');
const agregadoDropdown = document.getElementById('agregadoDropdown');
const idContrato = document.getElementById('idContrato');
const status = document.getElementById('status');
const agregadoCpf = document.getElementById('agregadoCpf');
const agregadoDataNasc = document.getElementById('agregadoDataNasc');
const agregadoParentesco = document.getElementById('agregadoParentesco');
const agregadoLiberacao = document.getElementById('agregadoLiberacao');
const operacao = document.getElementById('operacao');
const dataAtendimento = document.getElementById('dataAtendimento');
const descricaoAtendimento = document.getElementById('descricaoAtendimento');

// Despesas
const descricaoDespesa = document.getElementById('descricaoDespesa');
const quantidadeDespesa = document.getElementById('quantidadeDespesa');
const valorUnitarioDespesa = document.getElementById('valorUnitarioDespesa');
const valorTotalDespesa = document.getElementById('valorTotalDespesa');
const btnAdicionarDespesa = document.getElementById('btnAdicionarDespesa');
const despesasTableBody = document.getElementById('despesasTableBody');

// Totais
const totalGeralCustos = document.getElementById('totalGeralCustos');
const valorDespesaCliente = document.getElementById('valorDespesaCliente');

// Assinatura (REMOVIDO - Assinatura será feita manualmente no PDF impresso)
// Canvas e botões relacionados foram removidos

// Botões de Ação
const btnGerarPDF = document.getElementById('btnGerarPDF');
const btnSalvarAtendimento = document.getElementById('btnSalvarAtendimento');
const btnCancelar = document.getElementById('btnCancelar');

// Variáveis globais
let despesasAtendimento = [];
let contratoSelecionado = null;
let agregadoSelecionado = null;

// ===========================
// INICIALIZAÇÃO
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[ATENDIMENTO] DOMContentLoaded disparado');
    
    // Desabilitar botão por padrão
    if (btnGerarPDF) {
        btnGerarPDF.disabled = true;
        console.log('[ATENDIMENTO] Botão Imprimir desabilitado na inicialização');
    }
    
    configurarEventos();
});

// ===========================
// CONFIGURAÇÃO DE EVENTOS
// ===========================

function configurarEventos() {
    console.log('[ATENDIMENTO] Configurando eventos...');
    
    // Busca de agregado
    if (agregadoBusca) {
        agregadoBusca.addEventListener('input', buscarAgregado);
        agregadoBusca.addEventListener('blur', () => {
            setTimeout(() => {
                agregadoDropdown.style.display = 'none';
            }, 200);
        });
    }

    // Despesas
    if (btnAdicionarDespesa) {
        btnAdicionarDespesa.addEventListener('click', adicionarDespesa);
    }

    // Cálculo automático de valor total
    if (quantidadeDespesa && valorUnitarioDespesa) {
        quantidadeDespesa.addEventListener('input', calcularValorTotal);
        valorUnitarioDespesa.addEventListener('input', calcularValorTotal);
    }

    // Botões de ação
    if (btnGerarPDF) {
        btnGerarPDF.addEventListener('click', gerarPDF);
    }
    
    if (formAtendimento) {
        formAtendimento.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarAtendimento();
        });
    }
    
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cancelarFormulario);
    }

    // Rádios de custo coberto
    document.querySelectorAll('input[name="custoCoberto"]').forEach(radio => {
        radio.addEventListener('change', atualizarValorDespesaCliente);
    });

    // Logout
    const userMenuEl = document.getElementById('userMenu');
    const logoutBtnEl = document.getElementById('logoutBtn');
    
    if (userMenuEl) {
        userMenuEl.addEventListener('click', toggleUserDropdown);
    } else {
        console.warn('[ATENDIMENTO] userMenu não encontrado');
    }
    
    if (logoutBtnEl) {
        logoutBtnEl.addEventListener('click', logout);
    } else {
        console.warn('[ATENDIMENTO] logoutBtn não encontrado');
    }
    
    console.log('[ATENDIMENTO] Eventos configurados com sucesso');
}

// ===========================
// CÁLCULO DE VALOR TOTAL
// ===========================

function calcularValorTotal() {
    const quantidade = parseFloat(quantidadeDespesa.value) || 0;
    const valorUnitario = parseFloat(valorUnitarioDespesa.value) || 0;
    const valorTotal = quantidade * valorUnitario;
    
    valorTotalDespesa.value = valorTotal.toFixed(2);
}

// ===========================
// BUSCA DE AGREGADO/CLIENTE
// ===========================

function buscarAgregado() {
    const termo = agregadoBusca.value.trim().toLowerCase();

    if (termo.length < 2) {
        agregadoDropdown.style.display = 'none';
        return;
    }

    // Obter contratos salvos
    const contratosRegistrados = JSON.parse(localStorage.getItem('contratosRegistrados') || '[]');
    const agregadosFiltrados = [];

    // Filtrar agregados por nome em contratos salvos
    contratosRegistrados.forEach(contrato => {
        // Suporta tanto 'inscritos' quanto 'agregados' para compatibilidade
        const lista = contrato.inscritos || contrato.agregados || [];
        if (Array.isArray(lista)) {
            lista.forEach(pessoa => {
                if (pessoa.nome.toLowerCase().includes(termo)) {
                    agregadosFiltrados.push({
                        nome: pessoa.nome,
                        cpf: pessoa.cpf,
                        dataNasc: pessoa.dataNascimento || pessoa.dataNasc,
                        parentesco: pessoa.parentesco,
                        contratoId: contrato.numeroContrato || contrato.numContrato || contrato.id,
                        status: contrato.status,
                        liberacao: pessoa.liberacao || 'Sim'
                    });
                }
            });
        }
    });

    // Se não houver resultados em contratos, usar dados de exemplo para testes
    if (agregadosFiltrados.length === 0) {
        const exemploAgregados = [
            {
                nome: "MARIA APARECIDA DE BORGES",
                dataNasc: "10/10/1967",
                parentesco: "TITULAR",
                contratoId: "1/2026",
                clienteCpf: "111.222.333-22",
                clienteDataNasc: "10/10/1970",
                clienteProfissao: "Empresária",
                clienteTelefone: "(11) 98765-4321",
                liberacao: "08/05/2024"
            },
            {
                nome: "JOÃO CASTRO DE BORGES (ÓBITO)",
                dataNasc: "10/10/1956",
                parentesco: "CÔNJUGE",
                contratoId: "1/2026",
                clienteCpf: "111.222.333-22",
                clienteDataNasc: "10/10/1970",
                clienteProfissao: "Empresária",
                clienteTelefone: "(11) 98765-4321",
                liberacao: "08/05/2024"
            },
            {
                nome: "JUSSARA BORGES (ATIVO)",
                dataNasc: "10/10/1970",
                parentesco: "FILHO(A)",
                contratoId: "1/2026",
                clienteCpf: "111.222.333-22",
                clienteDataNasc: "10/10/1970",
                clienteProfissao: "Empresária",
                clienteTelefone: "(11) 98765-4321",
                liberacao: "08/05/2024"
            }
        ];

        const filtrados = exemploAgregados.filter(a => a.nome.toLowerCase().includes(termo));
        if (filtrados.length > 0) {
            agregadosFiltrados.push(...filtrados);
        }
    }

    // Renderizar dropdown
    if (agregadosFiltrados.length === 0) {
        agregadoDropdown.innerHTML = '<div class="dropdown-item" style="padding: 10px; color: #999;">Nenhum resultado encontrado</div>';
    } else {
        agregadoDropdown.innerHTML = agregadosFiltrados.map((item, idx) => `
            <div class="dropdown-item" data-index="${idx}" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;">
                <strong>${item.nome}</strong>
                <br>
                <small style="color: #666;">Contrato: ${item.contratoId} | Parentesco: ${item.parentesco}</small>
            </div>
        `).join('');

        // Adicionar eventos aos itens
        document.querySelectorAll('.dropdown-item').forEach((item, idx) => {
            item.addEventListener('click', () => selecionarAgregado(agregadosFiltrados[idx]));
        });
    }

    agregadoDropdown.style.display = 'block';
}

function selecionarAgregado(agregado) {
    agregadoSelecionado = agregado;

    // Preencher campos
    agregadoBusca.value = agregado.nome;
    idContrato.value = agregado.contratoId;
    agregadoCpf.value = agregado.clienteCpf;
    agregadoDataNasc.value = formatarData(agregado.clienteDataNasc);
    agregadoParentesco.value = agregado.parentesco;
    agregadoLiberacao.value = formatarData(agregado.liberacao);
    
    // **NOVO**: Preencher status dinamicamente do contrato (somente leitura)
    if (agregado.status) {
        status.value = agregado.status;
    } else {
        // Buscar o contrato para obter o status
        const contratosRegistrados = JSON.parse(localStorage.getItem('contratosRegistrados') || '[]');
        const contratoEncontrado = contratosRegistrados.find(c => 
            (c.numeroContrato || c.numContrato || c.id) === agregado.contratoId
        );
        
        if (contratoEncontrado && contratoEncontrado.status) {
            status.value = contratoEncontrado.status;
        } else {
            status.value = 'ATIVO'; // Padrão
        }
    }

    agregadoDropdown.style.display = 'none';
    despesasAtendimento = [];
    atualizarTabelaDespesas();
    atualizarTotais();
}

// ===========================
// GERENCIAMENTO DE DESPESAS
// ===========================

function adicionarDespesa() {
    const descricao = descricaoDespesa.value.trim();
    const quantidade = parseFloat(quantidadeDespesa.value) || 1;
    const valorUnitario = parseFloat(valorUnitarioDespesa.value.replace('R$', '').replace(',', '.')) || 0;
    const valorTotal = quantidade * valorUnitario;

    if (!descricao) {
        alert('Por favor, descreva a despesa');
        return;
    }

    if (quantidade <= 0) {
        alert('Por favor, insira uma quantidade válida');
        return;
    }

    if (valorUnitario <= 0) {
        alert('Por favor, insira um valor unitário válido');
        return;
    }

    despesasAtendimento.push({
        id: Date.now(),
        descricao,
        quantidade,
        valorUnitario,
        valorTotal
    });

    // Limpar inputs
    descricaoDespesa.value = '';
    quantidadeDespesa.value = '1';
    valorUnitarioDespesa.value = '';
    valorTotalDespesa.value = '';

    atualizarTabelaDespesas();
    atualizarTotais();
}

function deletarDespesa(id) {
    despesasAtendimento = despesasAtendimento.filter(d => d.id !== id);
    atualizarTabelaDespesas();
    atualizarTotais();
}

function atualizarTabelaDespesas() {
    if (despesasAtendimento.length === 0) {
        despesasTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma despesa adicionada</td></tr>';
        return;
    }

    despesasTableBody.innerHTML = despesasAtendimento.map((despesa) => `
        <tr>
            <td>${despesa.descricao}</td>
            <td>${despesa.quantidade}</td>
            <td>${formatarMoeda(despesa.valorUnitario)}</td>
            <td>${formatarMoeda(despesa.valorTotal)}</td>
            <td>
                <button type="button" class="btn btn-delete" onclick="deletarDespesa(${despesa.id})">
                    [X]
                </button>
            </td>
        </tr>
    `).join('');
}

function atualizarTotais() {
    const totalGeral = despesasAtendimento.reduce((sum, d) => sum + d.valorTotal, 0);

    totalGeralCustos.textContent = formatarMoeda(totalGeral);

    atualizarValorDespesaCliente();
}

function atualizarValorDespesaCliente() {
    const custoCoberto = document.querySelector('input[name="custoCoberto"]:checked')?.value;
    const totalGeral = despesasAtendimento.reduce((sum, d) => sum + d.valorTotal, 0);

    if (custoCoberto === 'sim') {
        valorDespesaCliente.value = 'R$ 0,00';
    } else if (custoCoberto === 'nao') {
        valorDespesaCliente.value = formatarMoeda(totalGeral);
    } else {
        valorDespesaCliente.value = 'R$ 0,00';
    }
}

// ===========================
// GERAR PDF - ORÇAMENTO
// ===========================

function gerarPDF() {
    // Validações
    if (!agregadoSelecionado) {
        alert('Por favor, selecione um agregado');
        return;
    }

    if (!operacao.value) {
        alert('Por favor, selecione uma operação');
        return;
    }

    if (!dataAtendimento.value) {
        alert('Por favor, selecione a data do atendimento');
        return;
    }

    if (despesasAtendimento.length === 0) {
        alert('Por favor, adicione pelo menos uma despesa');
        return;
    }

    // Buscar configurações da empresa (logo e dados)
    const configEmpresa = JSON.parse(localStorage.getItem('configEmpresa') || '{}');
    const logoBase64 = localStorage.getItem('configLogomarca') || null;

    // Montar bloco de cabeçalho dinâmico
    const headerHtml = `
            <div class="header" style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #1B6B8C;padding-bottom:6px;margin-bottom:8px;">
                <div style="flex:0 0 96px;">
                    ${logoBase64 ? `<img src="${logoBase64}" style="max-width:96px;max-height:64px;object-fit:contain;">` : ''}
                </div>
                <div style="flex:1;text-align:left;">
                    <h2 style="margin:0;color:#1B6B8C;font-size:14px;">${configEmpresa.nomeEmpresa || ''}</h2>
                    <p style="margin:3px 0 0 0;color:#666;font-size:9px;">${configEmpresa.endereco || ''} ${configEmpresa.numero || ''} ${configEmpresa.cidade || ''} ${configEmpresa.estado || ''} ${configEmpresa.cep || ''}</p>
                    <p style="margin:3px 0 0 0;color:#666;font-size:9px;">Tel: ${configEmpresa.telefone || ''} | ${configEmpresa.email || ''}</p>
                </div>
                <div style="text-align:right;flex:0 0 220px;">
                    <h1 style="margin:0;color:#1B6B8C;font-size:14px;font-weight:700;">ORÇAMENTO DE ATENDIMENTO PÓSTUMO</h1>
                    <p style="margin:1px 0 0 0;color:#666;font-size:9px;">Autorização de Despesas</p>
                </div>
            </div>
    `;

    // Montar HTML do relatório
    const totalGeral = despesasAtendimento.reduce((sum, d) => sum + (d.valorTotal || 0), 0);
    const custoCoberto = document.querySelector('input[name="custoCoberto"]:checked')?.value || 'nao';
    
    const conteudoRelatorio = `
        <div style="font-family: Arial, sans-serif; width: 210mm; margin: 0; padding: 8mm; background: #fff; color: #000; box-sizing: border-box; line-height: 1.2;">
            
            <style>
                body, div { margin: 0; padding: 0; }
                .header { text-align: center; border-bottom: 2px solid #1B6B8C; padding-bottom: 6px; margin-bottom: 8px; }
                .header h1 { margin: 0; color: #1B6B8C; font-size: 14px; font-weight: bold; }
                .header p { margin: 1px 0 0 0; color: #666; font-size: 9px; }
                .secao { margin-bottom: 8px; page-break-inside: avoid; }
                .secao-titulo { background: #1B6B8C; color: white; padding: 3px 5px; margin: 0 0 4px 0; font-size: 10px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin: 0; }
                td, th { padding: 3px; border-bottom: 1px solid #ddd; font-size: 8px; margin: 0; }
                th { background: #f5f5f5; font-weight: bold; text-align: left; border-bottom: 1px solid #1B6B8C; }
                .label { font-size: 7px; font-weight: bold; color: #666; }
                .valor { font-size: 8px; color: #333; }
                .total-geral { background: #f0f0f0; border: 1px solid #1B6B8C; }
                .total-geral td { padding: 5px; font-weight: bold; font-size: 9px; }
                .assinaturas { margin-top: 15px; }
                .linha-assinatura { border-top: 1px solid #333; margin-top: 25px; padding-top: 2px; text-align: center; font-size: 7px; }
                .rodape { text-align: center; margin-top: 10px; padding-top: 6px; border-top: 1px solid #ddd; font-size: 7px; color: #999; }
                p { margin: 0; }
            </style>

            ${headerHtml}

            <div class="secao">
                <div class="secao-titulo">DADOS DO CONTRATO</div>
                <table>
                    <tr>
                        <td width="33%"><span class="label">ID DO CONTRATO:</span><br><span class="valor">${idContrato.value}</span></td>
                        <td width="33%"><span class="label">STATUS:</span><br><span class="valor">${status.value.toUpperCase()}</span></td>
                        <td width="34%"><span class="label">DATA DO ATENDIMENTO:</span><br><span class="valor">${formatarData(dataAtendimento.value)}</span></td>
                    </tr>
                </table>
            </div>

            <div class="secao">
                <div class="secao-titulo">DADOS DO AGREGADO/CLIENTE</div>
                <table>
                    <tr>
                        <td width="50%"><span class="label">NOME:</span><br><span class="valor">${agregadoSelecionado.nome}</span></td>
                        <td width="50%"><span class="label">CPF:</span><br><span class="valor">${agregadoCpf.value}</span></td>
                    </tr>
                    <tr>
                        <td><span class="label">DATA NASC.:</span><br><span class="valor">${agregadoDataNasc.value}</span></td>
                        <td><span class="label">PARENTESCO:</span><br><span class="valor">${agregadoParentesco.value}</span></td>
                    </tr>
                </table>
            </div>

            <div class="secao">
                <div class="secao-titulo">OPERAÇÃO</div>
                <table>
                    <tr>
                        <td><span class="label">TIPO:</span> ${operacao.value.toUpperCase()}</td>
                    </tr>
                    <tr>
                        <td><span class="label">DESCRIÇÃO:</span> ${descricaoAtendimento.value}</td>
                    </tr>
                </table>
            </div>

            <div class="secao">
                <div class="secao-titulo">DESPESAS DO ATENDIMENTO</div>
                <table>
                    <thead>
                        <tr>
                            <th width="45%">DESCRIÇÃO</th>
                            <th width="15%">QTD</th>
                            <th width="20%" style="text-align: right;">UNITÁRIO</th>
                            <th width="20%" style="text-align: right;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${despesasAtendimento.map(d => `
                        <tr>
                            <td>${d.descricao}</td>
                            <td style="text-align: center;">${d.quantidade}</td>
                            <td style="text-align: right;">${formatarMoeda(d.valorUnitario)}</td>
                            <td style="text-align: right;">${formatarMoeda(d.valorTotal)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="secao">
                <div class="secao-titulo">RESUMO</div>
                <table class="total-geral">
                    <tr>
                        <td style="text-align: right;">TOTAL GERAL:</td>
                        <td style="text-align: right;" width="100px">${formatarMoeda(totalGeral)}</td>
                    </tr>
                </table>
            </div>

            <div class="secao">
                <div class="secao-titulo">COBERTURA DO PLANO</div>
                <table>
                    <tr>
                        <td><span class="label">Coberto:</span> ${custoCoberto === 'sim' ? 'SIM' : 'NÃO'}</td>
                        <td><span class="label">Cliente paga:</span> ${valorDespesaCliente.value}</td>
                    </tr>
                </table>
            </div>

            <div class="assinaturas">
                <p style="font-size: 7px; color: #666; margin: 8px 0;">AUTORIZAÇÃO: Assinatura obrigatória</p>
                <table>
                    <tr>
                        <td width="45%">
                            <div class="linha-assinatura">Cliente</div>
                        </td>
                        <td width="10%"></td>
                        <td width="45%">
                            <div class="linha-assinatura">Responsável</div>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="rodape">
                <p>Válido por 7 dias | Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
        </div>
    `;

    // Criar HTML completo do PDF
    const htmlCompleto = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Orçamento</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: white; color: #000; line-height: 1.2; padding: 8mm; }
        .header { text-align: center; border-bottom: 2px solid #1B6B8C; padding-bottom: 6px; margin-bottom: 8px; }
        .header h1 { margin: 0; color: #1B6B8C; font-size: 14px; font-weight: bold; }
        .header p { margin: 1px 0 0 0; color: #666; font-size: 9px; }
        .secao { margin-bottom: 8px; page-break-inside: avoid; }
        .secao-titulo { background: #1B6B8C; color: white; padding: 3px 5px; margin: 0 0 4px 0; font-size: 10px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 0; }
        td, th { padding: 3px; border-bottom: 1px solid #ddd; font-size: 8px; }
        th { background: #f5f5f5; font-weight: bold; text-align: left; border-bottom: 1px solid #1B6B8C; }
        .label { font-size: 7px; font-weight: bold; color: #666; }
        .valor { font-size: 8px; color: #333; }
        .total-geral { background: #f0f0f0; border: 1px solid #1B6B8C; }
        .total-geral td { padding: 5px; font-weight: bold; font-size: 9px; }
        .linha-assinatura { border-top: 1px solid #333; margin-top: 25px; padding-top: 2px; text-align: center; font-size: 7px; }
        .rodape { text-align: center; margin-top: 10px; padding-top: 6px; border-top: 1px solid #ddd; font-size: 7px; color: #999; }
    </style>
</head>
<body>
    ${headerHtml}

    <div class="secao">
        <div class="secao-titulo">DADOS DO CONTRATO</div>
        <table>
            <tr>
                <td width="33%"><span class="label">ID DO CONTRATO:</span><br><span class="valor">${idContrato.value}</span></td>
                <td width="33%"><span class="label">STATUS:</span><br><span class="valor">${status.value.toUpperCase()}</span></td>
                <td width="34%"><span class="label">DATA DO ATENDIMENTO:</span><br><span class="valor">${formatarData(dataAtendimento.value)}</span></td>
            </tr>
        </table>
    </div>

    <div class="secao">
        <div class="secao-titulo">DADOS DO AGREGADO/CLIENTE</div>
        <table>
            <tr>
                <td width="50%"><span class="label">NOME:</span><br><span class="valor">${agregadoSelecionado.nome}</span></td>
                <td width="50%"><span class="label">CPF:</span><br><span class="valor">${agregadoCpf.value}</span></td>
            </tr>
            <tr>
                <td><span class="label">DATA NASC.:</span><br><span class="valor">${agregadoDataNasc.value}</span></td>
                <td><span class="label">PARENTESCO:</span><br><span class="valor">${agregadoParentesco.value}</span></td>
            </tr>
        </table>
    </div>

    <div class="secao">
        <div class="secao-titulo">OPERAÇÃO</div>
        <table>
            <tr>
                <td><span class="label">TIPO:</span> ${operacao.value.toUpperCase()}</td>
            </tr>
            <tr>
                <td><span class="label">DESCRIÇÃO:</span> ${descricaoAtendimento.value}</td>
            </tr>
        </table>
    </div>

    <div class="secao">
        <div class="secao-titulo">DESPESAS DO ATENDIMENTO</div>
        <table>
            <thead>
                <tr>
                    <th width="45%">DESCRIÇÃO</th>
                    <th width="15%">QTD</th>
                    <th width="20%" style="text-align: right;">UNITÁRIO</th>
                    <th width="20%" style="text-align: right;">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${despesasAtendimento.map(d => `
                <tr>
                    <td>${d.descricao}</td>
                    <td style="text-align: center;">${d.quantidade}</td>
                    <td style="text-align: right;">${formatarMoeda(d.valorUnitario)}</td>
                    <td style="text-align: right;">${formatarMoeda(d.valorTotal)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="secao">
        <div class="secao-titulo">RESUMO</div>
        <table class="total-geral">
            <tr>
                <td style="text-align: right;">TOTAL GERAL:</td>
                <td style="text-align: right;" width="100px">${formatarMoeda(totalGeral)}</td>
            </tr>
        </table>
    </div>

    <div class="secao">
        <div class="secao-titulo">COBERTURA DO PLANO</div>
        <table>
            <tr>
                <td><span class="label">Coberto:</span> ${custoCoberto === 'sim' ? 'SIM' : 'NÃO'}</td>
                <td><span class="label">Cliente paga:</span> ${valorDespesaCliente.value}</td>
            </tr>
        </table>
    </div>

    <div class="secao">
        <p style="font-size: 7px; color: #666; margin: 8px 0;"><strong>AUTORIZAÇÃO:</strong> Assinatura obrigatória</p>
        <table>
            <tr>
                <td width="45%">
                    <div class="linha-assinatura">Cliente</div>
                </td>
                <td width="10%"></td>
                <td width="45%">
                    <div class="linha-assinatura">Responsável</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="rodape">
        <p>Válido por 7 dias | Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>

    <script>
        window.print();
        setTimeout(() => window.close(), 1000);
    </script>
</body>
</html>
    `;

    // Abrir em janela nova
    const novaJanela = window.open('', '_blank', 'width=900,height=700');
    novaJanela.document.write(htmlCompleto);
    novaJanela.document.close();
}

// ===========================
// SALVAR ATENDIMENTO
// ===========================

function salvarAtendimento() {
    // Validações
    if (!agregadoSelecionado) {
        showError('Por favor, selecione um agregado');
        return;
    }

    if (!status.value) {
        showError('Por favor, selecione um status');
        return;
    }

    if (!operacao.value) {
        showError('Por favor, selecione uma operação');
        return;
    }

    if (!dataAtendimento.value) {
        showError('Por favor, selecione a data do atendimento');
        return;
    }

    if (!descricaoAtendimento.value.trim()) {
        showError('Por favor, descreva o atendimento');
        return;
    }

    if (despesasAtendimento.length === 0) {
        showError('Por favor, adicione pelo menos uma despesa');
        return;
    }

    const editIndex = formAtendimento.dataset.editIndex;
    const atendimentos = JSON.parse(localStorage.getItem('atendimentosRegistrados') || '[]');

    // Criar objeto de atendimento
    const atendimento = {
        id: editIndex !== undefined ? atendimentos[parseInt(editIndex)].id : Date.now(),
        idContrato: idContrato.value,
        status: status.value,
        agregadoNome: agregadoSelecionado.nome,
        agregadoCpf: agregadoCpf.value,
        agregadoDataNasc: agregadoDataNasc.value,
        agregadoParentesco: agregadoParentesco.value,
        agregadoLiberacao: agregadoLiberacao.value,
        operacao: operacao.value,
        dataAtendimento: dataAtendimento.value,
        descricaoAtendimento: descricaoAtendimento.value,
        despesas: [...despesasAtendimento],
        custoCoberto: document.querySelector('input[name="custoCoberto"]:checked')?.value,
        valorDespesaCliente: valorDespesaCliente.value,
        totalGeralCustos: totalGeralCustos.textContent.replace('R$ ', '').replace(',', '.'),
        dataCadastro: new Date().toISOString()
    };

    // Salvar ou atualizar
    if (editIndex !== undefined && editIndex !== '') {
        atendimentos[parseInt(editIndex)] = atendimento;
        delete formAtendimento.dataset.editIndex;
        showSuccess('Atendimento atualizado com sucesso!');
    } else {
        atendimentos.push(atendimento);
        showSuccess('Atendimento registrado com sucesso!');
    }

    localStorage.setItem('atendimentosRegistrados', JSON.stringify(atendimentos));

    // Habilitar botão de impressão após salvar
    btnGerarPDF.disabled = false;
    console.log('[ATENDIMENTO] Botão Imprimir habilitado após salvar');

    // Voltar à lista
    setTimeout(showLista, 1500);
}

function cancelarFormulario() {
    formAtendimento.reset();
    agregadoBusca.value = '';
    idContrato.value = '';
    status.value = '';
    agregadoCpf.value = '';
    agregadoDataNasc.value = '';
    agregadoParentesco.value = '';
    agregadoLiberacao.value = '';
    operacao.value = '';
    dataAtendimento.value = '';
    descricaoAtendimento.value = '';
    descricaoDespesa.value = '';
    quantidadeDespesa.value = '1';
    valorUnitarioDespesa.value = '';
    valorTotalDespesa.value = '';
    despesasAtendimento = [];
    atualizarTabelaDespesas();
    atualizarTotais();
    agregadoSelecionado = null;
    delete formAtendimento.dataset.editIndex;
    showLista();
}

// ===========================
// UTILITÁRIOS
// ===========================

function formatarMoeda(valor) {
    // Garantir que seja um número
    const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(numero);
}

function formatarData(data) {
    if (!data) return '';
    try {
        const date = new Date(data + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    } catch (e) {
        console.error('Erro ao formatar data:', e);
        return data;
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

function logout() {
    window.authManager.logout();
    window.location.href = '/index.html';
}
// ===========================
// GERENCIAMENTO DE VISUALIZAÇÃO (Lista vs Formulário)
// ===========================

const viewLista = document.getElementById('viewLista');
const viewFormulario = document.getElementById('viewFormulario');
const btnNovoAtendimento = document.getElementById('btnNovoAtendimento');

function showLista() {
    if (viewLista) viewLista.classList.add('active');
    if (viewFormulario) viewFormulario.classList.remove('active');
    carregarAtendimentos();
}

function showFormulario() {
    if (viewLista) viewLista.classList.remove('active');
    if (viewFormulario) viewFormulario.classList.add('active');
    // Resetar formulário para novo atendimento
    if (formAtendimento) formAtendimento.reset();
    despesasAtendimento = [];
    atualizarTabelaDespesas();
    atualizarTotais();
    // Desabilitar botão de impressão até salvar
    btnGerarPDF.disabled = true;
    console.log('[ATENDIMENTO] Botão Imprimir desabilitado ao abrir formulário');
}

// Botão Novo Atendimento
if (btnNovoAtendimento) {
    btnNovoAtendimento.addEventListener('click', showFormulario);
}

// Botão Cancelar
if (btnCancelar) {
    btnCancelar.addEventListener('click', showLista);
}

// ===========================
// CARREGAR ATENDIMENTOS NA LISTA
// ===========================

function carregarAtendimentos() {
    const atendimentos = JSON.parse(localStorage.getItem('atendimentosRegistrados') || '[]');
    const tbody = document.querySelector('.atendimentos-table tbody');
    
    if (!tbody) return;
    
    if (atendimentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum atendimento registrado</td></tr>';
        return;
    }

    tbody.innerHTML = atendimentos.map((atendimento, index) => {
        const totalDespesas = parseFloat(atendimento.totalGeralCustos || 0).toFixed(2);
        const dataFormatada = atendimento.dataAtendimento ? new Date(atendimento.dataAtendimento).toLocaleDateString('pt-BR') : '-';
        
        return `
            <tr>
                <td>${dataFormatada}</td>
                <td>${atendimento.agregadoNome || '-'}</td>
                <td>${atendimento.idContrato || '-'}</td>
                <td>${atendimento.operacao || '-'}</td>
                <td>R$ ${totalDespesas}</td>
                <td>${atendimento.descricaoAtendimento ? atendimento.descricaoAtendimento.substring(0, 50) + '...' : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="editarAtendimento(${index})" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="excluirAtendimento(${index})" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===========================
// EDITAR ATENDIMENTO
// ===========================

function editarAtendimento(index) {
    const atendimentos = JSON.parse(localStorage.getItem('atendimentosRegistrados') || '[]');
    const atendimento = atendimentos[index];
    
    if (!atendimento) {
        showError('Atendimento não encontrado');
        return;
    }

    // Preencher formulário
    agregadoBusca.value = atendimento.agregadoNome || '';
    agregadoCpf.value = atendimento.agregadoCpf || '';
    agregadoDataNasc.value = atendimento.agregadoDataNasc || '';
    agregadoParentesco.value = atendimento.agregadoParentesco || '';
    agregadoLiberacao.value = atendimento.agregadoLiberacao || '';
    idContrato.value = atendimento.idContrato || '';
    status.value = atendimento.status || '';
    operacao.value = atendimento.operacao || '';
    dataAtendimento.value = atendimento.dataAtendimento || '';
    descricaoAtendimento.value = atendimento.descricaoAtendimento || '';
    
    // Restaurar despesas
    despesasAtendimento = atendimento.despesas ? [...atendimento.despesas] : [];
    atualizarTabelaDespesas();
    atualizarTotais();
    
    // Guardar índice para atualização
    formAtendimento.dataset.editIndex = index;
    
    // Mostrar formulário
    showFormulario();
}

// ===========================
// EXCLUIR ATENDIMENTO
// ===========================

function excluirAtendimento(index) {
    showConfirmModal('Deseja realmente excluir este atendimento?', () => {
        const atendimentos = JSON.parse(localStorage.getItem('atendimentosRegistrados') || '[]');
        atendimentos.splice(index, 1);
        localStorage.setItem('atendimentosRegistrados', JSON.stringify(atendimentos));
        carregarAtendimentos();
        showSuccess('Atendimento excluído com sucesso!');
    });
}

// Inicializar lista ao carregar página
document.addEventListener('DOMContentLoaded', () => {
    showLista();
}, { once: true });