# 🔒 Proteção de Rotas - LegacyFlow

**Data:** 30 de janeiro de 2026
**Versão:** 1.0

---

## 📋 O Que Foi Implementado

### Proteção Client-Side de Rotas
Sistema de autenticação e autorização que impede acesso a páginas protegidas sem login.

**Arquivo Principal:** `js/routeGuard.js`

---

## 🛡️ Como Funciona

### 1. **Arquivo `routeGuard.js`**
- Executado **automaticamente** no início de cada página protegida
- Verifica se há usuário logado em `localStorage`
- Valida se a sessão não expirou (timeout: 30 minutos)
- Redireciona para `/index.html` se não autorizado

### 2. **Timeout de Sessão**
- Duração: **30 minutos**
- Chave: `sessionTime`
- Atualizado a cada acesso de página
- Se usuário fica inativo + 30 min, sessão expira

### 3. **Integração com Auth**
Ao fazer login (em `js/auth.js`), são criadas 3 entradas no localStorage:
```javascript
localStorage.setItem('legacyflow_user', JSON.stringify(userData));  // Dados do usuário
localStorage.setItem('sessionTime', now.toString());                // Timestamp da sessão
localStorage.setItem('currentUser', email);                          // Email para routeGuard
```

### 4. **Logout Completo**
Ao fazer logout, todas as sessões são limpas:
```javascript
localStorage.removeItem('legacyflow_user');
localStorage.removeItem('sessionTime');
localStorage.removeItem('currentUser');
```

---

## 📄 Páginas Protegidas

Todas as seguintes páginas têm proteção automática:

✅ `/dashboard.html`
✅ `/funcionarios.html`
✅ `/planos.html`
✅ `/clientes.html`
✅ `/contratos.html`
✅ `/atendimento.html`
✅ (Todas as futuras páginas protegidas)

---

## 🚀 Como Usar

### Para o Usuário
1. Acessar `http://localhost:8000`
2. Fazer login com credenciais válidas
3. Acessar qualquer página do sistema
4. Sessão expira em 30 minutos sem atividade
5. Fazer logout para limpar sessão

### Para o Desenvolvedor

#### Proteger uma Nova Página
Adicione esta linha logo após `<body>`:

```html
<body>
    <!-- Proteção de Rota -->
    <script src="/js/routeGuard.js"></script>
    
    <!-- Resto do conteúdo -->
</body>
```

#### NÃO Proteger uma Página
Se precisar de uma página pública (como login, termo de serviço, etc), simplesmente **não adicione** o script `routeGuard.js`.

#### Resetar Sessão Manualmente
```javascript
// Limpar tudo
localStorage.clear();

// Ou apenas sessão
localStorage.removeItem('sessionTime');
localStorage.removeItem('currentUser');
```

---

## ⚠️ Limitações (Client-Side Only)

**IMPORTANTE:** Esta é uma proteção **client-side**. Usuários técnicos podem:
- Acessar localStorage via console
- Modificar dados no navegador
- Contornar a proteção manualmente

**Para segurança REAL**, seria necessário:
- ✅ Backend (Node.js, PHP, Python, etc)
- ✅ JWT tokens ou Sessions autenticadas
- ✅ Banco de dados com validação
- ✅ HTTPS para transmissão segura
- ✅ Rate limiting e proteção contra força bruta

---

## 🧪 Testando a Proteção

### Teste 1: Acesso sem Login
1. Abra nova aba incógnita/privada
2. Tente acessar `http://localhost:8000/dashboard.html`
3. **Resultado esperado:** Redireciona para `/index.html`

### Teste 2: Timeout de Sessão
1. Faça login normalmente
2. Aguarde ~30 minutos (ou altere `SESSION_TIMEOUT` em routeGuard.js para 10s para teste)
3. Tente acessar outra página
4. **Resultado esperado:** Redireciona para login

### Teste 3: Logout
1. Faça login
2. Clique em Logout
3. Tente acessar qualquer página protegida diretamente
4. **Resultado esperado:** Redireciona para `/index.html`

---

## 📊 localStorage Keys

| Chave | Propósito | Exemplo |
|-------|-----------|---------|
| `legacyflow_user` | Dados do usuário | `{email, empresa, responsavel, tipo}` |
| `currentUser` | Email para routeGuard | `"admin@legacyflow.com"` |
| `sessionTime` | Timestamp da sessão | `"1706573400000"` |

---

## 🔐 Credenciais Padrão

```
Admin:
Email: admin@legacyflow.com
Senha: 123456

Usuário:
Email: usuario@legacyflow.com
Senha: 123456
```

---

## 📝 Logs do Console

Quando acessa uma página protegida, verá:
```
✅ Rota protegida autorizada
👤 Usuário: admin@legacyflow.com
⏱️ Sessão válida até: 14:30:45
```

Se acesso negado:
```
❌ Acesso negado: Usuário não autenticado
```

Se sessão expirada:
```
⏰ Sessão expirada
```

---

## 🎯 Próximas Melhorias

- [ ] Implementar backend API com autenticação real
- [ ] JWT tokens em vez de localStorage
- [ ] Banco de dados para usuários
- [ ] HTTPS obrigatório em produção
- [ ] Rate limiting para login
- [ ] 2FA (autenticação dupla)
- [ ] Audit log de acessos
- [ ] Renovação automática de token

---

## 📞 Suporte

Dúvidas ou problemas? Verifique:
1. Console do navegador (F12) para mensagens de erro
2. localStorage (F12 > Application > Local Storage) para dados
3. LISTA_DE_IMPLEMENTACOES.md para histórico de mudanças
