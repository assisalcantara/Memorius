/**
 * Route Guard - Proteção de Rotas
 * Verifica se usuário está autenticado antes de acessar páginas protegidas
 * Implementa timeout de sessão (30 minutos)
 * 
 * Incluir no topo do <body> de toda página protegida:
 * <script src="/js/routeGuard.js"></script>
 */

(function() {
    'use strict';
    
    // Configurações
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos em ms
    const SESSION_TIME_KEY = 'sessionTime';
    const CURRENT_USER_KEY = 'currentUser';
    const LOGIN_PAGE = '/index.html';
    
    // Verificar se usuário está autenticado
    const currentUser = localStorage.getItem(CURRENT_USER_KEY);
    const sessionTime = localStorage.getItem(SESSION_TIME_KEY);
    const now = new Date().getTime();
    
    // Se não tem usuário logado, redirecionar
    if (!currentUser) {
        console.warn('❌ Acesso negado: Usuário não autenticado');
        window.location.href = LOGIN_PAGE;
        return;
    }
    
    // Se sessão expirou, limpar e redirecionar
    if (sessionTime && (now - parseInt(sessionTime) > SESSION_TIMEOUT)) {
        console.warn('⏰ Sessão expirada');
        localStorage.clear();
        window.location.href = LOGIN_PAGE;
        return;
    }
    
    // Atualizar timestamp da sessão (user ainda está ativo)
    localStorage.setItem(SESSION_TIME_KEY, now.toString());
    
    console.log('✅ Rota protegida autorizada');
    console.log(`👤 Usuário: ${currentUser}`);
    console.log(`⏱️ Sessão válida até: ${new Date(now + SESSION_TIMEOUT).toLocaleTimeString('pt-BR')}`);
    
    // Evento global: se página perde foco por mais de 30 min, sessão expira ao voltar
    window.addEventListener('focus', function() {
        const lastTime = localStorage.getItem(SESSION_TIME_KEY);
        const currentTime = new Date().getTime();
        
        if (lastTime && (currentTime - parseInt(lastTime) > SESSION_TIMEOUT)) {
            console.warn('⏰ Sessão expirada enquanto abava inativo');
            localStorage.clear();
            window.location.href = LOGIN_PAGE;
        }
    });
    
})();
