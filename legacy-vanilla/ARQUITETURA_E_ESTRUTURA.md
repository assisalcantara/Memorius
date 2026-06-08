# LegacyFlow - Arquitetura e Estrutura do Projeto

## 1. VISÃO GERAL
**Projeto:** Sistema de Gestão para Funerárias (LegacyFlow)
**Objetivo:** Gerenciar clientes, funcionários, planos, contratos e operações financeiras de empresas funerárias
**Data de Início:** 26 de Janeiro de 2026
**Stack:** Frontend - HTML5, CSS3, Vanilla JavaScript (sem frameworks)

---

## 2. ESTRUTURA DE PASTAS

---

## 14. GERAÇÃO DE RELATÓRIOS E IMPRESSÃO (ATUALIZAÇÃO - 31/01/2026)

- Abordagem atualizada: a geração de orçamentos/relatórios foi alterada para usar uma nova janela HTML + `window.print()` em vez de bibliotecas como `html2pdf.js` e `html2canvas` que se mostraram instáveis.

- Vantagens:
  - Renderização nativa do navegador — elimina problemas com elementos ocultos (opacity/visibility) que causavam PDFs em branco.
  - Maior compatibilidade entre navegadores e fidelidade WYSIWYG.
  - Permite injetar corretamente cabeçalho com logomarca e dados da empresa antes de imprimir.

- Arquivos afetados:
  - `js/atendimento.js` — função `gerarPDF()` reescrita para montar documento HTML completo, injetar cabeçalho dinâmico e chamar `window.print()`.
  - `configuracoes.html`, `js/configuracoes.js` — novas fontes de dados (`configEmpresa`, `configLogomarca`) usadas pelo gerador de relatório.
  - `css/atendimento.css` — ajustes de estilo do botão de impressão e estilos de impressão gerais.

- Cabeçalho dinâmico:
  - Busca `configEmpresa` (dados da empresa) e `configLogomarca` (base64) em `localStorage`.
  - Insere logo (se existir) e dados (nome, endereço, telefone, email) no topo do HTML do relatório.

Observação: testar impressão em diferentes navegadores (Chrome, Edge, Firefox) e ajustar margens em `@media print` se necessário.

```
legacyflow/
├── index.html                    (Página de login)
├── dashboard.html                (Dashboard principal - hub de navegação)
├── funcionarios.html             (Gestão de funcionários)
├── planos.html                   (Gestão de planos/serviços)
├── clientes.html                 (Gestão de clientes)
├── contratos.html                (Gestão de contratos)
├── atendimento.html              (NÃO CRIADO - Future)
├── obituario.html                (NÃO CRIADO - Future)
├── comunicados.html              (NÃO CRIADO - Future)
├── documentos.html               (NÃO CRIADO - Future)
├── solicitacoes.html             (NÃO CRIADO - Future)
├── gerar-fatura.html             (NÃO CRIADO - Future)
├── baixar-faturas.html           (NÃO CRIADO - Future)
├── imprimir-faturas.html         (NÃO CRIADO - Future)
│
├── css/
│   ├── dashboard.css             (Estilos globais: sidebar, header, layout principal)
│   ├── funcionarios.css          (Estilos da página de funcionários)
│   ├── planos.css                (Estilos da página de planos)
│   ├── clientes.css              (Estilos da página de clientes)
│   └── contratos.css             (Estilos da página de contratos)
│
├── js/
│   ├── auth.js                   (Autenticação e session management)
│   └── dashboard.js              (Lógica do dashboard)
│
└── img/
    └── logo02.png                (Logo da empresa)
```

---

## 3. TECNOLOGIAS EMPREGADAS

### Frontend
- **HTML5:** Markup semântico
- **CSS3:** 
  - Flexbox para layouts
  - Grid CSS para tabelas e formulários
  - BEM naming convention (para sidebar)
  - Variáveis CSS (--color-*, --shadow, --brand)
  - Media queries responsive
- **JavaScript Vanilla (ES6+):**
  - Event listeners para interatividade
  - localStorage para persistência de dados
  - JSON para armazenamento de objetos
  - Arrow functions, template literals, destructuring

### Storage
- **localStorage:** Armazenamento de sessões, contadores, planos, contratos

### Build & Deploy
- **Node.js** com npm
- **http-server** para desenvolvimento local (porta 8000)

---

## 4. PALETA DE CORES

