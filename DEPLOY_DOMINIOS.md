# Documentação de Implantação e Configuração de Domínios — Memorius

Este guia descreve as configurações necessárias para apontamento de domínios, DNS, Vercel e variáveis de ambiente para a entrada do sistema em produção.

## 1. Mapeamento de Domínios e Roteamento

O roteamento automático de acessos do Memorius é estruturado da seguinte forma:

* **`memorius.com.br`** e **`www.memorius.com.br`**: Exibem a landing page comercial do produto.
* **`app.memorius.com.br`**: Redireciona a rota raiz (`/`) para a tela de `/login` e gerencia a área logada do sistema.

## 2. Configurações de DNS

No provedor de registro de domínio (ex: Registro.br, Cloudflare, etc.), configure as seguintes entradas DNS:

| Tipo | Nome | Valor / Destino | Finalidade |
| :--- | :--- | :--- | :--- |
| **A** | `@` (ou vazio) | `76.76.21.21` (IP da Vercel) | Aponta o domínio principal (`memorius.com.br`) |
| **CNAME** | `www` | `cname.vercel-dns.com` | Aponta o subdomínio `www.memorius.com.br` |
| **CNAME** | `app` | `cname.vercel-dns.com` | Aponta o subdomínio do sistema `app.memorius.com.br` |

## 3. Configuração de Domínios na Vercel

No painel do projeto na Vercel, navegue até **Settings > Domains** e adicione os seguintes registros:

1. **`memorius.com.br`** (Configure para redirecionar de forma recomendada ou manter junto com o `www`)
2. **`www.memorius.com.br`**
3. **`app.memorius.com.br`**

*Nota: O proxy inteligente configurado em `src/proxy.ts` irá detectar o cabeçalho `Host` e servir a landing page ou o portal de login automaticamente.*

## 4. Variáveis de Ambiente de Produção

Configure as seguintes chaves no painel da Vercel em **Settings > Environment Variables**:

* **`NEXT_PUBLIC_SUPABASE_URL`**: URL de produção do projeto no Supabase.
* **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Chave anônima pública para acesso cliente ao Supabase.
* **`SUPABASE_SERVICE_ROLE_KEY`**: Chave de acesso administrativo (bypass de RLS).
* **`ASAAS_WEBHOOK_TOKEN`**: Token de segurança para validação das requisições de webhook enviadas pelo ASAAS.

> [!CAUTION]
> **Segurança de Chaves Privadas**
> Nunca exponha a variável `SUPABASE_SERVICE_ROLE_KEY` no frontend ou em variáveis prefixadas com `NEXT_PUBLIC_`. Ela concede acesso administrativo irrestrito ao banco de dados e deve ser mantida estritamente no lado do servidor (API Routes/Server Actions).
