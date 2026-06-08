// Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('[DASHBOARD] DOMContentLoaded disparado');
    console.log('[DASHBOARD] window.authManager existe?', typeof window.authManager);
    console.log('[DASHBOARD] localStorage:', localStorage.getItem('legacyflow_user'));
    
    // Verificar se usuário está autenticado
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.log('[DASHBOARD] NÃO AUTENTICADO - Redirecionando...');
        window.location.href = './index.html';
        return;
    }
    
    console.log('[DASHBOARD] AUTENTICADO - Carregando dashboard');
    // Carregar dados do usuário
    loadUserData();
    initializeDropdowns();
    setupLogout();
});

function loadUserData() {
    const user = window.authManager.getCurrentUser();
    
    if (user) {
        // Atualizar nome da empresa no header
        const companyNameElement = document.querySelector('.company-name');
        if (companyNameElement) {
            companyNameElement.textContent = user.empresa;
        }

        // Atualizar nome do usuário no header
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = user.responsavel;
        }

        // Atualizar data em tempo real
        updateDateTime();

        console.log('Usuário logado:', user);
    }
}

function toggleSubmenu(menuItem, submenu) {
    menuItem.classList.toggle('active');
    submenu.classList.toggle('active');

    if (submenu.style.display === 'none' || submenu.style.display === '') {
        submenu.style.display = 'block';
    } else {
        submenu.style.display = 'none';
    }
}

function initializeDropdowns() {
    const headerItems = document.querySelectorAll('.header-item');

    headerItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Dropdown clicked:', this.textContent);
            // Aqui você pode adicionar lógica para abrir dropdowns
        });
    });
}

// Função para navegar para diferentes seções
function navigateTo(section) {
    console.log('Navigating to:', section);
    // Aqui você pode adicionar lógica de navegação
}

// Simulando dados para os widgets
function updateDashboardData() {
    const stats = {
        totalCadastradas: 0,
        totalVencidas: 0,
        totalAVencer: 0
    };

    // Você pode fazer requisições à API aqui
    console.log('Dashboard data:', stats);
}

// Atualizar data e hora do header em tempo real
function updateDateTime() {
    const welcomeText = document.querySelector('.welcome-text');
    if (welcomeText) {
        const today = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const dateStr = today.toLocaleDateString('pt-BR', options);
        const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

        const companyName = document.querySelector('.company-name');
        welcomeText.innerHTML = `Bem-vindo <span class="company-name">${companyName.textContent}</span>. ${capitalizedDate}`;
    }
}

// Chamar ao carregar
updateDateTime();

// Links dos menus
document.addEventListener('click', function(e) {
    const submenuItems = e.target.closest('.submenu-item');
    if (submenuItems) {
        e.preventDefault();
        const href = submenuItems.getAttribute('href');
        console.log('Menu item clicked:', submenuItems.textContent, 'href:', href);
        // Aqui você pode implementar a navegação real
    }
});

function setupLogout() {
    const userMenu = document.getElementById('userMenu');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userMenu && userDropdown) {
        userMenu.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            performLogout();
        });
    }

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', function(e) {
        if (userDropdown && !e.target.closest('#userMenu') && !e.target.closest('#userDropdown')) {
            userDropdown.style.display = 'none';
        }
    });
}

function performLogout() {
    window.authManager.logout();
    showSuccess('Você foi desconectado com sucesso!', 'Logout');
    setTimeout(() => {
        window.location.href = './index.html';
    }, 1500);
}