```css
--color-white: #ffffff
--color-text-dark: #333333
--color-border: #cccccc

--brand: #0b4f59           /* Teal primário - sidebar, elementos principais */
--brand-hover: #0a4855

--header-bg: #1B6B8C       /* Teal escuro - header, títulos */
--header-gradient: #2E8FAD /* Teal para gradientes */

--accent-tan: #f1e2b5      /* Bege/tan para logo area *)
--accent-light: #f2e3b6    /* Variação do tan *)

--success: #0D7F5F         /* Verde para botão cadastrar *)
--success-hover: #0A6550

--danger: #d32f2f          /* Vermelho para campos importantes *)
--danger-light: #ffebee    /* Fundo vermelho claro *)
--danger-dark: #c62828     /* Texto vermelho escuro *)

--shadow: 0 2px 8px rgba(0,0,0,0.1)
```

---

## 5. PADRÕES E CONVENÇÕES

### Estrutura de Páginas (Padrão Usado)
Todas as páginas de gestão (funcionarios, planos, clientes, contratos) seguem:

```html
<div class="main-container">
  <!-- SIDEBAR com menu navegação -->
  <aside class="sidebar">
    <!-- Logo, menu principal, submenus -->
  </aside>
  
  <!-- CONTEÚDO PRINCIPAL -->
  <div class="right-section">
    <!-- HEADER com welcome text e notificações -->
    <header class="header"></header>
    
    <!-- MAIN CONTENT -->
    <main class="main-content">
      <!-- VIEW LISTA (tabela com filtros) -->
      <div id="viewLista" class="view-section active">
        <!-- Filtros, botão Inserir, tabela -->
      </div>
      
      <!-- VIEW FORMULÁRIO (form para cadastro) -->
      <div id="viewFormulario" class="view-section">
        <!-- Form com múltiplas seções -->
      </div>
    </main>
  </div>
</div>
```

### Padrão de View Switching
```javascript
function showFormulario() {
    viewLista.classList.remove("active");
    viewFormulario.classList.add("active");
}

function showLista() {
    viewFormulario.classList.remove("active");
    viewLista.classList.add("active");
    formElement.reset();
}
```

### Padrão de Geração de IDs/Matrícula Sequencial
```javascript
// Resetar localStorage
localStorage.removeItem("contador");
localStorage.setItem("contador", "0");

function obterProximo() {
    let proximo = localStorage.getItem("contador");
    if (!proximo) proximo = 0;
    proximo = parseInt(proximo) + 1;
    return proximo.toString();
}

function salvarProximo() {
    let proximo = localStorage.getItem("contador");
    if (!proximo) proximo = 0;
    proximo = parseInt(proximo) + 1;
    localStorage.setItem("contador", proximo);
}

// Apenas chamar salvarProximo() no submit do form
```

