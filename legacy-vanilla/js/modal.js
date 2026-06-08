// ============ CUSTOM MODAL SYSTEM ============

// Criar estrutura HTML do modal se não existir
function initCustomModal() {
    if (!document.getElementById('customModal')) {
        const modalHTML = `
            <div id="customModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-logo">
                            <img src="img/logo03.png" alt="LegacyFlow" onerror="this.style.display='none'">
                        </div>
                        <h2 class="modal-title" id="modalTitle">Mensagem</h2>
                    </div>
                    <div class="modal-body" id="modalBody"></div>
                    <div class="modal-footer" id="modalFooter">
                        <button class="modal-btn modal-btn-primary" id="modalBtnOk">OK</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

// Mostrar modal customizado
function showCustomModal(message, type = 'info', title = null, buttons = null) {
    initCustomModal();
    
    const modal = document.getElementById('customModal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const modalFooter = document.getElementById('modalFooter');
    const modalContent = modal.querySelector('.modal-content');
    
    // Limpar classes anteriores
    modalContent.className = 'modal-content';
    modalContent.classList.add(`modal-${type}`);
    
    // Definir títulos padrão
    const titles = {
        'success': '✓ Sucesso',
        'error': '✗ Erro',
        'info': 'ℹ Informação',
        'warning': '⚠ Aviso',
        'confirm': '❓ Confirmação'
    };
    
    modalTitle.textContent = title || titles[type] || 'Mensagem';
    modalBody.textContent = message;
    
    // Limpar footer anterior
    modalFooter.innerHTML = '';
    modalFooter.className = 'modal-footer';
    
    // Adicionar botões
    if (buttons && Array.isArray(buttons)) {
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `modal-btn modal-btn-${btn.type || 'primary'}`;
            button.textContent = btn.text;
            button.onclick = () => {
                if (btn.callback) btn.callback();
                closeCustomModal();
            };
            modalFooter.appendChild(button);
        });
    } else {
        // Botão padrão
        const btnOk = document.createElement('button');
        btnOk.className = 'modal-btn modal-btn-primary';
        btnOk.textContent = 'OK';
        btnOk.onclick = closeCustomModal;
        modalFooter.appendChild(btnOk);
    }
    
    // Mostrar modal
    modal.classList.add('active');
    
    // Fechar ao clicar fora (em background)
    modal.onclick = (e) => {
        if (e.target === modal) closeCustomModal();
    };
}

// Fechar modal customizado
function closeCustomModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Confirmação customizada
function showConfirmModal(message, onConfirm, onCancel = null, title = null) {
    showCustomModal(message, 'confirm', title || 'Confirmação', [
        {
            text: 'Confirmar',
            type: 'primary',
            callback: onConfirm
        },
        {
            text: 'Cancelar',
            type: 'secondary',
            callback: onCancel
        }
    ]);
}

// Alerta simples
function showAlert(message, type = 'info') {
    showCustomModal(message, type);
}

// Sucesso
function showSuccess(message, title = null) {
    showCustomModal(message, 'success', title);
}

// Erro
function showError(message, title = null) {
    showCustomModal(message, 'error', title);
}

// Aviso
function showWarning(message, title = null) {
    showCustomModal(message, 'warning', title);
}

// Info
function showInfo(message, title = null) {
    showCustomModal(message, 'info', title);
}

// Substituir confirm() nativo
function customConfirm(message) {
    return new Promise((resolve) => {
        showConfirmModal(message, () => resolve(true), () => resolve(false));
    });
}

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', initCustomModal);
