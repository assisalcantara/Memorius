// Sistema de Autenticação - dados de usuários

const users = [
    {
        id: 1,
        email: 'admin@legacyflow.com',
        senha: '123456',
        empresa: 'SOCIEDADE ETERNA PAZ',
        responsavel: 'Administrator',
        tipo: 'admin'
    },
    {
        id: 2,
        email: 'usuario@legacyflow.com',
        senha: '123456',
        empresa: 'FUNERÁRIA EXEMPLO',
        responsavel: 'João Silva',
        tipo: 'usuario'
    }
];

// Classe para gerenciar autenticação
class AuthManager {
    constructor() {
        this.storageKey = 'legacyflow_user';
    }

    /**
     * Fazer login com email e senha
     */
    login(email, senha) {
        const user = users.find(u => u.email === email && u.senha === senha);
        
        if (user) {
            const userData = {
                id: user.id,
                email: user.email,
                empresa: user.empresa,
                responsavel: user.responsavel,
                tipo: user.tipo,
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(userData));
            
            // Iniciar sessão com timestamp (para timeout de 30 minutos)
            localStorage.setItem('sessionTime', new Date().getTime().toString());
            
            // Adicionar currentUser para compatibilidade com routeGuard.js
            localStorage.setItem('currentUser', user.email);
            
            return { success: true, user: userData };
        }
        
        return { success: false, message: 'Email ou senha inválidos' };
    }

    /**
     * Fazer logout
     */
    logout() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem('sessionTime');
        localStorage.removeItem('currentUser');
        return true;
    }

    /**
     * Obter usuário atual
     */
    getCurrentUser() {
        const userData = localStorage.getItem(this.storageKey);
        return userData ? JSON.parse(userData) : null;
    }

    /**
     * Verificar se usuário está autenticado
     */
    isAuthenticated() {
        return this.getCurrentUser() !== null;
    }

    /**
     * Registrar novo usuário (cadastro)
     */
    register(empresa, responsavel, cpf, whatsapp, email, senha) {
        const existingUser = users.find(u => u.email === email);
        
        if (existingUser) {
            return { success: false, message: 'Email já cadastrado' };
        }

        const newUser = {
            id: users.length + 1,
            email: email,
            senha: senha,
            empresa: empresa,
            responsavel: responsavel,
            cpf: cpf,
            whatsapp: whatsapp,
            tipo: 'usuario'
        };

        users.push(newUser);
        
        // Auto-login após cadastro
        const userData = {
            id: newUser.id,
            email: newUser.email,
            empresa: newUser.empresa,
            responsavel: newUser.responsavel,
            tipo: newUser.tipo,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem(this.storageKey, JSON.stringify(userData));
        
        // Iniciar sessão com timestamp (para timeout de 30 minutos)
        localStorage.setItem('sessionTime', new Date().getTime().toString());
        
        // Adicionar currentUser para compatibilidade com routeGuard.js
        localStorage.setItem('currentUser', newUser.email);
        
        return { success: true, user: userData };
    }
}

// Exportar para uso global
window.authManager = new AuthManager();

// ===========================
// DADOS DE TESTE
// ===========================

// Função para inicializar dados de teste
function initTestData() {
    // Verificar se já existe dados
    if (!localStorage.getItem('planosRegistrados')) {
        const planosDefault = [
            {
                id: 1,
                nome: 'Plano Básico Familiar',
                descricao: 'Cobertura básica para até 5 dependentes',
                valorMensal: 150.00,
                coberturaBasica: 'Velório, Sepultamento, Translado Local',
                coberturaAdicional: 'Flores, Registro, Urna Simples',
                limiteDependentes: 5,
                status: 'Ativo',
                dataCadastro: '2026-01-15'
            }
        ];
        localStorage.setItem('planosRegistrados', JSON.stringify(planosDefault));
        console.log('[AUTH] Plano de teste criado');
    }

    if (!localStorage.getItem('clientesRegistrados')) {
        const clientesDefault = [
            {
                id: 1,
                nomeCompleto: 'Maria da Silva Santos',
                cpf: '123.456.789-00',
                rg: '12.345.678-9',
                dataNascimento: '1960-05-20',
                telefone: '(11) 98765-4321',
                email: 'maria.silva@email.com',
                cep: '01310-100',
                logradouro: 'Av. Paulista',
                numero: '1000',
                complemento: 'Apto 101',
                bairro: 'Bela Vista',
                cidade: 'São Paulo',
                estado: 'SP',
                status: 'Ativo',
                dataCadastro: '2026-01-20'
            }
        ];
        localStorage.setItem('clientesRegistrados', JSON.stringify(clientesDefault));
        console.log('[AUTH] Cliente de teste criado');
    }

    if (!localStorage.getItem('contratosRegistrados')) {
        const contratosDefault = [
            {
                id: 1,
                numeroContrato: '2026001',
                clienteId: 1,
                clienteNome: 'Maria da Silva Santos',
                planoId: 1,
                planoNome: 'Plano Básico Familiar',
                dataInicio: '2026-01-20',
                status: 'Ativo',
                agregados: [
                    {
                        id: 1,
                        nome: 'João Silva Santos',
                        cpf: '987.654.321-00',
                        dataNascimento: '1958-08-10',
                        parentesco: 'Cônjuge',
                        liberacao: 'Sim'
                    },
                    {
                        id: 2,
                        nome: 'Ana Paula Santos',
                        cpf: '111.222.333-44',
                        dataNascimento: '1985-03-15',
                        parentesco: 'Filha',
                        liberacao: 'Sim'
                    }
                ]
            }
        ];
        localStorage.setItem('contratosRegistrados', JSON.stringify(contratosDefault));
        console.log('[AUTH] Contrato de teste criado com agregados');
    }
}

// Inicializar dados de teste ao carregar
initTestData();