### CSS Classes Padrão
- `.view-section` → container para views (lista/form)
- `.view-section.active` → torna view visível
- `.content-card` → container principal de conteúdo
- `.card-header` → cabeçalho com título
- `.section-title` → títulos de seções do form
- `.form-section` → agrupamento de campos
- `.form-row` → linha de campos
- `.form-group` → grupo de um campo (label + input)
- `.form-group.full` → campo que ocupa linha inteira
- `.form-group input:readonly` → campo desabilitado (cor vermelha #ffebee, texto #c62828)
- `.action-buttons` → botões no topo (Inserir, etc)
- `.filter-section` → seção de filtros
- `.list-header` → cabeçalho da tabela com contagem
- `.empty-state` → mensagem quando lista vazia

---

## 6. SIDEBAR NAVIGATION STRUCTURE

### Menu Principal (todos.html)
- 🏠 **Início** → `/dashboard.html`
- 👥 **Funcionários** → `/funcionarios.html`
- 📋 **Cadastros** (submenu expansível)
  - › Planos → `/planos.html`
  - › Clientes → `/clientes.html`
  - › Contratos → `/contratos.html`
  - › Atendimento → `/atendimento.html`
  - › Obituário → `/obituario.html`
- 💰 **Financeiro** (submenu expansível)
  - › Gerar Fatura → `/gerar-fatura.html`
  - › Baixar Faturas → `/baixar-faturas.html`
  - › Imprimir Faturas → `/imprimir-faturas.html`
- 📢 **Comunicados** → `/comunicados.html`
- 🗂️ **Documentos** → `/documentos.html`
- ✉️ **Solicitações** → `/solicitacoes.html`

**Importante:** Todos os links usam caminhos ABSOLUTOS (`/arquivo.html`) para funcionar de qualquer página.

---

## 7. AUTENTICAÇÃO

### Arquivo: js/auth.js
- Classe `AuthManager` para gestão de usuários
- Usuários pré-cadastrados (localStorage):
  - Email: `admin@legacyflow.com` | Senha: `123456`
  - Email: `usuario@legacyflow.com` | Senha: `123456`
- Métodos principais:
  - `login(email, senha)` → retorna true/false
  - `register(email, senha)` → cria novo usuário
  - `logout()` → limpa session
  - `getCurrentUser()` → retorna usuário atual
  - `isAuthenticated()` → verifica se autenticado

---

## 8. DADOS PERSISTIDOS EM LOCALSTORAGE

| Chave | Descrição | Tipo | Exemplo |
|-------|-----------|------|---------|
| `currentUser` | Usuário autenticado | JSON | `{email, name}` |
| `proximoIdPlano` | Contador de planos | String | `"5"` |
| `proximaMatricula` | Contador de clientes | String | `"8"` |
| `proximoNumContrato` | Contador de contratos | String | `"3"` |
| `planosRegistrados` | Array de planos criados | JSON Array | `[{id, nome, valor...}]` |

---

## 9. CAMPOS DE FORMULÁRIOS POR PÁGINA

### Funcionários
- Matrícula (readonly, auto-gerado)
- Nome, Email, Contato, Função
- Foto (upload com preview)
- Status (ATIVO/INATIVO)

### Planos
- ID Plano (readonly, auto-gerado, vermelho)
- Nome do Plano
- Dias Carência
- Nº Meses, Nº Agregados
- Valor R$

### Clientes
- Matrícula (readonly, auto-gerado, vermelho)
- **Dados Cadastrais:** Nome, CPF, RG, Data Nasc, Sexo, Pai, Mãe, Naturalidade, Est. Civil, Cônjuge, Profissão, Local Trabalho
- **Endereço:** CEP, Logradouro, Número, Bairro, Complemento, Cidade, UF
- **Contato:** Email, Telefone, Celular, Observações

### Contratos
- Nº Contrato (readonly, auto-gerado, formato: "1/2026")
- **Dados Cliente:** Busca com dropdown dinamicamente preenchido
- **Dados Plano:** Select dinamicamente preenchido com planos cadastrados, Valor auto-preenchido
- **Inscritos/Dependentes:** Tabela adicionável com Nome, Data Nasc, Parentesco

---

## 10. FUNCIONALIDADES IMPLEMENTADAS

✅ Sistema de Login/Signup com localStorage
✅ Dashboard com sidebar navegável
✅ Página de Funcionários (CRUD UI)
✅ Página de Planos (CRUD UI, planos salvos em localStorage)
✅ Página de Clientes (CRUD UI, clientes salvos)
✅ Página de Contratos (CRUD UI, busca de cliente, planos, inscritos)
✅ Auto-geração de IDs/Matrícula sequencial
✅ View switching (lista/formulário)
✅ Filtros e busca em listas
✅ Preenchimento dinâmico de campos
✅ Navegação completa entre todas as páginas
✅ Responsividade básica

---

## 11. PRÓXIMAS IMPLEMENTAÇÕES

❌ Páginas de Atendimento, Obituário
❌ Páginas de Comunicados, Documentos, Solicitações
❌ Páginas de Financeiro (Gerar/Baixar/Imprimir Faturas)
❌ Backend API para persistência em banco de dados
❌ Upload de fotos (server-side)
❌ Edição e deleção de registros
❌ Relatórios e exportação de dados
❌ Validações avançadas

---

## 12. AMBIENTE DE DESENVOLVIMENTO

**Instalação:**
```bash
npm install
npx http-server -p 8000
```

**Acesso:**
- URL: `http://localhost:8000`
- Login padrão: admin@legacyflow.com / 123456

---

## 13. NOTAS IMPORTANTES

1. **Todos os links de menu usam caminhos absolutos** (`/arquivo.html`), não caminhos relativos
2. **localStorage é resetado ao carregar a página** para contadores (ID, Matrícula), então sempre começam do 1
3. **Planos são salvos dinamicamente** - ao cadastrar plano em planos.html, aparece automaticamente em contratos.html
4. **Clientes são simulados** (array fictício) - em produção viriam do backend
5. **Não há banco de dados** - tudo é localStorage/sessão (perderá dados ao limpar browser)
6. **Não há validações robustas** - implementar conforme necessário

