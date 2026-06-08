// Sistema de Login - LegacyFlow

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const btnSignup = document.querySelector('.btn-signup');
    const btnVoltar = document.getElementById('btnVoltar');
    const loginContainer = document.querySelector('.login-container');
    const signupContainer = document.getElementById('signupContainer');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    if (btnSignup) {
        btnSignup.addEventListener('click', function(e) {
            e.preventDefault();
            toggleForms();
        });
    }

    if (btnVoltar) {
        btnVoltar.addEventListener('click', function(e) {
            e.preventDefault();
            toggleForms();
        });
    }

    // Validação em tempo real
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');

    if (emailInput) {
        emailInput.addEventListener('blur', validateEmail);
        emailInput.addEventListener('input', function() {
            this.classList.remove('input-error');
        });
    }

    if (senhaInput) {
        senhaInput.addEventListener('input', function() {
            this.classList.remove('input-error');
        });
    }
});

function toggleForms() {
    const loginContainer = document.querySelector('.login-container');
    const signupContainer = document.getElementById('signupContainer');
    
    if (loginContainer.style.display === 'none') {
        loginContainer.style.display = 'flex';
        signupContainer.style.display = 'none';
    } else {
        loginContainer.style.display = 'none';
        signupContainer.style.display = 'flex';
    }
}

function validateEmail(e) {
    const email = e.target.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        e.target.classList.add('input-error');
        return false;
    }
    return true;
}

function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    // Validação básica
    if (!email || !senha) {
        showAlert('Por favor, preencha todos os campos', 'error');
        return;
    }

    if (!validateEmail({ target: document.getElementById('email') })) {
        showAlert('E-mail inválido', 'error');
        return;
    }

    if (senha.length < 6) {
        showAlert('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }

    // Autenticar usando o AuthManager
    showAlert('Autenticando...', 'info');
    
    setTimeout(() => {
        const result = window.authManager.login(email, senha);
        
        if (result.success) {
            console.log('Login bem-sucedido para:', result.user.empresa);
            showAlert('Login realizado com sucesso!', 'success');
            
            // Redirecionar para dashboard após 1.5s
            setTimeout(() => {
                window.location.href = './dashboard.html';
            }, 1500);
        } else {
            showAlert('Email ou senha inválidos', 'error');
        }
    }, 1000);
}

function handleSignup(e) {
    e.preventDefault();

    const empresa = document.getElementById('empresa').value.trim();
    const responsavel = document.getElementById('responsavel').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const senha = document.getElementById('signup-senha').value;
    const confirmaSenha = document.getElementById('confirma-senha').value;

    // Validação básica
    if (!empresa || !responsavel || !cpf || !whatsapp || !email || !senha || !confirmaSenha) {
        showAlert('Por favor, preencha todos os campos', 'error');
        return;
    }

    if (!validateEmail({ target: document.getElementById('signup-email') })) {
        showAlert('E-mail inválido', 'error');
        return;
    }

    if (senha.length < 6) {
        showAlert('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }

    if (senha !== confirmaSenha) {
        showAlert('As senhas não conferem', 'error');
        return;
    }

    // Registrar usando o AuthManager
    showAlert('Registrando novo acesso...', 'info');
    
    setTimeout(() => {
        const result = window.authManager.register(empresa, responsavel, cpf, whatsapp, email, senha);
        
        if (result.success) {
            console.log('Cadastro realizado para:', result.user.empresa);
            showAlert('Cadastro realizado com sucesso! Acesso de 7 dias concedido!', 'success');
            
            // Redirecionar para dashboard após 2s
            setTimeout(() => {
                window.location.href = './dashboard.html';
            }, 2000);
        } else {
            showAlert(result.message, 'error');
        }
    }, 1000);
}

function showAlert(message, type = 'info') {
    // Remover alerta anterior se existir
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Estilos inline para o alerta
    Object.assign(alertDiv.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '8px',
        color: '#fff',
        fontWeight: '600',
        zIndex: '9999',
        animation: 'slideInAlert 0.3s ease-out',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        fontSize: '14px',
        maxWidth: '350px'
    });

    // Cores do alerta
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        info: '#2196F3'
    };

    alertDiv.style.backgroundColor = colors[type] || colors.info;
    document.body.appendChild(alertDiv);

    // Remover alerta após 3 segundos
    setTimeout(() => {
        alertDiv.style.animation = 'slideOutAlert 0.3s ease-out';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

// Adicionar estilos de animação ao documento
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInAlert {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutAlert {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .input-error {
        border-color: #f44336 !important;
        box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2) !important;
    }
`;
document.head.appendChild(style);

// Sistema de roteamento (para páginas futuras)
const Router = {
    routes: {
        '/': 'index.html',
        '/dashboard': 'dashboard.html',
        '/usuarios': 'usuarios.html',
        '/funerais': 'funerais.html',
        '/configuracoes': 'configuracoes.html'
    },

    navigate(path) {
        if (this.routes[path]) {
            window.location.href = this.routes[path];
        } else {
            console.warn('Rota não encontrada:', path);
        }
    },

    getCurrentPath() {
        return window.location.pathname;
    }
};

// Exportar Router para uso global
window.Router = Router;
